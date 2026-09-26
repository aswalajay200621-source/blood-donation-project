const validator = require('validator');
const { query } = require('../db/db');

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).substring(2, 11);
}

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MANDATORY_GAP_DAYS = 90; // 3 months mandatory gap for donor safety

class DonorService {
  /**
   * Validate 10-digit Phone Number (Strict: exact 10 digits, numeric only)
   */
  validatePhone(phone) {
    if (!phone) return { valid: false, error: 'Phone number is required' };
    const clean = String(phone).trim();
    if (!/^\d{10}$/.test(clean)) {
      return {
        valid: false,
        error: 'Phone number must be exactly 10 digits numeric only (e.g. 9876543210)'
      };
    }
    return { valid: true, sanitized: clean };
  }

  /**
   * Validate Email Address
   */
  validateEmail(email) {
    if (!email) return { valid: false, error: 'Email address is required' };
    const clean = String(email).trim().toLowerCase();
    if (!validator.isEmail(clean)) {
      return { valid: false, error: 'Invalid email address format (e.g. donor@example.com)' };
    }
    return { valid: true, sanitized: clean };
  }

  /**
   * Validate Blood Group
   */
  validateBloodGroup(bg) {
    if (!bg) return { valid: false, error: 'Blood group is required' };
    const clean = String(bg).trim().toUpperCase();
    if (!VALID_BLOOD_GROUPS.includes(clean)) {
      return {
        valid: false,
        error: `Invalid blood group. Allowed: ${VALID_BLOOD_GROUPS.join(', ')}`
      };
    }
    return { valid: true, sanitized: clean };
  }

  /**
   * Calculate Next Eligible Date (Last Donation Date + 90 Days / 3 Months)
   */
  calculateNextEligibleDate(lastDonationDateStr) {
    const lastDate = new Date(lastDonationDateStr);
    if (isNaN(lastDate.getTime())) {
      throw new Error('Invalid donation date');
    }
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + MANDATORY_GAP_DAYS);
    return nextDate.toISOString().split('T')[0];
  }

  /**
   * Compute Detailed Eligibility Status
   */
  computeEligibility(lastDonationDateStr, nextEligibleDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDate = new Date(nextEligibleDateStr || this.calculateNextEligibleDate(lastDonationDateStr));
    nextDate.setHours(0, 0, 0, 0);

    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        isEligible: true,
        daysRemaining: 0,
        statusText: 'Eligible to Donate',
        statusBadge: 'eligible',
        nextEligibleDate: nextDate.toISOString().split('T')[0]
      };
    } else if (diffDays <= 7) {
      return {
        isEligible: false,
        daysRemaining: diffDays,
        statusText: `Eligible in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
        statusBadge: 'due_soon',
        nextEligibleDate: nextDate.toISOString().split('T')[0]
      };
    } else {
      return {
        isEligible: false,
        daysRemaining: diffDays,
        statusText: `Not Eligible — ${diffDays} days remaining`,
        statusBadge: 'blocked',
        nextEligibleDate: nextDate.toISOString().split('T')[0]
      };
    }
  }

  /**
   * Lookup Donor by Phone or Email for Instant Auto-Suggest in Live Camp Mode
   */
  async findDuplicate(phone, email) {
    const cleanPhone = phone ? String(phone).trim() : null;
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;

    if (!cleanPhone && !cleanEmail) return null;

    let res;
    if (cleanPhone && cleanEmail) {
      res = await query('SELECT * FROM donors WHERE phone = $1 OR email = $2 LIMIT 1', [cleanPhone, cleanEmail]);
    } else if (cleanPhone) {
      res = await query('SELECT * FROM donors WHERE phone = $1 LIMIT 1', [cleanPhone]);
    } else {
      res = await query('SELECT * FROM donors WHERE email = $1 LIMIT 1', [cleanEmail]);
    }

    if (res.rows.length === 0) return null;

    const donor = res.rows[0];
    const eligibility = this.computeEligibility(donor.last_donation_date, donor.next_eligible_date);
    
    // Fetch last 5 donations history
    const historyRes = await query(
      'SELECT * FROM donation_history WHERE donor_id = $1 ORDER BY donation_date DESC LIMIT 5',
      [donor.id]
    );

    return {
      ...donor,
      eligibility,
      history: historyRes.rows
    };
  }

  /**
   * Register a Brand New Donor (Phase 2: Live Camp Entry)
   */
  async createDonor(data, staffUser) {
    // 1. Validate fields
    const phoneVal = this.validatePhone(data.phone);
    if (!phoneVal.valid) throw new Error(phoneVal.error);

    const emailVal = this.validateEmail(data.email);
    if (!emailVal.valid) throw new Error(emailVal.error);

    const bgVal = this.validateBloodGroup(data.blood_group);
    if (!bgVal.valid) throw new Error(bgVal.error);

    if (!data.full_name || data.full_name.trim().length < 2) {
      throw new Error('Full name is required (at least 2 characters)');
    }

    const lastDonationDate = data.last_donation_date || new Date().toISOString().split('T')[0];
    const nextEligibleDate = this.calculateNextEligibleDate(lastDonationDate);

    // 2. Check for duplicate phone or email
    const duplicate = await this.findDuplicate(phoneVal.sanitized, emailVal.sanitized);
    if (duplicate) {
      throw new Error(`A donor with this ${duplicate.phone === phoneVal.sanitized ? 'phone number' : 'email'} is already registered as "${duplicate.full_name}". Use the "Update Existing Donor" action.`);
    }

    const donorId = genId();
    const age = data.age ? parseInt(data.age, 10) : null;
    const gender = data.gender || 'Other';
    const address = data.address || '';
    const campLocation = data.camp_location || 'Hospital Blood Center';
    const sourceOfEntry = data.source_of_entry || 'Manual Entry';
    const staffName = staffUser ? staffUser.name : 'Camp Staff';
    const staffId = staffUser ? staffUser.id : null;

    await query(
      `INSERT INTO donors (
        id, full_name, phone, email, blood_group, gender, age, address,
        camp_location, last_donation_date, next_eligible_date, source_of_entry,
        entered_by_staff_id, entered_by_staff_name, total_donations_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1)`,
      [
        donorId, data.full_name.trim(), phoneVal.sanitized, emailVal.sanitized, bgVal.sanitized,
        gender, age, address, campLocation, lastDonationDate, nextEligibleDate, sourceOfEntry,
        staffId, staffName
      ]
    );

    // Insert history
    await query(
      `INSERT INTO donation_history (
        id, donor_id, donation_date, camp_location, units_donated, source,
        entered_by_staff_id, entered_by_staff_name, notes
      ) VALUES ($1, $2, $3, $4, 1.0, $5, $6, $7, $8)`,
      [
        genId(), donorId, lastDonationDate, campLocation, sourceOfEntry,
        staffId, staffName, data.notes || 'Initial registration donation'
      ]
    );

    return this.getDonorById(donorId);
  }

  /**
   * Record a New Donation for an Existing Donor (Health-Safety Check Enforced)
   */
  async recordNewDonation(donorId, data, staffUser) {
    const existingRes = await query('SELECT * FROM donors WHERE id = $1', [donorId]);
    if (existingRes.rows.length === 0) throw new Error('Donor record not found');

    const donor = existingRes.rows[0];
    const newDonationDate = data.donation_date || new Date().toISOString().split('T')[0];

    // Enforce 3-Month Safety Window
    const eligibility = this.computeEligibility(donor.last_donation_date, donor.next_eligible_date);
    
    // Check if new donation date is before next eligible date
    const newDateObj = new Date(newDonationDate);
    const nextEligibleObj = new Date(donor.next_eligible_date);

    if (newDateObj < nextEligibleObj) {
      throw new Error(
        `HEALTH SAFETY BLOCK: Donor "${donor.full_name}" donated on ${donor.last_donation_date}. Mandatory 3-month safety window is active until ${donor.next_eligible_date} (${eligibility.daysRemaining} days remaining). Donation cannot be accepted.`
      );
    }

    const newNextEligible = this.calculateNextEligibleDate(newDonationDate);
    const staffName = staffUser ? staffUser.name : 'Camp Staff';
    const staffId = staffUser ? staffUser.id : null;
    const campLocation = data.camp_location || donor.camp_location || 'Hospital Blood Center';

    // Update donor master record
    await query(
      `UPDATE donors SET
        last_donation_date = $1,
        next_eligible_date = $2,
        total_donations_count = total_donations_count + 1,
        camp_location = $3,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newDonationDate, newNextEligible, campLocation, donorId]
    );

    // Insert history entry
    await query(
      `INSERT INTO donation_history (
        id, donor_id, donation_date, camp_location, units_donated, source,
        entered_by_staff_id, entered_by_staff_name, notes
      ) VALUES ($1, $2, $3, $4, 1.0, 'Manual Entry', $5, $6, $7)`,
      [
        genId(), donorId, newDonationDate, campLocation,
        staffId, staffName, data.notes || 'Repeat donation at camp'
      ]
    );

    return this.getDonorById(donorId);
  }

  /**
   * Update Donor Demographics
   */
  async updateDonor(donorId, data) {
    const existing = await query('SELECT * FROM donors WHERE id = $1', [donorId]);
    if (existing.rows.length === 0) throw new Error('Donor not found');

    const phoneVal = data.phone ? this.validatePhone(data.phone) : null;
    if (phoneVal && !phoneVal.valid) throw new Error(phoneVal.error);

    const emailVal = data.email ? this.validateEmail(data.email) : null;
    if (emailVal && !emailVal.valid) throw new Error(emailVal.error);

    const bgVal = data.blood_group ? this.validateBloodGroup(data.blood_group) : null;
    if (bgVal && !bgVal.valid) throw new Error(bgVal.error);

    const current = existing.rows[0];
    const newPhone = phoneVal ? phoneVal.sanitized : current.phone;
    const newEmail = emailVal ? emailVal.sanitized : current.email;

    // Check unique conflict
    const conflict = await query(
      'SELECT id FROM donors WHERE (phone = $1 OR email = $2) AND id != $3',
      [newPhone, newEmail, donorId]
    );
    if (conflict.rows.length > 0) {
      throw new Error('Another donor already has this phone number or email.');
    }

    const newName = data.full_name ? data.full_name.trim() : current.full_name;
    const newBg = bgVal ? bgVal.sanitized : current.blood_group;
    const newGender = data.gender || current.gender;
    const newAge = data.age ? parseInt(data.age, 10) : current.age;
    const newAddress = data.address !== undefined ? data.address : current.address;

    await query(
      `UPDATE donors SET
        full_name = $1, phone = $2, email = $3, blood_group = $4,
        gender = $5, age = $6, address = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [newName, newPhone, newEmail, newBg, newGender, newAge, newAddress, donorId]
    );

    return this.getDonorById(donorId);
  }

  /**
   * Get Single Donor by ID
   */
  async getDonorById(donorId) {
    const res = await query('SELECT * FROM donors WHERE id = $1', [donorId]);
    if (res.rows.length === 0) return null;

    const donor = res.rows[0];
    const eligibility = this.computeEligibility(donor.last_donation_date, donor.next_eligible_date);
    const history = await query(
      'SELECT * FROM donation_history WHERE donor_id = $1 ORDER BY donation_date DESC',
      [donorId]
    );

    return {
      ...donor,
      eligibility,
      history: history.rows
    };
  }

  /**
   * Search & List Donors with Filters & Pagination
   */
  async listDonors({ search, bloodGroup, eligibilityStatus, page = 1, limit = 50 }) {
    let sql = 'SELECT * FROM donors WHERE 1=1';
    const params = [];
    let pIdx = 1;

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ` AND (full_name ILIKE $${pIdx} OR phone ILIKE $${pIdx} OR email ILIKE $${pIdx} OR camp_location ILIKE $${pIdx})`;
      params.push(q);
      pIdx++;
    }

    if (bloodGroup && bloodGroup !== 'ALL') {
      sql += ` AND blood_group = $${pIdx}`;
      params.push(bloodGroup.trim());
      pIdx++;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

    if (eligibilityStatus === 'eligible') {
      sql += ` AND next_eligible_date <= $${pIdx}`;
      params.push(todayStr);
      pIdx++;
    } else if (eligibilityStatus === 'blocked') {
      sql += ` AND next_eligible_date > $${pIdx}`;
      params.push(todayStr);
      pIdx++;
    } else if (eligibilityStatus === 'due_soon') {
      sql += ` AND next_eligible_date > $${pIdx} AND next_eligible_date <= $${pIdx + 1}`;
      params.push(todayStr, nextWeekStr);
      pIdx += 2;
    }

    sql += ' ORDER BY next_eligible_date ASC, created_at DESC';

    const res = await query(sql, params);
    
    // Augment with computed eligibility
    const enriched = res.rows.map((d) => ({
      ...d,
      eligibility: this.computeEligibility(d.last_donation_date, d.next_eligible_date)
    }));

    return {
      donors: enriched,
      totalCount: enriched.length
    };
  }

  /**
   * Dashboard Statistics
   */
  async getDashboardStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

    const allDonors = await query('SELECT * FROM donors');
    const donors = allDonors.rows;

    let totalDonors = donors.length;
    let eligibleNowCount = 0;
    let upcomingThisWeekCount = 0;
    let blockedCount = 0;
    const bloodGroupCounts = {
      'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
      'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
    };

    donors.forEach((d) => {
      const el = this.computeEligibility(d.last_donation_date, d.next_eligible_date);
      if (el.isEligible) {
        eligibleNowCount++;
      } else if (el.daysRemaining <= 7) {
        upcomingThisWeekCount++;
      } else {
        blockedCount++;
      }

      if (bloodGroupCounts[d.blood_group] !== undefined) {
        bloodGroupCounts[d.blood_group]++;
      }
    });

    // Recent Donations Feed
    const recentHistory = await query(
      `SELECT dh.*, d.full_name, d.blood_group, d.phone
       FROM donation_history dh
       JOIN donors d ON d.id = dh.donor_id
       ORDER BY dh.donation_date DESC, dh.created_at DESC
       LIMIT 8`
    );

    // Notification Stats
    const notifStats = await query(
      `SELECT status, COUNT(*) as count FROM notification_logs GROUP BY status`
    );

    return {
      totalDonors,
      eligibleNowCount,
      upcomingThisWeekCount,
      blockedCount,
      bloodGroupCounts,
      recentDonations: recentHistory.rows,
      notificationStats: notifStats.rows
    };
  }
}

module.exports = new DonorService();
