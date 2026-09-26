import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  UserPlus,
  FileSpreadsheet,
  Users,
  Bell,
  Settings,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  UserCheck,
  Clock,
  Radio,
  Hospital
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, systemSettings }) {
  const { user, logout, isAdmin } = useAuth();

  const isEmailActive = systemSettings?.email_enabled === 'true';
  const isWhatsAppActive = systemSettings?.whatsapp_enabled !== 'false';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'camp-entry', label: 'Live Camp Entry', icon: UserPlus, highlight: true },
    { id: 'donors', label: 'Donors Directory', icon: Users },
    { id: 'excel-import', label: 'Excel Migration (Phase 1)', icon: FileSpreadsheet },
    { id: 'notifications', label: 'Notification Center', icon: Bell },
    ...(isAdmin ? [
      { id: 'settings', label: 'System Settings', icon: Settings },
      { id: 'security', label: 'Security & Audit', icon: ShieldCheck }
    ] : [])
  ];

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid var(--border-light)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Top Clinical Status Bar */}
      <div style={{
        background: '#0f172a',
        color: '#f8fafc',
        padding: '6px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
            <Radio size={12} color="#22c55e" />
            <strong style={{ color: '#fff' }}>Medical College Hospital</strong> Blood Bank Server #1
          </span>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isWhatsAppActive ? '#4ade80' : '#94a3b8' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isWhatsAppActive ? '#22c55e' : '#64748b' }} />
            WhatsApp API: {isWhatsAppActive ? 'Active' : 'Offline'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isEmailActive ? '#38bdf8' : '#fbbf24' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isEmailActive ? '#38bdf8' : '#f59e0b' }} />
            Email SMTP: {isEmailActive ? 'Active' : 'Standby (Disabled by default)'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            Daily Auto-Scan: 08:00 AM (3-Month Gap Check)
          </span>
        </div>
      </div>

      {/* Main Nav Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--blood-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
          }}>
            <Heart size={22} color="#ffffff" fill="#ffffff" />
          </div>
          <div>
            <div style={{
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--text-dark)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1
            }}>
              APEX HOSPITAL BLOOD CENTER
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              3-Month Safety Window & Donor Reminder Portal
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 15px',
                  borderRadius: 'var(--radius-md)',
                  border: isActive
                    ? '1px solid var(--brand-primary-border)'
                    : item.highlight
                    ? '1px solid var(--blood-red-border)'
                    : '1px solid transparent',
                  background: isActive
                    ? 'var(--brand-primary-light)'
                    : item.highlight
                    ? 'var(--blood-red-light)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--brand-primary)'
                    : item.highlight
                    ? 'var(--blood-red)'
                    : 'var(--text-body)',
                  fontWeight: isActive || item.highlight ? 700 : 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'var(--bg-subtle)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: user?.role === 'admin' ? '#f3e8ff' : '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserCheck size={16} color={user?.role === 'admin' ? '#7e22ce' : '#0369a1'} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                {user?.name || 'Staff User'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user?.role === 'admin' ? 'Chief Medical Officer' : 'Camp Nurse / Staff'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="btn btn-secondary btn-sm"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
