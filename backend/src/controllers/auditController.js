/**
 * ============================================================================
 * File: backend/src/controllers/auditController.js
 * Purpose: Controller for Querying Security & System Audit Trail Records
 * ----------------------------------------------------------------------------
 * Description:
 * Exposes endpoints for administrative review of hospital audit logs.
 * Audit logs record user actions, logins, donor modifications, Excel migrations,
 * configuration updates, and security events with IP and timestamp metadata.
 *
 * Endpoints Managed:
 * - GET /api/audit/logs : Retrieve recent audit events with optional filtering
 * ============================================================================
 */

const { query } = require('../db/db');

class AuditController {
  /**
   * Retrieves security audit logs from the database
   * Route: GET /api/audit/logs
   * Query Parameters:
   *  - action: Optional filter by action type (e.g. 'LOGIN_SUCCESS', 'DONOR_CREATED')
   *  - limit: Maximum number of rows to return (default: 100)
   */
  async getAuditLogs(req, res) {
    try {
      const { action, limit = 100 } = req.query;
      
      // Base parameterized query
      let sql = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];

      // Apply action filter if specified and not 'ALL'
      if (action && action !== 'ALL') {
        sql += ' AND action = $1';
        params.push(action);
      }

      // Order newest first and enforce row limits
      sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
      params.push(parseInt(limit, 10));

      // Execute query against database
      const result = await query(sql, params);
      
      // Return log array to client
      return res.status(200).json({ success: true, logs: result.rows });
    } catch (err) {
      console.error('Failed to fetch audit logs:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new AuditController();
