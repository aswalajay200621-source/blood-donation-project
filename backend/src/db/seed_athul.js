const { query, initDatabase } = require('./db');

async function seedAthul() {
  await initDatabase();
  console.log('Connected to DB. Setting up donor Athul...');

  // Allow 'not_delivered' in notification_logs check constraint if applicable
  try {
    await query(`
      ALTER TABLE notification_logs 
      DROP CONSTRAINT IF EXISTS notification_logs_status_check;
    `);
    await query(`
      ALTER TABLE notification_logs 
      ADD CONSTRAINT notification_logs_status_check 
      CHECK (status IN ('queued', 'sent', 'failed', 'standby_skipped', 'not_delivered'));
    `);
    console.log('✅ Updated notification_logs check constraint.');
  } catch (err) {
    console.warn('Constraint update note:', err.message);
  }

  // Check if donor with phone 8089848208 or email abelaswal@gmail.com already exists
  await query("DELETE FROM donors WHERE phone = '8089848208' OR email = 'abelaswal@gmail.com'");
  await query("DELETE FROM notification_logs WHERE recipient IN ('8089848208', '+918089848208', 'abelaswal@gmail.com') OR donor_name = 'Athul'");

  // 100 days ago from today so donor is precompiled to be > 3 months old and currently eligible
  const now = new Date();
  const donationDateObj = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
  const lastDonationDate = donationDateObj.toISOString().split('T')[0];

  // next eligible date is last donation + 90 days (10 days in the past)
  const nextEligibleObj = new Date(donationDateObj.getTime() + 90 * 24 * 60 * 60 * 1000);
  const nextEligibleDate = nextEligibleObj.toISOString().split('T')[0];

  // Insert Athul
  const donorRes = await query(`
    INSERT INTO donors (
      id, full_name, phone, email, blood_group, gender, age,
      camp_location, last_donation_date, next_eligible_date,
      source_of_entry, total_donations_count, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      CURRENT_TIMESTAMP - INTERVAL '100 days',
      CURRENT_TIMESTAMP
    ) RETURNING *;
  `, [
    'Athul',
    '8089848208',
    'abelaswal@gmail.com',
    'B-',
    'Male',
    20, // DOB 21-10-2005 -> Age ~20
    'City General Camp',
    lastDonationDate,
    nextEligibleDate,
    'Manual Entry',
    1
  ]);

  const athul = donorRes.rows[0];
  console.log('✅ Registered Donor Athul:', athul.id, athul.full_name, athul.blood_group, athul.next_eligible_date);

  // Insert Donation History
  await query(`
    INSERT INTO donation_history (
      id, donor_id, donation_date, camp_location, units_donated, source, notes, created_at
    ) VALUES (
      gen_random_uuid(),
      $1, $2, $3, $4, $5, $6,
      CURRENT_TIMESTAMP - INTERVAL '100 days'
    );
  `, [
    athul.id,
    lastDonationDate,
    'City General Camp',
    1.0,
    'Manual Entry',
    'Precompiled 3-month donation: Hb 13 g/dL, Weight 70kg, Pulse 70, BP 120/80'
  ]);
  console.log('✅ Added historical donation record.');

  // Create two notification log records with status 'not_delivered': WhatsApp and Email
  // 1. WhatsApp notification log
  await query(`
    INSERT INTO notification_logs (
      id, donor_id, donor_name, channel, recipient, template_type, status,
      provider, response_payload, error_message, sent_at, created_at
    ) VALUES (
      gen_random_uuid(),
      $1, $2, 'whatsapp', $3, '3_month_reminder', 'not_delivered',
      'meta_cloud',
      '{"error": {"code": 131026, "message": "Message undeliverable - recipient phone not reachable"}}',
      'WhatsApp message not delivered to +91-8089848208: Handset unreachable or unregistered',
      CURRENT_TIMESTAMP - INTERVAL '1 hour',
      CURRENT_TIMESTAMP - INTERVAL '1 hour'
    );
  `, [
    athul.id,
    athul.full_name,
    '8089848208'
  ]);
  console.log('✅ Created WhatsApp notification log (status: not_delivered).');

  // 2. Email notification log
  await query(`
    INSERT INTO notification_logs (
      id, donor_id, donor_name, channel, recipient, template_type, status,
      provider, response_payload, error_message, sent_at, created_at
    ) VALUES (
      gen_random_uuid(),
      $1, $2, 'email', $3, '3_month_reminder', 'not_delivered',
      'nodemailer_smtp',
      '{"code": "EENVELOPE", "response": "550 5.1.1 Recipient address rejected: mailbox unavailable"}',
      'Email not delivered to abelaswal@gmail.com: SMTP 550 Mailbox delivery temporarily rejected',
      CURRENT_TIMESTAMP - INTERVAL '30 minutes',
      CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    );
  `, [
    athul.id,
    athul.full_name,
    'abelaswal@gmail.com'
  ]);
  console.log('✅ Created Email notification log (status: not_delivered).');

  console.log('🎉 Setup completed successfully!');
  process.exit(0);
}

seedAthul().catch(err => {
  console.error('❌ Error seeding Athul:', err);
  process.exit(1);
});
