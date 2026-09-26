import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, saveAuthSession, clearAuthSession, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session on load
  useEffect(() => {
    async function loadUser() {
      const token = getAccessToken();
      const savedUser = localStorage.getItem('hospital_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify with backend
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

  const loginWithPassword = async (email, password) => {
    const res = await api.auth.login(email, password);
    return res;
  };

  const complete2FALogin = async (temp2FAToken, totpCode) => {
    const res = await api.auth.verify2FALogin(temp2FAToken, totpCode);
    if (res.success && res.user) {
      saveAuthSession(res);
      setUser(res.user);
    }
    return res;
  };

  const complete2FAEnrollment = async (userId, token) => {
    const res = await api.auth.verify2FASetup(userId, token);
    if (res.success && res.user) {
      saveAuthSession(res);
      setUser(res.user);
    }
    return res;
  };

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
