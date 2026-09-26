const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', settingsController.getSettings);
router.put('/', requireRole(['admin']), settingsController.updateSettings);
router.get('/cron-status', settingsController.getCronStatus);
router.post('/trigger-cron', requireRole(['admin']), settingsController.triggerCron);

module.exports = router;
