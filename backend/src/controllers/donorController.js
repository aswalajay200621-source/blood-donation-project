const donorService = require('../services/donorService');
const notificationService = require('../services/notificationService');
const { recordAudit } = require('../middleware/auditMiddleware');

class DonorController {
  // GET /api/donors
  async listDonors(req, res) {
    try {
      const { search, bloodGroup, eligibilityStatus, page, limit } = req.query;
      const result = await donorService.listDonors({
        search,
        bloodGroup,
        eligibilityStatus,
        page: parseInt(page || '1', 10),
        limit: parseInt(limit || '50', 10)
      });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/donors/:id
  async getDonor(req, res) {
    try {
      const donor = await donorService.getDonorById(req.params.id);
      if (!donor) {
        return res.status(404).json({ success: false, error: 'Donor not found' });
      }
      return res.status(200).json({ success: true, donor });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/donors/check-duplicate
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
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /api/donors (Phase 2: Live Camp Entry - New Donor)
  async createDonor(req, res) {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const newDonor = await donorService.createDonor(req.body, req.user);

      await recordAudit({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'DONOR_CREATED',
        resourceType: 'DONOR',
        resourceId: newDonor.id,
        ipAddress: ip,
        details: { fullName: newDonor.full_name, bloodGroup: newDonor.blood_group, phone: newDonor.phone }
      });

      // Optionally dispatch thank-you notification
      notificationService.sendDonationThankYou(newDonor, req.body.camp_location, newDonor.last_donation_date).catch(() => {});

      return res.status(201).json({
        success: true,
        message: `Donor ${newDonor.full_name} registered successfully.`,
        donor: newDonor
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // POST /api/donors/:id/donate (Record new donation for existing donor)
  async recordNewDonation(req, res) {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const updatedDonor = await donorService.recordNewDonation(req.params.id, req.body, req.user);

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

      // Dispatch thank-you
      notificationService.sendDonationThankYou(updatedDonor, req.body.camp_location, updatedDonor.last_donation_date).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `New donation recorded for ${updatedDonor.full_name}. Next eligibility date set to ${updatedDonor.next_eligible_date}.`,
        donor: updatedDonor
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // PUT /api/donors/:id
  async updateDonor(req, res) {
    try {
      const updatedDonor = await donorService.updateDonor(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Donor information updated successfully.',
        donor: updatedDonor
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // POST /api/donors/:id/send-reminder
  async sendReminder(req, res) {
    try {
      const donor = await donorService.getDonorById(req.params.id);
      if (!donor) {
        return res.status(404).json({ success: false, error: 'Donor not found' });
      }

      const results = await notificationService.send3MonthEligibilityReminder(donor);
      return res.status(200).json({
        success: true,
        message: `Eligibility reminder processed for ${donor.full_name}.`,
        results
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/donors/export/csv
  async exportDonorsCSV(req, res) {
    try {
      const { bloodGroup, eligibilityStatus } = req.query;
      const { donors } = await donorService.listDonors({ bloodGroup, eligibilityStatus, limit: 5000 });

      const headers = ['Full Name', 'Phone', 'Email', 'Blood Group', 'Gender', 'Age', 'Last Donation Date', 'Next Eligible Date', 'Status', 'Days Remaining', 'Total Donations', 'Camp Location'];
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

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="blood_donors_export_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.status(200).send(csvContent);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new DonorController();
