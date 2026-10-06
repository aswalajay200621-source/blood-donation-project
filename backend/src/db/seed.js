/**
 * ============================================================================
 * File: backend/src/db/seed.js
 * Purpose: Initial Database Seeding & Mock Clinical Data Generator
 * ----------------------------------------------------------------------------
 * Description:
 * Populates a fresh database (PostgreSQL or SQLite fallback) with baseline
 * records required for development, testing, and clinical demonstration:
 *
 * Seeded Entities:
 * 1. Default Accounts:
 *    - Administrator (`aswalajay200621@gmail.com` / `admin123`) with TOTP 2FA enabled.
 *    - Staff Coordinator (`25cs238@gmail.com` / `staff123`).
 * 2. System Settings:
 *    - Baseline key-value defaults for SMTP, WhatsApp provider, and eligibility intervals.
 * 3. Clinical Sample Donors & Historical Donations:
 *    - Diverse set of donors covering all 8 ABO/Rh blood groups.
 *    - Varied eligibility states: currently eligible, currently in 90-day waiting gap,
 *      and overdue recall candidates.
 * ============================================================================
 */

const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const { query, initDatabase } = require('./db');
const { v4: uuidv4 } = require('crypto');

/**
 * Generates unique UUID-style identifier strings
 */
function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).substring(2, 11);
}

/**
 * Helper to compute future or past dates
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Converts Date object to 'YYYY-MM-DD' formatted string
 */
function formatDate(d) {
  return d.toISOString().split('T')[0];
}

/**
 * Master database seeder function
 */
async function seed() {
  await initDatabase();
  console.log('🌱 Starting Database Seeding...');

  // 1. Seed Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

  // Default TOTP secret for admin demo: 'JBSWY3DPEHPK3PXP' (standard test base32 key)
  const adminSecret = 'JBSWY3DPEHPK3PXP';
  const staffSecret = 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ';

  const adminId = genId();
  const staffId = genId();

  // Check if admin exists
  const existingAdmin = await query('SELECT * FROM users WHERE email = $1', ['aswalajay200621@gmail.com']);
  if (existingAdmin.rows.length === 0) {
    await query(
      `INSERT INTO users (id, email, name, password_hash, role, two_factor_secret, two_factor_enabled, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [adminId, 'aswalajay200621@gmail.com', 'Dr. Ajay Aswal (Chief Medical Officer)', adminPasswordHash, 'admin', adminSecret, 1, 1]
    );
    console.log('✅ Created Admin user: aswalajay200621@gmail.com / admin123');
  }

  const existingStaff = await query('SELECT * FROM users WHERE email = $1', ['studymate608@gmail.com']);
  if (existingStaff.rows.length === 0) {
    await query(
      `INSERT INTO users (id, email, name, password_hash, role, two_factor_secret, two_factor_enabled, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [staffId, 'studymate608@gmail.com', 'Staff Coordinator', staffPasswordHash, 'staff', staffSecret, false, true]
    );
    console.log('✅ Created Staff user: studymate608@gmail.com / staff123');
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

  // (Sample Donors removed for production launch)

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
