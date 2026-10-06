/**
 * ============================================================================
 * File: backend/src/routes/notificationRoutes.js
 * Purpose: Routing Declarations for Notification Logs & Diagnostic Testing
 * ----------------------------------------------------------------------------
 * Description:
 * Defines endpoints for viewing communication dispatch logs and running test
 * dispatches through WhatsApp and Email channels.
 *
 * Security Controls:
 * - All routes require authenticated staff (`verifyToken`).
 * - Test dispatches are restricted exclusively to administrators (`requireRole(['admin'])`).
 *
 * Routes Mapped:
 * - GET  /api/notifications/logs          -> Retrieve notification history logs
 * - POST /api/notifications/test-email    -> Send test email (Admin only)
 * - POST /api/notifications/test-whatsapp -> Send test WhatsApp message (Admin only)
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Enforce authentication on all notification routes
router.use(verifyToken);

// View notification delivery logs
router.get('/logs', notificationController.getLogs);

// Send test email (Admin only)
router.post('/test-email', requireRole(['admin']), notificationController.testEmail);

// Send test WhatsApp message (Admin only)
router.post('/test-whatsapp', requireRole(['admin']), notificationController.testWhatsApp);

// Bulk WhatsApp to ALL eligible donors (Admin and Staff)
router.post('/bulk-whatsapp', requireRole(['admin', 'staff']), notificationController.bulkWhatsApp);

// Bulk Email to ALL eligible donors (Admin and Staff)
router.post('/bulk-email', requireRole(['admin', 'staff']), notificationController.bulkEmail);

// Record frontend browser SDK dispatch log (Admin and Staff)
router.post('/log-browser-dispatch', requireRole(['admin', 'staff']), notificationController.logBrowserDispatch);

module.exports = router;
