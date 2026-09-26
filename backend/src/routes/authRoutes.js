const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', loginLimiter, authController.login);
router.get('/2fa-setup', authController.get2FASetup);
router.post('/verify-2fa-setup', loginLimiter, authController.verify2FASetup);
router.post('/verify-2fa-login', loginLimiter, authController.verify2FALogin);
router.post('/refresh', authController.refreshToken);
router.get('/me', verifyToken, authController.getCurrentUser);

module.exports = router;
