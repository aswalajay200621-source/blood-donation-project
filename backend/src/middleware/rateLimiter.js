/**
 * ============================================================================
 * File: backend/src/middleware/rateLimiter.js
 * Purpose: API Rate Limiting Middleware — DDoS & Brute-Force Protection
 * ----------------------------------------------------------------------------
 * Description:
 * Configures and exports three distinct rate-limiting strategies using
 * the `express-rate-limit` library:
 *
 * 1. `loginLimiter`  — Strict throttle on login/2FA endpoints to prevent
 *                       brute-force password attacks and credential stuffing.
 *                       Limits: configured via env (e.g. 5 requests / 15 min)
 *
 * 2. `apiLimiter`    — General throttle applied to all /api/* routes to
 *                       prevent excessive automated API requests.
 *                       Limits: configured via env (e.g. 100 requests / 15 min)
 *
 * 3. `fileOpLimiter` — Separate throttle for file-heavy routes like Excel
 *                       import/export to prevent large resource abuse.
 *                       Limits: 20 requests / 5 min hardcoded
 * ============================================================================
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

/**
 * Strict login rate limiter — prevents credential brute force attacks
 * Applied to: POST /api/auth/login, POST /api/auth/verify-2fa-login
 */
const loginLimiter = rateLimit({
  windowMs: config.LOGIN_RATE_LIMIT_WINDOW_MS,   // Rolling time window (e.g. 15 min)
  max: config.LOGIN_RATE_LIMIT_MAX,              // Max attempts per IP per window
  standardHeaders: true,   // Include RateLimit-* headers in responses
  legacyHeaders: false,     // Disable deprecated X-RateLimit-* headers
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * General API rate limiter — applied across all /api/* endpoints
 * Applied in: backend/src/app.js middleware pipeline
 */
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,          // Rolling window (e.g. 15 min)
  max: config.RATE_LIMIT_MAX_REQUESTS,            // Max requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests generated. Please slow down.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * File operation rate limiter — extra throttle for heavy import/export routes
 * Applied to: POST /api/excel/preview, POST /api/excel/commit, GET /api/donors/export/csv
 */
const fileOpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5-minute rolling window
  max: 20,                  // Max 20 file operations per IP per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'File operation rate limit reached. Please wait a few minutes.',
    code: 'FILE_OP_RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  loginLimiter,
  apiLimiter,
  fileOpLimiter
};
