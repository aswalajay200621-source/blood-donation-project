/**
 * ============================================================================
 * File: backend/src/controllers/userController.js
 * Purpose: Staff/User Management API Endpoints
 * ----------------------------------------------------------------------------
 * Description:
 * Manages hospital staff accounts. These endpoints are strictly for Admins.
 * ============================================================================
 */

const bcrypt = require('bcryptjs');
const { query } = require('../db/db');
const { v4: uuidv4 } = require('crypto');

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).substring(2, 11);
}

class UserController {
  // Get all registered users
  async getAllUsers(req, res) {
    try {
      const result = await query(
        'SELECT id, email, name, role, two_factor_enabled, is_active, created_at FROM users ORDER BY created_at DESC'
      );
      return res.status(200).json({ success: true, users: result.rows });
    } catch (err) {
      console.error('Error fetching users:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
  }

  // Register a new staff/admin user
  async createUser(req, res) {
    try {
      const { email, name, password, role } = req.body;
      
      if (!email || !name || !password || !role) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // Check if email already exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = genId();

      await query(
        `INSERT INTO users (id, email, name, password_hash, role, two_factor_enabled, is_active)
         VALUES ($1, $2, $3, $4, $5, 0, 1)`,
        [userId, email.toLowerCase(), name, passwordHash, role]
      );

      return res.status(201).json({ success: true, message: 'User created successfully' });
    } catch (err) {
      console.error('Error creating user:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to create user' });
    }
  }

  // Deactivate/Delete a user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      if (id === req.user.id) {
        return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
      }

      // Prevent deleting the primary admin account for safety
      const userRes = await query('SELECT email FROM users WHERE id = $1', [id]);
      if (userRes.rows.length > 0 && userRes.rows[0].email === 'admin@hospital.med') {
        return res.status(403).json({ success: false, error: 'Cannot delete the primary root admin account' });
      }

      await query('DELETE FROM users WHERE id = $1', [id]);

      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      console.error('Error deleting user:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
  }
}

module.exports = new UserController();
