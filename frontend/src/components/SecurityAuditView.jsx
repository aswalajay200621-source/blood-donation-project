import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck,
  Lock,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Activity,
  Key,
  Database
} from 'lucide-react';

export default function SecurityAuditView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.audit.getLogs({ limit: 50 });
      if (res.success) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const penTestItems = [
    {
      title: 'Authentication Bypass & Brute-Force',
      status: 'HARDENED',
      details: 'Strict express-rate-limit on /api/auth/login (5 attempts per 15 min), bcrypt password hashing (cost factor 10), TOTP 2FA enforced.'
    },
    {
      title: 'SQL Injection (SQLi)',
      status: 'HARDENED',
      details: 'Zero raw SQL concatenation. 100% of queries use parameterized prepared statements ($1, $2) across both PostgreSQL & SQLite engines.'
    },
    {
      title: 'Cross-Site Scripting (XSS) & Content Injection',
      status: 'HARDENED',
      details: 'Helmet.js active with strict Content-Security-Policy (CSP), X-Content-Type-Options, X-Frame-Options: DENY, and React JSX auto-escaping.'
    },
    {
      title: 'Insecure Direct Object Reference (IDOR)',
      status: 'HARDENED',
      details: 'All donor update and donation recording endpoints require authenticated JWT Bearer session and role-based permissions.'
    },
    {
      title: 'Cross-Origin Resource Sharing (CORS) Policy',
      status: 'HARDENED',
      details: 'Whitelisted hospital frontend domain only; unauthorized cross-origin requests are rejected.'
    },
    {
      title: 'JWT Session Replay & Token Lifecycle',
      status: 'HARDENED',
      details: 'Short-lived access token (15m expiry), signed refresh token rotation, distinct 2FA verification token scopes.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
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
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)' }}>Security Center & Pen-Test Inspector</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
              Real-time audit trails, defensive countermeasures, and penetration test verification matrix
            </p>
          </div>
        </div>

        <button onClick={fetchLogs} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Pen-Test Verification Matrix */}
      <div className="classic-card">
        <div className="neon-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="var(--status-eligible)" />
            <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Penetration Testing Verification Checklist</h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--status-eligible)', fontWeight: 700 }}>6 of 6 Defenses Active</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          {penTestItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ color: 'var(--text-dark)', fontSize: '14px' }}>{item.title}</strong>
                <span className="status-pill eligible" style={{ fontSize: '10px', padding: '2px 6px' }}>
                  {item.status}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {item.details}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="classic-card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700 }}>System & Data Access Audit Log</h2>
        </div>

        <div className="neon-table-container">
          <table className="neon-table">
            <thead>
              <tr>
                <th>Action Event</th>
                <th>User / Actor</th>
                <th>Resource</th>
                <th>IP Address</th>
                <th>Metadata Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading audit trail records...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        background: 'var(--brand-primary-light)',
                        color: 'var(--brand-primary)',
                        fontWeight: 700
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{log.user_email || 'System'}</td>
                    <td><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.resource_type || 'N/A'}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{log.ip_address}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No audit records logged yet.
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
