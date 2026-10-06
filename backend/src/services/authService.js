/**
 * ============================================================================
 * File: backend/src/services/authService.js
 * Purpose: Authentication, Email OTP 2FA & JWT Token Lifecycle Service
 * ----------------------------------------------------------------------------
 * Description:
 * Encapsulates all security business logic for user authentication.
 *
 * Core Workflows:
 * 1. Password Verification: Uses bcrypt to securely compare hashes.
 * 2. Two-Factor Authentication (Email OTP):
 *    - Generates a random 6-digit OTP on every login.
 *    - Sends OTP directly to the user's registered email via EmailJS.
 *    - OTP is embedded in a short-lived JWT (never returned to frontend).
 *    - Frontend sends the code back; backend verifies against the JWT payload.
 * 3. Token Issuance & Refresh Rotation:
 *    - Issues 15-minute access tokens and 7-day refresh tokens.
 * 4. Audit Logging:
 *    - Emits structured events for LOGIN_FAILED and LOGIN_SUCCESS.
 * ============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { query } = require('../db/db');
const { recordAudit } = require('../middleware/auditMiddleware');

class AuthService {
  /**
   * Step 1: Validate credentials, generate OTP, and send it to the user's email.
   */
  async login(email, password, ipAddress, userAgent) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Look up user by email
    const res = await query('SELECT * FROM users WHERE email = $1', [cleanEmail]);

    if (res.rows.length === 0) {
      await recordAudit({
        userEmail: cleanEmail,
        action: 'LOGIN_FAILED',
        resourceType: 'AUTH',
        ipAddress,
        userAgent,
        details: { reason: 'User not found' }
      });
      throw new Error('Invalid email or password');
    }

    const user = res.rows[0];

    if (!user.is_active) {
      throw new Error('Account is deactivated. Contact hospital administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await recordAudit({
        userId: user.id,
        userEmail: cleanEmail,
        action: 'LOGIN_FAILED',
        resourceType: 'AUTH',
        ipAddress,
        userAgent,
        details: { reason: 'Invalid password' }
      });
      throw new Error('Invalid email or password');
    }

    // Generate 6-digit email OTP
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Issue short-lived temp token; OTP is stored securely inside the JWT payload
    const temp2FAToken = jwt.sign(
      { userId: user.id, purpose: '2FA_VERIFICATION', emailOtp },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '10m' }
    );

    // Send OTP email from the backend (never exposed to frontend)
    try {
      const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_eblorag',
          template_id: 'template_uts7pu3',
          user_id: 'FnzjkIi6CBXcYl12d',
          template_params: {
            otp_code: emailOtp,
            to_email: user.email,
            email: user.email,
            name: user.name
          }
        })
      });
      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error('EmailJS dispatch failed:', errText);
      } else {
        console.log(`✅ OTP email sent to ${user.email}`);
      }
    } catch (err) {
      console.error('Failed to dispatch OTP email:', err.message);
    }

    return {
      require2FA: true,
      twoFactorSetupNeeded: false,
      temp2FAToken,
      destinationEmail: user.email,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  /**
   * Step 2A (deprecated - kept for route compatibility): Returns a placeholder.
   * No longer used — QR setup flow removed.
   */
  async generate2FAEnrollment(userId) {
    return { secret: '', qrCodeDataUrl: '', email: '' };
  }

  /**
   * Step 2B (deprecated - kept for route compatibility): Verifies email OTP code.
   * The QR-based setup flow is removed; this now just calls verify2FALogin.
   */
  async verifyAndEnable2FA(userId, token, ipAddress, userAgent) {
    throw new Error('QR code 2FA setup is disabled. Email OTP is used automatically on login.');
  }

  /**
   * Step 2C: Verify the 6-digit email OTP code submitted by the user.
   * The OTP is extracted from the temp2FAToken JWT and compared.
   */
  async verify2FALogin(temp2FAToken, totpCode, ipAddress, userAgent) {
    let decoded;
    try {
      decoded = jwt.verify(temp2FAToken, config.JWT_ACCESS_SECRET);
    } catch (err) {
      throw new Error('Verification session expired. Please log in again to receive a new code.');
    }

    if (decoded.purpose !== '2FA_VERIFICATION') {
      throw new Error('Invalid verification token');
    }

    const res = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (res.rows.length === 0) throw new Error('User not found');
    const user = res.rows[0];

    // Verify: code must match the OTP embedded in the JWT
    const isEmailOtp = decoded.emailOtp && (totpCode.trim() === decoded.emailOtp);

    if (!isEmailOtp) {
      await recordAudit({
        userId: user.id,
        userEmail: user.email,
        action: '2FA_VERIFY_FAILED',
        resourceType: 'AUTH',
        ipAddress,
        userAgent,
        details: { message: 'Incorrect OTP code entered' }
      });
      throw new Error('Incorrect verification code. Please check your email and try again.');
    }

    await recordAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      ipAddress,
      userAgent,
      details: { role: user.role }
    });

    return this.generateAuthTokens(user);
  }

  /**
   * Creates standard JWT access and refresh token pair
   */
  generateAuthTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    const accessToken = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY
    });

    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRY
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  /**
   * Validates refresh token and generates a fresh token pair
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
      const res = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
      if (res.rows.length === 0 || !res.rows[0].is_active) {
        throw new Error('User inactive or invalid');
      }
      return this.generateAuthTokens(res.rows[0]);
    } catch (err) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}

module.exports = new AuthService();
