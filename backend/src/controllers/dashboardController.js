/**
 * ============================================================================
 * File: backend/src/controllers/dashboardController.js
 * Purpose: Controller for Dashboard Metrics, Blood Stock & Eligibility Summaries
 * ----------------------------------------------------------------------------
 * Description:
 * Exposes statistical aggregation endpoints consumed by the Dashboard UI view.
 * Computes blood unit distributions across ABO/Rh groups, donor registry counts,
 * today's eligible donors count, and monthly intake analytics.
 *
 * Endpoints Managed:
 * - GET /api/dashboard/stats : Aggregate clinical summary statistics
 * ============================================================================
 */

const donorService = require('../services/donorService');

class DashboardController {
  /**
   * Fetches high-level blood bank and donor metrics for dashboard display
   * Route: GET /api/dashboard/stats
   * 
   * Returns:
   * - Total donors registered
   * - Donors eligible today (after 3-month window)
   * - Total historical donations recorded
   * - Units collected breakdown by blood group
   * - Recent donation logs
   */
  async getStats(req, res) {
    try {
      // Delegate statistical calculation to donorService
      const stats = await donorService.getDashboardStats();
      
      // Respond with 200 OK and computed metrics
      return res.status(200).json({ success: true, stats });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new DashboardController();
