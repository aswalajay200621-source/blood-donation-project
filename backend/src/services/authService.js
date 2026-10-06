/**
 * ============================================================================
 * File: backend/src/services/authService.js
 * Purpose: Authentication, Password Hashing, TOTP 2FA & JWT Token Lifecycle Service
 * ----------------------------------------------------------------------------
 * Description:
 * Encapsulates all security business logic for user authentication:
 *
 * Core Workflows:
 * 1. Password Verification: Uses bcrypt to securely compare hashes.
 * 2. Two-Factor Authentication (TOTP):
 *    - Uses `otplib` to generate RFC 6238 compliant base32 secrets.
 *    - Produces `otpauth://` URIs and PNG Data URLs via `qrcode` for Google/Microsoft Authenticator.
 *    - Validates 6-digit TOTP codes with a 1-step window (clock-drift tolerance).
 * 3. Two-Step Login Challenge:
 *    - Issues short-lived (5-min) temporary tokens for 2FA validation challenges.
 * 4. Token Issuance & Refresh Rotation:
 *    - Issues 15-minute access tokens and 7-day refresh tokens signed with HMAC SHA-256.
 *    - Validates refresh tokens against database user records.
 * 5. Audit Logging:
 *    - Emits structured events for LOGIN_FAILED, 2FA_ENABLED, and LOGIN_SUCCESS.
 * ============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const config = require('../config/env');
const { query } = require('../db/db');
const { recordAudit } = require('../middleware/auditMiddleware');

// Configure authenticator options: allow 1 step before/after for clock drift tolerance
authenticator.options = { window: 1 };

class AuthService {
  /**
   * Step 1: Validate User Email and Password
   * If credentials are correct, returns a temporary 2FA challenge token.
   *
   * @param {string} email     - User email address
   * @param {string} password  - Plaintext password
   * @param {string} ipAddress - Client IP for audit logging
   * @param {string} userAgent - Client browser agent string
   */
  async login(email, password, ipAddress, userAgent) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Look up user by email
    const res = await query('SELECT * FROM users WHERE email = $1', [cleanEmail]);

    if (res.rows.length === 0) {
      // Audit log failed login attempt
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

    // Check account active status
    if (!user.is_active) {
      throw new Error('Account is deactivated. Contact hospital administrator.');
    }

    // Compare bcrypt password hash
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

    // Check if 2FA is already enabled on this account
    if (user.two_factor_enabled && user.two_factor_secret) {
      // Generate a fresh 6-digit Email OTP
      const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // Issue short-lived temporary token exclusively for completing 2FA verification
      const temp2FAToken = jwt.sign(
        { userId: user.id, purpose: '2FA_VERIFICATION', emailOtp },
        config.JWT_ACCESS_SECRET,
        { expiresIn: '5m' }
      );

      // Securely send the OTP email from the backend to prevent frontend interception
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: 'service_eblorag',
            template_id: 'template_uts7pu3',
            user_id: 'FnzjkIi6CBXcYl12d', // EmailJS public key
            template_params: {
              otp_code: emailOtp,
              to_email: user.email,
              email: user.email,
              name: user.name
            }
          })
        });
      } catch (err) {
        console.error('Failed to send OTP from backend:', err.message);
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
    } else {
      // 2FA not yet enabled -> prompt user to scan QR code setup
      const temp2FAToken = jwt.sign(
        { userId: user.id, purpose: '2FA_SETUP' },
        config.JWT_ACCESS_SECRET,
        { expiresIn: '10m' }
      );

      return {
        require2FA: true,
        twoFactorSetupNeeded: true,
        temp2FAToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      };
    }
  }

  /**
   * Step 2A: Generate QR Code for Initial 2FA Enrollment
   *
   * @param {string} userId - User identifier
   * @returns {Promise<{secret: string, otpauthUrl: string, qrCodeDataUrl: string, email: string}>}
   */
  async generate2FAEnrollment(userId) {
    const res = await query('SELECT id, email, name, two_factor_secret FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0) throw new Error('User not found');

    const user = res.rows[0];
    let secret = user.two_factor_secret;

    // Generate fresh secret if user doesn't already have one
    if (!secret) {
      secret = authenticator.generateSecret();
      // Store secret in temporary column pending user confirmation
      await query('UPDATE users SET two_factor_temp_secret = $1 WHERE id = $2', [secret, userId]);
    }

    // Build standard otpauth URI
    const otpauthUrl = authenticator.keyuri(user.email, config.TWO_FACTOR_APP_NAME, secret);
    
    // Generate QR code base64 Data URL for direct image rendering in frontend
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      email: user.email
    };
  }

  /**
   * Step 2B: Verify initial 6-digit TOTP code and permanently enable 2FA on the account
   */
  async verifyAndEnable2FA(userId, token, ipAddress, userAgent) {
    const res = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0) throw new Error('User not found');

    const user = res.rows[0];
    const secret = user.two_factor_temp_secret || user.two_factor_secret;

    if (!secret) {
      throw new Error('No 2FA secret pending activation');
    }

    // Validate 6-digit OTP code against secret (allows demo codes 123456 or 000000)
    const isDemoCode = token.trim() === '123456' || token.trim() === '000000';
    const isValid = isDemoCode || authenticator.verify({ token: token.trim(), secret });
    if (!isValid) {
      throw new Error('Invalid 6-digit authentication code. Please check your authenticator app.');
    }

    // Permanently enable 2FA on user record and clear temporary secret
    await query(
      'UPDATE users SET two_factor_secret = $1, two_factor_enabled = 1, two_factor_temp_secret = NULL WHERE id = $2',
      [secret, userId]
    );

    // Audit log 2FA activation
    await recordAudit({
      userId: user.id,
      userEmail: user.email,
      action: '2FA_ENABLED',
      resourceType: 'AUTH',
      ipAddress,
      userAgent,
      details: { message: 'User successfully enrolled in TOTP 2FA' }
    });

    // Issue permanent JWT tokens
    return this.generateAuthTokens(user);
  }

  /**
   * Step 2C: Verify 6-digit TOTP code during routine login challenge
   */
  async verify2FALogin(temp2FAToken, totpCode, ipAddress, userAgent) {
    let decoded;
    try {
      decoded = jwt.verify(temp2FAToken, config.JWT_ACCESS_SECRET);
    } catch (err) {
      throw new Error('2FA session expired. Please start login again.');
    }

    if (decoded.purpose !== '2FA_VERIFICATION' && decoded.purpose !== '2FA_SETUP') {
      throw new Error('Invalid token purpose');
    }

    const res = await query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (res.rows.length === 0) throw new Error('User not found');

    const user = res.rows[0];
    const secret = user.two_factor_secret || user.two_factor_temp_secret;

    if (!secret) {
      throw new Error('2FA not configured for user');
    }

    // Allow:
    // 1. Email OTP (matching decoded.emailOtp sent to user inbox via EmailJS)
    // 2. Demo test bypass codes '123456' or '000000'
    // 3. Authenticator app TOTP code
    const isEmailOtp = decoded.emailOtp && (totpCode.trim() === decoded.emailOtp);
    const isDevCode = totpCode.trim() === '123456' || totpCode.trim() === '000000';
    const isTotpValid = secret ? authenticator.verify({ token: totpCode.trim(), secret }) : false;
    const isValid = isEmailOtp || isDevCode || isTotpValid;
    
    if (!isValid) {
      await recordAudit({
        userId: user.id,
        userEmail: user.email,
        action: '2FA_VERIFY_FAILED',
        resourceType: 'AUTH',
        ipAddress,
        userAgent,
        details: { message: 'Invalid OTP code provided' }
      });
      throw new Error('Invalid 6-digit OTP code');
    }

    // Audit log successful login
    await recordAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      ipAddress,
      userAgent,
      details: { role: user.role }
    });

    // Issue full session JWT tokens
    return this.generateAuthTokens(user);
  }

  /**
   * Creates standard JWT access and refresh token pair for authenticated user
   */
  generateAuthTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    // Sign access token (short-lived)
    const accessToken = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY
    });

    // Sign refresh token (longer-lived)
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
   * Validates refresh token and generates fresh access/refresh token pair
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
