const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/logs', notificationController.getLogs);
router.post('/test-email', requireRole(['admin']), notificationController.testEmail);
router.post('/test-whatsapp', requireRole(['admin']), notificationController.testWhatsApp);

module.exports = router;
