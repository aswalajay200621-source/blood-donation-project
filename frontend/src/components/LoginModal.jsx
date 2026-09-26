import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldCheck, Key, Lock, Mail, QrCode, AlertCircle, ArrowRight, UserCheck, CheckCircle2, Heart } from 'lucide-react';

export default function LoginModal() {
  const { loginWithPassword, complete2FALogin, complete2FAEnrollment } = useAuth();

  const [step, setStep] = useState('CREDENTIALS'); // 'CREDENTIALS' | '2FA_VERIFY' | '2FA_SETUP'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [temp2FAToken, setTemp2FAToken] = useState('');
  const [tempUserId, setTempUserId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [setupSecret, setSetupSecret] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1: Submit Credentials
  const handleCredentialSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginWithPassword(email, password);
      if (res.require2FA) {
        setTemp2FAToken(res.temp2FAToken);
        setTempUserId(res.user.id);

        if (res.twoFactorSetupNeeded) {
          const setupRes = await api.auth.get2FASetup(res.user.id);
          setQrCodeUrl(setupRes.qrCodeDataUrl);
          setSetupSecret(setupRes.secret);
          setStep('2FA_SETUP');
        } else {
          setStep('2FA_VERIFY');
        }
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2A: Verify 2FA Login
  const handleVerify2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await complete2FALogin(temp2FAToken, totpCode);
    } catch (err) {
      setError(err.message || 'Invalid 6-digit TOTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2B: Complete 2FA First-time Setup
  const handleComplete2FASetup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await complete2FAEnrollment(tempUserId, totpCode);
      setSuccessMsg('2FA Authenticator linked successfully!');
    } catch (err) {
      setError(err.message || 'Invalid code from authenticator. Please check time sync.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Fill
  const fillDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
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
        maxWidth: '460px',
        width: '100%',
        background: '#ffffff',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '36px 32px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'var(--blood-red)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
          }}>
            <Heart size={30} color="#ffffff" fill="#ffffff" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)' }}>
            Hospital Blood Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Medical College Staff Portal & Safety Window System
          </p>
        </div>

        {/* Error / Success Feedback */}
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

        {successMsg && (
          <div style={{
            background: 'var(--status-eligible-bg)',
            border: '1px solid var(--status-eligible-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--status-eligible)',
            fontSize: '13px'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Email + Password */}
        {step === 'CREDENTIALS' && (
          <form onSubmit={handleCredentialSubmit}>
            <div className="form-group">
              <label className="form-label">
                <Mail size={15} color="var(--brand-primary)" />
                <span>Hospital Staff / Admin Email</span>
              </label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@hospital.med"
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
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
            >
              {loading ? 'Authenticating...' : 'Continue to 2FA Verification'}
              <ArrowRight size={16} />
            </button>

            {/* Quick Demo Login Preset Buttons */}
            <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '10px' }}>
                Quick Demo Access (One-Click)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => fillDemo('admin@hospital.med', 'Admin@Hospital2026!')}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', background: '#f8fafc' }}
                >
                  <UserCheck size={14} color="#7e22ce" />
                  <div>
                    <strong style={{ color: '#0f172a' }}>Chief Medical Officer (Admin)</strong> - admin@hospital.med
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('nurse.mary@hospital.med', 'Nurse@Hospital2026!')}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', background: '#f8fafc' }}
                >
                  <UserCheck size={14} color="#0369a1" />
                  <div>
                    <strong style={{ color: '#0f172a' }}>Camp Coordinator (Staff)</strong> - nurse.mary@hospital.med
                  </div>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2A: TOTP 2FA Verification */}
        {step === '2FA_VERIFY' && (
          <form onSubmit={handleVerify2FASubmit}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--brand-primary-light)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <Key size={22} color="var(--brand-primary)" />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Enter 2FA Security Code</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Enter the 6-digit code from your authenticator app (or enter <strong>123456</strong> in demo).
              </p>
            </div>

            <div className="form-group">
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                className="form-input"
                style={{
                  textAlign: 'center',
                  fontSize: '22px',
                  letterSpacing: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700
                }}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setTotpCode('123456')}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '12px' }}
              >
                Auto-Fill Demo Code (123456)
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length < 6}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Verifying...' : 'Verify & Access Portal'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('CREDENTIALS'); setTotpCode(''); }}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '10px' }}
            >
              Back to Login
            </button>
          </form>
        )}

        {/* STEP 2B: TOTP First Time Enrollment with QR Code */}
        {step === '2FA_SETUP' && (
          <form onSubmit={handleComplete2FASetup}>
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '10px',
                background: '#ffffff',
                border: '1px solid var(--border-medium)',
                borderRadius: '10px',
                marginBottom: '10px'
              }}>
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
                ) : (
                  <QrCode size={160} />
                )}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Scan with Google Authenticator</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Scan this QR code in Google Authenticator or Authy to configure 2-Factor Authentication.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ justifyContent: 'center' }}>
                <span>Enter 6-digit code shown in app</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                className="form-input"
                style={{
                  textAlign: 'center',
                  fontSize: '20px',
                  letterSpacing: '6px',
                  fontFamily: 'var(--font-mono)'
                }}
                placeholder="123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length < 6}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Activating...' : 'Complete 2FA Setup'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
