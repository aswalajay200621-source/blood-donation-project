const { query } = require('../db/db');
const schedulerService = require('../services/schedulerService');
const { recordAudit } = require('../middleware/auditMiddleware');

class SettingsController {
  // GET /api/settings
  async getSettings(req, res) {
    try {
      const result = await query('SELECT * FROM system_settings');
      const settingsMap = {};
      result.rows.forEach((r) => {
        settingsMap[r.key] = r.value;
      });
      return res.status(200).json({ success: true, settings: settingsMap, raw: result.rows });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // PUT /api/settings
  async updateSettings(req, res) {
    try {
      const updates = req.body;
      for (const [key, value] of Object.entries(updates)) {
        await query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
          [key, String(value)]
        );
      }

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      await recordAudit({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'SETTINGS_UPDATED',
        resourceType: 'SYSTEM_SETTINGS',
        ipAddress: ip,
        details: updates
      });

      return res.status(200).json({ success: true, message: 'Settings saved successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/settings/cron-status
  async getCronStatus(req, res) {
    try {
      const status = schedulerService.getStatus();
      return res.status(200).json({ success: true, ...status });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /api/settings/trigger-cron
  async triggerCron(req, res) {
    try {
      const result = await schedulerService.runEligibilityScan();
      return res.status(200).json({
        success: true,
        message: '3-Month eligibility scan completed.',
        result
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new SettingsController();
