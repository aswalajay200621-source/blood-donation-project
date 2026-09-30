/**
 * ============================================================================
 * File: frontend/src/services/api.js
 * Purpose: Centralized Client-Side REST API Client Service Layer
 * ----------------------------------------------------------------------------
 * Description:
 * This module coordinates all network communication between the React frontend
 * and the Express.js backend server.
 *
 * Key Capabilities:
 * 1. Manages JWT access and refresh tokens stored in localStorage.
 * 2. Injects Authorization Bearer headers into authenticated requests automatically.
 * 3. Handles automatic token refreshing transparently when receiving a 401 response.
 * 4. Formats and dispatches structured requests across all modules:
 *    - `auth`: Login, 2FA setup, TOTP verification, active session checks
 *    - `donors`: Donor listings, duplicate checks, creation, repeat donations, CSV exports
 *    - `excel`: File upload preview, schema validation, and database commit
 *    - `notifications`: Dispatch logs and multi-channel test message triggers
 *    - `dashboard`: Real-time stock counts and clinical summary statistics
 *    - `settings`: System configurations, SMTP/WhatsApp toggles, and manual cron triggers
 *    - `audit`: Clinical access logs, tampering checks, and security audit trails
 * ============================================================================
 */

// Base endpoint prefix routed through Vite's local reverse proxy to Express (port 5000)
const API_BASE = '/api';

/**
 * Retrieves the currently saved JWT Access Token from browser localStorage.
 * @returns {string|null} The active JWT bearer token or null if unauthenticated.
 */
export function getAccessToken() {
  return localStorage.getItem('hospital_access_token');
}

/**
 * Persists updated session credentials into browser localStorage upon login or token refresh.
 * @param {Object} data - Contains accessToken, refreshToken, and user metadata.
 */
export function saveAuthSession(data) {
  if (data.accessToken) localStorage.setItem('hospital_access_token', data.accessToken);
  if (data.refreshToken) localStorage.setItem('hospital_refresh_token', data.refreshToken);
  if (data.user) localStorage.setItem('hospital_user', JSON.stringify(data.user));
}

/**
 * Purges all authentication tokens and user information on logout or expired refresh session.
 */
export function clearAuthSession() {
  localStorage.removeItem('hospital_access_token');
  localStorage.removeItem('hospital_refresh_token');
  localStorage.removeItem('hospital_user');
}

/**
 * Universal Fetch Wrapper
 * Handles JSON serialization, Bearer token injection, automatic token refresh,
 * and unified error extraction.
 *
 * @param {string} endpoint - API route relative to API_BASE (e.g. '/donors')
 * @param {RequestInit} options - Standard fetch options (method, body, headers)
 * @returns {Promise<any>} Parsed JSON response payload
 */
async function apiRequest(endpoint, options = {}) {
  const token = getAccessToken();
  const headers = {
    ...(options.headers || {})
  };

  // Only append JSON content-type if the body is not FormData (e.g. multipart Excel upload)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Inject JWT Bearer Token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);

    // If access token has expired (401), automatically attempt to refresh using the refresh token
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
            // Retry the original request with the fresh token
            headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
            const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...config, headers });
            return await retryRes.json();
          }
        } catch (e) {
          // If refresh token fails, clear session and reload page to prompt login
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

/**
 * Exported API Client Namespaces
 */
export const api = {
  // ==========================================
  // Authentication & 2FA Multi-Factor Security
  // ==========================================
  auth: {
    // Authenticate clinical staff user credentials (email & password)
    login: (email, password) =>
      apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    // Generate TOTP QR code secret for two-factor authentication setup
    get2FASetup: (userId) =>
      apiRequest(`/auth/2fa-setup?userId=${userId}`),
    // Confirm 2FA setup by verifying the first 6-digit TOTP code
    verify2FASetup: (userId, token) =>
      apiRequest('/auth/verify-2fa-setup', { method: 'POST', body: JSON.stringify({ userId, token }) }),
    // Verify 2FA challenge code during staff sign-in
    verify2FALogin: (temp2FAToken, totpCode) =>
      apiRequest('/auth/verify-2fa-login', { method: 'POST', body: JSON.stringify({ temp2FAToken, totpCode }) }),
    // Retrieve currently logged-in clinical user profile
    getMe: () =>
      apiRequest('/auth/me')
  },

  // ==========================================
  // Blood Donor Management & Eligibility
  // ==========================================
  donors: {
    // Fetch paginated/filtered list of registered donors
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/donors?${query}`);
    },
    // Fetch single donor profile by ID including donation history
    getById: (id) =>
      apiRequest(`/donors/${id}`),
    // Check if phone number or email is already registered (Live Camp Entry lookup)
    checkDuplicate: (phone, email) => {
      const query = new URLSearchParams({ phone: phone || '', email: email || '' }).toString();
      return apiRequest(`/donors/check-duplicate?${query}`);
    },
    // Register a brand new donor into the master registry
    create: (donorData) =>
      apiRequest('/donors', { method: 'POST', body: JSON.stringify(donorData) }),
    // Record a new donation for an existing donor (enforcing 90-day safety gap)
    recordDonation: (donorId, donationData) =>
      apiRequest(`/donors/${donorId}/donate`, { method: 'POST', body: JSON.stringify(donationData) }),
    // Update existing donor demographic information
    update: (donorId, data) =>
      apiRequest(`/donors/${donorId}`, { method: 'PUT', body: JSON.stringify(data) }),
    // Trigger immediate multi-channel reminder for an eligible donor
    sendReminder: (donorId) =>
      apiRequest(`/donors/${donorId}/send-reminder`, { method: 'POST' }),
    // Generate CSV download link for filtered master registry export
    getExportCSVUrl: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return `${API_BASE}/donors/export/csv?${query}`;
    }
  },

  // ==========================================
  // Bulk Excel Spreadsheet Migration
  // ==========================================
  excel: {
    // Parse uploaded .xlsx file and perform preliminary validation without committing
    preview: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest('/excel/preview', { method: 'POST', body: formData });
    },
    // Commit validated spreadsheet records into the database
    commit: (rows, updateExisting = true) =>
      apiRequest('/excel/commit', { method: 'POST', body: JSON.stringify({ rows, updateExisting }) }),
    // URL to download standard Excel blank import template
    downloadTemplateUrl: () => `${API_BASE}/excel/template`
  },

  // ==========================================
  // Automated Notification & Reminder Services
  // ==========================================
  notifications: {
    // Fetch delivery logs for WhatsApp and Email reminder dispatches
    getLogs: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/notifications/logs?${query}`);
    },
    // Test SMTP email transmission with a test message
    testEmail: (email) =>
      apiRequest('/notifications/test-email', { method: 'POST', body: JSON.stringify({ email }) }),
    // Test WhatsApp Business API message delivery
    testWhatsApp: (phone) =>
      apiRequest('/notifications/test-whatsapp', { method: 'POST', body: JSON.stringify({ phone }) }),
    // Send WhatsApp reminders to currently eligible donors (optionally targeted by blood group)
    bulkWhatsApp: (bloodGroup = null) =>
      apiRequest('/notifications/bulk-whatsapp', {
        method: 'POST',
        body: JSON.stringify({ bloodGroup: bloodGroup && bloodGroup !== 'ALL' ? bloodGroup : null })
      }),
    // Send Email reminders to currently eligible donors (optionally targeted by blood group)
    bulkEmail: (bloodGroup = null) =>
      apiRequest('/notifications/bulk-email', {
        method: 'POST',
        body: JSON.stringify({ bloodGroup: bloodGroup && bloodGroup !== 'ALL' ? bloodGroup : null })
      })
  },

  // ==========================================
  // Operational Dashboard & Stock Metrics
  // ==========================================
  dashboard: {
    // Retrieve overview metrics, blood chamber stock counts, and recent entries
    getStats: () => apiRequest('/dashboard/stats')
  },

  // ==========================================
  // System Configurations & Background Cron
  // ==========================================
  settings: {
    // Fetch global hospital parameters (reminder channels, gaps, thresholds)
    get: () => apiRequest('/settings'),
    // Update system configuration key-value pairs
    update: (settings) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
    // Check scheduled cron job status (e.g. 08:00 AM daily eligibility scan)
    getCronStatus: () => apiRequest('/settings/cron-status'),
    // Manually trigger the daily 3-month eligibility recall scan
    triggerCron: () => apiRequest('/settings/trigger-cron', { method: 'POST' })
  },

  // ==========================================
  // Security Auditing & Compliance Logging
  // ==========================================
  audit: {
    // Retrieve immutable audit log events (actions, IP addresses, tamper detection)
    getLogs: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/audit/logs?${query}`);
    }
  }
};
