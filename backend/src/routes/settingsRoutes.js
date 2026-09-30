/**
 * ============================================================================
 * File: backend/src/routes/settingsRoutes.js
 * Purpose: Routing Declarations for Hospital System Settings & Scheduler
 * ----------------------------------------------------------------------------
 * Description:
 * Exposes configuration management routes and background scheduler triggers.
 *
 * Security Controls:
 * - All routes require authenticated staff (`verifyToken`).
 * - Mutating settings (`PUT /`) and manually triggering cron (`POST /trigger-cron`)
 *   strictly require administrator role (`requireRole(['admin'])`).
 *
 * Routes Mapped:
 * - GET  /api/settings              -> Retrieve current configuration map
 * - PUT  /api/settings              -> Update configuration keys (Admin only)
 * - GET  /api/settings/cron-status  -> Fetch background scheduler state
 * - POST /api/settings/trigger-cron -> Manually trigger 3-month scan (Admin only)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Enforce authentication on all settings routes
router.use(verifyToken);

// Retrieve system configuration
router.get('/', settingsController.getSettings);

// Update system configuration (Admin only)
router.put('/', requireRole(['admin']), settingsController.updateSettings);

// View background cron status
router.get('/cron-status', settingsController.getCronStatus);

// Manually trigger the daily 3-month eligibility recall scan (Admin only)
router.post('/trigger-cron', requireRole(['admin']), settingsController.triggerCron);

module.exports = router;
