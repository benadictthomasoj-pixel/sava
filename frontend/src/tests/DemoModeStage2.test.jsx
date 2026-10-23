import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import LoginScreen from '../components/LoginScreen';
import DemoBanner from '../components/DemoBanner';
import Header from '../components/Header';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../services/api';

describe('AAYAM Demo Mode — Stage 2: Navigation, App State & Demo Banner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    window.location.hash = '';

    // Mock API methods so authenticated or background checks behave safely
    vi.spyOn(api, 'fetchHealth').mockResolvedValue({
      status: 'healthy',
      app_name: 'AAYAM Infrastructure Intelligence API',
      database: 'connected',
      total_assets: 12,
    });
    vi.spyOn(api, 'fetchAssets').mockResolvedValue({
      total: 0,
      count: 0,
      items: [],
      categories: [],
    });
    vi.spyOn(api, 'fetchAssetStats').mockResolvedValue({
      total_assets: 0,
      critical_assets: 0,
      high_risk_assets: 0,
      inspection_due: 0,
      operational_assets: 0,
      average_health_index: 0,
    });
  });

  afterEach(() => {
    window.location.hash = '';
    sessionStorage.clear();
  });

  describe('1. Login Screen Entry Point', () => {
    it('renders the "Try Demo Mode" button in LoginScreen with amber accents and Sparkles icon', () => {
      const handleEnterDemo = vi.fn();
      render(
        <AuthProvider>
          <LoginScreen onEnterDemo={handleEnterDemo} />
        </AuthProvider>
      );

      const demoBtn = screen.getByRole('button', { name: /try demo mode/i });
      expect(demoBtn).toBeInTheDocument();
      expect(demoBtn).toHaveAttribute('id', 'btn-try-demo');

      fireEvent.click(demoBtn);
      expect(handleEnterDemo).toHaveBeenCalledTimes(1);
    });

    it('clicking Try Demo Mode button from App transitions to Demo Mode', async () => {
      render(<App />);

      const demoBtn = await screen.findByRole('button', { name: /try demo mode/i });
      fireEvent.click(demoBtn);

      // Verify URL hash updated to #demo
      expect(window.location.hash).toBe('#demo');

      // Verify Demo Banner appears
      const banner = await screen.findByRole('region', { name: /demo mode notice/i });
      expect(banner).toBeInTheDocument();
      expect(screen.getByText('DEMO MODE')).toBeInTheDocument();
    });
  });

  describe('2. Direct URL Hash Navigation (#demo)', () => {
    it('opens demo mode directly when window.location.hash is #demo without requiring login', async () => {
      window.location.hash = '#demo';
      render(<App />);

      // Should display Demo Banner immediately without rendering Login form
      const banner = await screen.findByRole('region', { name: /demo mode notice/i });
      expect(banner).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /sign in to aayam/i })).not.toBeInTheDocument();

      // Check header environment indicator
      const dbIndicator = screen.getByText(/simulated environment/i);
      expect(dbIndicator).toBeInTheDocument();
    });

    it('responds dynamically to browser hashchange events', async () => {
      render(<App />);

      // Initially on login screen
      expect(await screen.findByRole('heading', { name: /sign in to aayam/i })).toBeInTheDocument();

      // Simulate browser navigation to #demo
      window.location.hash = '#demo';
      fireEvent(window, new HashChangeEvent('hashchange'));

      // Transitions to demo mode
      expect(await screen.findByRole('region', { name: /demo mode notice/i })).toBeInTheDocument();

      // Simulate browser navigation back (clearing hash)
      window.location.hash = '';
      fireEvent(window, new HashChangeEvent('hashchange'));

      // Returns to login screen
      expect(await screen.findByRole('heading', { name: /sign in to aayam/i })).toBeInTheDocument();
    });
  });

  describe('3. Persistent DemoBanner & Safety Disclaimers', () => {
    it('renders DemoBanner with safety disclaimer and exit button', () => {
      const handleExit = vi.fn();
      render(<DemoBanner onExitDemo={handleExit} />);

      const banner = screen.getByRole('region', { name: /demo mode notice/i });
      expect(banner).toBeInTheDocument();
      expect(screen.getByText('DEMO MODE')).toBeInTheDocument();
      expect(
        screen.getByText(/simulated specimens for demonstration purposes/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/must not be used for real engineering, structural, or life-safety decisions/i)
      ).toBeInTheDocument();

      const exitBtn = screen.getByRole('button', { name: /exit demo & return to sign in/i });
      fireEvent.click(exitBtn);
      expect(handleExit).toHaveBeenCalledTimes(1);
    });

    it('persists DemoBanner when navigating between intelligence modules', async () => {
      window.location.hash = '#demo';
      render(<App />);

      expect(await screen.findByRole('region', { name: /demo mode notice/i })).toBeInTheDocument();

      // Switch to Geospatial Map
      const mapNav = screen.getByRole('button', { name: /geospatial map/i });
      fireEvent.click(mapNav);

      // Banner remains visible
      expect(screen.getByRole('region', { name: /demo mode notice/i })).toBeInTheDocument();

      // Switch to Digital Heartbeat
      const heartbeatNav = screen.getByRole('button', { name: /digital heartbeat/i });
      fireEvent.click(heartbeatNav);

      // Banner remains visible
      expect(screen.getByRole('region', { name: /demo mode notice/i })).toBeInTheDocument();
    });
  });

  describe('4. Demo-Aware Header & Layout', () => {
    it('hides authenticated user profile and displays Simulated Environment badge in Header', () => {
      const handleExit = vi.fn();
      render(
        <Header
          pageTitle="Infrastructure Operations Dashboard"
          subtitle="Real-time telemetry overview"
          isDemo={true}
          onExitDemo={handleExit}
        />
      );

      // Should not show user role badge
      expect(screen.queryByText(/administrator/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/common user/i)).not.toBeInTheDocument();

      // Should show Simulated Environment
      expect(screen.getByText(/simulated environment/i)).toBeInTheDocument();

      // Should show Exit Demo action in header
      const exitBtn = screen.getByRole('button', { name: /exit demo/i });
      expect(exitBtn).toBeInTheDocument();
      fireEvent.click(exitBtn);
      expect(handleExit).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Exit Demo Mode Flow', () => {
    it('exiting demo mode clears the #demo hash and displays LoginScreen', async () => {
      window.location.hash = '#demo';
      render(<App />);

      expect(await screen.findByRole('region', { name: /demo mode notice/i })).toBeInTheDocument();

      // Click Exit Demo on the banner
      const exitBannerBtn = screen.getByRole('button', { name: /exit demo & return to sign in/i });
      fireEvent.click(exitBannerBtn);

      // Should return to LoginScreen
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in to aayam/i })).toBeInTheDocument();
      });
      expect(window.location.hash).toBe('');
      expect(screen.queryByRole('region', { name: /demo mode notice/i })).not.toBeInTheDocument();
    });
  });

  describe('6. Security & Session Isolation Guarantees', () => {
    it('entering and exiting demo mode never touches sessionStorage auth keys or creates JWT tokens', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      // Click Try Demo
      render(<App />);
      const demoBtn = await screen.findByRole('button', { name: /try demo mode/i });
      fireEvent.click(demoBtn);

      expect(await screen.findByRole('region', { name: /demo mode notice/i })).toBeInTheDocument();

      // Click Exit Demo
      const exitBtn = screen.getByRole('button', { name: /exit demo & return to sign in/i });
      fireEvent.click(exitBtn);

      expect(await screen.findByRole('heading', { name: /sign in to aayam/i })).toBeInTheDocument();

      // Verify no auth token was written
      expect(sessionStorage.getItem('aayam_auth_token')).toBeNull();
      expect(sessionStorage.getItem('aayam_auth_user')).toBeNull();
      expect(setItemSpy).not.toHaveBeenCalledWith('aayam_auth_token', expect.anything());
    });

    it('does not trigger live fetchHealth or fetchAssets in demo entry flow', async () => {
      const fetchAssetsSpy = vi.spyOn(api, 'fetchAssets');
      const fetchHealthSpy = vi.spyOn(api, 'fetchHealth');

      window.location.hash = '#demo';
      render(<App />);

      expect(await screen.findByRole('region', { name: /demo mode notice/i })).toBeInTheDocument();

      // Neither live health nor live assets should be requested in Stage 2 demo entry
      expect(fetchAssetsSpy).not.toHaveBeenCalled();
      expect(fetchHealthSpy).not.toHaveBeenCalled();
    });
  });
});
