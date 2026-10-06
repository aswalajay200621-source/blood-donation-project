const { query, initDatabase } = require('./db');

async function cleanLogs() {
  await initDatabase();
  console.log('Cleaning duplicate notification logs for Athul...');

  // Delete the two older test rows
  const del = await query(`
    DELETE FROM notification_logs 
    WHERE id IN ('2173b490-15a4-4755-abfd-dc292afb3b21', '1672bb40-e634-400c-84d5-b0ac2452811d')
  `);
  console.log('Deleted rows:', del.rowCount);

  const remaining = await query(`
    SELECT id, donor_name, channel, recipient, status, sent_at, provider 
    FROM notification_logs 
    ORDER BY created_at DESC
  `);
  console.log('Remaining Message History logs in DB:');
  console.table(remaining.rows);
  process.exit(0);
}

cleanLogs().catch(err => {
  console.error(err);
  process.exit(1);
});
