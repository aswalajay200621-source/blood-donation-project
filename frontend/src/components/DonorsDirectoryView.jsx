import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Search,
  Filter,
  Download,
  Users,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
  RefreshCw,
  Droplets,
  Calendar
} from 'lucide-react';

const BLOOD_GROUPS = ['ALL', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ELIGIBILITY_OPTIONS = [
  { id: 'ALL', label: 'All Donors' },
  { id: 'eligible', label: 'Eligible Now (3+ Mos)' },
  { id: 'due_soon', label: 'Due Soon (<7 Days)' },
  { id: 'blocked', label: 'In Safety Window (Blocked)' }
];

export default function DonorsDirectoryView({ onSelectDonor }) {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBg, setSelectedBg] = useState('ALL');
  const [selectedEligibility, setSelectedEligibility] = useState('ALL');
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const res = await api.donors.list({
        search,
        bloodGroup: selectedBg,
        eligibilityStatus: selectedEligibility
      });
      if (res.success) {
        setDonors(res.donors);
      }
    } catch (err) {
      console.error('Error listing donors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, [selectedBg, selectedEligibility]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDonors();
  };

  const handleSendReminder = async (donor) => {
    try {
      setSendingReminderId(donor.id);
      const res = await api.donors.sendReminder(donor.id);
      if (res.success) {
        setActionMessage({
          type: 'SUCCESS',
          text: `Eligibility reminder triggered for ${donor.full_name}. WhatsApp/Email queue updated.`
        });
      }
    } catch (err) {
      setActionMessage({ type: 'ERROR', text: err.message || 'Failed to dispatch reminder.' });
    } finally {
      setSendingReminderId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Export */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)' }}>Donors Master Directory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Hospital registry tracking 3-month safety timelines, collection camp origins, and reminder dispatches
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={api.donors.getExportCSVUrl({ bloodGroup: selectedBg, eligibilityStatus: selectedEligibility })}
            className="btn btn-secondary"
            download
          >
            <Download size={16} color="var(--brand-primary)" />
            <span>Export Filtered Donors (CSV)</span>
          </a>
          <button onClick={fetchDonors} className="btn btn-secondary" title="Refresh List">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div style={{
          background: actionMessage.type === 'SUCCESS' ? 'var(--status-eligible-bg)' : 'var(--blood-red-light)',
          border: `1px solid ${actionMessage.type === 'SUCCESS' ? 'var(--status-eligible-border)' : 'var(--blood-red-border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: actionMessage.type === 'SUCCESS' ? 'var(--status-eligible)' : 'var(--blood-red)' }}>
            {actionMessage.type === 'SUCCESS' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="btn btn-secondary btn-sm">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="classic-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search Row */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by Donor Name, 10-digit Phone, Email, or Camp Location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              <Search size={16} />
              <span>Search</span>
            </button>
          </form>

          {/* Blood Group Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Blood Group:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  onClick={() => setSelectedBg(bg)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: selectedBg === bg ? '1.5px solid var(--blood-red)' : '1px solid var(--border-medium)',
                    background: selectedBg === bg ? 'var(--blood-red-light)' : '#ffffff',
                    color: selectedBg === bg ? 'var(--blood-red)' : 'var(--text-dark)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Eligibility Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              3-Month Status:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ELIGIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedEligibility(opt.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: selectedEligibility === opt.id ? '1px solid var(--brand-primary-border)' : '1px solid var(--border-light)',
                    background: selectedEligibility === opt.id ? 'var(--brand-primary-light)' : '#ffffff',
                    color: selectedEligibility === opt.id ? 'var(--brand-primary)' : 'var(--text-muted)',
                    fontWeight: selectedEligibility === opt.id ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Donors Table */}
      <div className="classic-card" style={{ padding: 0 }}>
        <div className="neon-table-container">
          <table className="neon-table">
            <thead>
              <tr>
                <th>Donor Profile</th>
                <th>Blood Group</th>
                <th>Contact Info</th>
                <th>Last Donation</th>
                <th>Safety Window Status</th>
                <th>Camp Location</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <RefreshCw className="spin" size={20} color="var(--brand-primary)" />
                    <div style={{ marginTop: '8px', fontSize: '13px' }}>Searching records...</div>
                  </td>
                </tr>
              ) : donors.length > 0 ? (
                donors.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-dark)', fontSize: '14px' }}>{d.full_name}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '6px', marginTop: '2px' }}>
                          <span>{d.gender || 'Donor'}</span>
                          {d.age && <span>• Age {d.age}</span>}
                          <span>• {d.total_donations_count} donation{d.total_donations_count === 1 ? '' : 's'}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="blood-badge">{d.blood_group}</span>
                    </td>

                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-dark)' }}>
                        {d.phone}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {d.email}
                      </div>
                    </td>

                    <td>
                      <div style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{d.last_donation_date}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Source: {d.source_of_entry}</div>
                    </td>

                    <td>
                      <span className={`status-pill ${d.eligibility.statusBadge}`}>
                        {d.eligibility.statusText}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Eligible: {d.next_eligible_date}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px' }}>{d.camp_location || 'Hospital Center'}</span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => onSelectDonor(d)}
                          className="btn btn-secondary btn-sm"
                          title="View Full Profile & Donation History"
                        >
                          <Eye size={14} />
                          <span>Profile</span>
                        </button>

                        {d.eligibility.isEligible && (
                          <button
                            onClick={() => handleSendReminder(d)}
                            disabled={sendingReminderId === d.id}
                            className="btn btn-primary btn-sm"
                            title="Dispatch Automated WhatsApp & Email Reminder"
                          >
                            <Send size={14} />
                            <span>{sendingReminderId === d.id ? 'Sending...' : 'Remind'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No donor records match the selected filters.
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
