/**
 * ============================================================================
 * File: backend/src/services/donorService.js
 * Purpose: Donor Domain Business Logic, Clinical Safety Rules & Registry Service
 * ----------------------------------------------------------------------------
 * Description:
 * Implements the core clinical and data integrity rules for the blood bank:
 *
 * Core Responsibilities & Business Rules:
 * 1. Clinical Safety Rule (Mandatory 90-Day / 3-Month Window):
 *    - Male/Female whole blood donors must wait at least 90 calendar days between donations.
 *    - Automatically calculates `next_eligible_date = last_donation_date + 90 days`.
 *    - Blocks any repeat donation attempted before `next_eligible_date` has arrived.
 * 2. Data Validation & Formatting:
 *    - Phone numbers must be exactly 10 digits (numeric only).
 *    - Blood groups are restricted to standard ABO/Rh types (A+, A-, B+, B-, AB+, AB-, O+, O-).
 *    - Automated email fallback generates `<phone>@donor.apexhospital.org` if blank.
 * 3. Real-Time Duplicate Prevention:
 *    - Checks phone and email uniqueness across the master registry.
 * 4. Multi-Criteria Search & Filtering:
 *    - Supports searching by name, phone, email, blood type, and eligibility status.
 * 5. Dashboard Aggregations:
 *    - Computes real-time blood stock counts, eligible donor counts, and recent activity logs.
 * ============================================================================
 */

const validator = require('validator');
const { query } = require('../db/db');

/**
 * Generates unique UUID-style identifier strings
 */
function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id_' + Math.random().toString(36).substring(2, 11);
}

// Approved ABO/Rh blood groups recognized by clinical laboratory systems
const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Mandatory clinical waiting gap between whole blood donations (90 calendar days = 3 months)
const MANDATORY_GAP_DAYS = 90;

class DonorService {
  /**
   * Validates that a phone number contains exactly 10 numeric digits
   *
   * @param {string} phone - Raw input phone number
   * @returns {{ valid: boolean, sanitized?: string, error?: string }}
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
   * Validates email format; if omitted, generates automated clinical fallback address
   *
   * @param {string} email         - User input email address
   * @param {string} fallbackPhone - Validated 10-digit phone for fallback domain generation
   * @returns {{ valid: boolean, sanitized?: string, error?: string }}
   */
  validateEmail(email, fallbackPhone = '') {
    // If no email provided, create hospital synthetic email fallback
    if (!email || !String(email).trim()) {
      if (fallbackPhone) {
        return { valid: true, sanitized: `${fallbackPhone}@donor.apexhospital.org` };
      }
      return { valid: false, error: 'Email address is required' };
    }
    const clean = String(email).trim().toLowerCase();
    if (!validator.isEmail(clean)) {
      return { valid: false, error: 'Invalid email address format (e.g. donor@example.com)' };
    }
    return { valid: true, sanitized: clean };
  }

  /**
   * Validates blood group against approved ABO/Rh types
   *
   * @param {string} bg - Blood group string
   * @returns {{ valid: boolean, sanitized?: string, error?: string }}
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
   * Computes next eligible donation date by adding 90 calendar days to last donation date
   *
   * @param {string} lastDonationDateStr - 'YYYY-MM-DD' formatted date string
   * @returns {string} 'YYYY-MM-DD' formatted date string
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
   * Computes real-time clinical eligibility status relative to today's date
   *
   * @param {string} lastDonationDateStr - 'YYYY-MM-DD'
   * @param {string} nextEligibleDateStr - 'YYYY-MM-DD'
   * @returns {{ isEligible: boolean, daysRemaining: number, statusText: string, statusBadge: string, nextEligibleDate: string }}
   */
  computeEligibility(lastDonationDateStr, nextEligibleDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDate = new Date(nextEligibleDateStr || this.calculateNextEligibleDate(lastDonationDateStr));
    nextDate.setHours(0, 0, 0, 0);

    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      // 90 days have elapsed -> donor is currently eligible
      return {
        isEligible: true,
        daysRemaining: 0,
        statusText: 'Eligible to Donate',
        statusBadge: 'eligible',
        nextEligibleDate: nextDate.toISOString().split('T')[0]
      };
    } else if (diffDays <= 7) {
      // Within 7 days of eligibility -> upcoming reminder window
      return {
        isEligible: false,
        daysRemaining: diffDays,
        statusText: `Eligible in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
        statusBadge: 'due_soon',
        nextEligibleDate: nextDate.toISOString().split('T')[0]
      };
    } else {
      // Under active mandatory waiting window -> donation strictly blocked
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
   * Searches for duplicate donor records by phone number or email address
   *
   * @param {string} phone - 10-digit phone
   * @param {string} email - Donor email address
   * @returns {Promise<Object|null>} Donor record with eligibility metadata or null
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
    
    // Fetch last 5 historical donations
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
   * Registers a brand-new donor during live blood donation camp intake
   *
   * @param {Object} data      - Donor registration payload
   * @param {Object} staffUser - Currently logged-in staff member context
   * @returns {Promise<Object>} Created donor record
   */
  async createDonor(data, staffUser) {
    // Step 1: Validate clinical inputs
    const phoneVal = this.validatePhone(data.phone);
    if (!phoneVal.valid) throw new Error(phoneVal.error);

    const emailVal = this.validateEmail(data.email, phoneVal.sanitized);
    if (!emailVal.valid) throw new Error(emailVal.error);

    const bgVal = this.validateBloodGroup(data.blood_group);
    if (!bgVal.valid) throw new Error(bgVal.error);

    if (!data.full_name || data.full_name.trim().length < 2) {
      throw new Error('Full name is required (at least 2 characters)');
    }

    const lastDonationDate = data.last_donation_date || new Date().toISOString().split('T')[0];
    const nextEligibleDate = this.calculateNextEligibleDate(lastDonationDate);

    // Step 2: Prevent duplicate registrations
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

    // Step 3: Insert into master donors table
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

    // Step 4: Record initial entry in donation_history ledger
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
   * Records a subsequent donation for an existing donor with 90-day clinical safety check
   *
   * @param {string} donorId   - Donor identifier
   * @param {Object} data      - New donation payload (date, camp location, notes)
   * @param {Object} staffUser - Recording staff member
   * @returns {Promise<Object>} Updated donor record
   */
  async recordNewDonation(donorId, data, staffUser) {
    const existingRes = await query('SELECT * FROM donors WHERE id = $1', [donorId]);
    if (existingRes.rows.length === 0) throw new Error('Donor record not found');

    const donor = existingRes.rows[0];
    const newDonationDate = data.donation_date || new Date().toISOString().split('T')[0];

    // Enforce 3-Month Safety Window (Clinical Block)
    const eligibility = this.computeEligibility(donor.last_donation_date, donor.next_eligible_date);
    
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

    // Update master donor record with new dates and increment counter
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

    // Insert historical donation ledger entry
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
   * Updates demographic and contact information of a donor
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

    // Check unique conflict against other donors
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
   * Retrieves single donor record along with complete historical donation ledger
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
   * Queries and filters the donor registry with text search and pagination
   */
  async listDonors({ search, bloodGroup, eligibilityStatus, page = 1, limit = 50 }) {
    let sql = 'SELECT * FROM donors WHERE 1=1';
    const params = [];
    let pIdx = 1;

    // Search query matches name, phone, email, or camp
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ` AND (full_name ILIKE $${pIdx} OR phone ILIKE $${pIdx} OR email ILIKE $${pIdx} OR camp_location ILIKE $${pIdx})`;
      params.push(q);
      pIdx++;
    }

    // Filter by specific blood group
    if (bloodGroup && bloodGroup !== 'ALL') {
      sql += ` AND blood_group = $${pIdx}`;
      params.push(bloodGroup.trim());
      pIdx++;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

    // Filter by clinical eligibility status
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
    
    // Augment every row with computed eligibility attributes
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
   * Aggregates real-time metrics for Dashboard display
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

    // Calculate donor eligibility breakdown
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

    // Recent Donations Feed (latest 8 transactions)
    const recentHistory = await query(
      `SELECT dh.*, d.full_name, d.blood_group, d.phone
       FROM donation_history dh
       JOIN donors d ON d.id = dh.donor_id
       ORDER BY dh.donation_date DESC, dh.created_at DESC
       LIMIT 8`
    );

    // Notification delivery breakdown counts
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
