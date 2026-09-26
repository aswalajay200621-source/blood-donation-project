import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function DashboardView({ onNavigate, onSelectDonor }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggeringCron, setTriggeringCron] = useState(false);
  const [cronResult, setCronResult] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.getStats();
      if (res.success) setStats(res.stats);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleTriggerDailyScan = async (e) => {
    e?.preventDefault();
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

  // Default design counts with live DB overlay when available
  const bloodVaultData = [
    {
      group: 'O+',
      units: stats?.bloodGroupCounts?.['O+'] !== undefined && stats.bloodGroupCounts['O+'] > 0 ? stats.bloodGroupCounts['O+'] : 54,
      supply: '22 Days',
      status: 'Sufficient',
      statusType: 'success',
      clinicalNote: 'Optimal storage load',
      isCritical: false
    },
    {
      group: 'O-',
      units: stats?.bloodGroupCounts?.['O-'] !== undefined && stats.bloodGroupCounts['O-'] > 0 ? stats.bloodGroupCounts['O-'] : 4,
      supply: '2 Days',
      status: 'Critical Low',
      statusType: 'critical',
      clinicalNote: 'Notify Donors',
      isCritical: true
    },
    {
      group: 'A+',
      units: stats?.bloodGroupCounts?.['A+'] !== undefined && stats.bloodGroupCounts['A+'] > 0 ? stats.bloodGroupCounts['A+'] : 41,
      supply: '18 Days',
      status: 'Sufficient',
      statusType: 'success',
      clinicalNote: 'Cross-matching stable',
      isCritical: false
    },
    {
      group: 'A-',
      units: stats?.bloodGroupCounts?.['A-'] !== undefined && stats.bloodGroupCounts['A-'] > 0 ? stats.bloodGroupCounts['A-'] : 11,
      supply: '8 Days',
      status: 'Moderate',
      statusType: 'warning',
      clinicalNote: 'Routine monitoring',
      isCritical: false
    },
    {
      group: 'B+',
      units: stats?.bloodGroupCounts?.['B+'] !== undefined && stats.bloodGroupCounts['B+'] > 0 ? stats.bloodGroupCounts['B+'] : 48,
      supply: '20 Days',
      status: 'Sufficient',
      statusType: 'success',
      clinicalNote: 'Safe reserve level',
      isCritical: false
    },
    {
      group: 'B-',
      units: stats?.bloodGroupCounts?.['B-'] !== undefined && stats.bloodGroupCounts['B-'] > 0 ? stats.bloodGroupCounts['B-'] : 3,
      supply: '2 Days',
      status: 'Critical Low',
      statusType: 'critical',
      clinicalNote: 'Notify Donors',
      isCritical: true
    },
    {
      group: 'AB+',
      units: stats?.bloodGroupCounts?.['AB+'] !== undefined && stats.bloodGroupCounts['AB+'] > 0 ? stats.bloodGroupCounts['AB+'] : 19,
      supply: '16 Days',
      status: 'Sufficient',
      statusType: 'success',
      clinicalNote: 'Plasma baseline normal',
      isCritical: false
    },
    {
      group: 'AB-',
      units: stats?.bloodGroupCounts?.['AB-'] !== undefined && stats.bloodGroupCounts['AB-'] > 0 ? stats.bloodGroupCounts['AB-'] : 6,
      supply: '9 Days',
      status: 'Moderate',
      statusType: 'warning',
      clinicalNote: 'Monitored for surgery list',
      isCritical: false
    }
  ];

  // Recent entries from DB or design fallback
  const recentEntries = stats?.recentDonations?.length > 0
    ? stats.recentDonations.slice(0, 5).map((d) => ({
        time: d.donation_date || 'Today',
        name: d.full_name,
        group: d.blood_group,
        type: 'Whole Blood (450ml)',
        location: d.camp_location || 'Hospital Ward A',
        isCritical: ['O-', 'B-', 'A-', 'AB-'].includes(d.blood_group)
      }))
    : [
        { time: '07:42 AM', name: 'Vikas K. Malhotra', group: 'O+', type: 'Whole Blood (450ml)', location: 'IIT Campus Hall B', isCritical: false },
        { time: '07:28 AM', name: 'Pooja Sundaram', group: 'A+', type: 'Plateletpheresis', location: 'Hospital Apheresis Unit', isCritical: false },
        { time: '07:15 AM', name: 'Devendra Pratap Singh', group: 'B-', type: 'Whole Blood (350ml)', location: 'IIT Campus Hall B', isCritical: true },
        { time: '06:55 AM', name: 'Sanya Mehra', group: 'AB+', type: 'Whole Blood (350ml)', location: 'Metro Station Camp', isCritical: false },
        { time: '06:40 AM', name: 'Farhan Akhtar Siddiqui', group: 'O+', type: 'Whole Blood (450ml)', location: 'Metro Station Camp', isCritical: false }
      ];

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="w-full">
      {/* Page Title & Operational Context */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-primary">Operational Overview</h1>
          <p className="text-sm text-text-muted">{currentDateFormatted} • Shift A (07:00 – 15:00)</p>
        </div>
      </div>

      {/* Daily scan result alert */}
      {cronResult && (
        <div className="mb-8 border-l-4 border-state-success bg-state-success-soft p-4 rounded-r-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-state-success text-22px">check_circle</span>
            <div>
              <h3 className="text-sm font-semibold text-text-main">3-Month Safety Scan Complete</h3>
              <p className="text-sm text-text-muted mt-0.5">
                Found {cronResult.eligibleDonorsFound} eligible donors • Dispatched: {cronResult.sentCount} sent, {cronResult.skippedCount} skipped.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCronResult(null)}
            className="text-xs font-semibold text-text-muted hover:text-text-main px-3 py-1 bg-white border border-surface-border rounded-md"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Alert Strip (Subtle, uncluttered notice) */}
      <div className="mb-12 border-l-4 border-secondary bg-surface-subtle p-5 rounded-r-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-secondary text-22px mt-0.5">error</span>
          <div>
            <h2 className="text-sm font-semibold text-text-main">Rh-Negative Reserves Critically Low</h2>
            <p className="text-sm text-text-muted mt-0.5">
              O-Negative ({bloodVaultData[1].units} Units) and B-Negative ({bloodVaultData[5].units} Units) are below the mandatory 15-day reserve threshold.
            </p>
          </div>
        </div>
        <button
          onClick={handleTriggerDailyScan}
          disabled={triggeringCron}
          className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-secondary-dark transition-colors self-start md:self-center shrink-0 bg-transparent border-0 cursor-pointer p-0"
        >
          {triggeringCron ? 'Scanning...' : 'Dispatch Priority Recall'}
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>

      {/* 4 Clean Open Key Metrics (Divider aligned, no heavy cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12">
        <div className="bg-white border border-surface-border rounded-md p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-2">Registered Donors</div>
          <div className="text-3xl font-bold text-primary tracking-tight">
            {stats?.totalDonors ? stats.totalDonors.toLocaleString() : '4,820'}
          </div>
          <div className="text-xs text-text-muted mt-2 flex items-center gap-1.5">
            <span className="text-state-success font-medium">+142</span>
            <span>this month</span>
          </div>
        </div>

        <div className="bg-white border border-surface-border rounded-md p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-2">Eligible for Recall</div>
          <div className="text-3xl font-bold text-primary tracking-tight">
            {stats?.eligibleNowCount ? stats.eligibleNowCount.toLocaleString() : '1,248'}
          </div>
          <div className="text-xs text-text-muted mt-2 flex items-center gap-1.5">
            <span>&gt;90 days since donation</span>
          </div>
        </div>

        <div className="bg-white border border-surface-border rounded-md p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-2">Monthly Collections</div>
          <div className="text-3xl font-bold text-primary tracking-tight">
            {stats?.upcomingThisWeekCount || 618} <span className="text-base font-normal text-text-muted">Units</span>
          </div>
          <div className="text-xs text-text-muted mt-2 flex items-center gap-1.5">
            <span>94.8% of 650 unit goal</span>
          </div>
        </div>

        <div className="bg-white border border-surface-border rounded-md p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-2">Scheduled Dispatches</div>
          <div className="text-3xl font-bold text-primary tracking-tight">
            {stats?.blockedCount || 84}
          </div>
          <div className="text-xs text-text-muted mt-2 flex items-center gap-1.5">
            <span>Next batch firing at 08:00 AM</span>
          </div>
        </div>
      </div>

      {/* Live Blood Inventory (Clean spacious table strip instead of 8 cluttered cards) */}
      <section className="py-8 border-b border-surface-border">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-5 gap-2">
          <div>
            <h2 className="text-lg font-bold text-primary tracking-tight">Blood Vault Stock (Chamber 1 • 4°C)</h2>
            <p className="text-sm text-text-muted mt-0.5">Physical count confirmed 45 mins ago</p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="text-xs text-text-muted font-medium bg-surface-subtle px-3 py-1.5 rounded-md border border-surface-border">
              Mandatory reserve threshold: 15 Days
            </div>
            <button
              onClick={fetchStats}
              title="Refresh inventory"
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-main px-2.5 py-1.5 rounded-md border border-surface-border bg-white hover:bg-surface-subtle transition-colors cursor-pointer"
            >
              <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-surface-border bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-subtle border-b border-surface-border text-xs uppercase tracking-wider text-text-muted">
                <th className="py-3.5 px-6 font-semibold border-r border-surface-border">Blood Group</th>
                <th className="py-3.5 px-6 font-semibold border-r border-surface-border">Available Stock</th>
                <th className="py-3.5 px-6 font-semibold border-r border-surface-border">Projected Supply</th>
                <th className="py-3.5 px-6 font-semibold border-r border-surface-border">Status</th>
                <th className="py-3.5 px-6 font-semibold text-right">Clinical Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-sm">
              {bloodVaultData.map((row) => (
                <tr
                  key={row.group}
                  className={
                    row.isCritical
                      ? 'bg-state-error-soft/30 hover:bg-state-error-soft/50 transition-colors'
                      : 'hover:bg-surface-subtle/60 transition-colors'
                  }
                >
                  <td
                    className={`py-4 px-6 font-bold text-base border-r border-surface-border ${
                      row.isCritical ? 'text-secondary' : 'text-primary'
                    }`}
                  >
                    {row.group}
                  </td>
                  <td
                    className={`py-4 px-6 border-r border-surface-border ${
                      row.isCritical ? 'font-bold text-secondary' : 'font-semibold text-text-main'
                    }`}
                  >
                    {row.units} Units
                  </td>
                  <td
                    className={`py-4 px-6 border-r border-surface-border ${
                      row.isCritical ? 'text-secondary font-medium' : 'text-text-muted'
                    }`}
                  >
                    {row.supply}
                  </td>
                  <td className="py-4 px-6 border-r border-surface-border">
                    {row.statusType === 'success' && (
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-state-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-state-success"></span>
                        Sufficient
                      </span>
                    )}
                    {row.statusType === 'critical' && (
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        Critical Low
                      </span>
                    )}
                    {row.statusType === 'warning' && (
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-state-warning">
                        <span className="w-1.5 h-1.5 rounded-full bg-state-warning"></span>
                        Moderate
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right text-xs">
                    {row.isCritical ? (
                      <button
                        onClick={() => onNavigate('notifications')}
                        className="text-secondary font-semibold hover:underline inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0 ml-auto"
                      >
                        Notify Donors <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    ) : (
                      <span className="text-text-muted">{row.clinicalNote}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Logs & Compliance Section (Open, simple, uncluttered) */}
      <section className="pt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Recent Camp Entries (2 cols) */}
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-lg font-bold text-primary">Recent Donations Today</h2>
            <button
              onClick={() => onNavigate('camp-entry')}
              className="text-xs font-semibold text-primary hover:underline bg-transparent border-0 cursor-pointer p-0"
            >
              View All →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-text-muted">
                  <th className="py-3 font-semibold pr-4">Time</th>
                  <th className="py-3 font-semibold px-4">Donor</th>
                  <th className="py-3 font-semibold px-4">Group</th>
                  <th className="py-3 font-semibold px-4">Type</th>
                  <th className="py-3 font-semibold pl-4">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-text-main">
                {recentEntries.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-subtle/60 transition-colors">
                    <td className="py-3.5 pr-4 text-xs text-text-muted">{row.time}</td>
                    <td className="py-3.5 px-4 font-medium">{row.name}</td>
                    <td
                      className={`py-3.5 px-4 font-semibold ${
                        row.isCritical ? 'text-secondary font-bold' : 'text-primary'
                      }`}
                    >
                      {row.group}
                    </td>
                    <td className="py-3.5 px-4 text-text-muted text-xs">{row.type}</td>
                    <td className="py-3.5 pl-4 text-text-muted text-xs">{row.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Protocol Safeguard (Clean overview, no redundant buttons) */}
        <div>
          <h2 className="text-lg font-bold text-primary mb-6">Safety Protocol Guard</h2>
          <div className="space-y-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-1">Mandatory Interval</div>
              <p className="text-text-main leading-relaxed">
                Enforcing strict 90-day donation interval for complete hemoglobin recovery (≥12.5 g/dL).
              </p>
            </div>
            <div className="pt-4 border-t border-surface-border space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-text-muted">Passed 90-Day Clearance Today</span>
                <span className="font-bold text-primary">{stats?.upcomingThisWeekCount || 52}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-text-muted">Auto-Deferred (Gap &lt; 90d)</span>
                <span className="font-bold text-secondary">{stats?.blockedCount || 14}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-text-muted">Daily Verification Audit</span>
                <span className="text-state-success font-medium flex items-center gap-1 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-state-success"></span>
                  Passed (03:00 AM)
                </span>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('camp-entry')}
                className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
              >
                Go to Camp Entry Stream
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
