const API_BASE = '/api';

/**
 * Helper to get active JWT access token
 */
export function getAccessToken() {
  return localStorage.getItem('hospital_access_token');
}

/**
 * Helper to save auth tokens
 */
export function saveAuthSession(data) {
  if (data.accessToken) localStorage.setItem('hospital_access_token', data.accessToken);
  if (data.refreshToken) localStorage.setItem('hospital_refresh_token', data.refreshToken);
  if (data.user) localStorage.setItem('hospital_user', JSON.stringify(data.user));
}

/**
 * Clear session on logout
 */
export function clearAuthSession() {
  localStorage.removeItem('hospital_access_token');
  localStorage.removeItem('hospital_refresh_token');
  localStorage.removeItem('hospital_user');
}

/**
 * Universal API request fetcher with automatic Bearer token and error handling
 */
async function apiRequest(endpoint, options = {}) {
  const token = getAccessToken();
  const headers = {
    ...(options.headers || {})
  };

  // Only add Content-Type: application/json if body is not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);

    // If access token expired, attempt token refresh
    if (res.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/refresh')) {
      const refreshToken = localStorage.getItem('hospital_refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.accessToken) {
            saveAuthSession(refreshData);
            // Retry initial request
            headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
            const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...config, headers });
            return await retryRes.json();
          }
        } catch (e) {
          clearAuthSession();
          window.location.reload();
        }
      }
    }

    const data = await res.json();
    if (!res.ok && !data.success) {
      throw new Error(data.error || 'Server request failed');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Authentication & 2FA
  auth: {
    login: (email, password) =>
      apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    get2FASetup: (userId) =>
      apiRequest(`/auth/2fa-setup?userId=${userId}`),
    verify2FASetup: (userId, token) =>
      apiRequest('/auth/verify-2fa-setup', { method: 'POST', body: JSON.stringify({ userId, token }) }),
    verify2FALogin: (temp2FAToken, totpCode) =>
      apiRequest('/auth/verify-2fa-login', { method: 'POST', body: JSON.stringify({ temp2FAToken, totpCode }) }),
    getMe: () =>
      apiRequest('/auth/me')
  },

  // Donors
  donors: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/donors?${query}`);
    },
    getById: (id) =>
      apiRequest(`/donors/${id}`),
    checkDuplicate: (phone, email) => {
      const query = new URLSearchParams({ phone: phone || '', email: email || '' }).toString();
      return apiRequest(`/donors/check-duplicate?${query}`);
    },
    create: (donorData) =>
      apiRequest('/donors', { method: 'POST', body: JSON.stringify(donorData) }),
    recordDonation: (donorId, donationData) =>
      apiRequest(`/donors/${donorId}/donate`, { method: 'POST', body: JSON.stringify(donationData) }),
    update: (donorId, data) =>
      apiRequest(`/donors/${donorId}`, { method: 'PUT', body: JSON.stringify(data) }),
    sendReminder: (donorId) =>
      apiRequest(`/donors/${donorId}/send-reminder`, { method: 'POST' }),
    getExportCSVUrl: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return `${API_BASE}/donors/export/csv?${query}`;
    }
  },

  // Excel Migration
  excel: {
    preview: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest('/excel/preview', { method: 'POST', body: formData });
    },
    commit: (rows, updateExisting = true) =>
      apiRequest('/excel/commit', { method: 'POST', body: JSON.stringify({ rows, updateExisting }) }),
    downloadTemplateUrl: () => `${API_BASE}/excel/template`
  },

  // Notifications
  notifications: {
    getLogs: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/notifications/logs?${query}`);
    },
    testEmail: (email) =>
      apiRequest('/notifications/test-email', { method: 'POST', body: JSON.stringify({ email }) }),
    testWhatsApp: (phone) =>
      apiRequest('/notifications/test-whatsapp', { method: 'POST', body: JSON.stringify({ phone }) })
  },

  // Dashboard
  dashboard: {
    getStats: () => apiRequest('/dashboard/stats')
  },

  // Settings
  settings: {
    get: () => apiRequest('/settings'),
    update: (settings) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
    getCronStatus: () => apiRequest('/settings/cron-status'),
    triggerCron: () => apiRequest('/settings/trigger-cron', { method: 'POST' })
  },

  // Audit
  audit: {
    getLogs: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/audit/logs?${query}`);
    }
  }
};
