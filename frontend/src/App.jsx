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
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemSettings, setSystemSettings] = useState(null);
  const [selectedDonor, setSelectedDonor] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      api.settings.get().then((res) => {
        if (res.success && res.settings) {
          setSystemSettings(res.settings);
        }
      }).catch((e) => console.warn('Could not fetch settings:', e));
    }
  }, [isAuthenticated]);

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

  if (!isAuthenticated) {
    return <LoginModal />;
  }

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemSettings={systemSettings}
      />

      <main className="w-full flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={setActiveTab}
            onSelectDonor={setSelectedDonor}
          />
        )}

        {activeTab === 'camp-entry' && (
          <LiveCampEntryView
            onSelectDonor={setSelectedDonor}
          />
        )}

        {activeTab === 'excel-import' && (
          <ExcelMigrationView
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'donors' && (
          <DonorsDirectoryView
            onSelectDonor={setSelectedDonor}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView
            systemSettings={systemSettings}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onSettingsSaved={(newSettings) => setSystemSettings(newSettings)}
          />
        )}

        {activeTab === 'security' && (
          <SecurityAuditView />
        )}
      </main>

      {/* Clean, Calm Footer */}
      <footer className="w-full border-t border-surface-border py-8 mt-12 bg-white text-xs text-text-muted">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>Apex Hospital Blood Bank Helpline: <strong className="text-text-main font-semibold">(011) 2658-8500</strong></div>
          <div>Clinical System v2.4-LTS • Connected to Secure Local Server</div>
        </div>
      </footer>

      {/* Global Donor Details Drawer / Modal */}
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
