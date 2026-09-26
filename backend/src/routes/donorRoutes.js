const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', donorController.listDonors);
router.get('/check-duplicate', donorController.checkDuplicate);
router.get('/export/csv', donorController.exportDonorsCSV);
router.get('/:id', donorController.getDonor);
router.post('/', donorController.createDonor);
router.post('/:id/donate', donorController.recordNewDonation);
router.put('/:id', donorController.updateDonor);
router.post('/:id/send-reminder', donorController.sendReminder);

module.exports = router;
