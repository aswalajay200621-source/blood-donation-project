/**
 * ============================================================================
 * File: backend/src/server.js
 * Purpose: HTTP Server Bootstrap & Application Startup Orchestrator
 * ----------------------------------------------------------------------------
 * Description:
 * This is the main Node.js entry point for the Apex Hospital Blood Bank
 * backend server. It coordinates the boot sequence in the correct order:
 *
 * Startup Sequence:
 * 1. Initializes the database (PostgreSQL preferred, SQLite fallback)
 * 2. Seeds initial admin users and sample donor records if database is empty
 * 3. Starts the daily background 3-month eligibility cron job
 * 4. Binds the Express app to the configured network port
 * 5. Registers graceful shutdown handlers (SIGTERM/SIGINT for Docker/PM2)
 * ============================================================================
 */

const app = require('./app');
const config = require('./config/env');
const { initDatabase, query } = require('./db/db');
const { seed } = require('./db/seed');
const schedulerService = require('./services/schedulerService');

/**
 * Bootstraps and starts the hospital backend server
 */
async function startServer() {
  try {
    console.log('🏥 Starting Hospital Blood Donation Management System Backend...');
    
    // Step 1: Initialize database connection & run table schema migrations
    await initDatabase();

    // Step 2: Seed initial admin accounts if database is completely empty
    const checkUser = await query('SELECT id FROM users LIMIT 1');
    if (checkUser.rows.length === 0) {
      console.log('🔄 Initial database is empty. Seeding initial accounts and sample donor records...');
      await seed();
    }

    // Step 3: Start automated daily 3-month eligibility recall cron job
    schedulerService.startScheduler();

    // Step 4: Begin listening on configured HTTP port
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

    // Step 5: Register graceful shutdown handlers
    // Ensures open database connections are released cleanly before process exit
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('Server closed. Database connections released.');
        process.exit(0);
      });
    };

    // Handle OS process termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Docker/PM2 stop
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C in terminal

  } catch (error) {
    console.error('❌ Fatal error starting hospital server:', error);
    process.exit(1);
  }
}

// Execute the startup sequence
startServer();
