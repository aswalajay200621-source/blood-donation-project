/**
 * ============================================================================
 * File: backend/src/controllers/settingsController.js
 * Purpose: Controller for Hospital System Settings & Manual Cron Triggers
 * ----------------------------------------------------------------------------
 * Description:
 * Exposes administration endpoints to configure application preferences
 * (hospital name, notification templates, interval policies, default channels)
 * and check or manually trigger the daily 3-month eligibility recall scheduler.
 *
 * Endpoints Managed:
 * - GET  /api/settings              : Fetch current system configuration map
 * - PUT  /api/settings              : Update configuration keys with audit logging
 * - GET  /api/settings/cron-status  : Get automated background scheduler state
 * - POST /api/settings/trigger-cron : Manually execute the 3-month eligibility job
 * ============================================================================
 */

const { query } = require('../db/db');
const schedulerService = require('../services/schedulerService');
const { recordAudit } = require('../middleware/auditMiddleware');

class SettingsController {
  /**
   * Fetches all hospital configuration key-value pairs
   * Route: GET /api/settings
   */
  async getSettings(req, res) {
    try {
      // Query system_settings table
      const result = await query('SELECT * FROM system_settings');
      
      // Transform rows into a convenient key-value map for the client
      const settingsMap = {};
      result.rows.forEach((r) => {
        settingsMap[r.key] = r.value;
      });

      return res.status(200).json({ success: true, settings: settingsMap, raw: result.rows });
    } catch (err) {
      console.error('Failed to get settings:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Updates or inserts system settings keys (upsert operation)
   * Route: PUT /api/settings
   */
  async updateSettings(req, res) {
    try {
      const updates = req.body;
      
      // Upsert each provided key into the system_settings table
      for (const [key, value] of Object.entries(updates)) {
        await query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
          [key, String(value)]
        );
      }

      // Record administrative audit trail entry
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
      console.error('Failed to update settings:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Returns current running status and last run execution time of background cron
   * Route: GET /api/settings/cron-status
   */
  async getCronStatus(req, res) {
    try {
      const status = schedulerService.getStatus();
      return res.status(200).json({ success: true, ...status });
    } catch (err) {
      console.error('Failed to fetch cron status:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Manually triggers the 3-month donor eligibility scan on-demand
   * Route: POST /api/settings/trigger-cron
   */
  async triggerCron(req, res) {
    try {
      // Execute the eligibility scan immediately
      const result = await schedulerService.runEligibilityScan();
      return res.status(200).json({
        success: true,
        message: '3-Month eligibility scan completed.',
        result
      });
    } catch (err) {
      console.error('Manual cron trigger failed:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new SettingsController();
