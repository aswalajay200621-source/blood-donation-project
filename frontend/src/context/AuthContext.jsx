/**
 * ============================================================================
 * File: frontend/src/context/AuthContext.jsx
 * Purpose: Authentication Context & Global User Session State Provider
 * ----------------------------------------------------------------------------
 * Description:
 * This module manages user authentication state across the entire React application.
 *
 * Key Responsibilities:
 * 1. Checks and restores existing JWT sessions from browser localStorage on app load.
 * 2. Validates session tokens against the Express `/auth/me` endpoint.
 * 3. Handles primary password authentication and 2-Factor (TOTP) verification.
 * 4. Manages 2FA security enrollment flows for staff members.
 * 5. Exposes convenience properties like `isAuthenticated` and `isAdmin`.
 * 6. Provides a unified `logout` function that wipes tokens and resets state.
 * ============================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, saveAuthSession, clearAuthSession, getAccessToken } from '../services/api';

// Create React context for authentication state
const AuthContext = createContext(null);

/**
 * AuthProvider Component
 * Wraps application components with global user session state and authentication helpers.
 */
export function AuthProvider({ children }) {
  // Current active staff user object (e.g. { id, name, email, role })
  const [user, setUser] = useState(null);

  // Loading state while checking token validity on initial page load
  const [loading, setLoading] = useState(true);

  // On component mount: restore existing session from localStorage if available
  useEffect(() => {
    async function loadUser() {
      const token = getAccessToken();
      const savedUser = localStorage.getItem('hospital_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify token validity with backend
          const res = await api.auth.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          }
        } catch (err) {
          console.warn('Session restoration failed:', err.message);
          clearAuthSession();
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  /**
   * Phase 1 Login: Authenticate with email & password
   * Returns temporary 2FA token if two-factor is enabled.
   */
  const loginWithPassword = async (email, password) => {
    const res = await api.auth.login(email, password);
    return res;
  };

  /**
   * Phase 2 Login: Complete sign-in using the 6-digit TOTP security code
   */
  const complete2FALogin = async (temp2FAToken, totpCode) => {
    const res = await api.auth.verify2FALogin(temp2FAToken, totpCode);
    if (res.success && res.user) {
      saveAuthSession(res);
      setUser(res.user);
    }
    return res;
  };

  /**
   * Complete initial 2FA enrollment when setting up an authenticator app
   */
  const complete2FAEnrollment = async (userId, token) => {
    const res = await api.auth.verify2FASetup(userId, token);
    if (res.success && res.user) {
      saveAuthSession(res);
      setUser(res.user);
    }
    return res;
  };

  /**
   * Disconnects current session, wipes stored tokens, and returns to login screen
   */
  const logout = () => {
    clearAuthSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        loginWithPassword,
        complete2FALogin,
        complete2FAEnrollment,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to easily consume authentication state in any React component
 * @returns {Object} { user, loading, isAuthenticated, isAdmin, loginWithPassword, ... }
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
