/**
 * ============================================================================
 * File: backend/src/middleware/auditMiddleware.js
 * Purpose: Security Audit Logging — Action Trail & Compliance Record Keeper
 * ----------------------------------------------------------------------------
 * Description:
 * Provides two functions for recording immutable clinical audit events:
 *
 * 1. `recordAudit(options)` — Directly inserts a structured audit event into
 *    the `audit_logs` database table. Can be called from any controller when a
 *    significant action (login, donor create, data delete) occurs.
 *
 * 2. `auditMiddleware(action, resourceType)` — Express middleware factory that
 *    automatically records an audit event after every successful (non-4xx/5xx)
 *    API response completes. Attaches to route definitions.
 *
 * Audit Events Capture:
 * - Who performed the action (userId, email)
 * - What action was performed (e.g. 'DONOR_CREATED', 'SETTINGS_UPDATED')
 * - What resource was affected (resourceType, resourceId)
 * - When and from where (timestamp, IP address, User-Agent browser string)
 * - Details context (query parameters and request body field names)
 * ============================================================================
 */

const { query } = require('../db/db');

/**
 * Generate a unique ID for each audit record.
 * Uses native crypto.randomUUID if available, otherwise falls back to random string.
 */
function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id_' + Math.random().toString(36).substring(2, 11);
}

/**
 * Directly records an audit event to the audit_logs table.
 * Used explicitly in controllers when tracking sensitive operations.
 *
 * @param {Object} options
 * @param {string}  options.userId       - Staff user ID (null for anonymous)
 * @param {string}  options.userEmail    - Staff email address
 * @param {string}  options.action       - Action label (e.g. 'LOGIN_SUCCESS', 'DONOR_CREATED')
 * @param {string}  options.resourceType - Resource type (e.g. 'DONOR', 'SETTINGS')
 * @param {string}  options.resourceId   - ID of the affected record
 * @param {string}  options.ipAddress    - Originating IP address
 * @param {string}  options.userAgent    - Browser/client user agent string
 * @param {Object}  options.details      - Additional structured context data
 */
async function recordAudit({
  userId = null,
  userEmail = 'anonymous',
  action,
  resourceType = 'GENERAL',
  resourceId = null,
  ipAddress = 'unknown',
  userAgent = 'unknown',
  details = {}
}) {
  try {
    const id = genId();
    // Serialize details object to JSON string for storage
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    
    // Insert audit record — parameterized to prevent SQL injection
    await query(
      `INSERT INTO audit_logs (id, user_id, user_email, action, resource_type, resource_id, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, userId, userEmail, action, resourceType, resourceId, ipAddress, userAgent, detailsStr]
    );
  } catch (err) {
    // Audit failures must not interrupt the main request flow
    console.error('Audit logging error:', err.message);
  }
}

/**
 * Express Middleware Factory for Automatic Audit Trail Recording
 * Hooks into the response `finish` event to record successful API calls.
 *
 * @param {string} action       - Action label for this route (e.g. 'DONOR_LIST_VIEWED')
 * @param {string} resourceType - Resource category affected (e.g. 'DONOR', 'EXCEL_IMPORT')
 * @returns Express middleware function
 *
 * Usage: router.get('/', verifyToken, auditMiddleware('DONOR_LIST_VIEWED', 'DONOR'), controller)
 */
function auditMiddleware(action, resourceType) {
  return (req, res, next) => {
    // Intercept the response finish event (fires after response headers are sent)
    res.on('finish', () => {
      // Only record audit for successful responses (exclude 4xx/5xx errors)
      if (res.statusCode < 400) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const ua = req.headers['user-agent'] || 'unknown';
        recordAudit({
          userId: req.user ? req.user.id : null,
          userEmail: req.user ? req.user.email : 'anonymous',
          action: action || `${req.method}_${req.baseUrl}`,
          resourceType: resourceType || 'API',
          resourceId: req.params.id || null,
          ipAddress: ip,
          userAgent: ua,
          details: {
            query: req.query,
            bodyKeys: Object.keys(req.body || {}) // Log field names, never values
          }
        });
      }
    });
    next();
  };
}

module.exports = {
  recordAudit,
  auditMiddleware
};
