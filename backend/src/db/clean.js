/**
 * ============================================================================
 * File: backend/src/db/clean.js
 * Purpose: Clean Database for Production / Serving
 * ----------------------------------------------------------------------------
 * Description:
 * Removes all dummy/sample data (donors, history, logs) while preserving 
 * core administrator accounts and system settings.
 * ============================================================================
 */

const { query, initDatabase } = require('./db');

async function clean() {
  await initDatabase();
  console.log('🧹 Starting database cleanup...');

  try {
    // Delete transactional and sample data
    await query('DELETE FROM donation_history');
    console.log('✅ Cleared donation history.');

    await query('DELETE FROM donors');
    console.log('✅ Cleared sample donors.');

    await query('DELETE FROM notification_logs');
    console.log('✅ Cleared notification logs.');

    await query('DELETE FROM audit_logs');
    console.log('✅ Cleared audit logs.');

    // We keep users and system_settings intact
    console.log('🎉 Database cleaned and ready to be served! (Admin accounts and settings preserved)');
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  clean()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}

module.exports = { clean };
