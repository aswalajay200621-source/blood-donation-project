const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const { query, initDatabase } = require('./db');
const { v4: uuidv4 } = require('crypto');

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).substring(2, 11);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

async function seed() {
  await initDatabase();
  console.log('🌱 Starting Database Seeding...');

  // 1. Seed Users
  const adminPasswordHash = await bcrypt.hash('Admin@Hospital2026!', 10);
  const staffPasswordHash = await bcrypt.hash('Nurse@Hospital2026!', 10);

  // Default TOTP secret for admin demo: 'JBSWY3DPEHPK3PXP' (standard test base32 key)
  const adminSecret = 'JBSWY3DPEHPK3PXP';
  const staffSecret = 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ';

  const adminId = genId();
  const staffId = genId();

  // Check if admin exists
  const existingAdmin = await query('SELECT * FROM users WHERE email = $1', ['admin@hospital.med']);
  if (existingAdmin.rows.length === 0) {
    await query(
      `INSERT INTO users (id, email, name, password_hash, role, two_factor_secret, two_factor_enabled, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [adminId, 'admin@hospital.med', 'Dr. Aris Thorne (Chief Medical Officer)', adminPasswordHash, 'admin', adminSecret, 1, 1]
    );
    console.log('✅ Created Admin user: admin@hospital.med / Admin@Hospital2026!');
  }

  const existingStaff = await query('SELECT * FROM users WHERE email = $1', ['nurse.mary@hospital.med']);
  if (existingStaff.rows.length === 0) {
    await query(
      `INSERT INTO users (id, email, name, password_hash, role, two_factor_secret, two_factor_enabled, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [staffId, 'nurse.mary@hospital.med', 'Nurse Mary Jenkins (Camp Coordinator)', staffPasswordHash, 'staff', staffSecret, 1, 1]
    );
    console.log('✅ Created Staff user: nurse.mary@hospital.med / Nurse@Hospital2026!');
  }

  // 2. Seed System Settings
  const defaultSettings = [
    { key: 'email_enabled', value: 'false', description: 'Enable automated email notifications via SMTP' },
    { key: 'email_smtp_host', value: 'smtp.hospital.med', description: 'Hospital SMTP Server Hostname' },
    { key: 'email_smtp_port', value: '587', description: 'Hospital SMTP Port' },
    { key: 'whatsapp_enabled', value: 'true', description: 'Enable WhatsApp Business API automated dispatch' },
    { key: 'whatsapp_provider', value: 'mock', description: 'Active WhatsApp Provider (mock / meta_cloud / twilio / gupshup)' },
    { key: 'eligibility_gap_months', value: '3', description: 'Mandatory minimum gap between blood donations' },
    { key: 'cron_schedule_daily', value: '0 8 * * *', description: 'Daily cron schedule for scanning 3-month eligibility (8:00 AM)' }
  ];

  for (const s of defaultSettings) {
    const exists = await query('SELECT key FROM system_settings WHERE key = $1', [s.key]);
    if (exists.rows.length === 0) {
      await query('INSERT INTO system_settings (key, value, description) VALUES ($1, $2, $3)', [s.key, s.value, s.description]);
    }
  }
  console.log('✅ Initialized System Settings.');

  // 3. Seed Sample Donors with realistic dates
  const now = new Date();
  
  // Date helpers
  // 120 days ago -> Eligible (past 90 days)
  const d120Ago = formatDate(addDays(now, -120));
  const el120 = formatDate(addDays(addDays(now, -120), 90));

  // 100 days ago -> Eligible
  const d100Ago = formatDate(addDays(now, -100));
  const el100 = formatDate(addDays(addDays(now, -100), 90));

  // 30 days ago -> Blocked (60 days remaining)
  const d30Ago = formatDate(addDays(now, -30));
  const el30 = formatDate(addDays(addDays(now, -30), 90));

  // 15 days ago -> Blocked (75 days remaining)
  const d15Ago = formatDate(addDays(now, -15));
  const el15 = formatDate(addDays(addDays(now, -15), 90));

  // 89 days ago -> Blocked (1 day remaining, eligible tomorrow!)
  const d89Ago = formatDate(addDays(now, -89));
  const el89 = formatDate(addDays(addDays(now, -89), 90));

  // 92 days ago -> Crossed 3 months 2 days ago (Pending Reminder)
  const d92Ago = formatDate(addDays(now, -92));
  const el92 = formatDate(addDays(addDays(now, -92), 90));

  const sampleDonors = [
    {
      full_name: 'Vikramaditya Sharma',
      phone: '9876543210',
      email: 'vikram.sharma@example.com',
      blood_group: 'O+',
      gender: 'Male',
      age: 29,
      address: '42 MG Road, Block 4, City Center',
      camp_location: 'Annual College Blood Camp - Hall A',
      last_donation_date: d120Ago,
      next_eligible_date: el120,
      source_of_entry: 'Excel Import',
      total_donations: 4
    },
    {
      full_name: 'Ananya Deshmukh',
      phone: '9811223344',
      email: 'ananya.deshmukh@example.com',
      blood_group: 'A+',
      gender: 'Female',
      age: 24,
      address: 'Flat 302, Green Meadows, Tech Park',
      camp_location: 'Campus Youth Blood Drive',
      last_donation_date: d30Ago,
      next_eligible_date: el30,
      source_of_entry: 'Manual Entry',
      total_donations: 2
    },
    {
      full_name: 'Rahul Sen Gupta',
      phone: '9823456789',
      email: 'rahul.sengupta@example.com',
      blood_group: 'B+',
      gender: 'Male',
      age: 34,
      address: '15 Lake View Avenue, Sector 9',
      camp_location: 'Rotary Club City Camp',
      last_donation_date: d100Ago,
      next_eligible_date: el100,
      source_of_entry: 'Excel Import',
      total_donations: 6
    },
    {
      full_name: 'Priyanka Iyer',
      phone: '9845012345',
      email: 'priyanka.iyer@example.com',
      blood_group: 'AB-',
      gender: 'Female',
      age: 27,
      address: '78 Silicon Heights, South Wing',
      camp_location: 'Hospital In-House Blood Bank',
      last_donation_date: d89Ago,
      next_eligible_date: el89,
      source_of_entry: 'Manual Entry',
      total_donations: 3
    },
    {
      full_name: 'Karthik Raja Raman',
      phone: '9871198711',
      email: 'karthik.raja@example.com',
      blood_group: 'O-',
      gender: 'Male',
      age: 41,
      address: '12 Temple Street, Heritage Zone',
      camp_location: 'Emergency Rare-Group Mobile Drive',
      last_donation_date: d92Ago,
      next_eligible_date: el92,
      source_of_entry: 'Manual Entry',
      total_donations: 8
    },
    {
      full_name: 'Sunita Patel',
      phone: '9890123456',
      email: 'sunita.patel@example.com',
      blood_group: 'A-',
      gender: 'Female',
      age: 31,
      address: '55 Sunrise Enclave, Phase 2',
      camp_location: 'Corporate Tech Park Drive',
      last_donation_date: d15Ago,
      next_eligible_date: el15,
      source_of_entry: 'Manual Entry',
      total_donations: 1
    },
    {
      full_name: 'Farhan Akhtar Qureshi',
      phone: '9833445566',
      email: 'farhan.qureshi@example.com',
      blood_group: 'B-',
      gender: 'Male',
      age: 26,
      address: '90 Marine Promenade, Flat 12B',
      camp_location: 'Annual College Blood Camp - Hall B',
      last_donation_date: d120Ago,
      next_eligible_date: el120,
      source_of_entry: 'Excel Import',
      total_donations: 5
    }
  ];

  for (const d of sampleDonors) {
    const exists = await query('SELECT id FROM donors WHERE phone = $1 OR email = $2', [d.phone, d.email]);
    if (exists.rows.length === 0) {
      const donorId = genId();
      await query(
        `INSERT INTO donors (
          id, full_name, phone, email, blood_group, gender, age, address,
          camp_location, last_donation_date, next_eligible_date, source_of_entry,
          entered_by_staff_name, total_donations_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          donorId, d.full_name, d.phone, d.email, d.blood_group, d.gender, d.age, d.address,
          d.camp_location, d.last_donation_date, d.next_eligible_date, d.source_of_entry,
          'Nurse Mary Jenkins', d.total_donations
        ]
      );

      // Add donation history entry
      await query(
        `INSERT INTO donation_history (
          id, donor_id, donation_date, camp_location, units_donated, source, entered_by_staff_name, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          genId(), donorId, d.last_donation_date, d.camp_location, 1.0, d.source_of_entry,
          'Nurse Mary Jenkins', 'Routine camp collection, vital signs normal.'
        ]
      );
    }
  }
  console.log('✅ Seeded Sample Donors with distinct 3-month eligibility windows.');

  // 4. Seed Audit Logs
  await query(
    `INSERT INTO audit_logs (id, user_email, action, resource_type, ip_address, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      genId(),
      'system@hospital.med',
      'SYSTEM_INIT',
      'SYSTEM',
      '127.0.0.1',
      JSON.stringify({ message: 'Blood Bank Database Schema and Seeding Completed.' })
    ]
  );

  console.log('🎉 Seeding successfully completed!\n');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seed };
