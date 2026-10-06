/**
 * ============================================================================
 * File: frontend/src/components/LoginModal.jsx
 * Purpose: Email OTP Two-Factor Authentication Login Modal
 * ----------------------------------------------------------------------------
 * Flow:
 * Step 1 (CREDENTIALS) → Backend validates credentials, generates OTP,
 *                         returns it to frontend.
 * Step 2 (2FA_VERIFY)  → Frontend sends OTP to user's email via EmailJS
 *                         (browser SDK). User enters the code to log in.
 * ============================================================================
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendOtpEmail } from '../services/emailService';
import { Key, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, Heart, RefreshCw, Loader2 } from 'lucide-react';

export default function LoginModal() {
  const { loginWithPassword, complete2FALogin } = useAuth();

  const [step, setStep] = useState('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [temp2FAToken, setTemp2FAToken] = useState('');
  const [destinationEmail, setDestinationEmail] = useState('');
  const [cachedOtp, setCachedOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sends OTP via EmailJS browser SDK
  const dispatchOtpEmail = async (otp, toEmail, userName) => {
    setSending(true);
    setError('');
    try {
      const result = await sendOtpEmail(otp, toEmail, userName);
      if (result.success) {
        setSuccessMsg(`✅ Verification code sent to ${toEmail}. Check your inbox (and spam folder).`);
      } else {
        setError(`Email delivery failed: ${result.error}. Please try again.`);
      }
    } catch (err) {
      setError('Could not send OTP email. Check your internet connection.');
    } finally {
      setSending(false);
    }
  };

  // Step 1: Validate credentials → get OTP from backend → dispatch email
  const handleCredentialSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await loginWithPassword(email, password);
      if (res.require2FA) {
        setTemp2FAToken(res.temp2FAToken);
        setDestinationEmail(res.destinationEmail || email);
        setCachedOtp(res.emailOtp);

        // Move to OTP screen immediately
        setStep('2FA_VERIFY');

        // Dispatch OTP email via EmailJS (browser SDK)
        await dispatchOtpEmail(res.emailOtp, res.destinationEmail || email, res.user?.name || 'Staff');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP entered by user
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

  // Resend OTP using cached value
  const handleResend = async () => {
    if (!cachedOtp || !destinationEmail) {
      setStep('CREDENTIALS');
      setOtpCode('');
      setSuccessMsg('');
      setError('Enter your credentials again to receive a new code.');
      return;
    }
    await dispatchOtpEmail(cachedOtp, destinationEmail);
  };

  const cardStyle = {
    maxWidth: '420px',
    width: '100%',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '40px 36px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.10)'
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
    color: '#0f172a'
  };

  const primaryBtn = {
    width: '100%',
    padding: '12px',
    background: '#1e40af',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '14px',
    transition: 'background 0.15s'
  };

  const secondaryBtn = {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    color: '#475569',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '8px',
    transition: 'background 0.15s'
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
      <div style={cardStyle}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: '#dc2626', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: '14px', boxShadow: '0 4px 14px rgba(220,38,38,0.3)'
          }}>
            <Heart size={30} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Hospital Blood Center
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            {step === 'CREDENTIALS' ? 'Staff Portal — Secure Sign In' : 'Email Verification Required'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '10px', padding: '11px 14px', marginBottom: '16px',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            color: '#dc2626', fontSize: '13px'
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {successMsg && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: '10px', padding: '11px 14px', marginBottom: '16px',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            color: '#15803d', fontSize: '13px'
          }}>
            <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── STEP 1: Credentials ── */}
        {step === 'CREDENTIALS' && (
          <form onSubmit={handleCredentialSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                <Mail size={14} color="#1e40af" /> Staff / Admin Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                style={inputStyle}
                placeholder="you@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                <Lock size={14} color="#1e40af" /> Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                style={inputStyle}
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
              style={{ ...primaryBtn, opacity: loading ? 0.75 : 1 }}
            >
              {loading ? (
                <><Loader2 size={17} className="spin" /> Sending Code...</>
              ) : (
                <>Send Verification Code <ArrowRight size={17} /></>
              )}
            </button>

            <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '14px' }}>
              A one-time code will be emailed to your registered address.
            </p>
          </form>
        )}

        {/* ── STEP 2: OTP Verification ── */}
        {step === '2FA_VERIFY' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: '#eff6ff', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: '10px'
              }}>
                {sending ? <Loader2 size={22} color="#1e40af" className="spin" /> : <Key size={22} color="#1e40af" />}
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a' }}>
                Enter Your Verification Code
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                {sending ? 'Sending code...' : <>Code sent to <strong style={{ color: '#0f172a' }}>{destinationEmail}</strong></>}
              </p>
            </div>

            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              required
              maxLength={6}
              autoFocus
              style={{
                ...inputStyle,
                textAlign: 'center',
                fontSize: '30px',
                letterSpacing: '12px',
                fontWeight: 700,
                fontFamily: 'monospace',
                padding: '16px',
                borderColor: otpCode.length === 6 ? '#1e40af' : '#e2e8f0'
              }}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            />

            <button
              id="otp-verify"
              type="submit"
              disabled={loading || otpCode.length < 6}
              style={{ ...primaryBtn, opacity: (loading || otpCode.length < 6) ? 0.65 : 1 }}
            >
              {loading ? <><Loader2 size={17} className="spin" /> Verifying...</> : 'Verify & Access Portal'}
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={handleResend}
              style={secondaryBtn}
            >
              <RefreshCw size={14} />
              {sending ? 'Resending...' : 'Resend Code'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('CREDENTIALS'); setOtpCode(''); setSuccessMsg(''); setError(''); }}
              style={{ ...secondaryBtn, color: '#94a3b8', borderColor: '#f1f5f9' }}
            >
              ← Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
