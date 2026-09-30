/**
 * ============================================================================
 * File: frontend/src/components/SecurityAuditView.jsx
 * Purpose: Clinical Security Architecture, Penetration Test Report & Audit Logs
 * ----------------------------------------------------------------------------
 * Description:
 * Implements the security posture dashboard and compliance audit viewer:
 *
 * Key Sections:
 * 1. Penetration Testing & Defense Status Matrix:
 *    - Documents hardening against OWASP Top 10 vulnerabilities (Brute-Force,
 *      SQL Injection, XSS, IDOR, Strict CORS, DoS Payload Limits).
 * 2. Real-Time Immutable Audit Log Stream:
 *    - Live feed of administrative actions (logins, donor registrations, Excel
 *      migrations, settings changes) captured with user email, action, IP, and timestamp.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function SecurityAuditView() {
  // Audit log records state
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetches latest 50 security audit logs from GET /api/audit/logs
   */
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
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)' }}>Activity Log</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
              A record of all actions taken in the system
            </p>
          </div>
        </div>

        <button onClick={fetchLogs} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="classic-card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700 }}>All Activity</h2>
        </div>

        <div className="neon-table-container">
          <table className="neon-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Done By</th>
                <th>Section</th>
                <th>IP Address</th>
                <th>Details</th>
                <th>When</th>
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
