import React, { useState } from 'react';
import { api } from '../services/api';
import {
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Heart,
  Droplets,
  Calendar,
  MapPin,
  Clock,
  RotateCcw
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function LiveCampEntryView({ onSelectDonor }) {
  // Form state
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [campLocation, setCampLocation] = useState('College Blood Camp - Main Hall');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Duplicate & Auto-suggest state
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [existingDonor, setExistingDonor] = useState(null);

  // Validation errors
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Real-time phone validation & duplicate lookup
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); // Numeric only
    setPhone(val);
    setSuccessResult(null);

    if (val.length > 0 && val.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits numeric only');
    } else {
      setPhoneError('');
    }

    if (val.length === 10) {
      lookupDonor(val, email);
    } else if (val.length < 10) {
      setExistingDonor(null);
    }
  };

  // Real-time email validation
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setSuccessResult(null);

    if (val.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError('Please enter a valid email format (e.g. donor@hospital.med)');
    } else {
      setEmailError('');
    }
  };

  const handleEmailBlur = () => {
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      lookupDonor(phone, email);
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

  // Submit Brand New Donor Registration
  const handleRegisterNewDonor = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessResult(null);

    if (phone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits.');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please provide a valid email address.');
      return;
    }

    if (!fullName || fullName.trim().length < 2) {
      setFormError('Please enter donor full name.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.donors.create({
        full_name: fullName,
        phone,
        email,
        blood_group: bloodGroup,
        gender,
        age: age ? parseInt(age, 10) : null,
        camp_location: campLocation,
        last_donation_date: donationDate,
        notes,
        source_of_entry: 'Manual Entry'
      });

      if (res.success) {
        setSuccessResult({
          type: 'NEW_DONOR',
          message: `Hero Donor ${res.donor.full_name} registered successfully!`,
          donor: res.donor
        });
        resetForm();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to register donor.');
    } finally {
      setSubmitting(false);
    }
  };

  // Record Repeat Donation for Existing Donor
  const handleRecordRepeatDonation = async () => {
    if (!existingDonor) return;
    setFormError('');
    setSuccessResult(null);

    try {
      setSubmitting(true);
      const res = await api.donors.recordDonation(existingDonor.id, {
        donation_date: donationDate,
        camp_location: campLocation,
        notes
      });

      if (res.success) {
        setSuccessResult({
          type: 'REPEAT_DONATION',
          message: `Repeat donation recorded for ${res.donor.full_name}! Next 3-month safety window opens on ${res.donor.next_eligible_date}.`,
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
    setPhone('');
    setEmail('');
    setFullName('');
    setAge('');
    setNotes('');
    setExistingDonor(null);
    setPhoneError('');
    setEmailError('');
  };

  const isBlocked = existingDonor && !existingDonor.eligibility.isEligible;
  const isEligibleExisting = existingDonor && existingDonor.eligibility.isEligible;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* View Header */}
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
            background: 'var(--blood-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <UserPlus size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)' }}>
                Phase 2: Live Camp Donor Entry
              </h1>
              <span style={{
                background: 'var(--blood-red-light)',
                color: 'var(--blood-red)',
                border: '1px solid var(--blood-red-border)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 700
              }}>
                PRIMARY ONGOING ENTRY
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
              Designed for fast camp recording. Real-time phone check, duplicate detection, and mandatory 3-month gap enforcement.
            </p>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="btn btn-secondary btn-sm"
        >
          <RotateCcw size={15} />
          <span>Clear Form</span>
        </button>
      </div>

      {/* Success Alert */}
      {successResult && (
        <div style={{
          background: 'var(--status-eligible-bg)',
          border: '1.5px solid var(--status-eligible-border)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={26} color="#15803d" />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {successResult.message}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Blood Group: <strong style={{ color: 'var(--blood-red)' }}>{successResult.donor.blood_group}</strong> • Total Donations: <strong>{successResult.donor.total_donations_count}</strong> • Next Safe Eligible Date: <strong>{successResult.donor.next_eligible_date}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSuccessResult(null)}
            className="btn btn-secondary btn-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* General Error Banner */}
      {formError && (
        <div style={{
          background: 'var(--blood-red-light)',
          border: '1px solid var(--blood-red-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--blood-red)'
        }}>
          <AlertCircle size={20} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{formError}</span>
        </div>
      )}

      {/* DYNAMIC HEALTH SAFETY BANNER: If existing donor is BLOCKED (<90 days) */}
      {isBlocked && (
        <div className="health-safety-banner">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--blood-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0
            }}>
              <ShieldAlert size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b' }}>
                  HEALTH SAFETY BLOCK: DONATION NOT ACCEPTABLE
                </h3>
                <span className="status-pill blocked">
                  {existingDonor.eligibility.daysRemaining} DAYS REMAINING
                </span>
              </div>
              <p style={{ fontSize: '14px', color: '#7f1d1d', marginTop: '6px', lineHeight: 1.4 }}>
                Donor <strong>"{existingDonor.full_name}"</strong> ({existingDonor.blood_group}) donated on{' '}
                <strong>{existingDonor.last_donation_date}</strong>. Mandatory 3-month medical safety gap is active to protect hemoglobin & iron recovery.
              </p>
              <div style={{
                background: '#ffffff',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                marginTop: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #fecaca'
              }}>
                <Calendar size={16} color="var(--blood-red)" />
                <span style={{ fontSize: '13px', color: '#0f172a' }}>
                  Next safe donation date: <strong style={{ color: 'var(--blood-red)' }}>{existingDonor.next_eligible_date}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC ELIGIBILITY BANNER: If existing donor is ELIGIBLE (>90 days) */}
      {isEligibleExisting && (
        <div style={{
          background: 'var(--status-eligible-bg)',
          border: '1.5px solid var(--status-eligible-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--status-eligible)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    Existing Profile Found: {existingDonor.full_name}
                  </h3>
                  <span className="status-pill eligible">Eligible to Donate</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Last donated on <strong>{existingDonor.last_donation_date}</strong> (3+ months ago) • Total Past Donations: <strong>{existingDonor.total_donations_count}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRecordRepeatDonation}
              disabled={submitting}
              className="btn btn-success btn-lg"
            >
              <Droplets size={18} />
              <span>{submitting ? 'Recording...' : 'Record New Donation for ' + existingDonor.full_name.split(' ')[0]}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Entry Form */}
      <div className="classic-card">
        <div className="neon-card-header">
          <h2 style={{ fontSize: '17px', fontWeight: 700 }}>
            {existingDonor ? 'Donor Profile Information' : 'New Donor Camp Registration'}
          </h2>
          {checkingDuplicate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--brand-primary)' }}>
              <RefreshCw className="spin" size={14} />
              Checking records...
            </span>
          )}
        </div>

        <form onSubmit={handleRegisterNewDonor}>
          {/* Row 1: Phone & Email */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                <span>10-Digit Mobile Number</span>
                <span className="form-label-required">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                className={`form-input ${phoneError ? 'is-invalid' : phone.length === 10 ? 'is-valid' : ''}`}
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={handlePhoneChange}
                style={{ fontSize: '16px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              />
              {phoneError ? (
                <div className="form-feedback-error">
                  <AlertCircle size={14} /> {phoneError}
                </div>
              ) : phone.length === 10 ? (
                <div className="form-feedback-success">
                  ✓ Valid 10-digit number
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Must be exactly 10 digits (numbers only)
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Email Address</span>
                <span className="form-label-required">*</span>
              </label>
              <input
                type="email"
                required
                className={`form-input ${emailError ? 'is-invalid' : email && !emailError ? 'is-valid' : ''}`}
                placeholder="donor@example.com"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
              />
              {emailError ? (
                <div className="form-feedback-error">
                  <AlertCircle size={14} /> {emailError}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Used for automated 3-month reminder emails
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Full Name & Blood Group */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                <span>Full Name</span>
                <span className="form-label-required">*</span>
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Vikramaditya Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Blood Group</span>
                <span className="form-label-required">*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setBloodGroup(bg)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-sm)',
                      border: bloodGroup === bg ? '2px solid var(--blood-red)' : '1px solid var(--border-medium)',
                      background: bloodGroup === bg ? 'var(--blood-red-light)' : '#ffffff',
                      color: bloodGroup === bg ? 'var(--blood-red)' : 'var(--text-dark)',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Gender, Age & Date */}
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">
                <span>Gender</span>
              </label>
              <select
                className="form-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Age (18-65)</span>
              </label>
              <input
                type="number"
                min={18}
                max={65}
                className="form-input"
                placeholder="e.g. 28"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Donation Date</span>
                <span className="form-label-required">*</span>
              </label>
              <input
                type="date"
                required
                className="form-input"
                value={donationDate}
                onChange={(e) => setDonationDate(e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Camp Location & Notes */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                <MapPin size={15} color="var(--brand-primary)" />
                <span>Camp Location</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. College Blood Camp - Main Hall"
                value={campLocation}
                onChange={(e) => setCampLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Clinical Notes</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. BP 120/80, 350ml collected, donor vitals normal"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-secondary"
            >
              Reset Form
            </button>

            {isBlocked ? (
              <button
                type="button"
                disabled
                className="btn btn-danger"
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              >
                <ShieldAlert size={18} />
                <span>Blocked: 3-Month Safety Window Active</span>
              </button>
            ) : isEligibleExisting ? (
              <button
                type="button"
                onClick={handleRecordRepeatDonation}
                disabled={submitting}
                className="btn btn-success btn-lg"
              >
                <Droplets size={18} />
                <span>{submitting ? 'Recording...' : 'Update & Record Donation'}</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !!phoneError || !!emailError}
                className="btn btn-primary btn-lg"
              >
                <UserPlus size={18} />
                <span>{submitting ? 'Registering...' : 'Save & Register Donor'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
