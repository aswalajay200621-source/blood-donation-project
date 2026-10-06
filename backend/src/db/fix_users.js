/**
 * One-time script to fix production users in the database.
 * Removes all old mock accounts and creates the real ones.
 */

const { query, initDatabase } = require('./db');
const bcrypt = require('bcryptjs');

async function fixUsers() {
  await initDatabase();
  console.log('🔧 Fixing users in database...');

  // Step 1: Delete all old mock accounts  
  await query("DELETE FROM users WHERE email NOT IN ('aswalajay200621@gmail.com', '25cs238@gmail.com')");
  console.log('✅ Removed old mock accounts (admin@hospital.med, nurse.mary@hospital.med, etc.)');

  // Step 2: Also clear all donors/logs (full clean for production)
  await query('DELETE FROM donation_history');
  await query('DELETE FROM donors');
  await query('DELETE FROM notification_logs');
  await query('DELETE FROM audit_logs');
  console.log('✅ Wiped all mock donor data and logs.');

  const adminHash = await bcrypt.hash('admin123', 10);
  const staffHash = await bcrypt.hash('staff123', 10);

  // Step 3: Upsert Admin
  const adminExists = await query("SELECT id FROM users WHERE email = 'aswalajay200621@gmail.com'");
  if (adminExists.rows.length > 0) {
    await query(
      "UPDATE users SET name='Dr. Ajay Aswal', password_hash=$1, role='admin', two_factor_enabled=false, is_active=true WHERE email='aswalajay200621@gmail.com'",
      [adminHash]
    );
    console.log('✅ Updated Admin: aswalajay200621@gmail.com');
  } else {
    await query(
      "INSERT INTO users (id, email, name, password_hash, role, two_factor_enabled, is_active) VALUES ('admin-001', 'aswalajay200621@gmail.com', 'Dr. Ajay Aswal', $1, 'admin', false, true)",
      [adminHash]
    );
    console.log('✅ Created Admin: aswalajay200621@gmail.com');
  }

  // Step 4: Upsert Staff
  const staffExists = await query("SELECT id FROM users WHERE email = '25cs238@gmail.com'");
  if (staffExists.rows.length > 0) {
    await query(
      "UPDATE users SET name='Staff Coordinator', password_hash=$1, role='staff', two_factor_enabled=false, is_active=true WHERE email='25cs238@gmail.com'",
      [staffHash]
    );
    console.log('✅ Updated Staff: 25cs238@gmail.com');
  } else {
    await query(
      "INSERT INTO users (id, email, name, password_hash, role, two_factor_enabled, is_active) VALUES ('staff-001', '25cs238@gmail.com', 'Staff Coordinator', $1, 'staff', false, true)",
      [staffHash]
    );
    console.log('✅ Created Staff: 25cs238@gmail.com');
  }

  const remaining = await query('SELECT email, name, role FROM users');
  console.log('\n📋 Final users in database:');
  remaining.rows.forEach(u => console.log(`  - ${u.email} (${u.role}) - ${u.name}`));

  console.log('\n🎉 Database is clean and ready for launch!');
  process.exit(0);
}

fixUsers().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
