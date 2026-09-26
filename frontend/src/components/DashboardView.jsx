import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Droplets,
  Calendar,
  Send,
  UserPlus,
  FileSpreadsheet,
  Download,
  Activity,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export default function DashboardView({ onNavigate, onSelectDonor }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggeringCron, setTriggeringCron] = useState(false);
  const [cronResult, setCronResult] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.getStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleTriggerDailyScan = async () => {
    try {
      setTriggeringCron(true);
      const res = await api.settings.triggerCron();
      setCronResult(res.result);
      fetchStats();
    } catch (err) {
      alert('Error triggering scan: ' + err.message);
    } finally {
      setTriggeringCron(false);
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <RefreshCw className="spin" size={32} color="var(--brand-primary)" />
        <div style={{ marginTop: '12px', fontSize: '15px' }}>Loading real-time hospital metrics...</div>
      </div>
    );
  }

  const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Quick Trigger */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)' }}>
            Hospital Blood Bank Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Real-time donor tracking, mandatory 3-month safety gap enforcement, and automated reminder queues
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleTriggerDailyScan}
            disabled={triggeringCron}
            className="btn btn-primary"
          >
            <Send size={16} />
            <span>{triggeringCron ? 'Scanning & Dispatching...' : 'Trigger 3-Month Reminder Scan'}</span>
          </button>
          <button
            onClick={fetchStats}
            className="btn btn-secondary"
            title="Refresh Metrics"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Trigger Notification Toast / Alert */}
      {cronResult && (
        <div style={{
          background: 'var(--status-eligible-bg)',
          border: '1px solid var(--status-eligible-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={22} color="#15803d" />
            <div>
              <strong style={{ color: '#0f172a', fontSize: '14px' }}>Daily 3-Month Eligibility Scan Completed</strong>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Identified {cronResult.eligibleDonorsFound} eligible donors • Dispatched reminders: {cronResult.sentCount} sent, {cronResult.skippedCount} standby-skipped.
              </div>
            </div>
          </div>
          <button
            onClick={() => setCronResult(null)}
            className="btn btn-secondary btn-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid-4">
        {/* Total Donors */}
        <div className="classic-card" style={{ borderTop: '4px solid var(--brand-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Donors Registered
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '4px' }}>
                {stats?.totalDonors || 0}
              </div>
            </div>
            <div style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'var(--brand-primary-light)',
              color: 'var(--brand-primary)'
            }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Historical Excel & Live Camp entries
          </div>
        </div>

        {/* Eligible Now */}
        <div className="classic-card" style={{ borderTop: '4px solid var(--status-eligible)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-eligible)', textTransform: 'uppercase' }}>
                Eligible Now (3+ Mos Passed)
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--status-eligible)', marginTop: '4px' }}>
                {stats?.eligibleNowCount || 0}
              </div>
            </div>
            <div style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'var(--status-eligible-bg)',
              color: 'var(--status-eligible)'
            }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--status-eligible)', marginTop: '8px', fontWeight: 600 }}>
            Ready for live donation camps
          </div>
        </div>

        {/* Due Soon (<7 Days) */}
        <div className="classic-card" style={{ borderTop: '4px solid var(--status-due-soon)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-due-soon)', textTransform: 'uppercase' }}>
                Upcoming This Week (&lt;7d)
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--status-due-soon)', marginTop: '4px' }}>
                {stats?.upcomingThisWeekCount || 0}
              </div>
            </div>
            <div style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'var(--status-due-soon-bg)',
              color: 'var(--status-due-soon)'
            }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Crossing 3-month mark within 7 days
          </div>
        </div>

        {/* In 3-Month Safety Window (Blocked) */}
        <div className="classic-card" style={{ borderTop: '4px solid var(--blood-red)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--blood-red)', textTransform: 'uppercase' }}>
                In Safety Window (Blocked)
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--blood-red)', marginTop: '4px' }}>
                {stats?.blockedCount || 0}
              </div>
            </div>
            <div style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'var(--blood-red-light)',
              color: 'var(--blood-red)'
            }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--blood-red)', marginTop: '8px' }}>
            Health safety block strictly enforced
          </div>
        </div>
      </div>

      {/* Main Row: Blood Group Distribution & Quick Action Camp Shortcuts */}
      <div className="grid-2">
        {/* Blood Group Inventory Distribution */}
        <div className="classic-card">
          <div className="neon-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Droplets size={18} color="var(--blood-red)" />
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Donor Pool by Blood Group</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hospital Registry</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginTop: '8px'
          }}>
            {bloodGroups.map((bg) => {
              const count = stats?.bloodGroupCounts?.[bg] || 0;
              return (
                <div
                  key={bg}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    textAlign: 'center'
                  }}
                >
                  <div className="blood-badge" style={{ marginBottom: '4px' }}>{bg}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)' }}>{count}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Donors</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Workflows */}
        <div className="classic-card">
          <div className="neon-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--brand-primary)" />
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Operational Workflows</h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Phase 2 Live Camp Button */}
            <div
              onClick={() => onNavigate('camp-entry')}
              style={{
                background: 'var(--blood-red-light)',
                border: '1px solid var(--blood-red-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--blood-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>
                    Phase 2: Live Camp Donor Entry (Ongoing)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Instant 10-digit phone lookup & 3-month safety block enforcement
                  </div>
                </div>
              </div>
              <ArrowRight size={18} color="var(--blood-red)" />
            </div>

            {/* Phase 1 Excel Import Button */}
            <div
              onClick={() => onNavigate('excel-import')}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'var(--brand-primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-primary)'
                }}>
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                    Phase 1: Initial Excel Migration (One-Time Setup)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Bulk upload historical records with column mapping & error report
                  </div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>

            {/* Donors Directory */}
            <div
              onClick={() => onNavigate('donors')}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#f3e8ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7e22ce'
                }}>
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                    Browse Donors Directory & Export CSV
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Filter by blood group, search phone/name, and review safety history
                  </div>
                </div>
              </div>
              <ArrowRight size={16} color="var(--text-muted)" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Camp Activity Feed */}
      <div className="classic-card">
        <div className="neon-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--brand-primary)" />
            <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Recent Camp Blood Donations</h2>
          </div>
          <button
            onClick={() => onNavigate('donors')}
            className="btn btn-secondary btn-sm"
          >
            View All Donors
          </button>
        </div>

        <div className="neon-table-container">
          <table className="neon-table">
            <thead>
              <tr>
                <th>Donor Name</th>
                <th>Blood Group</th>
                <th>Phone Number</th>
                <th>Donation Date</th>
                <th>Camp Location</th>
                <th>Staff Recorded</th>
                <th>Entry Source</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentDonations?.length > 0 ? (
                stats.recentDonations.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: 'var(--text-dark)', fontSize: '14px' }}>{item.full_name}</strong>
                    </td>
                    <td>
                      <span className="blood-badge">{item.blood_group}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{item.phone}</td>
                    <td style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{item.donation_date}</td>
                    <td>{item.camp_location || 'Hospital Center'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.entered_by_staff_name || 'Staff'}</td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: item.source === 'Excel Import' ? 'var(--brand-primary-light)' : 'var(--blood-red-light)',
                        color: item.source === 'Excel Import' ? 'var(--brand-primary)' : 'var(--blood-red)',
                        fontWeight: 600
                      }}>
                        {item.source}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No donation records yet. Start by recording a live camp donation or importing historical records!
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
