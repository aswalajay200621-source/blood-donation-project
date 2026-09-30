/**
 * ============================================================================
 * File: backend/src/routes/auditRoutes.js
 * Purpose: Routing Declarations for Administrative Security Audit Logs
 * ----------------------------------------------------------------------------
 * Description:
 * Defines endpoints for retrieving the immutable security and compliance audit
 * trail of user activities, logins, donor modifications, and system events.
 *
 * Security Controls:
 * - Requires authenticated session (`verifyToken`).
 * - Restricted exclusively to users with the 'admin' role (`requireRole(['admin'])`).
 *
 * Routes Mapped:
 * - GET /api/audit/logs -> Retrieve recent audit logs with optional filtering
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Enforce authentication on all audit endpoints
router.use(verifyToken);

// Retrieve security audit logs (Admin only)
router.get('/logs', requireRole(['admin']), auditController.getAuditLogs);

module.exports = router;
