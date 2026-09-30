/**
 * ============================================================================
 * File: backend/src/routes/excelRoutes.js
 * Purpose: Routing Declarations for Excel Migration & Spreadsheet Operations
 * ----------------------------------------------------------------------------
 * Description:
 * Defines endpoints for importing donor batches from Excel/CSV files and
 * downloading standardized migration templates.
 *
 * Security & Resource Controls:
 * - `verifyToken`     : Requires authenticated staff JWT.
 * - `fileOpLimiter`   : Rate limits file uploads to 20 requests per 5 minutes.
 * - `multer`          : In-memory buffering capped strictly at 10MB to prevent memory exhaustion.
 *
 * Routes Mapped:
 * - POST /api/excel/preview  -> Upload file, parse, and validate dry-run
 * - POST /api/excel/commit   -> Commit validated rows to the database
 * - GET  /api/excel/template -> Stream blank official template workbook
 * ============================================================================
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const excelController = require('../controllers/excelController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { fileOpLimiter } = require('../middleware/rateLimiter');

// Configure multer in-memory upload handler with a 10MB payload ceiling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Enforce JWT authentication on all spreadsheet operations
router.use(verifyToken);

// Parse uploaded file and return validation report
router.post('/preview', fileOpLimiter, upload.single('file'), excelController.previewFile);

// Commit batch of validated rows to the database
router.post('/commit', fileOpLimiter, excelController.commitImport);

// Download blank sample Excel template
router.get('/template', excelController.downloadTemplate);

module.exports = router;
