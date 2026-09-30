/**
 * ============================================================================
 * File: backend/src/controllers/donorController.js
 * Purpose: Donor Management, Live Camp Registration & Eligibility Controller
 * ----------------------------------------------------------------------------
 * Description:
 * Core controller managing donor lifecycle, live mobile blood camp intake,
 * automated 3-month eligibility calculations, duplicate detection, and CSV
 * report generation.
 *
 * Endpoints Managed:
 * - GET  /api/donors                 : Search, filter by blood group/status & paginate
 * - GET  /api/donors/:id             : Fetch detailed donor profile & donation history
 * - GET  /api/donors/check-duplicate : Look up donor by phone or email in real-time
 * - POST /api/donors                 : Register new donor (Phase 2: Live Camp Entry)
 * - POST /api/donors/:id/donate      : Record subsequent donation for existing donor
 * - PUT  /api/donors/:id             : Update donor contact info / demographic details
 * - POST /api/donors/:id/send-reminder : Manually dispatch 3-month eligibility reminder
 * - GET  /api/donors/export/csv      : Export filtered donor directory as CSV file
 * ============================================================================
 */

const donorService = require('../services/donorService');
const notificationService = require('../services/notificationService');
const { recordAudit } = require('../middleware/auditMiddleware');

class DonorController {
  /**
   * Retrieves a paginated list of donors with optional search and filter criteria
   * Route: GET /api/donors
   * Query Parameters:
   *  - search: Text query matching full_name, phone, or email
   *  - bloodGroup: 'A+', 'O-', etc.
   *  - eligibilityStatus: 'ELIGIBLE' | 'WAITING'
   *  - page: Page number (default: 1)
   *  - limit: Donors per page (default: 50)
   */
  async listDonors(req, res) {
    try {
      const { search, bloodGroup, eligibilityStatus, page, limit } = req.query;
      
      // Query donors using service
      const result = await donorService.listDonors({
        search,
        bloodGroup,
        eligibilityStatus,
        page: parseInt(page || '1', 10),
        limit: parseInt(limit || '50', 10)
      });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      console.error('List donors error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Fetches full profile and historical donations for a single donor
   * Route: GET /api/donors/:id
   */
  async getDonor(req, res) {
    try {
      const donor = await donorService.getDonorById(req.params.id);
      if (!donor) {
        return res.status(404).json({ success: false, error: 'Donor not found' });
      }
      return res.status(200).json({ success: true, donor });
    } catch (err) {
      console.error('Get donor error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Performs real-time duplicate checking by phone or email during camp registration
   * Route: GET /api/donors/check-duplicate?phone=...&email=...
   */
  async checkDuplicate(req, res) {
    try {
      const { phone, email } = req.query;
      const match = await donorService.findDuplicate(phone, email);
      return res.status(200).json({
        success: true,
        exists: !!match,
        donor: match
      });
    } catch (err) {
      console.error('Check duplicate error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Registers a brand-new donor during live camp intake (Phase 2)
   * Route: POST /api/donors
   */
  async createDonor(req, res) {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      
      // Register donor and compute 3-month next eligible date
      const newDonor = await donorService.createDonor(req.body, req.user);

      // Record administrative audit trail entry
      await recordAudit({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'DONOR_CREATED',
        resourceType: 'DONOR',
        resourceId: newDonor.id,
        ipAddress: ip,
        details: { fullName: newDonor.full_name, bloodGroup: newDonor.blood_group, phone: newDonor.phone }
      });

      // Fire-and-forget thank you notification (WhatsApp/Email)
      notificationService.sendDonationThankYou(newDonor, req.body.camp_location, newDonor.last_donation_date).catch(() => {});

      return res.status(201).json({
        success: true,
        message: `Donor ${newDonor.full_name} registered successfully.`,
        donor: newDonor
      });
    } catch (err) {
      console.error('Create donor error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Records a new donation for an already registered donor
   * Updates last donation date, computes new 3-month next eligible date, and adds to history
   * Route: POST /api/donors/:id/donate
   */
  async recordNewDonation(req, res) {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      
      // Record new donation event and recalculate eligibility window
      const updatedDonor = await donorService.recordNewDonation(req.params.id, req.body, req.user);

      // Audit log the donation entry
      await recordAudit({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'DONATION_RECORDED',
        resourceType: 'DONOR',
        resourceId: updatedDonor.id,
        ipAddress: ip,
        details: {
          fullName: updatedDonor.full_name,
          donationDate: req.body.donation_date,
          totalCount: updatedDonor.total_donations_count
        }
      });

      // Dispatch automated thank-you receipt
      notificationService.sendDonationThankYou(updatedDonor, req.body.camp_location, updatedDonor.last_donation_date).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `New donation recorded for ${updatedDonor.full_name}. Next eligibility date set to ${updatedDonor.next_eligible_date}.`,
        donor: updatedDonor
      });
    } catch (err) {
      console.error('Record donation error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Updates demographic or contact information of an existing donor
   * Route: PUT /api/donors/:id
   */
  async updateDonor(req, res) {
    try {
      const updatedDonor = await donorService.updateDonor(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Donor information updated successfully.',
        donor: updatedDonor
      });
    } catch (err) {
      console.error('Update donor error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Dispatches an on-demand eligibility recall notification to a specific donor
   * Route: POST /api/donors/:id/send-reminder
   */
  async sendReminder(req, res) {
    try {
      const donor = await donorService.getDonorById(req.params.id);
      if (!donor) {
        return res.status(404).json({ success: false, error: 'Donor not found' });
      }

      // Dispatch reminder across active communication channels
      const results = await notificationService.send3MonthEligibilityReminder(donor);
      return res.status(200).json({
        success: true,
        message: `Eligibility reminder processed for ${donor.full_name}.`,
        results
      });
    } catch (err) {
      console.error('Send reminder error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Streams a formatted CSV export of the active donor registry to the client
   * Route: GET /api/donors/export/csv
   */
  async exportDonorsCSV(req, res) {
    try {
      const { bloodGroup, eligibilityStatus } = req.query;
      const { donors } = await donorService.listDonors({ bloodGroup, eligibilityStatus, limit: 5000 });

      // CSV column headers
      const headers = ['Full Name', 'Phone', 'Email', 'Blood Group', 'Gender', 'Age', 'Last Donation Date', 'Next Eligible Date', 'Status', 'Days Remaining', 'Total Donations', 'Camp Location'];
      
      // Transform donor records to CSV rows (escaping quotes)
      const rows = donors.map((d) => [
        `"${d.full_name.replace(/"/g, '""')}"`,
        `"${d.phone}"`,
        `"${d.email}"`,
        `"${d.blood_group}"`,
        `"${d.gender || ''}"`,
        `"${d.age || ''}"`,
        `"${d.last_donation_date}"`,
        `"${d.next_eligible_date}"`,
        `"${d.eligibility.statusText}"`,
        `"${d.eligibility.daysRemaining}"`,
        `"${d.total_donations_count}"`,
        `"${(d.camp_location || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      // Set download headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="blood_donors_export_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.status(200).send(csvContent);
    } catch (err) {
      console.error('Export CSV error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new DonorController();
