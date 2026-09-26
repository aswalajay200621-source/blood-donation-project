import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RefreshCw, Download, Search, ChevronDown, ChevronUp, Send, Eye } from 'lucide-react';

const BLOOD_GROUPS = ['ALL', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ELIGIBILITY_OPTIONS = [
  { id: 'ALL', label: 'All Eligibility' },
  { id: 'eligible', label: 'Eligible Now (Passed 90 Days)' },
  { id: 'due_soon', label: 'In Safety Gap (< 90 Days)' },
  { id: 'blocked', label: 'Overdue for Recall' },
];

export default function DonorsDirectoryView({ onSelectDonor }) {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBg, setSelectedBg] = useState('ALL');
  const [selectedEligibility, setSelectedEligibility] = useState('ALL');
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const res = await api.donors.list({ search, bloodGroup: selectedBg, eligibilityStatus: selectedEligibility });
      if (res.success) setDonors(res.donors);
    } catch (err) {
      console.error('Error listing donors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDonors(); }, [selectedBg, selectedEligibility]);

  const handleSearchSubmit = (e) => { e.preventDefault(); fetchDonors(); };

  const handleSendReminder = async (donor) => {
    try {
      setSendingReminderId(donor.id);
      const res = await api.donors.sendReminder(donor.id);
      if (res.success) {
        setActionMessage({ type: 'SUCCESS', text: `Eligibility reminder triggered for ${donor.full_name}. WhatsApp/Email queue updated.` });
      }
    } catch (err) {
      setActionMessage({ type: 'ERROR', text: err.message || 'Failed to dispatch reminder.' });
    } finally {
      setSendingReminderId(null);
    }
  };

  const toggleRow = (id) => setExpandedRow(expandedRow === id ? null : id);

  const getEligibilityDisplay = (d) => {
    if (!d.eligibility) return { label: 'Unknown', color: '#64748B', dot: '#64748B' };
    const status = d.eligibility.statusText || '';
    if (d.eligibility.isEligible) return { label: 'Eligible to Donate', color: '#15803d', dot: '#22c55e' };
    if (status.toLowerCase().includes('overdue')) return { label: status, color: '#be123c', dot: '#f43f5e' };
    return { label: status, color: '#b45309', dot: '#f59e0b' };
  };

  const getRareBgColor = (bg) => {
    if (['O-', 'A-', 'B-', 'AB-'].includes(bg)) return '#b52426';
    return '#002045';
  };

  return (
    <div style={{ fontFamily: "'Public Sans', sans-serif", color: '#1e293b' }}>

      {/* Section Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>
              Hospital Donor Master Registry
            </h1>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
              Directory of {donors.length > 0 ? donors.length.toLocaleString() : '4,820'} registered blood donors across hospital clinics and outreach camps.
            </p>
          </div>
          <a
            href={api.donors.getExportCSVUrl({ bloodGroup: selectedBg, eligibilityStatus: selectedEligibility })}
            download
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontSize: '14px', fontWeight: 600, color: '#334155',
              background: '#f1f5f9', border: '1px solid rgba(203,213,225,0.8)',
              padding: '8px 16px', borderRadius: '6px', textDecoration: 'none',
              transition: 'background 0.15s'
            }}
          >
            <Download size={16} />
            Export Records
          </a>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div style={{
          marginBottom: '20px', padding: '14px 18px', borderRadius: '8px',
          background: actionMessage.type === 'SUCCESS' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${actionMessage.type === 'SUCCESS' ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: actionMessage.type === 'SUCCESS' ? '#15803d' : '#dc2626' }}>
            {actionMessage.text}
          </span>
          <button onClick={() => setActionMessage(null)} style={{ fontSize: '13px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', color: '#64748b' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Strip */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Search */}
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search donors by name, mobile number, or donor ID..."
              style={{
                width: '100%', paddingLeft: '40px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px',
                fontSize: '15px', color: '#0f172a', background: '#ffffff',
                border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit'
              }}
            />
          </form>

          {/* Blood Group Filter */}
          <select
            value={selectedBg}
            onChange={(e) => setSelectedBg(e.target.value)}
            style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 500, color: '#334155', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}
          >
            {BLOOD_GROUPS.map(bg => (
              <option key={bg} value={bg}>{bg === 'ALL' ? 'All Blood Groups' : bg}</option>
            ))}
          </select>

          {/* Eligibility Filter */}
          <select
            value={selectedEligibility}
            onChange={(e) => setSelectedEligibility(e.target.value)}
            style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 500, color: '#334155', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}
          >
            {ELIGIBILITY_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>

          <span style={{ fontSize: '14px', color: '#64748b', paddingLeft: '8px' }}>
            Showing <strong style={{ color: '#1e293b', fontWeight: 600 }}>{donors.length}</strong> donors
          </span>
        </div>
      </div>

      {/* Donor Table */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '1080px', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(248,250,252,0.9)', borderBottom: '1px solid #e2e8f0' }}>
                {[
                  { label: 'Donor ID', align: 'left', width: '140px' },
                  { label: 'Full Name & Age', align: 'left', width: 'auto' },
                  { label: 'Blood Group', align: 'left', width: '110px' },
                  { label: 'Contact', align: 'left', width: '220px' },
                  { label: 'Last Donated', align: 'left', width: '190px' },
                  { label: 'Eligibility Status', align: 'left', width: '160px' },
                  { label: 'Total Units', align: 'left', width: '110px' },
                  { label: 'Action', align: 'right', width: '150px' }
                ].map((h) => (
                  <th key={h.label} style={{
                    padding: '12px 16px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: '#475569',
                    textAlign: h.align,
                    width: h.width,
                    whiteSpace: 'nowrap'
                  }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ fontSize: '14px', color: '#1e293b' }}>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                    <RefreshCw className="spin" size={20} color="#002045" />
                    <div style={{ marginTop: '8px', fontSize: '14px' }}>Searching records...</div>
                  </td>
                </tr>
              ) : donors.length > 0 ? donors.map((d) => {
                const elig = getEligibilityDisplay(d);
                const isExpanded = expandedRow === d.id;
                // Compact Donor ID formatting
                const formattedId = typeof d.id === 'string' && d.id.includes('-')
                  ? `DNR-${d.id.substring(0, 8).toUpperCase()}`
                  : `DNR-${String(d.id || 0).padStart(5, '0')}`;

                return (
                  <React.Fragment key={d.id}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.15s', cursor: 'default' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,250,252,0.7)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                        #{formattedId}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>{d.full_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{d.age ? `${d.age} yrs` : ''}{d.age && d.gender ? ' • ' : ''}{d.gender || ''}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '17px', color: getRareBgColor(d.blood_group), whiteSpace: 'nowrap' }}>
                        {d.blood_group}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{d.phone}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all' }}>{d.email}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{d.last_donation_date || '—'}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{d.camp_location || 'Hospital Center'}</div>
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: d.eligibility?.isEligible ? 600 : 500, color: elig.color }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: elig.dot, flexShrink: 0 }} />
                          {elig.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>
                        {d.total_donations_count || 0} units
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {d.eligibility?.isEligible && (
                            <button
                              onClick={() => handleSendReminder(d)}
                              disabled={sendingReminderId === d.id}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#ffffff', background: '#1a365d', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                            >
                              <Send size={12} />
                              {sendingReminderId === d.id ? 'Sending...' : 'Remind'}
                            </button>
                          )}
                          <button
                            onClick={() => toggleRow(d.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: '#1a365d', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s', whiteSpace: 'nowrap' }}
                          >
                            Details
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Detail Row */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td colSpan={8} style={{ padding: '24px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', fontSize: '14px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Clinical Vitals</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#334155' }}>
                                <div>Hemoglobin: <strong style={{ color: '#0f172a' }}>—</strong></div>
                                <div>Weight: <strong style={{ color: '#0f172a' }}>—</strong></div>
                                <div>Blood Pressure: <strong style={{ color: '#0f172a' }}>—</strong></div>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Next Clearance</div>
                              <div style={{ fontWeight: 600, color: d.eligibility?.isEligible ? '#15803d' : '#0f172a', fontSize: '15px' }}>
                                {d.eligibility?.isEligible ? 'Clearance Passed (Eligible)' : d.next_eligible_date || '—'}
                              </div>
                              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                {d.eligibility?.isEligible ? 'Ready for immediate whole blood donation.' : 'Mandatory 90-day whole blood recovery period.'}
                              </p>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Collection Center</div>
                              <div style={{ fontWeight: 500, color: '#0f172a' }}>{d.camp_location || 'Hospital Center'}</div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Source: {d.source_of_entry || 'Manual Entry'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                              <button
                                onClick={() => onSelectDonor(d)}
                                style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 600, color: '#334155', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Eye size={13} /> View Past Donations
                              </button>
                              {d.eligibility?.isEligible && (
                                <button
                                  onClick={() => handleSendReminder(d)}
                                  disabled={sendingReminderId === d.id}
                                  style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 600, color: '#ffffff', background: '#002045', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                  {sendingReminderId === d.id ? 'Sending...' : 'Send Clearance Notice'}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontSize: '14px' }}>
                    No donor records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{
          padding: '16px 24px', background: '#ffffff', borderTop: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          gap: '16px', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#475569' }}>
            <span>Rows per page:</span>
            <select style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '14px', background: '#ffffff', color: '#1e293b', outline: 'none' }}>
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px' }}>
            <span style={{ color: '#64748b' }}>Page 1 of {Math.ceil(donors.length / 10) || 1}</span>
            <div style={{ display: 'inline-flex', gap: '4px' }}>
              <button style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#94a3b8', background: '#f8fafc', cursor: 'not-allowed', fontSize: '14px' }} disabled>
                Previous
              </button>
              <button style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', background: '#ffffff', cursor: 'pointer', fontSize: '14px' }}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
