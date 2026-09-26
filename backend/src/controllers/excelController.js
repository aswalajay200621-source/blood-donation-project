const excelService = require('../services/excelService');
const { recordAudit } = require('../middleware/auditMiddleware');

class ExcelController {
  // POST /api/excel/preview
  async previewFile(req, res) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, error: 'Please upload an .xlsx or .csv spreadsheet file.' });
      }

      const rawRows = excelService.parseFile(req.file.buffer);
      const previewReport = await excelService.previewAndValidate(rawRows);

      return res.status(200).json({
        success: true,
        message: `Parsed ${previewReport.totalRows} rows: ${previewReport.validCount} valid, ${previewReport.invalidCount} invalid.`,
        data: previewReport
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // POST /api/excel/commit
  async commitImport(req, res) {
    try {
      const { rows, updateExisting } = req.body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, error: 'No validated rows provided for database commit.' });
      }

      const importReport = await excelService.commitImport(rows, req.user, updateExisting !== false);

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

      return res.status(200).json({
        success: true,
        message: `Import completed: ${importReport.importedCount} created, ${importReport.updatedCount} updated, ${importReport.rejectedCount} rejected.`,
        report: importReport
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET /api/excel/template
  async downloadTemplate(req, res) {
    try {
      const buffer = excelService.generateSampleTemplate();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="Blood_Donors_Migration_Template.xlsx"');
      return res.status(200).send(buffer);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new ExcelController();
