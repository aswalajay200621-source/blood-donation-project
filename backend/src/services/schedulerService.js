/**
 * ============================================================================
 * File: backend/src/services/schedulerService.js
 * Purpose: Automated Cron Job Service for Daily 3-Month Eligibility Recall
 * ----------------------------------------------------------------------------
 * Description:
 * Orchestrates the recurring background task that ensures donors are contacted
 * as soon as their mandatory 90-day clinical waiting period has elapsed.
 *
 * Operational Details:
 * 1. Executes daily at 08:00 AM (cron expression: '0 8 * * *').
 * 2. Queries the database for donors where `next_eligible_date <= today` and
 *    no reminder has been dispatched for the current eligibility cycle.
 * 3. Iterates over eligible donors and triggers WhatsApp & Email dispatches
 *    via `notificationService`.
 * 4. Updates donor records with `last_reminder_sent_at` timestamp.
 * 5. Records an immutable audit log entry detailing the run metrics.
 * 6. Prevents overlapping concurrent execution with an internal locking flag.
 * ============================================================================
 */

const cron = require('node-cron');
const { query } = require('../db/db');
const notificationService = require('./notificationService');
const { recordAudit } = require('../middleware/auditMiddleware');

class SchedulerService {
  constructor() {
    this.cronTask = null;         // Reference to active node-cron task
    this.isJobRunning = false;     // Mutex lock to prevent overlapping runs
    this.lastRunSummary = null;   // Metadata summary of the most recent scan
  }

  /**
   * Initializes and schedules the daily automated background cron job
   */
  startScheduler() {
    // Schedule job to execute daily at 08:00 AM server time
    this.cronTask = cron.schedule('0 8 * * *', async () => {
      console.log('⏰ [CRON JOB] Starting daily donor 3-month eligibility check...');
      await this.runEligibilityScan();
    });

    console.log('✅ Daily 3-Month Eligibility Cron Job initialized (Scheduled for 08:00 AM daily).');
  }

  /**
   * Core Scan Engine: Finds all donors whose 3-month window has elapsed and sends reminders
   * Can also be triggered on-demand by administrators via POST /api/settings/trigger-cron
   */
  async runEligibilityScan() {
    // Guard against concurrent execution if a scan is already running
    if (this.isJobRunning) {
      console.log('⚠️ Eligibility scan already in progress, skipping duplicate run.');
      return { status: 'already_running' };
    }

    this.isJobRunning = true;
    const startTime = new Date();
    const todayStr = startTime.toISOString().split('T')[0];

    try {
      // Find donors whose next_eligible_date has arrived AND who haven't received
      // a reminder yet for this donation cycle
      const res = await query(
        `SELECT * FROM donors
         WHERE next_eligible_date <= $1
           AND (last_reminder_sent_at IS NULL OR last_reminder_sent_at < next_eligible_date)
         ORDER BY next_eligible_date ASC`,
        [todayStr]
      );

      const eligibleDonors = res.rows;
      console.log(`🔍 Found ${eligibleDonors.length} donors newly eligible for 3-month reminder dispatch.`);

      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      // Sequentially dispatch notifications to prevent overwhelming external APIs
      for (const donor of eligibleDonors) {
        try {
          const result = await notificationService.send3MonthEligibilityReminder(donor);
          if (result.whatsapp?.status === 'sent' || result.email?.status === 'sent') {
            sentCount++;
          } else if (result.whatsapp?.status === 'standby_skipped' && result.email?.status === 'standby_skipped') {
            skippedCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error(`Failed to send reminder for donor ${donor.full_name}:`, err.message);
          failedCount++;
        }
      }

      // Aggregate execution metrics
      this.lastRunSummary = {
        runAt: startTime.toISOString(),
        eligibleDonorsFound: eligibleDonors.length,
        sentCount,
        failedCount,
        skippedCount,
        durationMs: Date.now() - startTime.getTime()
      };

      // Record administrative audit trail entry
      await recordAudit({
        userEmail: 'system-cron@hospital.med',
        action: 'CRON_ELIGIBILITY_SCAN',
        resourceType: 'SCHEDULER',
        ipAddress: '127.0.0.1',
        details: this.lastRunSummary
      });

      console.log('✅ 3-Month Eligibility Cron Scan Finished:', this.lastRunSummary);
      return this.lastRunSummary;
    } catch (err) {
      console.error('❌ Eligibility scan error:', err);
      throw err;
    } finally {
      // Release execution lock
      this.isJobRunning = false;
    }
  }

  /**
   * Returns current scheduler health, active state, and last execution summary
   */
  getStatus() {
    return {
      isActive: !!this.cronTask,
      isJobRunning: this.isJobRunning,
      lastRunSummary: this.lastRunSummary,
      schedulePattern: '0 8 * * * (Daily at 8:00 AM)'
    };
  }
}

module.exports = new SchedulerService();
