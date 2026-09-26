import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Settings,
  Mail,
  MessageSquare,
  Clock,
  Save,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export default function SettingsView({ onSettingsSaved }) {
  const [settings, setSettings] = useState({
    email_enabled: 'false',
    email_smtp_host: 'smtp.hospital.med',
    email_smtp_port: '587',
    whatsapp_enabled: 'true',
    whatsapp_provider: 'mock',
    eligibility_gap_months: '3'
  });

  const [cronStatus, setCronStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settRes, cronRes] = await Promise.all([
        api.settings.get(),
        api.settings.getCronStatus()
      ]);

      if (settRes.success && settRes.settings) {
        setSettings((prev) => ({ ...prev, ...settRes.settings }));
      }
      if (cronRes.success) {
        setCronStatus(cronRes);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      const res = await api.settings.update(settings);
      if (res.success) {
        setFeedback({ type: 'SUCCESS', text: 'System settings saved successfully.' });
        if (onSettingsSaved) onSettingsSaved(settings);
      }
    } catch (err) {
      setFeedback({ type: 'ERROR', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerCron = async () => {
    try {
      setFeedback({ type: 'INFO', text: 'Executing 3-month eligibility cron scan...' });
      const res = await api.settings.triggerCron();
      if (res.success) {
        setFeedback({
          type: 'SUCCESS',
          text: `Scan finished: ${res.result.eligibleDonorsFound} eligible donors identified, ${res.result.sentCount} reminders dispatched.`
        });
      }
    } catch (err) {
      setFeedback({ type: 'ERROR', text: err.message || 'Cron scan failed.' });
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'var(--brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Settings size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)' }}>System & Integration Settings</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
              Configure SMTP standby status, WhatsApp API provider keys, and daily cron frequency
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div style={{
          background: feedback.type === 'SUCCESS' ? 'var(--status-eligible-bg)' : 'var(--blood-red-light)',
          border: `1px solid ${feedback.type === 'SUCCESS' ? 'var(--status-eligible-border)' : 'var(--blood-red-border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: feedback.type === 'SUCCESS' ? 'var(--status-eligible)' : 'var(--blood-red)' }}>
            {feedback.type === 'SUCCESS' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="btn btn-secondary btn-sm">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Email SMTP Configuration & Standby Switch */}
        <div className="classic-card">
          <div className="neon-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={18} color="var(--brand-primary)" />
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Nodemailer Email Integration</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: settings.email_enabled === 'true' ? 'var(--status-eligible)' : 'var(--status-due-soon)' }}>
                {settings.email_enabled === 'true' ? 'ENABLED (LIVE SENDS)' : 'STANDBY (OFF BY DEFAULT)'}
              </span>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, email_enabled: settings.email_enabled === 'true' ? 'false' : 'true' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {settings.email_enabled === 'true' ? (
                  <ToggleRight size={32} color="#16a34a" />
                ) : (
                  <ToggleLeft size={32} color="#94a3b8" />
                )}
              </button>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            As per hospital compliance, email sending logic is wired and templated but kept on <strong>STANDBY by default</strong> until hospital IT activates SMTP credentials.
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Hospital SMTP Host</label>
              <input
                type="text"
                className="form-input"
                value={settings.email_smtp_host || ''}
                onChange={(e) => setSettings({ ...settings, email_smtp_host: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Port</label>
              <input
                type="number"
                className="form-input"
                value={settings.email_smtp_port || '587'}
                onChange={(e) => setSettings({ ...settings, email_smtp_port: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Provider Switcher */}
        <div className="classic-card">
          <div className="neon-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={18} color="#16a34a" />
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>WhatsApp Business Provider</h2>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Active Provider Driver</label>
            <select
              className="form-select"
              value={settings.whatsapp_provider || 'mock'}
              onChange={(e) => setSettings({ ...settings, whatsapp_provider: e.target.value })}
            >
              <option value="mock">Mock Simulator (Built-in Development & Testing)</option>
              <option value="meta_cloud">Meta Cloud WhatsApp Business API (Official Graph API)</option>
              <option value="twilio">Twilio WhatsApp Messaging API</option>
              <option value="gupshup">Gupshup Enterprise Messaging Gateway</option>
            </select>
          </div>
        </div>

        {/* Automated 3-Month Eligibility Cron Job */}
        <div className="classic-card">
          <div className="neon-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} color="var(--brand-primary)" />
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Daily 3-Month Eligibility Scheduler</h2>
            </div>
            <button
              type="button"
              onClick={handleTriggerCron}
              className="btn btn-secondary btn-sm"
            >
              Run Cron Scan Now
            </button>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Schedule: <strong style={{ color: 'var(--text-dark)' }}>0 8 * * * (Every morning at 08:00 AM)</strong>. Automatically scans all donors who reached the 3-month gap and queues reminder alerts.
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving} className="btn btn-primary btn-lg">
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
