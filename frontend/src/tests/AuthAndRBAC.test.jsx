import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import LoginScreen from '../components/LoginScreen';
import Header from '../components/Header';
import AssetRegistry from '../pages/AssetRegistry';
import InspectionHistoryModal from '../components/InspectionHistoryModal';
import DigitalHeartbeatPlaceholder from '../pages/DigitalHeartbeatPlaceholder';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../services/api';

describe('Frontend Authentication and RBAC Integration', () => {
  const mockAdminUser = {
    id: 'USER-ADM-001',
    username: 'admin',
    email: 'admin@aayam.gov.in',
    full_name: 'Chief Structural Engineer (Admin)',
    role: 'admin',
    is_active: true,
  };

  const mockCommonUser = {
    id: 'USER-COM-001',
    username: 'engineer',
    email: 'engineer@aayam.gov.in',
    full_name: 'Field Auditor (Common User)',
    role: 'common_user',
    is_active: true,
  };

  const mockAssets = [
    {
      id: 'ASSET-BRG-001',
      name: 'Mandovi River Estuary Bridge',
      category: 'Bridge',
      district: 'North Goa',
      state: 'Goa',
      latitude: 15.501,
      longitude: 73.832,
      construction_year: 1986,
      status: 'Critical Attention',
      risk_score: 88.5,
      risk_level: 'Critical',
      health_index: 38.2,
      last_inspection_date: '2024-01-15',
      flagged_reasons: ['Sub-surface Pier Scour Exceedance'],
    },
  ];

  const mockInspections = [
    {
      id: 'INSP-BRG-001-01',
      asset_id: 'ASSET-BRG-001',
      inspection_date: '2024-01-15',
      inspection_type: 'Underwater Sonar Bathymetry',
      findings: 'Sub-surface scour hole depth 2.4m detected.',
      recommended_action: 'Rip-rap rock armouring around Pier 4.',
      actual_action_taken: '45 tonnes rip-rap installed.',
      responsible_user: 'Field Audit Team',
      status: 'Completed',
      verification_outcome: null,
      verification_notes: null,
      verification_date: null,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    api.setAuthToken(null);

    // Default API mocks for read endpoints
    vi.spyOn(api, 'fetchHealth').mockResolvedValue({ status: 'healthy', database: 'connected' });
    vi.spyOn(api, 'fetchAssets').mockResolvedValue({ items: mockAssets, categories: ['Bridge'] });
    vi.spyOn(api, 'fetchAssetStats').mockResolvedValue({
      total_assets: 1,
      critical_assets: 1,
      high_risk_assets: 0,
      inspection_due: 0,
      operational_assets: 0,
      average_health_index: 38.2,
    });
    vi.spyOn(api, 'fetchAssetById').mockResolvedValue(mockAssets[0]);
    vi.spyOn(api, 'fetchAssetHeartbeat').mockResolvedValue({
      asset_id: 'ASSET-BRG-001',
      asset_name: 'Mandovi River Estuary Bridge',
      risk_score: 88.5,
      risk_tier: 'Critical',
      health_index: 38.2,
      days_since_inspection: 45,
      data_confidence_score: 0.95,
      contributing_factors: [],
      suggested_investigations: [],
      data_completeness: { verified_fields: [], missing_fields: [] },
    });
    vi.spyOn(api, 'fetchAssetInspections').mockResolvedValue(mockInspections);
    vi.spyOn(api, 'fetchAssetTimeline').mockResolvedValue([]);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  // ============================================================================
  // 1. LOGIN SCREEN & CREDENTIAL VALIDATION
  // ============================================================================
  describe('LoginScreen Component', () => {
    it('renders login form with inputs and role guidance without hardcoded secrets', () => {
      render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      expect(screen.getByText('Sign in to AAYAM')).toBeInTheDocument();
      expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/administrator/i)).toBeInTheDocument();
      expect(screen.getAllByText(/common user/i).length).toBeGreaterThanOrEqual(1);
    });

    it('rejects empty input fields with a validation message before calling API', async () => {
      const loginSpy = vi.spyOn(api, 'loginUser');

      render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(
        await screen.findByText('Please enter both your username/email and password.')
      ).toBeInTheDocument();
      expect(loginSpy).not.toHaveBeenCalled();
    });

    it('handles 401 invalid credentials with an informative error alert', async () => {
      const err = new Error('Invalid username or password.');
      err.status = 401;
      vi.spyOn(api, 'loginUser').mockRejectedValue(err);

      render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/username or email/i), {
        target: { value: 'baduser' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(
        await screen.findByText('Invalid username or password. Please verify your credentials.')
      ).toBeInTheDocument();
    });

    it('handles 403 deactivated user account with a clear denial alert', async () => {
      const err = new Error('User account is deactivated. Access denied.');
      err.status = 403;
      vi.spyOn(api, 'loginUser').mockRejectedValue(err);

      render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/username or email/i), {
        target: { value: 'inactive_officer' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(
        await screen.findByText(
          'This user account has been deactivated. Please contact an administrator.'
        )
      ).toBeInTheDocument();
    });

    it('handles backend offline / network failure with a helpful connectivity message', async () => {
      const err = new TypeError('Failed to fetch');
      vi.spyOn(api, 'loginUser').mockRejectedValue(err);

      render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/username or email/i), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(
        await screen.findByText(/Unable to connect to backend authentication server/i)
      ).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 2. SUCCESSFUL LOGIN & ROLE-AWARE APPLICATION VIEW
  // ============================================================================
  describe('Full Application Authentication Flow', () => {
    it('successfully logs in as Administrator and renders admin badge & mutation controls', async () => {
      vi.spyOn(api, 'loginUser').mockResolvedValue({
        access_token: 'fake-admin-jwt-token',
        token_type: 'bearer',
        user: mockAdminUser,
      });

      render(<App />);

      // Fill in credentials on login screen
      fireEvent.change(screen.getByLabelText(/username or email/i), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'AdminPass@123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for transition to Dashboard
      await waitFor(() => {
        expect(screen.getByText('Chief Structural Engineer (Admin)')).toBeInTheDocument();
      });

      const roleBadge = screen.getByText('Administrator');
      expect(roleBadge).toBeInTheDocument();
      expect(screen.getByTitle('Sign out of AAYAM')).toBeInTheDocument();

      // Check that token was stored in sessionStorage
      expect(sessionStorage.getItem('aayam_auth_token')).toBe('fake-admin-jwt-token');
      expect(api.getAuthToken()).toBe('fake-admin-jwt-token');
    });

    it('successfully logs in as Common User and displays Common User badge', async () => {
      vi.spyOn(api, 'loginUser').mockResolvedValue({
        access_token: 'fake-common-jwt-token',
        token_type: 'bearer',
        user: mockCommonUser,
      });

      render(<App />);

      fireEvent.change(screen.getByLabelText(/username or email/i), {
        target: { value: 'engineer' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'CommonPass@123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Field Auditor (Common User)')).toBeInTheDocument();
      });

      expect(screen.getByText('Common User')).toBeInTheDocument();
      expect(screen.queryByText('Administrator')).not.toBeInTheDocument();
    });

    it('logs out cleanly, purges session storage and returns user to LoginScreen', async () => {
      vi.spyOn(api, 'loginUser').mockResolvedValue({
        access_token: 'fake-admin-jwt-token',
        token_type: 'bearer',
        user: mockAdminUser,
      });

      render(<App />);

      fireEvent.change(screen.getByLabelText(/username or email/i), {
        target: { value: 'admin' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'AdminPass@123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Chief Structural Engineer (Admin)')).toBeInTheDocument();
      });

      // Click logout
      fireEvent.click(screen.getByTitle('Sign out of AAYAM'));

      // Verify returned to LoginScreen
      await waitFor(() => {
        expect(screen.getByText('Sign in to AAYAM')).toBeInTheDocument();
      });

      // Verify token is purged
      expect(sessionStorage.getItem('aayam_auth_token')).toBeNull();
      expect(sessionStorage.getItem('aayam_auth_user')).toBeNull();
      expect(api.getAuthToken()).toBeNull();
    });
  });

  // ============================================================================
  // 3. ROLE-BASED MUTATION CONTROLS VISIBILITY
  // ============================================================================
  describe('RBAC Mutation Controls in Registry, History, and Heartbeat', () => {
    it('shows Register Asset button in AssetRegistry only when isAdmin=true', () => {
      const { rerender } = render(
        <AssetRegistry
          assets={mockAssets}
          categories={['Bridge']}
          isAdmin={true}
          onSelectAsset={vi.fn()}
        />
      );

      // Admin should see Register Asset button
      expect(screen.getByRole('button', { name: /register asset/i })).toBeInTheDocument();

      // Common User (isAdmin=false) must not see Register Asset button
      rerender(
        <AssetRegistry
          assets={mockAssets}
          categories={['Bridge']}
          isAdmin={false}
          onSelectAsset={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /register asset/i })).not.toBeInTheDocument();
    });

    it('shows Record New Inspection and Verify Outcome in InspectionHistoryModal only when isAdmin=true', async () => {
      const { rerender } = render(
        <InspectionHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          asset={mockAssets[0]}
          isAdmin={true}
        />
      );

      // Admin sees Record New Inspection button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /record new inspection/i })).toBeInTheDocument();
      });

      // Admin sees Status select and Verify Outcome button for completed inspection
      expect(screen.getByRole('button', { name: /verify outcome/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/status:/i)).toBeInTheDocument();

      // Rerender as Common User
      rerender(
        <InspectionHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          asset={mockAssets[0]}
          isAdmin={false}
        />
      );

      // Common User sees findings in read-only mode, but no mutation buttons
      expect(screen.getByText('Observed Structural Findings')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /record new inspection/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /verify outcome/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/status:/i)).not.toBeInTheDocument();
    });

    it('shows Record New Inspection in DigitalHeartbeatPlaceholder only when isAdmin=true', async () => {
      const { rerender } = render(
        <DigitalHeartbeatPlaceholder
          assets={mockAssets}
          selectedAsset={mockAssets[0]}
          isAdmin={true}
        />
      );

      // Switch to Inspections & Interventions tab
      fireEvent.click(screen.getByRole('button', { name: /Interventions & Verifications/i }));

      // Admin should see Record New Inspection button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /record new inspection/i })).toBeInTheDocument();
      });

      // Common user should not see Record New Inspection button
      rerender(
        <DigitalHeartbeatPlaceholder
          assets={mockAssets}
          selectedAsset={mockAssets[0]}
          isAdmin={false}
        />
      );

      expect(screen.queryByRole('button', { name: /record new inspection/i })).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 4. SESSION RESTORATION & EXPIRED TOKEN PURGING
  // ============================================================================
  describe('Session Lifecycle and Expired Token Handling', () => {
    it('restores active session from sessionStorage when token is valid', async () => {
      sessionStorage.setItem('aayam_auth_token', 'valid-stored-jwt');
      sessionStorage.setItem('aayam_auth_user', JSON.stringify(mockAdminUser));
      vi.spyOn(api, 'fetchCurrentUserProfile').mockResolvedValue(mockAdminUser);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Chief Structural Engineer (Admin)')).toBeInTheDocument();
      });

      expect(api.getAuthToken()).toBe('valid-stored-jwt');
    });

    it('clears stored session and presents LoginScreen when token is expired or 401', async () => {
      sessionStorage.setItem('aayam_auth_token', 'expired-stored-jwt');
      sessionStorage.setItem('aayam_auth_user', JSON.stringify(mockAdminUser));

      const err = new Error('Token has expired.');
      err.status = 401;
      vi.spyOn(api, 'fetchCurrentUserProfile').mockRejectedValue(err);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Sign in to AAYAM')).toBeInTheDocument();
      });

      // SessionStorage should be cleaned up
      expect(sessionStorage.getItem('aayam_auth_token')).toBeNull();
      expect(sessionStorage.getItem('aayam_auth_user')).toBeNull();
    });
  });

  // ============================================================================
  // 5. PUBLIC SELF-REGISTRATION FOR COMMON USERS
  // ============================================================================
  describe('Public Self-Registration for Common Users', () => {
    it('toggles between Sign In and Register Common User form', () => {
      render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      expect(screen.getByText('Sign in to AAYAM')).toBeInTheDocument();

      // Click to switch to Register mode
      fireEvent.click(screen.getByRole('button', { name: /register as common user/i }));

      expect(screen.getByText('Create Common User Account')).toBeInTheDocument();
      expect(screen.getByLabelText(/desired username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password \(min 8 chars\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register common user account/i })).toBeInTheDocument();

      // Click to switch back to Sign In mode
      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
      expect(screen.getByText('Sign in to AAYAM')).toBeInTheDocument();
    });

    it('validates password matching and length on the frontend before calling API', async () => {
      const regSpy = vi.spyOn(api, 'registerUser');

      render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /register as common user/i }));

      // Fill in mismatched passwords
      fireEvent.change(screen.getByLabelText(/desired username/i), { target: { value: 'citizen_raj' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'raj@domain.com' } });
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Rajesh Kumar' } });
      fireEvent.change(screen.getByLabelText(/password \(min 8 chars\)/i), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'MismatchedPassword999!' } });

      fireEvent.click(screen.getByRole('button', { name: /register common user account/i }));

      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
      expect(regSpy).not.toHaveBeenCalled();

      // Test short password
      fireEvent.change(screen.getByLabelText(/password \(min 8 chars\)/i), { target: { value: 'short' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'short' } });

      fireEvent.click(screen.getByRole('button', { name: /register common user account/i }));
      expect(await screen.findByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    });

    it('successfully registers a Common User account and transitions to Sign In with success message', async () => {
      const regSpy = vi.spyOn(api, 'registerUser').mockResolvedValue({
        id: 'USER-COM-TEST1234',
        username: 'citizen_anita',
        email: 'anita.desai@infra.gov.in',
        full_name: 'Anita Desai',
        role: 'common_user',
        is_active: true,
      });

      render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /register as common user/i }));

      fireEvent.change(screen.getByLabelText(/desired username/i), { target: { value: 'citizen_anita' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'anita.desai@infra.gov.in' } });
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Anita Desai' } });
      fireEvent.change(screen.getByLabelText(/password \(min 8 chars\)/i), { target: { value: 'SecureCitizen2026!' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'SecureCitizen2026!' } });

      fireEvent.click(screen.getByRole('button', { name: /register common user account/i }));

      await waitFor(() => {
        expect(regSpy).toHaveBeenCalledWith({
          username: 'citizen_anita',
          email: 'anita.desai@infra.gov.in',
          full_name: 'Anita Desai',
          password: 'SecureCitizen2026!',
          confirm_password: 'SecureCitizen2026!',
        });
      });

      // Transits to Sign In view with success message and prefilled username
      await waitFor(() => {
        expect(screen.getByText('Sign in to AAYAM')).toBeInTheDocument();
        expect(screen.getByText(/Account created successfully for 'citizen_anita'!/i)).toBeInTheDocument();
      });

      const usernameInput = screen.getByLabelText(/username or email/i);
      expect(usernameInput).toHaveValue('citizen_anita');
    });

    it('handles duplicate username or email (409 Conflict) from API gracefully', async () => {
      const conflictErr = new Error("Username 'existing_user' is already registered. Please choose another username.");
      conflictErr.status = 409;
      vi.spyOn(api, 'registerUser').mockRejectedValue(conflictErr);

      render(
        <AuthProvider>
          <LoginScreen />
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /register as common user/i }));

      fireEvent.change(screen.getByLabelText(/desired username/i), { target: { value: 'existing_user' } });
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@domain.com' } });
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByLabelText(/password \(min 8 chars\)/i), { target: { value: 'ValidPassword123!' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'ValidPassword123!' } });

      fireEvent.click(screen.getByRole('button', { name: /register common user account/i }));

      expect(
        await screen.findByText("Username 'existing_user' is already registered. Please choose another username.")
      ).toBeInTheDocument();
    });
  });
});

