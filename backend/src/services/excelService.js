const xlsx = require('xlsx');
const donorService = require('./donorService');
const { query } = require('../db/db');

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).substring(2, 11);
}

// Column header aliases for flexible mapping
const HEADER_ALIASES = {
  full_name: ['full name', 'fullname', 'name', 'donor name', 'donor_name', 'patient name', 'donor'],
  phone: ['phone', 'mobile', 'contact', 'phone number', 'mobile number', 'contact number', 'cell', 'phone_number'],
  email: ['email', 'email address', 'mail', 'email_id', 'e-mail'],
  blood_group: ['blood group', 'bloodgroup', 'blood type', 'blood_group', 'bg', 'group'],
  last_donation_date: ['last donation date', 'donation date', 'last donation', 'last_donation_date', 'date of donation', 'date', 'camp date'],
  gender: ['gender', 'sex'],
  age: ['age', 'years'],
  address: ['address', 'location', 'residence', 'city'],
  camp_location: ['camp location', 'camp', 'camp_name', 'center', 'drive location']
};

class ExcelService {
  /**
   * Normalize and map arbitrary column headers to standard fields
   */
  mapRowHeaders(rawRow) {
    const mapped = {};
    const rawKeys = Object.keys(rawRow);

    for (const [standardKey, aliases] of Object.entries(HEADER_ALIASES)) {
      for (const key of rawKeys) {
        const normalizedKey = key.trim().toLowerCase().replace(/[\s_\-]+/g, ' ');
        if (aliases.includes(normalizedKey)) {
          mapped[standardKey] = rawRow[key];
          break;
        }
      }
    }
    return mapped;
  }

  /**
   * Format Excel date number or string to YYYY-MM-DD
   */
  parseExcelDate(val) {
    if (!val) return null;
    if (typeof val === 'number') {
      // Excel epoch date
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return null;
  }

  /**
   * Parse uploaded file buffer (XLSX or CSV) and preview / dry-run validate
   */
  parseFile(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('The uploaded spreadsheet contains no sheets.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawData.length === 0) {
      throw new Error('The spreadsheet contains no data rows.');
    }

    return rawData;
  }

  /**
   * Validate and preview rows without persisting
   */
  async previewAndValidate(rawData) {
    const validRows = [];
    const invalidRows = [];

    for (let i = 0; i < rawData.length; i++) {
      const rowNumber = i + 2; // Accounting for 1-based index and header row
      const rawRow = rawData[i];
      const mapped = this.mapRowHeaders(rawRow);

      const errors = [];

      // Validate Name
      if (!mapped.full_name || String(mapped.full_name).trim().length < 2) {
        errors.push('Full Name is required (minimum 2 characters)');
      }

      // Validate Phone (10 digits numeric only)
      const phoneValidation = donorService.validatePhone(mapped.phone);
      if (!phoneValidation.valid) {
        errors.push(phoneValidation.error);
      }

      // Validate Email
      const emailValidation = donorService.validateEmail(mapped.email);
      if (!emailValidation.valid) {
        errors.push(emailValidation.error);
      }

      // Validate Blood Group
      const bgValidation = donorService.validateBloodGroup(mapped.blood_group);
      if (!bgValidation.valid) {
        errors.push(bgValidation.error);
      }

      // Parse and Validate Last Donation Date
      const dateStr = this.parseExcelDate(mapped.last_donation_date);
      if (!dateStr) {
        errors.push('Last Donation Date is required and must be a valid date (YYYY-MM-DD)');
      }

      // Age validation if provided
      let ageNum = null;
      if (mapped.age) {
        ageNum = parseInt(mapped.age, 10);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 65) {
          errors.push('Age must be between 18 and 65 for donor eligibility');
        }
      }

      if (errors.length > 0) {
        invalidRows.push({
          rowNumber,
          rawData: rawRow,
          mappedData: mapped,
          errors,
          reason: errors.join('; ')
        });
      } else {
        const nextEligible = donorService.calculateNextEligibleDate(dateStr);
        const eligibility = donorService.computeEligibility(dateStr, nextEligible);

        validRows.push({
          rowNumber,
          full_name: String(mapped.full_name).trim(),
          phone: phoneValidation.sanitized,
          email: emailValidation.sanitized,
          blood_group: bgValidation.sanitized,
          gender: mapped.gender ? String(mapped.gender).trim() : 'Other',
          age: ageNum,
          address: mapped.address ? String(mapped.address).trim() : '',
          camp_location: mapped.camp_location ? String(mapped.camp_location).trim() : 'Phase 1 Excel Migration',
          last_donation_date: dateStr,
          next_eligible_date: nextEligible,
          eligibility
        });
      }
    }

    return {
      totalRows: rawData.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      validRows,
      invalidRows
    };
  }

  /**
   * Commit Import Batch to Database
   */
  async commitImport(validatedRows, staffUser, updateExistingDuplicates = true) {
    const importReport = {
      totalProcessed: validatedRows.length,
      importedCount: 0,
      updatedCount: 0,
      rejectedCount: 0,
      importedRecords: [],
      rejectedRecords: []
    };

    const staffName = staffUser ? staffUser.name : 'Phase 1 Migration Admin';
    const staffId = staffUser ? staffUser.id : null;

    for (const row of validatedRows) {
      try {
        // Check for duplicate by phone or email
        const existing = await donorService.findDuplicate(row.phone, row.email);

        if (existing) {
          if (updateExistingDuplicates) {
            // Update existing record
            const newDateObj = new Date(row.last_donation_date);
            const prevDateObj = new Date(existing.last_donation_date);

            // Keep the latest donation date
            const latestDateStr = newDateObj > prevDateObj ? row.last_donation_date : existing.last_donation_date;
            const newNextEligible = donorService.calculateNextEligibleDate(latestDateStr);

            await query(
              `UPDATE donors SET
                full_name = $1, blood_group = $2, gender = $3, age = $4,
                address = $5, last_donation_date = $6, next_eligible_date = $7,
                total_donations_count = total_donations_count + 1,
                updated_at = CURRENT_TIMESTAMP
               WHERE id = $8`,
              [
                row.full_name, row.blood_group, row.gender, row.age,
                row.address, latestDateStr, newNextEligible, existing.id
              ]
            );

            // Add history
            await query(
              `INSERT INTO donation_history (
                id, donor_id, donation_date, camp_location, units_donated, source,
                entered_by_staff_id, entered_by_staff_name, notes
              ) VALUES ($1, $2, $3, $4, 1.0, 'Excel Import', $5, $6, $7)`,
              [
                genId(), existing.id, row.last_donation_date, row.camp_location,
                staffId, staffName, 'Historical record imported via Excel migration.'
              ]
            );

            importReport.updatedCount++;
            importReport.importedRecords.push({
              action: 'UPDATED',
              id: existing.id,
              full_name: row.full_name,
              phone: row.phone,
              email: row.email,
              blood_group: row.blood_group,
              last_donation_date: latestDateStr
            });
          } else {
            importReport.rejectedCount++;
            importReport.rejectedRecords.push({
              rowNumber: row.rowNumber,
              full_name: row.full_name,
              phone: row.phone,
              email: row.email,
              reason: 'Duplicate phone or email already exists in system.'
            });
          }
        } else {
          // Brand new insert
          const donorId = genId();
          await query(
            `INSERT INTO donors (
              id, full_name, phone, email, blood_group, gender, age, address,
              camp_location, last_donation_date, next_eligible_date, source_of_entry,
              entered_by_staff_id, entered_by_staff_name, total_donations_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Excel Import', $12, $13, 1)`,
            [
              donorId, row.full_name, row.phone, row.email, row.blood_group,
              row.gender, row.age, row.address, row.camp_location,
              row.last_donation_date, row.next_eligible_date, staffId, staffName
            ]
          );

          // Add history
          await query(
            `INSERT INTO donation_history (
              id, donor_id, donation_date, camp_location, units_donated, source,
              entered_by_staff_id, entered_by_staff_name, notes
            ) VALUES ($1, $2, $3, $4, 1.0, 'Excel Import', $5, $6, $7)`,
            [
              genId(), donorId, row.last_donation_date, row.camp_location,
              staffId, staffName, 'Historical record imported via Excel migration.'
            ]
          );

          importReport.importedCount++;
          importReport.importedRecords.push({
            action: 'CREATED',
            id: donorId,
            full_name: row.full_name,
            phone: row.phone,
            email: row.email,
            blood_group: row.blood_group,
            last_donation_date: row.last_donation_date
          });
        }
      } catch (err) {
        importReport.rejectedCount++;
        importReport.rejectedRecords.push({
          rowNumber: row.rowNumber,
          full_name: row.full_name,
          phone: row.phone,
          email: row.email,
          reason: err.message
        });
      }
    }

    return importReport;
  }

  /**
   * Generate an official downloadable sample Excel template
   */
  generateSampleTemplate() {
    const templateData = [
      {
        'Full Name': 'Aarav Mehta',
        'Phone': '9876501234',
        'Email': 'aarav.mehta@example.com',
        'Blood Group': 'O+',
        'Last Donation Date': '2026-05-15',
        'Gender': 'Male',
        'Age': 28,
        'Address': '104 Lotus Towers, Sector 12',
        'Camp Location': 'Main Hospital Blood Camp'
      },
      {
        'Full Name': 'Kavita Nair',
        'Phone': '9812345678',
        'Email': 'kavita.nair@example.com',
        'Blood Group': 'B+',
        'Last Donation Date': '2026-08-20',
        'Gender': 'Female',
        'Age': 23,
        'Address': '22 Palms Residency, Civil Lines',
        'Camp Location': 'College Auditorium Camp'
      },
      {
        'Full Name': 'David Fernandes',
        'Phone': '9899887766',
        'Email': 'david.f@example.com',
        'Blood Group': 'AB+',
        'Last Donation Date': '2026-04-10',
        'Gender': 'Male',
        'Age': 35,
        'Address': '45 Church Road, Block C',
        'Camp Location': 'Rotary Club Mobile Drive'
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'DonorTemplate');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = new ExcelService();
