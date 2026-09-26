const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.get('/logs', requireRole(['admin']), auditController.getAuditLogs);

module.exports = router;
