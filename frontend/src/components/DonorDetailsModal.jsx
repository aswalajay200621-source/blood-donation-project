import React, { useState } from 'react';
import { api } from '../services/api';
import {
  X,
  User,
  Phone,
  Mail,
  Droplets,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  History,
  MapPin,
  ShieldCheck
} from 'lucide-react';

export default function DonorDetailsModal({ donor, onClose, onRefresh }) {
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState(null);

  if (!donor) return null;

  const handleSendReminder = async () => {
    try {
      setSendingReminder(true);
      const res = await api.donors.sendReminder(donor.id);
      if (res.success) {
        setReminderMessage({ type: 'SUCCESS', text: `Automated WhatsApp & Email reminders dispatched for ${donor.full_name}!` });
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      setReminderMessage({ type: 'ERROR', text: err.message || 'Failed to send reminder.' });
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="blood-badge" style={{ fontSize: '18px', padding: '4px 12px' }}>
              {donor.blood_group}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)' }}>{donor.full_name}</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Registered via {donor.source_of_entry} • Total Donations: <strong>{donor.total_donations_count}</strong>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Reminder Feedback */}
        {reminderMessage && (
          <div style={{
            background: reminderMessage.type === 'SUCCESS' ? 'var(--status-eligible-bg)' : 'var(--blood-red-light)',
            border: `1px solid ${reminderMessage.type === 'SUCCESS' ? 'var(--status-eligible-border)' : 'var(--blood-red-border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: reminderMessage.type === 'SUCCESS' ? 'var(--status-eligible)' : 'var(--blood-red)'
          }}>
            {reminderMessage.type === 'SUCCESS' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{reminderMessage.text}</span>
          </div>
        )}

        {/* 3-Month Safety Window Banner */}
        <div style={{
          background: donor.eligibility.isEligible ? 'var(--status-eligible-bg)' : 'var(--blood-red-light)',
          border: `1.5px solid ${donor.eligibility.isEligible ? 'var(--status-eligible-border)' : 'var(--blood-red-border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-pill ${donor.eligibility.statusBadge}`}>
                {donor.eligibility.statusText}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Last Donated: <strong style={{ color: 'var(--text-dark)' }}>{donor.last_donation_date}</strong> • Next Safe Eligible Date: <strong style={{ color: 'var(--brand-primary)' }}>{donor.next_eligible_date}</strong>
            </div>
          </div>

          {donor.eligibility.isEligible && (
            <button
              onClick={handleSendReminder}
              disabled={sendingReminder}
              className="btn btn-primary btn-sm"
            >
              <Send size={14} />
              <span>{sendingReminder ? 'Dispatching...' : 'Send 3-Month Reminder'}</span>
            </button>
          )}
        </div>

        {/* Demographics Grid */}
        <div className="grid-2" style={{ marginBottom: '20px' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Contact Details</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-dark)', marginBottom: '4px' }}>
              <Phone size={13} color="var(--brand-primary)" />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{donor.phone}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-dark)' }}>
              <Mail size={13} color="var(--brand-primary)" />
              <span>{donor.email}</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Demographics & Camp Origin</div>
            <div style={{ fontSize: '13px', color: 'var(--text-dark)', marginBottom: '2px' }}>
              <strong>Gender:</strong> {donor.gender || 'Not specified'} {donor.age && `• Age: ${donor.age}`}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong>Location:</strong> {donor.camp_location || 'Main Hospital'}
            </div>
          </div>
        </div>

        {/* Donation Events Timeline */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <History size={16} color="var(--brand-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Donation History Events</h3>
          </div>

          <div className="neon-table-container">
            <table className="neon-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Camp Location</th>
                  <th>Staff Recorded</th>
                  <th>Source</th>
                  <th>Clinical Notes</th>
                </tr>
              </thead>
              <tbody>
                {donor.history && donor.history.length > 0 ? (
                  donor.history.map((h) => (
                    <tr key={h.id}>
                      <td style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{h.donation_date}</td>
                      <td>{h.camp_location || 'Hospital Center'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{h.entered_by_staff_name || 'Staff'}</td>
                      <td>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.source}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{h.notes || 'Routine donation'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '14px', color: 'var(--text-muted)' }}>
                      No separate donation events recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
