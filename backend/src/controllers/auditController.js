const { query } = require('../db/db');

class AuditController {
  // GET /api/audit/logs
  async getAuditLogs(req, res) {
    try {
      const { action, limit = 100 } = req.query;
      let sql = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];

      if (action && action !== 'ALL') {
        sql += ' AND action = $1';
        params.push(action);
      }

      sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
      params.push(parseInt(limit, 10));

      const result = await query(sql, params);
      return res.status(200).json({ success: true, logs: result.rows });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new AuditController();
