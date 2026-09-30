/**
 * ============================================================================
 * File: backend/src/middleware/authMiddleware.js
 * Purpose: JWT Authentication & Role-Based Access Control Middleware
 * ----------------------------------------------------------------------------
 * Description:
 * Provides two Express middleware functions that protect all sensitive
 * API routes in the hospital system:
 *
 * 1. `verifyToken`  — Validates the JWT Bearer token on every protected request,
 *                     looks up the active user from the database, and populates
 *                     `req.user` for downstream controllers to consume.
 *
 * 2. `requireRole`  — Higher-order middleware that restricts route access
 *                     to only users matching specified role(s) (e.g. 'admin').
 *
 * Security Behaviors:
 * - Returns 401 if token is missing, expired, or cryptographically invalid.
 * - Returns 401 if the user account is inactive/deactivated in the database.
 * - Returns 403 if the user lacks the required role for a specific action.
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { query } = require('../db/db');

/**
 * JWT Token Verification Middleware
 * Reads the Authorization Bearer header, decodes and validates the JWT,
 * and attaches the authenticated staff user object to `req.user`.
 *
 * Usage: router.get('/protected', verifyToken, controller)
 */
async function verifyToken(req, res, next) {
  // Extract Authorization header from the incoming request
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token missing or invalid format.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  // Isolate the raw JWT token from "Bearer <token>"
  const token = authHeader.split(' ')[1];

  try {
    // Cryptographically verify the token signature and expiry
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
    
    // Fetch latest user record from database (catches deactivated accounts)
    const userRes = await query(
      'SELECT id, email, name, role, two_factor_enabled, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    // Block if user no longer exists or has been deactivated
    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or deactivated.',
        code: 'USER_INACTIVE'
      });
    }

    // Attach user record to request context for controllers to use
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
 * Role-Based Access Control Middleware Factory
 * Generates middleware that allows only users matching the specified roles.
 *
 * @param {Array<string>} allowedRoles - Roles permitted (e.g. ['admin'])
 * @returns Express middleware function
 *
 * Usage: router.delete('/donor/:id', verifyToken, requireRole(['admin']), controller)
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    // Ensure verifyToken has already populated req.user
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    // Check if the authenticated user has one of the permitted roles
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
