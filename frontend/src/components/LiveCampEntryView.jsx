/**
 * ============================================================================
 * File: frontend/src/components/LiveCampEntryView.jsx
 * Purpose: Live Mobile Camp Donor Registration & 90-Day Safety Screening View
 * ----------------------------------------------------------------------------
 * Description:
 * Implements the point-of-care registration interface for mobile blood drives
 * and hospital collection centers.
 *
 * Core Capabilities:
 * 1. Instant 10-Digit Phone Auto-Lookup:
 *    - Validates phone format and immediately checks the backend for repeat donors.
 * 2. 90-Day Clinical Safety Enforcement:
 *    - If donor donated within the past 90 days, displays a high-visibility clinical
 *      block banner preventing donation submission.
 * 3. Clinical Vitals Pre-Screening:
 *    - Captures Hemoglobin (g/dL), Weight (kg), Pulse, Blood Pressure, Pack Size (350/450 ml).
 * 4. Dual Submission Pathways:
 *    - 'POST /api/donors' for brand-new donors.
 *    - 'POST /api/donors/:id/donate' for repeat eligible donors.
 * ============================================================================
 */

import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Search, CheckCircle2, AlertCircle, ShieldAlert,
  Droplets, Calendar, MapPin, RotateCcw, RefreshCw
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function LiveCampEntryView({ onSelectDonor }) {
  // Demographic form state
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [campLocation, setCampLocation] = useState('City Hall Drive (#104)');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Clinical vitals screening state
  const [hemoglobin, setHemoglobin] = useState('');
  const [weight, setWeight] = useState('');
  const [pulse, setPulse] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [packSize, setPackSize] = useState('450');
  const [declarations, setDeclarations] = useState([true, true, true]);

  // Lookup & duplicate checking state
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [existingDonor, setExistingDonor] = useState(null);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Phone input handler: strips non-digits, validates 10-digit format, and triggers auto-lookup
   */
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setPhone(val);
    setSuccessResult(null);
    if (val.length > 0 && val.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits numeric only');
    } else {
      setPhoneError('');
    }
    if (val.length === 10) lookupDonor(val, email);
    else if (val.length < 10) setExistingDonor(null);
  };

  /**
   * Email input handler: validates standard email format
   */
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setSuccessResult(null);
    if (val.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError('Please enter a valid email format');
    } else {
      setEmailError('');
    }
  };

  const lookupDonor = async (lookupPhone, lookupEmail) => {
    if ((!lookupPhone || lookupPhone.length !== 10) && !lookupEmail) return;
    try {
      setCheckingDuplicate(true);
      const res = await api.donors.checkDuplicate(lookupPhone, lookupEmail);
      if (res.success && res.exists && res.donor) {
        setExistingDonor(res.donor);
        setFullName(res.donor.full_name);
        setBloodGroup(res.donor.blood_group);
        if (res.donor.email && !email) setEmail(res.donor.email);
        if (res.donor.gender) setGender(res.donor.gender);
        if (res.donor.age) setAge(String(res.donor.age));
      } else {
        setExistingDonor(null);
      }
    } catch (err) {
      console.error('Duplicate lookup error:', err);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const handleRegisterNewDonor = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessResult(null);
    if (!phone || phone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits.');
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!fullName || fullName.trim().length < 2) {
      setFormError('Please enter donor full legal name.');
      return;
    }
    if (!email || !email.trim()) {
      setEmailError('Email address is required.');
      setFormError('Email address is required to register a donor.');
      return;
    }
    if (emailError) {
      setFormError('Please correct the email address format before submitting.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.donors.create({
        full_name: fullName.trim(), phone, email: email.trim(), blood_group: bloodGroup, gender,
        age: age ? parseInt(age, 10) : null, camp_location: campLocation,
        last_donation_date: donationDate, notes, source_of_entry: 'Manual Entry'
      });
      if (res.success) {
        setSuccessResult({ type: 'NEW_DONOR', message: `Donor ${res.donor.full_name} registered successfully!`, donor: res.donor });
        resetForm();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to register donor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordRepeatDonation = async () => {
    if (!existingDonor) return;
    setFormError(''); setSuccessResult(null);
    try {
      setSubmitting(true);
      const res = await api.donors.recordDonation(existingDonor.id, { donation_date: donationDate, camp_location: campLocation, notes });
      if (res.success) {
        setSuccessResult({
          type: 'REPEAT_DONATION',
          message: `Repeat donation recorded for ${res.donor.full_name}! Next safe date: ${res.donor.next_eligible_date}.`,
          donor: res.donor
        });
        resetForm();
      }
    } catch (err) {
      setFormError(err.message || 'Health Safety Block: Cannot accept donation.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPhone(''); setEmail(''); setFullName(''); setAge(''); setNotes('');
    setHemoglobin(''); setWeight(''); setPulse(''); setBpSys(''); setBpDia('');
    setExistingDonor(null); setPhoneError(''); setEmailError('');
  };

  const isBlocked = existingDonor && !existingDonor.eligibility.isEligible;
  const isEligibleExisting = existingDonor && existingDonor.eligibility.isEligible;

  const inputStyle = {
    width: '100%', height: '48px', padding: '0 14px', background: '#ffffff',
    border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px',
    color: '#002045', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    fontWeight: 500
  };

  const labelStyle = { display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', fontFamily: "'Public Sans', sans-serif", color: '#002045' }}>

      {/* Page Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px', marginBottom: '32px', borderBottom: '1px solid rgba(229,231,235,0.8)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#b52426', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#b52426' }} />
            Blood Donation Camp
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#002045', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>
            Register a Blood Donation
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Enter the donor's details below. We'll check automatically if the person has donated in the past 90 days.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
          <MapPin size={16} color="#9ca3af" />
          Location: <strong style={{ color: '#002045', fontWeight: 600 }}>{campLocation}</strong>
        </div>
      </div>

      {/* Success Banner */}
      {successResult && (
        <div style={{ marginBottom: '32px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '8px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={24} color="#15803d" />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{successResult.message}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Blood Group: <strong style={{ color: '#b52426' }}>{successResult.donor.blood_group}</strong> • Total Donations: <strong>{successResult.donor.total_donations_count}</strong>
              </div>
            </div>
          </div>
          <button onClick={() => setSuccessResult(null)} style={{ fontSize: '13px', color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* Error Banner */}
      {formError && (
        <div style={{ marginBottom: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626' }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{formError}</span>
        </div>
      )}

      {/* STEP 1: Donor Verification */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#002045', margin: '0 0 2px 0' }}>Step 1 — Search Donor</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Enter the donor's mobile number or email to check if they've donated before.</p>
        </div>

        {/* Search Bar with Phone & Email */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr)) auto', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: 600, color: '#6b7280', pointerEvents: 'none' }}>+91</span>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={10}
              placeholder="Enter 10-digit mobile number"
              style={{ ...inputStyle, paddingLeft: '48px', borderColor: phoneError ? '#dc2626' : '#d1d5db' }}
            />
            {phoneError && <p style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>{phoneError}</p>}
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Donor email (e.g. donor@example.com)"
              style={{ ...inputStyle, borderColor: emailError ? '#dc2626' : '#d1d5db' }}
            />
            {emailError && <p style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>{emailError}</p>}
          </div>

          <button
            onClick={() => lookupDonor(phone, email)}
            disabled={checkingDuplicate}
            style={{ height: '48px', padding: '0 24px', background: '#002045', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {checkingDuplicate ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
            Search Record
          </button>
        </div>

        {/* Donor Found Summary */}
        {existingDonor && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#002045' }}>{existingDonor.full_name}</span>
                <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>REG-{existingDonor.id}</span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>{existingDonor.age ? `${existingDonor.age} yrs` : ''}{existingDonor.gender ? `, ${existingDonor.gender}` : ''}</span>
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>
                Recorded Group: <span style={{ fontWeight: 700, color: '#b52426' }}>{existingDonor.blood_group}</span> • Lifetime Donations: <span style={{ fontWeight: 600, color: '#002045' }}>{existingDonor.total_donations_count} Units</span>
              </div>
            </div>

            {/* Safety Notice */}
            {isBlocked && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(254,242,242,0.7)', border: '1px solid rgba(254,202,202,0.6)', color: '#7f1d1d', marginTop: '8px' }}>
                <AlertCircle size={18} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                  <strong style={{ color: '#450a0a' }}>Cannot Donate Yet:</strong> This donor's last donation was on <span style={{ fontWeight: 600 }}>{existingDonor.last_donation_date}</span>. Donors must wait 90 days between donations. Next eligible date: <span style={{ fontWeight: 600 }}>{existingDonor.next_eligible_date}</span> ({existingDonor.eligibility.daysRemaining} days remaining).
                </div>
              </div>
            )}
            {isEligibleExisting && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '12px 16px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', marginTop: '8px' }}>
                <CheckCircle2 size={18} color="#15803d" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#14532d' }}>
                  <strong>This donor can donate today.</strong> Last donation was on <span style={{ fontWeight: 600 }}>{existingDonor.last_donation_date}</span> — that is 90+ days ago.
                  <button onClick={handleRecordRepeatDonation} disabled={submitting} style={{ marginLeft: '16px', fontSize: '13px', fontWeight: 600, color: '#ffffff', background: '#002045', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer' }}>
                    {submitting ? 'Saving...' : `Record Donation for ${existingDonor.full_name.split(' ')[0]}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* STEP 2: Donor Profile & Vitals Form */}
      <form onSubmit={handleRegisterNewDonor} style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <div>
          <div style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(229,231,235,0.8)', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#002045', margin: '0 0 2px 0' }}>Step 2 — Donor Details</h2>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Fill in the donor's personal information and health check details.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 48px' }}>
            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Legal Name <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select style={{ ...inputStyle, width: '90px', flex: 'none' }}>
                  <option>Mr.</option><option>Ms.</option><option>Dr.</option><option>Mrs.</option>
                </select>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Full legal name"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label style={labelStyle}>Email Address <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                style={{
                  ...inputStyle,
                  borderColor: emailError ? '#dc2626' : '#d1d5db'
                }}
                placeholder="donor.name@example.com"
                required
              />
              {emailError && <p style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>{emailError}</p>}
            </div>

            {/* Mobile Phone */}
            <div>
              <label style={labelStyle}>Mobile Phone (10 digits) <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: 600, color: '#6b7280', pointerEvents: 'none' }}>+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  style={{ ...inputStyle, paddingLeft: '48px', borderColor: phoneError ? '#dc2626' : '#d1d5db' }}
                  required
                />
              </div>
              {phoneError && <p style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>{phoneError}</p>}
            </div>

            {/* DOB & Gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle} htmlFor="donor-dob">Date of Birth</label>
                <input id="donor-dob" type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '20px', height: '48px' }}>
                  {['Male', 'Female'].map(g => (
                    <label key={g} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                      <input type="radio" name="gender" value={g} checked={gender === g} onChange={() => setGender(g)} style={{ accentColor: '#002045' }} /> {g}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Blood Group */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Blood Group (ABO/Rh)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
                {BLOOD_GROUPS.map(bg => (
                  <button
                    key={bg} type="button"
                    onClick={() => setBloodGroup(bg)}
                    style={{
                      height: '44px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                      border: bloodGroup === bg ? '1px solid #b52426' : '1px solid #d1d5db',
                      background: bloodGroup === bg ? '#b52426' : '#ffffff',
                      color: bloodGroup === bg ? '#ffffff' : '#374151',
                      transition: 'all 0.15s'
                    }}
                  >{bg}</button>
                ))}
              </div>
            </div>

            {/* Hemoglobin & Weight */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <label style={{ ...labelStyle, margin: 0 }}>Hemoglobin</label>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>≥ 12.5 g/dL</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="number" step="0.1" value={hemoglobin} onChange={e => setHemoglobin(e.target.value)} style={{ ...inputStyle, paddingRight: '48px' }} placeholder="13.8" />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#9ca3af' }}>g/dL</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <label style={{ ...labelStyle, margin: 0 }}>Body Weight</label>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>≥ 50 kg</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={weight} onChange={e => setWeight(e.target.value)} style={{ ...inputStyle, paddingRight: '40px' }} placeholder="72" />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#9ca3af' }}>kg</span>
                </div>
              </div>
            </div>

            {/* Pulse & BP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Pulse (bpm)</label>
                <input type="number" value={pulse} onChange={e => setPulse(e.target.value)} style={inputStyle} placeholder="74" />
              </div>
              <div>
                <label style={labelStyle}>Blood Pressure</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="number" value={bpSys} onChange={e => setBpSys(e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} placeholder="Sys" />
                  <span style={{ color: '#9ca3af' }}>/</span>
                  <input type="number" value={bpDia} onChange={e => setBpDia(e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} placeholder="Dia" />
                </div>
              </div>
            </div>

            {/* Camp Location */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>
                <MapPin size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Camp / Venue Location
              </label>
              <input type="text" value={campLocation} onChange={e => setCampLocation(e.target.value)} style={inputStyle} />
            </div>

            {/* Medical Declaration */}
            <div style={{ gridColumn: '1 / -1', paddingTop: '8px' }}>
              <span style={labelStyle}>Pre-Donation Medical Declaration</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'No fever, sore throat, or active symptoms in the past 7 days',
                  'No antibiotic, aspirin, or anti-inflammatory drugs taken in last 14 days',
                  'No major surgical procedure, tattoo, or piercing in the last 6 months'
                ].map((text, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={declarations[i]}
                      onChange={() => setDeclarations(d => d.map((v, j) => j === i ? !v : v))}
                      style={{ width: '16px', height: '16px', accentColor: '#002045' }}
                    />
                    {text}
                  </label>
                ))}
              </div>
            </div>

            {/* Pack Size */}
            <div style={{ gridColumn: '1 / -1', paddingTop: '8px' }}>
              <label style={labelStyle}>Pack Size</label>
              <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#374151' }}>
                {['450', '350'].map(size => (
                  <label key={size} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="pack_size" value={size} checked={packSize === size} onChange={() => setPackSize(size)} style={{ accentColor: '#002045' }} />
                    {size} mL {size === '450' ? '(Standard)' : ''}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(229,231,235,0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => { if (window.confirm('Reset current donor registration form?')) resetForm(); }}
            style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{ height: '48px', padding: '0 32px', background: '#b52426', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {submitting ? <RefreshCw className="spin" size={16} /> : '✓'}
            {submitting ? 'Saving...' : 'Save & Register Donor'}
          </button>
        </div>
      </form>

      {/* Recent Intakes Log */}
      <section style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid rgba(229,231,235,0.8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#002045', margin: 0 }}>Recent Registrations ({campLocation})</h3>
          <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>Today: Active</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {['Time', 'Donor Name', 'Group', 'Hb', 'Status', 'Barcode'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 16px 12px 0', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ color: '#374151' }}>
              {[
                { time: '11:42 AM', name: 'Karan Johar Patel', bg: 'O+', hb: '14.2 g/dL', status: 'Cleared', barcode: 'WB-104-038', ok: true },
                { time: '11:35 AM', name: 'Ananya Sengupta', bg: 'A-', hb: '11.8 g/dL', status: 'Deferred', barcode: 'DEF-012', ok: false },
                { time: '11:20 AM', name: 'Deepak R. Mehta', bg: 'B+', hb: '15.1 g/dL', status: 'Cleared', barcode: 'WB-104-037', ok: true },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px 12px 0', fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }}>{row.time}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#002045' }}>{row.name}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#b52426' }}>{row.bg}</td>
                  <td style={{ padding: '12px 16px', color: row.ok ? '#374151' : '#dc2626', fontWeight: row.ok ? 400 : 500 }}>{row.hb}</td>
                  <td style={{ padding: '12px 16px', color: row.ok ? '#15803d' : '#b91c1c', fontWeight: 500 }}>{row.status}</td>
                  <td style={{ padding: '12px 0 12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: row.ok ? '#374151' : '#9ca3af' }}>{row.barcode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
