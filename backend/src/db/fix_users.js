const { query, initDatabase } = require('./db');
const bcrypt = require('bcryptjs');

async function updateStaff() {
  await initDatabase();
  const staffHash = await bcrypt.hash('staff123', 10);

  // Remove old staff account
  await query("DELETE FROM users WHERE email = '25cs238@gmail.com'");

  // Upsert new staff account
  const exists = await query("SELECT id FROM users WHERE email = 'studymate608@gmail.com'");
  if (exists.rows.length > 0) {
    await query(
      "UPDATE users SET name='Staff Coordinator', password_hash=$1, role='staff', two_factor_enabled=false, is_active=true WHERE email='studymate608@gmail.com'",
      [staffHash]
    );
    console.log('✅ Updated existing staff: studymate608@gmail.com');
  } else {
    await query(
      "INSERT INTO users (id, email, name, password_hash, role, two_factor_enabled, is_active) VALUES (gen_random_uuid(), 'studymate608@gmail.com', 'Staff Coordinator', $1, 'staff', false, true)",
      [staffHash]
    );
    console.log('✅ Created staff: studymate608@gmail.com');
  }

  const all = await query('SELECT email, role FROM users ORDER BY role');
  console.log('\n📋 Current users:');
  all.rows.forEach(u => console.log(`  ${u.role}: ${u.email}`));
  process.exit(0);
}

updateStaff().catch(e => { console.error(e); process.exit(1); });
