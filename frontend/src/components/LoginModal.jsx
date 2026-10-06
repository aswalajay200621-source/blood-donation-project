/**
 * ============================================================================
 * File: frontend/src/components/LoginModal.jsx
 * Purpose: Email OTP Two-Factor Authentication Login Modal
 * ----------------------------------------------------------------------------
 * Description:
 * Step 1 (CREDENTIALS): Staff enters email + password.
 * Step 2 (2FA_VERIFY):  A 6-digit code is emailed to their registered address.
 *                       Staff enters that code to access the portal.
 * No QR codes, no Google Authenticator — pure email OTP.
 * ============================================================================
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Key, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, Heart, RefreshCw } from 'lucide-react';

export default function LoginModal() {
  const { loginWithPassword, complete2FALogin } = useAuth();

  const [step, setStep] = useState('CREDENTIALS'); // 'CREDENTIALS' | '2FA_VERIFY'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [temp2FAToken, setTemp2FAToken] = useState('');
  const [destinationEmail, setDestinationEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1: Validate credentials → backend sends OTP to registered email
  const handleCredentialSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginWithPassword(email, password);
      if (res.require2FA) {
        setTemp2FAToken(res.temp2FAToken);
        setDestinationEmail(res.destinationEmail || email);
        setStep('2FA_VERIFY');
        setSuccessMsg(`A 6-digit verification code has been sent to ${res.destinationEmail || email}. Check your inbox.`);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify the OTP code entered by the user
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await complete2FALogin(temp2FAToken, otpCode);
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Go back and re-submit credentials to get a fresh OTP
  const handleResend = () => {
    setStep('CREDENTIALS');
    setOtpCode('');
    setSuccessMsg('');
    setError('Enter your credentials again to receive a new code.');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: '#ffffff',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px 36px',
        boxShadow: 'var(--shadow-lg)'
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'var(--blood-red)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)'
          }}>
            <Heart size={32} color="#ffffff" fill="#ffffff" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
            Hospital Blood Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {step === 'CREDENTIALS'
              ? 'Staff Portal — Secure Sign In'
              : 'Email Verification Required'}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            background: 'var(--blood-red-light)',
            border: '1px solid var(--blood-red-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--blood-red)',
            fontSize: '13px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div style={{
            background: 'var(--status-eligible-bg)',
            border: '1px solid var(--status-eligible-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            color: 'var(--status-eligible)',
            fontSize: '13px'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── STEP 1: Credentials ── */}
        {step === 'CREDENTIALS' && (
          <form onSubmit={handleCredentialSubmit}>
            <div className="form-group">
              <label className="form-label">
                <Mail size={15} color="var(--brand-primary)" />
                <span>Staff / Admin Email</span>
              </label>
              <input
                id="login-email"
                type="email"
                required
                className="form-input"
                placeholder="you@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={15} color="var(--brand-primary)" />
                <span>Password</span>
              </label>
              <input
                id="login-password"
                type="password"
                required
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '12px' }}
            >
              {loading
                ? <><RefreshCw size={16} className="spin" /> Sending OTP...</>
                : <>'Send Verification Code' <ArrowRight size={16} /></>
              }
              {!loading && <>Send Verification Code <ArrowRight size={16} /></>}
            </button>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
              A one-time code will be emailed to your registered address.
            </p>
          </form>
        )}

        {/* ── STEP 2: Email OTP Verification ── */}
        {step === '2FA_VERIFY' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--brand-primary-light)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px'
              }}>
                <Key size={24} color="var(--brand-primary)" />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px 0' }}>
                Enter Your Verification Code
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Code sent to <strong>{destinationEmail}</strong>
              </p>
            </div>

            <div className="form-group">
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                autoFocus
                className="form-input"
                style={{
                  textAlign: 'center',
                  fontSize: '28px',
                  letterSpacing: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  padding: '14px'
                }}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              id="otp-verify"
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '4px' }}
            >
              {loading ? 'Verifying...' : 'Verify & Access Portal'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> Resend Code
            </button>

            <button
              type="button"
              onClick={() => { setStep('CREDENTIALS'); setOtpCode(''); setSuccessMsg(''); }}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '6px' }}
            >
              ← Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
