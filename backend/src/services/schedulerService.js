const cron = require('node-cron');
const { query } = require('../db/db');
const notificationService = require('./notificationService');
const { recordAudit } = require('../middleware/auditMiddleware');

class SchedulerService {
  constructor() {
    this.cronTask = null;
    this.isJobRunning = false;
    this.lastRunSummary = null;
  }

  /**
   * Start the daily automated cron scheduler
   */
  startScheduler() {
    // Run daily at 08:00 AM ('0 8 * * *')
    this.cronTask = cron.schedule('0 8 * * *', async () => {
      console.log('⏰ [CRON JOB] Starting daily donor 3-month eligibility check...');
      await this.runEligibilityScan();
    });

    console.log('✅ Daily 3-Month Eligibility Cron Job initialized (Scheduled for 08:00 AM daily).');
  }

  /**
   * Core Scan Logic: Find all donors whose 3-month window has elapsed and dispatch reminders
   */
  async runEligibilityScan() {
    if (this.isJobRunning) {
      console.log('⚠️ Eligibility scan already in progress, skipping duplicate run.');
      return { status: 'already_running' };
    }

    this.isJobRunning = true;
    const startTime = new Date();
    const todayStr = startTime.toISOString().split('T')[0];

    try {
      // Find donors where next_eligible_date <= today AND (last_reminder_sent_at IS NULL OR last_reminder_sent_at < next_eligible_date)
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

      this.lastRunSummary = {
        runAt: startTime.toISOString(),
        eligibleDonorsFound: eligibleDonors.length,
        sentCount,
        failedCount,
        skippedCount,
        durationMs: Date.now() - startTime.getTime()
      };

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
      this.isJobRunning = false;
    }
  }

  /**
   * Get Current Scheduler Status & Last Run Info
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
