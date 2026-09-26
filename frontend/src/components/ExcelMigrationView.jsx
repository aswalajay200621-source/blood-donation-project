import React, { useState } from 'react';
import { api } from '../services/api';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  ArrowRight,
  Filter,
  FileCheck
} from 'lucide-react';

export default function ExcelMigrationView({ onNavigate }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [activePreviewTab, setActivePreviewTab] = useState('VALID'); // 'VALID' | 'INVALID'

  // Handle file drop / select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewData(null);
      setImportReport(null);
      setErrorMsg('');
    }
  };

  // Upload and parse preview
  const handlePreviewUpload = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select an .xlsx or .csv spreadsheet file.');
      return;
    }

    try {
      setParsing(true);
      setErrorMsg('');
      const res = await api.excel.preview(selectedFile);
      if (res.success && res.data) {
        setPreviewData(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to parse Excel file.');
    } finally {
      setParsing(false);
    }
  };

  // Commit validated rows to database
  const handleCommitBatch = async () => {
    if (!previewData || !previewData.validRows || previewData.validRows.length === 0) {
      setErrorMsg('No valid rows available to commit.');
      return;
    }

    try {
      setCommitting(true);
      setErrorMsg('');
      const res = await api.excel.commit(previewData.validRows, updateExisting);
      if (res.success && res.report) {
        setImportReport(res.report);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to commit import to database.');
    } finally {
      setCommitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportReport(null);
    setErrorMsg('');
  };

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
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
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)' }}>
                Phase 1: Initial Historical Data Migration
              </h1>
              <span style={{
                background: 'var(--brand-primary-light)',
                color: 'var(--brand-primary)',
                border: '1px solid var(--brand-primary-border)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 700
              }}>
                ONE-TIME MIGRATION TOOL
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
              Bulk-import historical donor records so the hospital database starts with past donation timelines.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={api.excel.downloadTemplateUrl()}
            download
            className="btn btn-secondary btn-sm"
          >
            <Download size={15} color="var(--brand-primary)" />
            <span>Download Official Template (.xlsx)</span>
          </a>
          {(previewData || importReport) && (
            <button onClick={handleReset} className="btn btn-secondary btn-sm">
              New Upload
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div style={{
          background: 'var(--blood-red-light)',
          border: '1px solid var(--blood-red-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          color: 'var(--blood-red)',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Upload Dropzone */}
      {!previewData && !importReport && (
        <div className="classic-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            background: 'var(--brand-primary-light)',
            border: '2px dashed var(--brand-primary-border)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <UploadCloud size={36} color="var(--brand-primary)" />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
            Upload Historical Donors Spreadsheet
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '520px', margin: '0 auto 20px auto' }}>
            Supports Microsoft Excel (<strong>.xlsx</strong>) and <strong>.csv</strong>. Standard headers like <em>Full Name, Phone (10 digits), Email, Blood Group, Last Donation Date</em> will be automatically mapped.
          </p>

          <input
            type="file"
            id="excel-file-input"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
            <label htmlFor="excel-file-input" className="btn btn-secondary btn-lg" style={{ cursor: 'pointer' }}>
              <FileSpreadsheet size={18} />
              <span>{selectedFile ? selectedFile.name : 'Choose Spreadsheet File'}</span>
            </label>

            {selectedFile && (
              <button
                onClick={handlePreviewUpload}
                disabled={parsing}
                className="btn btn-primary btn-lg"
              >
                {parsing ? (
                  <>
                    <RefreshCw className="spin" size={18} />
                    <span>Analyzing Rows...</span>
                  </>
                ) : (
                  <>
                    <span>Validate & Preview Rows</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Validation Preview */}
      {previewData && !importReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="grid-3">
            <div className="classic-card" style={{ borderTop: '4px solid var(--brand-primary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Spreadsheet Rows
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-dark)', marginTop: '4px' }}>
                {previewData.totalRows}
              </div>
            </div>

            <div
              className="classic-card"
              onClick={() => setActivePreviewTab('VALID')}
              style={{
                borderTop: '4px solid var(--status-eligible)',
                cursor: 'pointer',
                background: activePreviewTab === 'VALID' ? '#f0fdf4' : '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--status-eligible)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Valid Rows (Ready)
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--status-eligible)', marginTop: '4px' }}>
                    {previewData.validCount}
                  </div>
                </div>
                <CheckCircle2 size={24} color="#15803d" />
              </div>
            </div>

            <div
              className="classic-card"
              onClick={() => setActivePreviewTab('INVALID')}
              style={{
                borderTop: '4px solid var(--blood-red)',
                cursor: 'pointer',
                background: activePreviewTab === 'INVALID' ? '#fef2f2' : '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--blood-red)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Invalid / Rejected Rows
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--blood-red)', marginTop: '4px' }}>
                    {previewData.invalidCount}
                  </div>
                </div>
                <XCircle size={24} color="#dc2626" />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="classic-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary)' }}
              />
              <span>
                <strong>Update existing records</strong> if duplicate phone/email is found
              </span>
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleReset} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleCommitBatch}
                disabled={committing || previewData.validCount === 0}
                className="btn btn-success btn-lg"
              >
                {committing ? (
                  <>
                    <RefreshCw className="spin" size={18} />
                    <span>Writing to Database...</span>
                  </>
                ) : (
                  <>
                    <Database size={18} />
                    <span>Commit {previewData.validCount} Records to Database</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tabbed Table */}
          <div className="classic-card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActivePreviewTab('VALID')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activePreviewTab === 'VALID' ? 'var(--status-eligible-bg)' : 'transparent',
                  color: activePreviewTab === 'VALID' ? 'var(--status-eligible)' : 'var(--text-muted)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✓ Valid Records ({previewData.validCount})
              </button>
              <button
                onClick={() => setActivePreviewTab('INVALID')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activePreviewTab === 'INVALID' ? 'var(--status-blocked-bg)' : 'transparent',
                  color: activePreviewTab === 'INVALID' ? 'var(--blood-red)' : 'var(--text-muted)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✗ Rejected Rows ({previewData.invalidCount})
              </button>
            </div>

            {activePreviewTab === 'VALID' ? (
              <div className="neon-table-container">
                <table className="neon-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Full Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Blood Group</th>
                      <th>Last Donation Date</th>
                      <th>Eligibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.validRows.map((r) => (
                      <tr key={r.rowNumber}>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>#{r.rowNumber}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{r.full_name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{r.phone}</td>
                        <td>{r.email}</td>
                        <td><span className="blood-badge">{r.blood_group}</span></td>
                        <td>{r.last_donation_date}</td>
                        <td>
                          <span className={`status-pill ${r.eligibility.statusBadge}`}>
                            {r.eligibility.statusText}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="neon-table-container">
                <table className="neon-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Reason for Rejection</th>
                      <th>Raw Spreadsheet Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.invalidRows.map((inv) => (
                      <tr key={inv.rowNumber}>
                        <td style={{ color: 'var(--blood-red)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>#{inv.rowNumber}</td>
                        <td style={{ color: 'var(--blood-red)', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={15} />
                            {inv.reason}
                          </div>
                        </td>
                        <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {JSON.stringify(inv.rawData)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Post-Commit Report */}
      {importReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'var(--status-eligible-bg)',
            border: '1.5px solid var(--status-eligible-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <CheckCircle2 size={32} color="#15803d" />
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    Historical Migration Completed
                  </h2>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Created <strong>{importReport.importedCount}</strong> new donors • Updated <strong>{importReport.updatedCount}</strong> duplicates • Rejected <strong>{importReport.rejectedCount}</strong> invalid rows
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => onNavigate('donors')}
                  className="btn btn-primary"
                >
                  <span>View in Donors Directory</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={handleReset}
                  className="btn btn-secondary"
                >
                  Upload Another File
                </button>
              </div>
            </div>
          </div>

          <div className="classic-card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Committed Donor Records</h3>
            </div>
            <div className="neon-table-container">
              <table className="neon-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Donor Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Blood Group</th>
                    <th>Last Donation Date</th>
                  </tr>
                </thead>
                <tbody>
                  {importReport.importedRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          background: rec.action === 'CREATED' ? 'var(--status-eligible-bg)' : 'var(--brand-primary-light)',
                          color: rec.action === 'CREATED' ? 'var(--status-eligible)' : 'var(--brand-primary)'
                        }}>
                          {rec.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{rec.full_name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{rec.phone}</td>
                      <td>{rec.email}</td>
                      <td><span className="blood-badge">{rec.blood_group}</span></td>
                      <td style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{rec.last_donation_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
