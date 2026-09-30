/**
 * ============================================================================
 * File: backend/src/routes/authRoutes.js
 * Purpose: Routing Declarations for Staff Authentication & 2FA Endpoints
 * ----------------------------------------------------------------------------
 * Description:
 * Defines URL routes for hospital user authentication. Applies strict rate
 * limiters (`loginLimiter`) on sensitive login and verification routes to
 * defend against brute-force attacks and credential stuffing.
 *
 * Routes Mapped:
 * - POST /api/auth/login            -> Step 1 credential check
 * - GET  /api/auth/2fa-setup        -> Generate TOTP QR setup data
 * - POST /api/auth/verify-2fa-setup -> Confirm and enable 2FA
 * - POST /api/auth/verify-2fa-login -> Step 2 verify TOTP 6-digit code
 * - POST /api/auth/refresh          -> Issue new access token using refresh token
 * - GET  /api/auth/me               -> Retrieve authenticated user profile
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/authMiddleware');

// Step 1: Login with Email & Password (rate limited)
router.post('/login', loginLimiter, authController.login);

// Step 2A: Generate TOTP QR Code URI for new account enrollment
router.get('/2fa-setup', authController.get2FASetup);

// Step 2B: Verify initial 6-digit code and activate 2FA
router.post('/verify-2fa-setup', loginLimiter, authController.verify2FASetup);

// Step 2C: Verify 6-digit code for 2FA login challenge (rate limited)
router.post('/verify-2fa-login', loginLimiter, authController.verify2FALogin);

// Refresh expired JWT access token
router.post('/refresh', authController.refreshToken);

// Fetch current user details (protected by JWT verification middleware)
router.get('/me', verifyToken, authController.getCurrentUser);

module.exports = router;
