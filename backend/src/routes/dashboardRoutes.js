/**
 * ============================================================================
 * File: backend/src/routes/dashboardRoutes.js
 * Purpose: Routing Declarations for Clinical Dashboard & Metrics Endpoints
 * ----------------------------------------------------------------------------
 * Description:
 * Exposes statistical aggregation endpoints consumed by the Dashboard view.
 * Requires authenticated staff session via `verifyToken`.
 *
 * Routes Mapped:
 * - GET /api/dashboard/stats -> Aggregates blood group counts, eligibility counts & activity
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/authMiddleware');

// Enforce authentication on dashboard data access
router.use(verifyToken);

// Retrieve high-level blood bank metrics
router.get('/stats', dashboardController.getStats);

module.exports = router;
