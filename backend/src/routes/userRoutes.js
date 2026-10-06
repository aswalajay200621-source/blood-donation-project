/**
 * ============================================================================
 * File: backend/src/routes/userRoutes.js
 * Purpose: Routing Declarations for Staff/User Management
 * ----------------------------------------------------------------------------
 * Description:
 * Defines URL routes for hospital user management. All routes require admin
 * privileges.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Secure all routes in this file - strictly admin only
router.use(verifyToken);
router.use(requireRole(['admin']));

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
