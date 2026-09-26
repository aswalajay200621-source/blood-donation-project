const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { query } = require('../db/db');

/**
 * Verify Access Token Middleware
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token missing or invalid format.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
    
    // Fetch fresh user record
    const userRes = await query(
      'SELECT id, email, name, role, two_factor_enabled, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or deactivated.',
        code: 'USER_INACTIVE'
      });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Access token expired. Please refresh token.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid or forged authentication token.',
      code: 'TOKEN_INVALID'
    });
  }
}

/**
 * Role-Based Access Control Middleware
 * @param {Array<string>} allowedRoles 
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden. This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};
