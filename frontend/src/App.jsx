/**
 * ============================================================================
 * File: frontend/src/App.jsx
 * Purpose: Main Root Application Component & View Orchestrator
 * ----------------------------------------------------------------------------
 * Description:
 * This component acts as the central layout container and router for the
 * Apex Hospital Blood Bank Management System.
 *
 * Responsibilities:
 * 1. Checks user authentication status via `AuthContext`.
 * 2. Renders the login modal if the user is not authenticated.
 * 3. Fetches system configuration settings (SMTP, WhatsApp, SMS thresholds).
 * 4. Controls active navigation tab states (`dashboard`, `camp-entry`, `donors`,
 *    `excel-import`, `notifications`, `settings`, `security`).
 * 5. Hosts the persistent clinical header (`Navbar`), the primary content views,
 *    and the hospital status footer.
 * 6. Manages the global `DonorDetailsModal` drawer overlay when a donor is selected.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import DashboardView from './components/DashboardView';
import LiveCampEntryView from './components/LiveCampEntryView';
import ExcelMigrationView from './components/ExcelMigrationView';
import DonorsDirectoryView from './components/DonorsDirectoryView';
import NotificationsView from './components/NotificationsView';
import SettingsView from './components/SettingsView';
import SecurityAuditView from './components/SecurityAuditView';
import DonorDetailsModal from './components/DonorDetailsModal';
import { RefreshCw } from 'lucide-react';

export default function App() {
  // Authentication status and loading state from custom AuthContext
  const { isAuthenticated, loading } = useAuth();

  // Active top-level navigation tab state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Hospital system settings (e.g. notifications, cron status)
  const [systemSettings, setSystemSettings] = useState(null);

  // Global selected donor record for the details modal drawer
  const [selectedDonor, setSelectedDonor] = useState(null);

  // Fetch hospital system settings once the medical staff is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      api.settings.get().then((res) => {
        if (res.success && res.settings) {
          setSystemSettings(res.settings);
        }
      }).catch((e) => console.warn('Could not fetch settings:', e));
    }
  }, [isAuthenticated]);

  // Loading Screen: Displayed while verifying JWT session token with backend
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-space)',
        color: 'var(--text-muted)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="spin" size={36} color="var(--neon-cyan)" />
          <div style={{ marginTop: '16px', fontSize: '16px', fontWeight: 600 }}>
            Initializing Hospital Node Security...
          </div>
        </div>
      </div>
    );
  }

  // Authentication Guard: If not signed in, display the staff authentication modal
  if (!isAuthenticated) {
    return <LoginModal />;
  }

  return (
    <div className="app-container">
      {/* 1. Global Clinical Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemSettings={systemSettings}
      />

      {/* 2. Primary Page Content Container (Responsive up to 1400px width) */}
      <main className="w-full flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 1: Operational Overview & Blood Vault Stock */}
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={setActiveTab}
            onSelectDonor={setSelectedDonor}
          />
        )}

        {/* Tab 2: Live Camp Entry & Donor Intake */}
        {activeTab === 'camp-entry' && (
          <LiveCampEntryView
            onSelectDonor={setSelectedDonor}
          />
        )}

        {/* Tab 3: Excel Roster Spreadsheet Migration */}
        {activeTab === 'excel-import' && (
          <ExcelMigrationView
            onNavigate={setActiveTab}
          />
        )}

        {/* Tab 4: Hospital Donor Master Registry Directory */}
        {activeTab === 'donors' && (
          <DonorsDirectoryView
            onSelectDonor={setSelectedDonor}
          />
        )}

        {/* Tab 5: Automated Reminder & Dispatch Center */}
        {activeTab === 'notifications' && (
          <NotificationsView
            systemSettings={systemSettings}
          />
        )}

        {/* Tab 6: Hospital Administration & System Settings */}
        {activeTab === 'settings' && (
          <SettingsView
            onSettingsSaved={(newSettings) => setSystemSettings(newSettings)}
          />
        )}

        {/* Tab 7: Security Audit Logs & Compliance Verification */}
        {activeTab === 'security' && (
          <SecurityAuditView />
        )}
      </main>

      {/* 3. Clinical System Status Footer */}
      <footer className="w-full border-t border-surface-border py-8 mt-12 bg-white text-xs text-text-muted">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>Apex Hospital Blood Bank Helpline: <strong className="text-text-main font-semibold">(011) 2658-8500</strong></div>
          <div>Clinical System v2.4-LTS • Connected to Secure Local Server</div>
        </div>
      </footer>

      {/* 4. Global Donor Details Drawer Modal */}
      {selectedDonor && (
        <DonorDetailsModal
          donor={selectedDonor}
          onClose={() => setSelectedDonor(null)}
          onRefresh={async () => {
            const fresh = await api.donors.getById(selectedDonor.id);
            if (fresh.success && fresh.donor) setSelectedDonor(fresh.donor);
          }}
        />
      )}
    </div>
  );
}
