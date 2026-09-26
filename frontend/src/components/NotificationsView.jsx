import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  Send,
  Mail,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function NotificationsView({ systemSettings }) {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testSendingEmail, setTestSendingEmail] = useState(false);
  const [testSendingWa, setTestSendingWa] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.notifications.getLogs({
        channel: channelFilter,
        status: statusFilter
      });
      if (res.success) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.error('Error fetching notification logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [channelFilter, statusFilter]);

  const handleTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail) return;
    try {
      setTestSendingEmail(true);
      setTestResult(null);
      const res = await api.notifications.testEmail(testEmail);
      setTestResult({
        type: 'EMAIL',
        success: res.success,
        message: res.message || 'Test email triggered.'
      });
      fetchLogs();
    } catch (err) {
      setTestResult({ type: 'EMAIL', success: false, message: err.message });
    } finally {
      setTestSendingEmail(false);
    }
  };

  const handleTestWhatsApp = async (e) => {
    e.preventDefault();
    if (!testPhone) return;
    try {
      setTestSendingWa(true);
      setTestResult(null);
      const res = await api.notifications.testWhatsApp(testPhone);
      setTestResult({
        type: 'WHATSAPP',
        success: res.success,
        message: res.message || 'Test WhatsApp triggered.'
      });
      fetchLogs();
    } catch (err) {
      setTestResult({ type: 'WHATSAPP', success: false, message: err.message });
    } finally {
      setTestSendingWa(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)' }}>Notification Dispatch Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Automated multi-channel 3-month eligibility reminders & donor appreciation dispatches
          </p>
        </div>

        <button onClick={fetchLogs} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Integration Status Cards */}
      <div className="grid-2">
        {/* WhatsApp Card */}
        <div className="classic-card" style={{ borderTop: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a'
              }}>
                <MessageSquare size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>WhatsApp Business Dispatch</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Provider: <strong>{systemSettings?.whatsapp_provider || 'Mock Simulator'}</strong>
                </div>
              </div>
            </div>
            <span className="status-pill eligible">Active</span>
          </div>

          {isAdmin && (
            <form onSubmit={handleTestWhatsApp} style={{ marginTop: '18px', display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit test phone"
                className="form-input"
                style={{ fontSize: '14px', fontFamily: 'var(--font-mono)' }}
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
              />
              <button
                type="submit"
                disabled={testSendingWa || testPhone.length !== 10}
                className="btn btn-success btn-sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                <Send size={14} />
                <span>{testSendingWa ? 'Sending...' : 'Test WhatsApp'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Email Card */}
        <div className="classic-card" style={{ borderTop: '4px solid var(--brand-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'var(--brand-primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)'
              }}>
                <Mail size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Nodemailer Email Integration</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  State: <strong>{systemSettings?.email_enabled === 'true' ? 'Active SMTP' : 'Standby (Disabled by default)'}</strong>
                </div>
              </div>
            </div>
            <span className={`status-pill ${systemSettings?.email_enabled === 'true' ? 'eligible' : 'due-soon'}`}>
              {systemSettings?.email_enabled === 'true' ? 'Active' : 'Standby'}
            </span>
          </div>

          {isAdmin && (
            <form onSubmit={handleTestEmail} style={{ marginTop: '18px', display: 'flex', gap: '8px' }}>
              <input
                type="email"
                placeholder="Test recipient email"
                className="form-input"
                style={{ fontSize: '14px' }}
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <button
                type="submit"
                disabled={testSendingEmail || !testEmail}
                className="btn btn-primary btn-sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                <Send size={14} />
                <span>{testSendingEmail ? 'Sending...' : 'Test Email'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Test Feedback */}
      {testResult && (
        <div style={{
          background: testResult.success ? 'var(--status-eligible-bg)' : 'var(--blood-red-light)',
          border: `1px solid ${testResult.success ? 'var(--status-eligible-border)' : 'var(--blood-red-border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: testResult.success ? 'var(--status-eligible)' : 'var(--blood-red)' }}>
            {testResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{testResult.message}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="btn btn-secondary btn-sm">
            Dismiss
          </button>
        </div>
      )}

      {/* Logs Table */}
      <div className="classic-card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--brand-primary)" />
            <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Dispatch History & Delivery Logs</h2>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="form-select"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              style={{ minHeight: '36px', padding: '4px 10px', fontSize: '13px' }}
            >
              <option value="ALL">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minHeight: '36px', padding: '4px 10px', fontSize: '13px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="sent">Sent / Delivered</option>
              <option value="standby_skipped">Standby Skipped</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="neon-table-container">
          <table className="neon-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Recipient / Donor</th>
                <th>Template Event</th>
                <th>Status</th>
                <th>Provider Engine</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading dispatch logs...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '11px',
                        background: log.channel === 'whatsapp' ? 'var(--status-eligible-bg)' : 'var(--brand-primary-light)',
                        color: log.channel === 'whatsapp' ? 'var(--status-eligible)' : 'var(--brand-primary)'
                      }}>
                        {log.channel === 'whatsapp' ? <MessageSquare size={13} /> : <Mail size={13} />}
                        {log.channel.toUpperCase()}
                      </span>
                    </td>

                    <td>
                      <strong style={{ color: 'var(--text-dark)' }}>{log.donor_name || 'Recipient'}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {log.recipient}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px' }}>
                        {log.template_type === '3_month_reminder' ? '🩸 3-Month Safety Gap Reminder' : '❤️ Donation Thank You'}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill ${log.status === 'sent' ? 'eligible' : log.status === 'standby_skipped' ? 'due-soon' : 'blocked'}`}>
                        {log.status === 'sent' ? 'Delivered' : log.status === 'standby_skipped' ? 'Standby (Skipped)' : 'Failed'}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {log.provider}
                      </span>
                    </td>

                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(log.created_at || log.sent_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No notification dispatch logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
