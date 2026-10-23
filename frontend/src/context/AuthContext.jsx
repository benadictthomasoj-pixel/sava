/**
 * Centralized Authentication Context for AAYAM Infrastructure Intelligence
 *
 * SECURITY NOTE & ARCHITECTURAL TRADE-OFFS:
 * For this client-side prototype, authentication uses a signed JWT access token issued by FastAPI.
 * The token and active user profile are held in React state (in-memory) and mirrored to sessionStorage
 * so that page reloads within an active engineering session do not unexpectedly drop the session.
 *
 * Security Trade-offs & Limitations:
 * 1. sessionStorage is tab-isolated and destroyed when the browser tab closes, preventing persistent disk exposure.
 * 2. However, any client-side JavaScript execution (such as XSS vulnerability or malicious dependency) can read
 *    sessionStorage. Browser storage is NOT secure against XSS.
 * 3. In a production-grade deployment, tokens should be managed via an HttpOnly, Secure, SameSite=Strict
 *    cookie accompanied by CSRF protection, ensuring credentials cannot be read via document.cookie or script.
 * 4. Frontend role checks are for UI guidance and workflow ergonomics only. The backend FastAPI RBAC
 *    dependencies ('require_admin') remain the authoritative, non-bypassable security boundary.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginUser,
  registerUser,
  fetchCurrentUserProfile,
  setAuthToken,
  setUnauthorizedHandler,
} from '../services/api';

const AuthContext = createContext(null);

const STORAGE_TOKEN_KEY = 'aayam_auth_token';
const STORAGE_USER_KEY = 'aayam_auth_user';

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const [user, setUserState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Synchronize token state with api service and sessionStorage
  const updateSession = useCallback((newToken, newUser) => {
    setTokenState(newToken);
    setUserState(newUser);
    setAuthToken(newToken);

    try {
      if (newToken && newUser) {
        sessionStorage.setItem(STORAGE_TOKEN_KEY, newToken);
        sessionStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
      } else {
        sessionStorage.removeItem(STORAGE_TOKEN_KEY);
        sessionStorage.removeItem(STORAGE_USER_KEY);
      }
    } catch (err) {
      console.warn('SessionStorage write error:', err);
    }
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    updateSession(null, null);
    setAuthError(null);
  }, [updateSession]);

  // Initial verification on mount
  useEffect(() => {
    let isMounted = true;

    // Register 401 callback with API service
    setUnauthorizedHandler(() => {
      logout();
    });

    const initAuth = async () => {
      const existingToken = sessionStorage.getItem(STORAGE_TOKEN_KEY);
      if (!existingToken) {
        setLoading(false);
        return;
      }

      setAuthToken(existingToken);
      try {
        const verifiedUser = await fetchCurrentUserProfile();
        if (isMounted) {
          if (verifiedUser && verifiedUser.is_active) {
            updateSession(existingToken, verifiedUser);
          } else {
            logout();
          }
        }
      } catch (err) {
        console.warn('Existing session validation failed:', err);
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [logout, updateSession]);

  // Login action
  const login = async (username, password) => {
    setAuthError(null);
    try {
      const data = await loginUser({ username, password });
      if (!data || !data.access_token || !data.user) {
        throw new Error('Authentication response did not return expected token and user profile.');
      }
      updateSession(data.access_token, data.user);
      return data.user;
    } catch (err) {
      setAuthError(err.message || 'Authentication failed.');
      throw err;
    }
  };

  // Register action (Public Common User)
  const register = async (regData) => {
    setAuthError(null);
    try {
      const newUser = await registerUser(regData);
      return newUser;
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const isAdmin = Boolean(user && user.role === 'admin');
  const isAuthenticated = Boolean(user && token);

  const value = {
    user,
    token,
    loading,
    authError,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
