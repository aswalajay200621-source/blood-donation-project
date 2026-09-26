const app = require('./app');
const config = require('./config/env');
const { initDatabase, query } = require('./db/db');
const { seed } = require('./db/seed');
const schedulerService = require('./services/schedulerService');

async function startServer() {
  try {
    console.log('🏥 Starting Hospital Blood Donation Management System Backend...');
    
    // 1. Initialize Database & run schema
    await initDatabase();

    // 2. Check if admin user exists, if not run seed
    const checkUser = await query('SELECT id FROM users LIMIT 1');
    if (checkUser.rows.length === 0) {
      console.log('🔄 Initial database is empty. Seeding initial accounts and sample donor records...');
      await seed();
    }

    // 3. Start automated daily 3-month eligibility scheduler
    schedulerService.startScheduler();

    // 4. Start HTTP Server
    const server = app.listen(config.PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 Apex Hospital Blood Bank API is running!`);
      console.log(`🌐 Server Port: ${config.PORT}`);
      console.log(`🔒 Security: Helmet, CORS, JWT + TOTP 2FA, Rate Limiters Active`);
      console.log(`⏰ Daily 3-Month Eligibility Cron Job: Active`);
      console.log(`📧 Email Dispatch: ${config.EMAIL_ENABLED ? 'ENABLED' : 'STANDBY (Off by default)'}`);
      console.log(`💬 WhatsApp Provider: ${config.WHATSAPP_PROVIDER}`);
      console.log(`==================================================\n`);
    });

    // Graceful Shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('Server closed. Database connections released.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Fatal error starting hospital server:', error);
    process.exit(1);
  }
}

startServer();
