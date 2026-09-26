const rateLimit = require('express-rate-limit');
const config = require('../config/env');

// Strict Rate Limiter for Authentication / 2FA endpoints to prevent Brute-Force & Credential Stuffing
const loginLimiter = rateLimit({
  windowMs: config.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: config.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests generated. Please slow down.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  }
});

// Bulk Import & Export Limiter
const fileOpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
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
