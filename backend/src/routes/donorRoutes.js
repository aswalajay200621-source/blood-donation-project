/**
 * ============================================================================
 * File: backend/src/routes/donorRoutes.js
 * Purpose: Routing Declarations for Donor Directory, Registration & Records
 * ----------------------------------------------------------------------------
 * Description:
 * Exposes API routes for donor lifecycle management. Every endpoint on this
 * router is protected by `verifyToken` middleware, requiring a valid JWT session.
 *
 * Routes Mapped:
 * - GET  /api/donors                 -> Search, filter & paginate donor registry
 * - GET  /api/donors/check-duplicate -> Real-time phone/email duplicate check
 * - GET  /api/donors/export/csv      -> Download donor registry as formatted CSV
 * - GET  /api/donors/:id             -> Retrieve individual donor profile & history
 * - POST /api/donors                 -> Register new donor (Phase 2 Live Camp)
 * - POST /api/donors/:id/donate      -> Record new donation for existing donor
 * - PUT  /api/donors/:id             -> Update donor demographic details
 * - POST /api/donors/:id/send-reminder -> Manually dispatch 3-month eligibility recall
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Enforce JWT authentication on all donor endpoints
router.use(verifyToken);

// Search and list donors with filters
router.get('/', donorController.listDonors);

// Real-time duplicate check during mobile camp entry
router.get('/check-duplicate', donorController.checkDuplicate);

// Export filtered donor directory as CSV file
router.get('/export/csv', donorController.exportDonorsCSV);

// Fetch donor profile and donation history
router.get('/:id', donorController.getDonor);

// Register a brand new donor
router.post('/', donorController.createDonor);

// Record repeat donation for existing donor (enforces 90-day clinical safety gap)
router.post('/:id/donate', donorController.recordNewDonation);

// Update donor contact or demographic information
router.put('/:id', donorController.updateDonor);

// Trigger manual 3-month eligibility recall reminder
router.post('/:id/send-reminder', donorController.sendReminder);

module.exports = router;
