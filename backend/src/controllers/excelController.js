/**
 * ============================================================================
 * File: backend/src/controllers/excelController.js
 * Purpose: Controller for Excel / CSV Donor Migration & Bulk Import Workflow
 * ----------------------------------------------------------------------------
 * Description:
 * Manages the multi-step spreadsheet migration pipeline for hospital blood donor
 * records. Allows staff to upload `.xlsx` or `.csv` files, preview and validate
 * data integrity before persistence, commit rows with duplicate resolution, and
 * download official blank formatted templates.
 *
 * Endpoints Managed:
 * - POST /api/excel/preview  : Parse spreadsheet into rows and run validation checks
 * - POST /api/excel/commit   : Bulk insert / update validated donor rows into database
 * - GET  /api/excel/template : Generate & stream downloadable blank Excel template
 * ============================================================================
 */

const excelService = require('../services/excelService');
const { recordAudit } = require('../middleware/auditMiddleware');

class ExcelController {
  /**
   * Parses uploaded Excel/CSV file into memory and performs dry-run validation
   * Route: POST /api/excel/preview (multipart/form-data with file field)
   */
  async previewFile(req, res) {
    try {
      // Ensure file buffer exists from multer middleware
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, error: 'Please upload an .xlsx or .csv spreadsheet file.' });
      }

      // Step 1: Parse binary buffer into structured JSON objects
      const rawRows = excelService.parseFile(req.file.buffer);

      // Step 2: Validate columns, phone formatting, blood types, and dates
      const previewReport = await excelService.previewAndValidate(rawRows);

      // Respond with summary counts and row-by-row error details
      return res.status(200).json({
        success: true,
        message: `Parsed ${previewReport.totalRows} rows: ${previewReport.validCount} valid, ${previewReport.invalidCount} invalid.`,
        data: previewReport
      });
    } catch (err) {
      console.error('Excel preview error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Commits previously validated spreadsheet rows into the persistent donor database
   * Route: POST /api/excel/commit
   */
  async commitImport(req, res) {
    try {
      const { rows, updateExisting } = req.body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, error: 'No validated rows provided for database commit.' });
      }

      // Execute transactional batch import with deduplication logic
      const importReport = await excelService.commitImport(rows, req.user, updateExisting !== false);

      // Record administrative audit trail entry for compliance
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      await recordAudit({
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'EXCEL_IMPORT_MIGRATION',
        resourceType: 'EXCEL',
        ipAddress: ip,
        details: {
          totalProcessed: importReport.totalProcessed,
          importedCount: importReport.importedCount,
          updatedCount: importReport.updatedCount,
          rejectedCount: importReport.rejectedCount
        }
      });

      // Return commit summary to frontend
      return res.status(200).json({
        success: true,
        message: `Import completed: ${importReport.importedCount} created, ${importReport.updatedCount} updated, ${importReport.rejectedCount} rejected.`,
        report: importReport
      });
    } catch (err) {
      console.error('Excel commit error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Generates and downloads the official standardized Excel import template
   * Route: GET /api/excel/template
   */
  async downloadTemplate(req, res) {
    try {
      // Create workbook buffer with predefined headers and sample guidance rows
      const buffer = excelService.generateSampleTemplate();

      // Configure binary stream response headers for browser file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Blood_Donors_Migration_Template.xlsx"');
      return res.status(200).send(buffer);
    } catch (err) {
      console.error('Template download error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new ExcelController();
