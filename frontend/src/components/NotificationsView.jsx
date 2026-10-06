/**
 * ============================================================================
 * File: frontend/src/components/NotificationsView.jsx
 * Purpose: Multi-Channel Notification Audit Log & Diagnostic Testing View
 * ----------------------------------------------------------------------------
 * Description:
 * Provides administrators and staff with oversight of donor communication activities
 * across WhatsApp and Email:
 *
 * Capabilities:
 * 1. Notification Dispatch Logs:
 *    - Historical ledger of every message sent, failed, or skipped on standby.
 *    - Filterable by channel (WhatsApp vs Email) and status (SENT, FAILED, STANDBY_SKIPPED).
 * 2. Diagnostic Live Dispatch Testing:
 *    - Allows testing SMTP email delivery and Meta Cloud/Twilio WhatsApp dispatch
 *      with custom recipient addresses.
 * 3. Channel Health Status Badges:
 *    - Real-time indicator badges reflecting active vs standby provider status.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { sendDonorReminderEmail } from '../services/emailService';
import {
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Filter,
  Users,
  Loader2
} from 'lucide-react';

const BLOOD_GROUPS = ['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const CRITICAL_BLOOD_GROUPS = ['O-', 'B-'];

export default function NotificationsView() {
  // Target blood group selection state
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('ALL');
  const [eligibleCount, setEligibleCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Notification log audit state
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [logBgFilter, setLogBgFilter] = useState('ALL');

  // Bulk dispatch state
  const [bulkSendingWa, setBulkSendingWa] = useState(false);
  const [bulkSendingEmail, setBulkSendingEmail] = useState(false);
  const [bulkEmailMsg, setBulkEmailMsg] = useState(null);

  const isCritical = CRITICAL_BLOOD_GROUPS.includes(selectedBloodGroup);

  /**
   * Fetches real-time eligible donor count for the active blood group filter
   */
  const fetchEligibleCount = async () => {
    try {
      setLoadingCount(true);
      const res = await api.donors.list({
        eligibilityStatus: 'eligible',
        bloodGroup: selectedBloodGroup
      });
      if (res.success) {
        setEligibleCount(res.totalCount !== undefined ? res.totalCount : res.donors?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching eligible count:', err);
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    fetchEligibleCount();
  }, [selectedBloodGroup]);

  /**
   * Fetches notification logs from GET /api/notifications/logs
   */
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.notifications.getLogs({
        channel: channelFilter,
        status: statusFilter,
        bloodGroup: logBgFilter
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

  // Re-fetch whenever active filters change
  useEffect(() => {
    fetchLogs();
  }, [channelFilter, statusFilter, logBgFilter]);

  const handleBulkWhatsApp = async () => {
    try {
      setBulkSendingWa(true);
      await api.notifications.bulkWhatsApp(selectedBloodGroup);
      fetchLogs();
      fetchEligibleCount();
    } catch (err) {
      console.error('Bulk WhatsApp dispatch error:', err.message);
    } finally {
      setBulkSendingWa(false);
    }
  };

  const handleBulkEmail = async () => {
    try {
      setBulkSendingEmail(true);
      setBulkEmailMsg(null);

      // Fetch all eligible donors
      const donorRes = await api.donors.list({
        eligibilityStatus: 'eligible',
        bloodGroup: selectedBloodGroup
      });
      const eligible = donorRes.donors || [];

      if (eligible.length === 0) {
        setBulkEmailMsg('⚠️ No eligible donors found to send reminders to.');
        return;
      }

      let sentCount = 0;
      let failedCount = 0;
      let lastError = null;

      for (const d of eligible) {
        if (d.email) {
          const r = await sendDonorReminderEmail(d);
          if (r.success) {
            sentCount++;
            try {
              await api.notifications.logBrowserDispatch({
                donorId: d.id,
                donorName: d.full_name,
                channel: 'email',
                recipient: d.email,
                templateType: '3_month_reminder',
                status: 'sent',
                provider: 'emailjs_browser',
                responsePayload: 'Delivered via EmailJS browser SDK'
              });
            } catch (logErr) {
              console.warn('Logging dispatch error:', logErr);
            }
          } else {
            failedCount++;
            lastError = r.error;
            try {
              await api.notifications.logBrowserDispatch({
                donorId: d.id,
                donorName: d.full_name,
                channel: 'email',
                recipient: d.email,
                templateType: '3_month_reminder',
                status: 'not_delivered',
                provider: 'emailjs_browser',
                errorMessage: r.error || 'Delivery failed'
              });
            } catch (logErr) {
              console.warn('Logging dispatch error:', logErr);
            }
          }
        }
      }

      if (sentCount > 0) {
        setBulkEmailMsg(`✅ Successfully sent 3-month reminder email to ${sentCount} donor(s) (${eligible.map(e => e.full_name).join(', ')}) via EmailJS! Check inbox.`);
      } else {
        setBulkEmailMsg(`❌ Email reminder dispatch failed: ${lastError || 'Delivery error'}`);
      }

      fetchLogs();
      fetchEligibleCount();
    } catch (err) {
      console.error('Bulk email dispatch error:', err.message);
      setBulkEmailMsg(`❌ Error sending reminders: ${err.message}`);
    } finally {
      setBulkSendingEmail(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)' }}>Send Reminders to Donors</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Send WhatsApp or Email reminders to donors who are ready to donate again
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={fetchLogs} className="btn btn-secondary">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh Logs
          </button>
        </div>
      </div>

      {/* Prominent 1-Click Bulk Remind Card */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #bbf7d0',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 14px rgba(22,163,74,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Mail size={20} color="#15803d" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  1-Click Bulk Email Reminders
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Send 3-month eligibility recall emails directly via EmailJS to all eligible registered donors in one click.
                </span>
              </div>
            </div>
          </div>

          <button
            id="bulk-remind-primary-btn"
            onClick={handleBulkEmail}
            disabled={bulkSendingEmail || eligibleCount === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              border: 'none',
              borderRadius: '8px',
              cursor: (bulkSendingEmail || eligibleCount === 0) ? 'not-allowed' : 'pointer',
              opacity: (bulkSendingEmail || eligibleCount === 0) ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {bulkSendingEmail ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Sending Reminders via EmailJS...</span>
              </>
            ) : (
              <>
                <Mail size={16} />
                <span>Bulk Remind Eligible Donors via Mail ({eligibleCount !== null ? eligibleCount : '...'})</span>
              </>
            )}
          </button>
        </div>

        {bulkEmailMsg && (
          <div style={{
            fontSize: '13px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: bulkEmailMsg.includes('❌') ? '#fef2f2' : '#f0fdf4',
            color: bulkEmailMsg.includes('❌') ? '#991b1b' : '#14532d',
            border: `1.5px solid ${bulkEmailMsg.includes('❌') ? '#fecaca' : '#86efac'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600
          }}>
            {bulkEmailMsg}
          </div>
        )}
      </div>

      {/* Target Blood Group Selection & Critical Shortage Alert Bar */}
      <div className="classic-card" style={{
        padding: '18px 22px',
        border: isCritical ? '2px solid #ef4444' : '1px solid var(--border-light)',
        background: isCritical ? '#fef2f2' : '#ffffff',
        transition: 'all 0.25s ease'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: isCritical ? '#fee2e2' : 'var(--blood-red-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blood-red)'
            }}>
              {isCritical ? <AlertTriangle size={20} color="#dc2626" /> : <Filter size={18} />}
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: isCritical ? '#991b1b' : 'var(--text-dark)' }}>
                Filter by Blood Group {isCritical && '— 🚨 Stock Running Low'}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: isCritical ? '#b91c1c' : 'var(--text-muted)' }}>
                Choose a blood group to send reminders only to donors of that type
              </p>
            </div>
          </div>

          {/* Real-time Eligible Counter Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: isCritical ? '#dc2626' : 'var(--brand-primary)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}>
            <Users size={14} />
            <span>
              {loadingCount ? 'Counting...' : `${eligibleCount !== null ? eligibleCount : 0} Eligible ${selectedBloodGroup === 'ALL' ? 'Total' : `(${selectedBloodGroup})`}`}
            </span>
          </div>
        </div>

        {/* Blood Group Chips Selector */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {BLOOD_GROUPS.map((bg) => {
            const isSelected = selectedBloodGroup === bg;
            const isCrit = CRITICAL_BLOOD_GROUPS.includes(bg);
            return (
              <button
                key={bg}
                type="button"
                onClick={() => setSelectedBloodGroup(bg)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  border: isSelected
                    ? (isCrit ? '2px solid #dc2626' : '2px solid var(--brand-primary)')
                    : (isCrit ? '1px solid #fca5a5' : '1px solid #e2e8f0'),
                  background: isSelected
                    ? (isCrit ? '#dc2626' : 'var(--brand-primary)')
                    : (isCrit ? '#fff1f2' : '#f8fafc'),
                  color: isSelected
                    ? '#ffffff'
                    : (isCrit ? '#b91c1c' : 'var(--text-dark)'),
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{bg === 'ALL' ? 'All Blood Groups' : bg}</span>
                {isCrit && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: isSelected ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                    color: isSelected ? '#ffffff' : '#dc2626'
                  }}>
                    Critical
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Critical Shortage Notice when a critical group is active */}
        {isCritical && (
          <div style={{
            marginTop: '14px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: '#991b1b'
          }}>
            <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
            <span>
              <strong>Low Stock Alert:</strong> {selectedBloodGroup} blood is very low. Pressing the buttons above will send urgent reminders only to the {eligibleCount ?? 0} eligible <strong>{selectedBloodGroup}</strong> donors.
            </span>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="classic-card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--brand-primary)" />
            <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Message History</h2>
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
              <option value="sent">Delivered</option>
              <option value="not_delivered">Not Delivered</option>
              <option value="standby_skipped">Standby Skipped</option>
              <option value="failed">Failed</option>
            </select>

            <select
              className="form-select"
              value={logBgFilter}
              onChange={(e) => setLogBgFilter(e.target.value)}
              style={{ minHeight: '36px', padding: '4px 10px', fontSize: '13px' }}
            >
              <option value="ALL">All Blood Groups</option>
              {BLOOD_GROUPS.filter(bg => bg !== 'ALL').map(bg => (
                <option key={bg} value={bg}>{bg} {CRITICAL_BLOOD_GROUPS.includes(bg) ? '(Critical)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="neon-table-container">
          <table className="neon-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Donor Name</th>
                <th>Message Type</th>
                <th>Status</th>
                <th>Sent Via</th>
                <th>Date & Time</th>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {log.status === 'sent' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #86efac',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '14px',
                            boxShadow: '0 1px 3px rgba(22,163,74,0.15)'
                          }}>
                            <CheckCircle2 size={13} color="#16a34a" />
                            {log.donor_name || 'Recipient'}
                          </span>
                        ) : (
                          <strong style={{ color: 'var(--text-dark)', fontSize: '14px' }}>
                            {log.donor_name || 'Recipient'}
                          </strong>
                        )}
                        {log.blood_group && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: CRITICAL_BLOOD_GROUPS.includes(log.blood_group) ? '#fee2e2' : '#f1f5f9',
                            color: CRITICAL_BLOOD_GROUPS.includes(log.blood_group) ? '#dc2626' : 'var(--brand-primary)',
                            border: `1px solid ${CRITICAL_BLOOD_GROUPS.includes(log.blood_group) ? '#fca5a5' : '#cbd5e1'}`
                          }}>
                            {log.blood_group}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {log.recipient}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px' }}>
                        {log.template_type === '3_month_reminder' ? '🩸 90-Day Reminder' : '❤️ Thank You'}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill ${log.status === 'sent' ? 'eligible' : log.status === 'standby_skipped' ? 'due-soon' : 'blocked'}`}>
                        {log.status === 'sent' ? 'Delivered' : log.status === 'standby_skipped' ? 'Standby (Skipped)' : 'Not Delivered'}
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
