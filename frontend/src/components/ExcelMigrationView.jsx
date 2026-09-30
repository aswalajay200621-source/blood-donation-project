/**
 * ============================================================================
 * File: frontend/src/components/ExcelMigrationView.jsx
 * Purpose: Spreadsheet Migration Engine (Phase 1 Legacy Data Import) View
 * ----------------------------------------------------------------------------
 * Description:
 * Implements the guided 3-step bulk data import workflow for legacy blood donor
 * records from `.xlsx` or `.csv` spreadsheets:
 *
 * Workflow Steps:
 * 1. Step 1 - File Upload & Template Download:
 *    - Allows drag-and-drop or file picker selection of spreadsheets.
 *    - Provides a direct link to download the standardized Excel template.
 * 2. Step 2 - Parsing & Pre-Commit Validation:
 *    - Sends binary file buffer to backend for schema mapping and dry-run validation.
 *    - Renders tabbed preview tables comparing Valid Rows vs Rejected Rows with
 *      row-specific error messages.
 * 3. Step 3 - Database Commit:
 *    - Persists validated rows to the database with duplicate merge option.
 *    - Displays a comprehensive execution report (created, updated, rejected).
 * ============================================================================
 */

import React, { useState } from 'react';
import { api } from '../services/api';
import {
  FileSpreadsheet, UploadCloud, Download, CheckCircle2,
  XCircle, AlertTriangle, RefreshCw, Database, ArrowRight
} from 'lucide-react';

export default function ExcelMigrationView({ onNavigate }) {
  // File upload and processing state
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  
  // Validation results and import report state
  const [previewData, setPreviewData] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [activePreviewTab, setActivePreviewTab] = useState('VALID');

  /**
   * File input change handler: records selected spreadsheet and resets stale preview reports
   */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setPreviewData(null); setImportReport(null); setErrorMsg(''); }
  };

  /**
   * Sends uploaded file to POST /api/excel/preview for header mapping & dry-run validation
   */
  const handlePreviewUpload = async () => {
    if (!selectedFile) { setErrorMsg('Please select an .xlsx or .csv spreadsheet file.'); return; }
    try {
      setParsing(true); setErrorMsg('');
      const res = await api.excel.preview(selectedFile);
      if (res.success && res.data) setPreviewData(res.data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to parse Excel file.');
    } finally {
      setParsing(false);
    }
  };

  /**
   * Commits validated spreadsheet rows into the persistent donor database
   */
  const handleCommitBatch = async () => {
    if (!previewData || !previewData.validRows || previewData.validRows.length === 0) {
      setErrorMsg('No valid rows available to commit.'); return;
    }
    try {
      setCommitting(true); setErrorMsg('');
      const res = await api.excel.commit(previewData.validRows, updateExisting);
      if (res.success && res.report) setImportReport(res.report);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to commit import to database.');
    } finally {
      setCommitting(false);
    }
  };

  /**
   * Resets migration state to allow importing another file
   */
  const handleReset = () => { setSelectedFile(null); setPreviewData(null); setImportReport(null); setErrorMsg(''); };

  const sectionTitleStyle = {
    fontSize: '15px', fontWeight: 600, color: '#0b1c30', margin: '0 0 2px 0'
  };

  const stepBadge = (n) => (
    <span style={{
      width: '24px', height: '24px', borderRadius: '50%', background: '#002045',
      color: '#ffffff', fontSize: '12px', fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>{n}</span>
  );

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', fontFamily: "'Public Sans', sans-serif", color: '#0b1c30' }}>

      {/* Page Title */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', color: '#0b1c30', margin: '0 0 8px 0' }}>
          Excel / CSV Donor Migration
        </h1>
        <p style={{ fontSize: '15px', color: '#43474e', margin: 0 }}>
          Upload donor spreadsheets from field camps for automatic validation and direct roster import.
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div style={{ marginBottom: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626' }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: '14px' }}>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: File Upload / Selected File */}
      <section style={{ marginBottom: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {stepBadge(1)}
          <h2 style={sectionTitleStyle}>Selected File</h2>
        </div>

        {!selectedFile && !previewData && !importReport ? (
          /* Upload Drop Zone */
          <div style={{
            border: '2px dashed #c4c6cf', borderRadius: '8px', padding: '48px 24px',
            background: '#ffffff', textAlign: 'center'
          }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: '#e5eeff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <UploadCloud size={32} color="#002045" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0b1c30', margin: '0 0 8px 0' }}>Upload Donor Spreadsheet</h3>
            <p style={{ fontSize: '14px', color: '#74777f', maxWidth: '480px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
              Supports <strong>.xlsx</strong> and <strong>.csv</strong>. Headers like <em>Full Name, Phone (10 digits), Email, Blood Group, Last Donation Date</em> will be mapped automatically.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="file" id="excel-file-input" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
              <label htmlFor="excel-file-input" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#43474e',
                background: '#ffffff', border: '1px solid #c4c6cf', borderRadius: '6px'
              }}>
                <FileSpreadsheet size={16} /> Choose Spreadsheet File
              </label>
              <a href={api.excel.downloadTemplateUrl()} download style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#002045',
                background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none'
              }}>
                <Download size={16} /> Download Template
              </a>
            </div>
          </div>
        ) : (
          /* File Selected / Parsed Card */
          <div style={{
            border: '1px solid rgba(196,198,207,0.6)', borderRadius: '8px', padding: '24px',
            background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#e5eeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileSpreadsheet size={24} color="#002045" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0b1c30' }}>{selectedFile?.name || 'Selected file'}</div>
                  <div style={{ fontSize: '13px', color: '#43474e', marginTop: '2px' }}>
                    {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : '—'} •{' '}
                    {previewData ? `${previewData.totalRows} records detected` : 'Ready to parse'} • Strict UTF-8 format
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {previewData ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#003f27', background: 'rgba(175,241,202,0.3)', padding: '6px 12px', borderRadius: '999px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#003f27' }} />
                    File Parsed Successfully
                  </span>
                ) : (
                  <button
                    onClick={handlePreviewUpload}
                    disabled={parsing}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#ffffff', background: '#002045', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    {parsing ? <><RefreshCw className="spin" size={14} /> Analyzing...</> : <>Validate & Preview <ArrowRight size={14} /></>}
                  </button>
                )}
                <button onClick={handleReset} style={{ fontSize: '13px', color: '#74777f', background: 'none', border: '1px solid #c4c6cf', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* STEP 2: Validation Summary */}
      {previewData && !importReport && (
        <section style={{ marginBottom: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            {stepBadge(2)}
            <h2 style={sectionTitleStyle}>Validation Summary</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0', border: '0' }}>
            {[
              {
                value: previewData.validCount,
                label: 'Ready to Import',
                sub: 'Clean records meeting clinical cooldown standards',
                color: '#0b1c30', labelColor: '#0b1c30',
                border: '1px solid rgba(196,198,207,0.4)'
              },
              {
                value: previewData.totalRows - previewData.validCount - previewData.invalidCount,
                label: 'Existing Donors',
                sub: 'Phone match found; records will be merged safely',
                color: '#0b1c30', labelColor: '#0b1c30',
                border: '1px solid rgba(196,198,207,0.4)'
              },
              {
                value: previewData.invalidCount,
                label: 'Excluded Records',
                sub: 'Failed validation (missing digits or early donation date)',
                color: '#b52426', labelColor: '#b52426',
                border: 'none'
              }
            ].map((item, i) => (
              <div key={i} style={{
                paddingRight: i < 2 ? '24px' : 0, paddingLeft: i > 0 ? '24px' : 0,
                borderRight: i < 2 ? '1px solid rgba(196,198,207,0.4)' : 'none',
                paddingBottom: '8px'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: item.labelColor, marginTop: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '12px', color: '#43474e', marginTop: '4px' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* STEP 3: Excluded Records Preview */}
      {previewData && !importReport && (
        <section style={{ marginBottom: '64px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ ...sectionTitleStyle, fontSize: '15px' }}>Preview Excluded Records</h2>
            <p style={{ fontSize: '12px', color: '#43474e', margin: '4px 0 0 0' }}>
              The following {previewData.invalidCount} rows will be omitted from the database import automatically.
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '0', borderBottom: '0' }}>
            <button
              onClick={() => setActivePreviewTab('INVALID')}
              style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: activePreviewTab === 'INVALID' ? '#fef2f2' : 'transparent', color: activePreviewTab === 'INVALID' ? '#dc2626' : '#74777f' }}
            >✗ Excluded Rows ({previewData.invalidCount})</button>
            <button
              onClick={() => setActivePreviewTab('VALID')}
              style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: activePreviewTab === 'VALID' ? '#f0fdf4' : 'transparent', color: activePreviewTab === 'VALID' ? '#15803d' : '#74777f' }}
            >✓ Valid Records ({previewData.validCount})</button>
          </div>

          <div style={{ border: '1px solid rgba(196,198,207,0.4)', borderRadius: '8px', overflow: 'hidden', background: '#ffffff', marginTop: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(196,198,207,0.3)' }}>
                  {activePreviewTab === 'INVALID' ? (
                    ['Row', 'Donor Details', 'Issue Detected'].map(h => (
                      <th key={h} style={{ padding: '16px 24px', fontSize: '12px', color: '#43474e', fontWeight: 600 }}>{h}</th>
                    ))
                  ) : (
                    ['Row', 'Full Name', 'Phone', 'Blood Group', 'Last Donation Date', 'Eligibility'].map(h => (
                      <th key={h} style={{ padding: '16px 24px', fontSize: '12px', color: '#43474e', fontWeight: 600 }}>{h}</th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody style={{ color: '#0b1c30' }}>
                {activePreviewTab === 'INVALID' ? (
                  previewData.invalidRows.slice(0, 4).map((inv) => (
                    <tr key={inv.rowNumber} style={{ borderBottom: '1px solid rgba(196,198,207,0.2)' }}>
                      <td style={{ padding: '16px 24px', color: '#74777f', fontFamily: 'monospace', fontSize: '12px' }}>#{inv.rowNumber}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontWeight: 500 }}>{inv.rawData?.full_name || inv.rawData?.name || '—'}</span>
                        <span style={{ display: 'block', fontSize: '12px', color: '#74777f', marginTop: '2px' }}>
                          Phone: {inv.rawData?.phone || '—'}
                          {inv.rawData?.blood_group ? ` • ${inv.rawData.blood_group}` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '12px', color: '#b52426' }}>{inv.reason}</td>
                    </tr>
                  ))
                ) : (
                  previewData.validRows.slice(0, 10).map((r) => (
                    <tr key={r.rowNumber} style={{ borderBottom: '1px solid rgba(196,198,207,0.2)' }}>
                      <td style={{ padding: '16px 24px', color: '#74777f', fontFamily: 'monospace', fontSize: '12px' }}>#{r.rowNumber}</td>
                      <td style={{ padding: '16px 24px', fontWeight: 500 }}>{r.full_name}</td>
                      <td style={{ padding: '16px 24px', fontFamily: 'monospace', fontSize: '13px' }}>{r.phone}</td>
                      <td style={{ padding: '16px 24px', fontWeight: 700, color: '#002045' }}>{r.blood_group}</td>
                      <td style={{ padding: '16px 24px' }}>{r.last_donation_date}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: r.eligibility?.isEligible ? '#15803d' : '#b45309' }}>
                          {r.eligibility?.statusText || '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {activePreviewTab === 'INVALID' && previewData.invalidCount > 4 && (
              <div style={{ padding: '12px 24px', background: 'rgba(239,244,255,0.5)', fontSize: '12px', color: '#43474e', borderTop: '1px solid rgba(196,198,207,0.3)' }}>
                Showing 4 sample issues. Remaining {previewData.invalidCount - 4} records share similar discrepancies and will also be skipped.
              </div>
            )}
          </div>

          {/* Action */}
          <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(196,198,207,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <input type="checkbox" checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#002045' }} />
                <span><strong>Update existing records</strong> if duplicate phone/email is found</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#43474e' }}>Target Database: Clinical Master Donor Roster</span>
              <button onClick={handleReset} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 500, color: '#43474e', background: 'none', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleCommitBatch}
                disabled={committing || previewData.validCount === 0}
                style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 600, color: '#ffffff', background: '#002045', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: previewData.validCount === 0 ? 0.5 : 1 }}
              >
                {committing ? <><RefreshCw className="spin" size={14} /> Writing to Database...</> : <><Database size={14} /> Import Valid Records ({previewData.validCount})</>}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Post-Commit Report */}
      {importReport && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <CheckCircle2 size={32} color="#15803d" />
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Historical Migration Completed</h2>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    Created <strong>{importReport.importedCount}</strong> new donors • Updated <strong>{importReport.updatedCount}</strong> duplicates • Rejected <strong>{importReport.rejectedCount}</strong> invalid rows
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => onNavigate('donors')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#ffffff', background: '#002045', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  View in Donors Directory <ArrowRight size={14} />
                </button>
                <button onClick={handleReset} style={{ padding: '10px 18px', fontSize: '14px', fontWeight: 500, color: '#43474e', background: '#ffffff', border: '1px solid #c4c6cf', borderRadius: '6px', cursor: 'pointer' }}>
                  Upload Another File
                </button>
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(196,198,207,0.4)', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(196,198,207,0.3)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0b1c30', margin: 0 }}>Committed Donor Records</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(196,198,207,0.3)' }}>
                  {['Action', 'Donor Name', 'Phone', 'Blood Group', 'Last Donation Date'].map(h => (
                    <th key={h} style={{ padding: '14px 24px', fontSize: '12px', fontWeight: 600, color: '#43474e' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importReport.importedRecords.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid rgba(196,198,207,0.2)' }}>
                    <td style={{ padding: '14px 24px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, background: rec.action === 'CREATED' ? '#f0fdf4' : '#eff6ff', color: rec.action === 'CREATED' ? '#15803d' : '#1d4ed8' }}>{rec.action}</span>
                    </td>
                    <td style={{ padding: '14px 24px', fontWeight: 600, color: '#0b1c30' }}>{rec.full_name}</td>
                    <td style={{ padding: '14px 24px', fontFamily: 'monospace', fontSize: '13px' }}>{rec.phone}</td>
                    <td style={{ padding: '14px 24px', fontWeight: 700, color: '#002045' }}>{rec.blood_group}</td>
                    <td style={{ padding: '14px 24px', color: '#002045', fontWeight: 500 }}>{rec.last_donation_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
