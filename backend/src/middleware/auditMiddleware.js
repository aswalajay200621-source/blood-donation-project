const { query } = require('../db/db');

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).substring(2, 11);
}

/**
 * Log audit events for system changes, logins, and data modifications
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
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    
    await query(
      `INSERT INTO audit_logs (id, user_id, user_email, action, resource_type, resource_id, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, userId, userEmail, action, resourceType, resourceId, ipAddress, userAgent, detailsStr]
    );
  } catch (err) {
    console.error('Audit logging error:', err.message);
  }
}

function auditMiddleware(action, resourceType) {
  return (req, res, next) => {
    // Intercept response finish
    res.on('finish', () => {
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
          details: { query: req.query, bodyKeys: Object.keys(req.body || {}) }
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
