const authService = require('../services/authService');
const { query } = require('../db/db');

class AuthController {
  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const ua = req.headers['user-agent'] || 'unknown';

      const result = await authService.login(email, password, ip, ua);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // GET /api/auth/2fa-setup
  async get2FASetup(req, res) {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }
      const setupData = await authService.generate2FAEnrollment(userId);
      return res.status(200).json({ success: true, ...setupData });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // POST /api/auth/verify-2fa-setup
  async verify2FASetup(req, res) {
    try {
      const { userId, token } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const ua = req.headers['user-agent'] || 'unknown';

      const tokens = await authService.verifyAndEnable2FA(userId, token, ip, ua);
      return res.status(200).json({
        success: true,
        message: 'Two-Factor Authentication enrolled and enabled successfully.',
        ...tokens
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // POST /api/auth/verify-2fa-login
  async verify2FALogin(req, res) {
    try {
      const { temp2FAToken, totpCode } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const ua = req.headers['user-agent'] || 'unknown';

      const tokens = await authService.verify2FALogin(temp2FAToken, totpCode, ip, ua);
      return res.status(200).json({ success: true, ...tokens });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // POST /api/auth/refresh
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, error: 'Refresh token required' });
      }
      const tokens = await authService.refreshToken(refreshToken);
      return res.status(200).json({ success: true, ...tokens });
    } catch (err) {
      return res.status(401).json({ success: false, error: err.message });
    }
  }

  // GET /api/auth/me
  async getCurrentUser(req, res) {
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
