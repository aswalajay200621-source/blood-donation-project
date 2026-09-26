const donorService = require('../services/donorService');

class DashboardController {
  // GET /api/dashboard/stats
  async getStats(req, res) {
    try {
      const stats = await donorService.getDashboardStats();
      return res.status(200).json({ success: true, stats });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new DashboardController();
