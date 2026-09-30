/**
 * ============================================================================
 * File: backend/src/controllers/authController.js
 * Purpose: Authentication & Two-Factor Authentication (2FA) API Endpoints
 * ----------------------------------------------------------------------------
 * Description:
 * Manages user authentication flows for hospital staff members.
 * Handles primary password login, TOTP 2FA secret generation, TOTP verification,
 * 2FA login challenge resolution, JWT token refresh, and user profile retrieval.
 *
 * Endpoints Managed:
 * - POST /api/auth/login             : Step 1 password verification (triggers 2FA challenge if active)
 * - GET  /api/auth/2fa-setup         : Generate QR code URI & secret for authenticator apps
 * - POST /api/auth/verify-2fa-setup  : Confirm and activate 2FA for a user account
 * - POST /api/auth/verify-2fa-login  : Step 2 verification of 6-digit TOTP code
 * - POST /api/auth/refresh           : Issue new access token using a valid refresh token
 * - GET  /api/auth/me                : Fetch currently authenticated staff identity
 * ============================================================================
 */

const authService = require('../services/authService');
const { query } = require('../db/db');

class AuthController {
  /**
   * Primary Login Endpoint (Step 1)
   * Validates user credentials. If 2FA is enabled, returns a temporary challenge token.
   * If 2FA is disabled, issues final JWT access and refresh tokens directly.
   * Route: POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Extract client network and device details for audit logging
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const ua = req.headers['user-agent'] || 'unknown';

      // Delegate credential validation to authService
      const result = await authService.login(email, password, ip, ua);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      console.error('Login error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Generates a new TOTP secret & QR Code setup payload for 2FA enrollment
   * Route: GET /api/auth/2fa-setup?userId=...
   */
  async get2FASetup(req, res) {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }

      // Generate secret, otpauth URL, and QR code representation
      const setupData = await authService.generate2FAEnrollment(userId);
      return res.status(200).json({ success: true, ...setupData });
    } catch (err) {
      console.error('2FA setup error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Confirms initial 2FA enrollment with a test 6-digit code and activates it
   * Route: POST /api/auth/verify-2fa-setup
   */
  async verify2FASetup(req, res) {
    try {
      const { userId, token } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const ua = req.headers['user-agent'] || 'unknown';

      // Verify test code and permanently enable 2FA on the user account
      const tokens = await authService.verifyAndEnable2FA(userId, token, ip, ua);
      return res.status(200).json({
        success: true,
        message: 'Two-Factor Authentication enrolled and enabled successfully.',
        ...tokens
      });
    } catch (err) {
      console.error('2FA setup verification error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Verifies the 6-digit TOTP code during a 2FA login challenge (Step 2)
   * Route: POST /api/auth/verify-2fa-login
   */
  async verify2FALogin(req, res) {
    try {
      const { temp2FAToken, totpCode } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const ua = req.headers['user-agent'] || 'unknown';

      // Verify temp token and TOTP pin, then issue final JWT tokens
      const tokens = await authService.verify2FALogin(temp2FAToken, totpCode, ip, ua);
      return res.status(200).json({ success: true, ...tokens });
    } catch (err) {
      console.error('2FA login challenge error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Issues a fresh JWT access token using an unexpired refresh token
   * Route: POST /api/auth/refresh
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, error: 'Refresh token required' });
      }

      // Verify refresh token and generate renewed access token
      const tokens = await authService.refreshToken(refreshToken);
      return res.status(200).json({ success: true, ...tokens });
    } catch (err) {
      return res.status(401).json({ success: false, error: err.message });
    }
  }

  /**
   * Returns current authenticated user profile details from req.user
   * Route: GET /api/auth/me
   */
  async getCurrentUser(req, res) {
    // req.user is populated by verifyToken middleware
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        two_factor_enabled: !!req.user.two_factor_enabled
      }
    });
  }
}

module.exports = new AuthController();
