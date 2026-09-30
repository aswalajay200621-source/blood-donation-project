/**
 * ============================================================================
 * File: backend/src/controllers/notificationController.js
 * Purpose: Controller for Notification Logs & Live Dispatch Testing Endpoints
 * ----------------------------------------------------------------------------
 * Description:
 * Exposes endpoints for monitoring donor communication activity across WhatsApp
 * and Email channels. Supports fetching historical delivery logs with status
 * filters, and sending single test reminders to verified phone numbers or email
 * addresses for clinical diagnostics.
 *
 * Endpoints Managed:
 * - GET  /api/notifications/logs          : Retrieve paginated reminder delivery logs
 * - POST /api/notifications/test-email    : Trigger a test eligibility email
 * - POST /api/notifications/test-whatsapp : Trigger a test eligibility WhatsApp message
 * ============================================================================
 */

const notificationService = require('../services/notificationService');

class NotificationController {
  /**
   * Retrieves paginated notification delivery logs
   * Route: GET /api/notifications/logs
   * Query Parameters:
   *  - channel: 'WHATSAPP' | 'EMAIL' | undefined
   *  - status: 'SENT' | 'FAILED' | 'PENDING' | undefined
   *  - page: Page number (default: 1)
   *  - limit: Items per page (default: 50)
   */
  async getLogs(req, res) {
    try {
      const { channel, status, bloodGroup, page, limit } = req.query;
      
      // Query delivery logs via notification service
      const logs = await notificationService.getNotificationLogs({
        channel,
        status,
        bloodGroup,
        page: parseInt(page || '1', 10),
        limit: parseInt(limit || '50', 10)
      });
      return res.status(200).json({ success: true, logs });
    } catch (err) {
      console.error('Error fetching notification logs:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Sends a test eligibility notification via Email to verify SMTP configuration
   * Route: POST /api/notifications/test-email
   */
  async testEmail(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, error: 'Target email is required' });

      // Construct a mock donor profile for test message rendering
      const testDonor = {
        id: 'test-preview',
        full_name: 'Test Recipient',
        phone: '9999999999',
        email,
        blood_group: 'O+',
        last_donation_date: '2026-05-01',
        next_eligible_date: '2026-08-01'
      };

      // Dispatch test reminder
      const result = await notificationService.send3MonthEligibilityReminder(testDonor);
      return res.status(200).json({
        success: true,
        message: 'Email test dispatch executed.',
        result
      });
    } catch (err) {
      console.error('Test email error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Sends a test eligibility notification via WhatsApp to verify Meta Cloud / Twilio API
   * Route: POST /api/notifications/test-whatsapp
   */
  async testWhatsApp(req, res) {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, error: 'Target phone number is required' });

      // Construct a mock donor profile for WhatsApp template rendering
      const testDonor = {
        id: 'test-preview',
        full_name: 'Test Recipient',
        phone,
        email: 'test@example.com',
        blood_group: 'A+',
        last_donation_date: '2026-05-01',
        next_eligible_date: '2026-08-01'
      };

      // Dispatch test reminder
      const result = await notificationService.send3MonthEligibilityReminder(testDonor);
      return res.status(200).json({
        success: true,
        message: 'WhatsApp test dispatch executed.',
        result
      });
    } catch (err) {
      console.error('Test WhatsApp error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Sends WhatsApp eligibility reminders to currently eligible donors (optionally targeted by blood group)
   * Route: POST /api/notifications/bulk-whatsapp
   */
  async bulkWhatsApp(req, res) {
    try {
      const bloodGroup = req.body?.bloodGroup || req.query?.bloodGroup || null;
      const summary = await notificationService.sendBulkWhatsApp(bloodGroup);
      const bgLabel = bloodGroup && bloodGroup !== 'ALL' ? ` for ${bloodGroup} donors` : '';
      return res.status(200).json({
        success: true,
        message: `Bulk WhatsApp dispatch complete${bgLabel}: ${summary.sent} sent, ${summary.failed} failed, ${summary.skipped} skipped out of ${summary.total} eligible.`,
        summary
      });
    } catch (err) {
      console.error('Bulk WhatsApp error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Sends Email eligibility reminders to currently eligible donors (optionally targeted by blood group)
   * Route: POST /api/notifications/bulk-email
   */
  async bulkEmail(req, res) {
    try {
      const bloodGroup = req.body?.bloodGroup || req.query?.bloodGroup || null;
      const summary = await notificationService.sendBulkEmail(bloodGroup);
      const bgLabel = bloodGroup && bloodGroup !== 'ALL' ? ` for ${bloodGroup} donors` : '';
      return res.status(200).json({
        success: true,
        message: `Bulk email dispatch complete${bgLabel}: ${summary.sent} sent, ${summary.failed} failed, ${summary.skipped} skipped out of ${summary.total} eligible.`,
        summary
      });
    } catch (err) {
      console.error('Bulk email error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new NotificationController();
