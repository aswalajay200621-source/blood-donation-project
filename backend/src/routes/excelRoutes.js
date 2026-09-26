const express = require('express');
const multer = require('multer');
const router = express.Router();
const excelController = require('../controllers/excelController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { fileOpLimiter } = require('../middleware/rateLimiter');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

router.use(verifyToken);

router.post('/preview', fileOpLimiter, upload.single('file'), excelController.previewFile);
router.post('/commit', fileOpLimiter, excelController.commitImport);
router.get('/template', excelController.downloadTemplate);

module.exports = router;
