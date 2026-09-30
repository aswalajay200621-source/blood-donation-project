/**
 * ============================================================================
 * File: frontend/src/components/SettingsView.jsx
 * Purpose: Hospital System Settings, Notification Gateways & Scheduler Controls
 * ----------------------------------------------------------------------------
 * Description:
 * Administrative control panel for configuring system-wide operational policies:
 *
 * Configurable Options:
 * 1. Communication Gateways:
 *    - WhatsApp toggle & active provider selection ('mock', 'meta_cloud', 'twilio').
 *    - Email SMTP toggle (kept in Standby by default until hospital IT activates SMTP).
 * 2. Clinical Policy:
 *    - Mandatory inter-donation waiting gap (default: 3 months / 90 days).
 * 3. Daily Cron Scheduler Monitor:
 *    - Shows real-time scheduler health, cron pattern ('0 8 * * *' at 8 AM),
 *      and timestamp of the most recent 3-month eligibility recall scan.
 * ============================================================================
 */

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
  ToggleRight,
  ChevronDown
} from 'lucide-react';

export default function SettingsView({ onSettingsSaved }) {
  // Hospital system settings state
  const [settings, setSettings] = useState({
    email_enabled: 'false',
    email_smtp_host: 'smtp.hospital.med',
    email_smtp_port: '587',
    whatsapp_enabled: 'true',
    whatsapp_provider: 'mock',
    eligibility_gap_months: '3'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * Loads system settings on mount
   */
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.settings.get();
      if (res.success && res.settings) {
        setSettings((prev) => ({ ...prev, ...res.settings }));
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
        setFeedback({ type: 'SUCCESS', text: 'Settings updated successfully.' });
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
      setFeedback({ type: 'INFO', text: 'Executing 3-month eligibility scan...' });
      const res = await api.settings.triggerCron();
      if (res.success) {
        setFeedback({
          type: 'SUCCESS',
          text: `Scan finished: ${res.result.eligibleDonorsFound} eligible donors checked, ${res.result.sentCount} reminders dispatched.`
        });
      }
    } catch (err) {
      setFeedback({ type: 'ERROR', text: err.message || 'Scan failed.' });
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Settings size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
              System Preferences
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '3px 0 0 0' }}>
              Manage notification channels and automated donor reminder schedules
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
        {/* Simplified Channels & Scheduler Card */}
        <div className="classic-card" style={{ padding: '0', overflow: 'hidden' }}>
          {/* WhatsApp Channel Row */}
          <div style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-light)',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
                flexShrink: 0
              }}>
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 3px 0', color: 'var(--text-dark)' }}>
                  WhatsApp Messages
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Send WhatsApp alerts for donor eligibility and emergency shortage recalls
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <span className={`status-pill ${settings.whatsapp_enabled === 'true' ? 'eligible' : 'blocked'}`}>
                {settings.whatsapp_enabled === 'true' ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, whatsapp_enabled: settings.whatsapp_enabled === 'true' ? 'false' : 'true' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                title="Toggle WhatsApp"
              >
                {settings.whatsapp_enabled === 'true' ? (
                  <ToggleRight size={34} color="#16a34a" />
                ) : (
                  <ToggleLeft size={34} color="#94a3b8" />
                )}
              </button>
            </div>
          </div>

          {/* Email Channel Row */}
          <div style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-light)',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--brand-primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)',
                flexShrink: 0
              }}>
                <Mail size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 3px 0', color: 'var(--text-dark)' }}>
                  Email Notifications
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Send email notices to eligible donors after their 3-month clearance
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <span className={`status-pill ${settings.email_enabled === 'true' ? 'eligible' : 'due-soon'}`}>
                {settings.email_enabled === 'true' ? 'Enabled' : 'Standby'}
              </span>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, email_enabled: settings.email_enabled === 'true' ? 'false' : 'true' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                title="Toggle Email"
              >
                {settings.email_enabled === 'true' ? (
                  <ToggleRight size={34} color="#16a34a" />
                ) : (
                  <ToggleLeft size={34} color="#94a3b8" />
                )}
              </button>
            </div>
          </div>

          {/* Automated Daily Scan Row */}
          <div style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b45309',
                flexShrink: 0
              }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-dark)' }}>
                    Daily Automated Reminder Scan
                  </h3>
                  <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    Every Day at 8:00 AM
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                  Automatically checks all donors who reached the 3-month gap and prepares reminders
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTriggerCron}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} />
              <span>Run Daily Scan Now</span>
            </button>
          </div>
        </div>

        {/* Optional Collapsible Technical Settings */}
        <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: '#ffffff', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              width: '100%',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: '#64748b'
            }}
          >
            <span>Advanced Server & Gateway Settings</span>
            <ChevronDown size={16} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showAdvanced && (
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Hospital SMTP Server</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.email_smtp_host || ''}
                    onChange={(e) => setSettings({ ...settings, email_smtp_host: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>SMTP Port</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.email_smtp_port || '587'}
                    onChange={(e) => setSettings({ ...settings, email_smtp_port: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px' }}>WhatsApp Provider Engine</label>
                <select
                  className="form-select"
                  value={settings.whatsapp_provider || 'mock'}
                  onChange={(e) => setSettings({ ...settings, whatsapp_provider: e.target.value })}
                >
                  <option value="mock">Mock Simulator (Built-in Testing)</option>
                  <option value="meta_cloud">Meta Cloud API</option>
                  <option value="twilio">Twilio Messaging API</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '10px 22px' }}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
