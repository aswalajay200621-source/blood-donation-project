const notificationService = require('../services/notificationService');

class NotificationController {
  // GET /api/notifications/logs
  async getLogs(req, res) {
    try {
      const { channel, status, page, limit } = req.query;
      const logs = await notificationService.getNotificationLogs({
        channel,
        status,
        page: parseInt(page || '1', 10),
        limit: parseInt(limit || '50', 10)
      });
      return res.status(200).json({ success: true, logs });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /api/notifications/test-email
  async testEmail(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, error: 'Target email is required' });

      const testDonor = {
        id: 'test-preview',
        full_name: 'Test Recipient',
        phone: '9999999999',
        email,
        blood_group: 'O+',
        last_donation_date: '2026-05-01',
        next_eligible_date: '2026-08-01'
      };

      const result = await notificationService.send3MonthEligibilityReminder(testDonor);
      return res.status(200).json({
        success: true,
        message: 'Email test dispatch executed.',
        result
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /api/notifications/test-whatsapp
  async testWhatsApp(req, res) {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, error: 'Target phone number is required' });

      const testDonor = {
        id: 'test-preview',
        full_name: 'Test Recipient',
        phone,
        email: 'test@example.com',
        blood_group: 'A+',
        last_donation_date: '2026-05-01',
        next_eligible_date: '2026-08-01'
      };

      const result = await notificationService.send3MonthEligibilityReminder(testDonor);
      return res.status(200).json({
        success: true,
        message: 'WhatsApp test dispatch executed.',
        result
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new NotificationController();
