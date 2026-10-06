/**
 * ============================================================================
 * File: frontend/src/components/Navbar.jsx
 * Purpose: Global Navigation Header with Hamburger Sidebar Menu
 * ----------------------------------------------------------------------------
 * Description:
 * Renders the top navigation bar with a hamburger (☰) icon on the left that
 * opens a sliding sidebar containing all navigation items + logout.
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Menu, X, Home, UserPlus, Users, FileSpreadsheet,
  Bell, ShieldCheck, Settings, Users2, LogOut, Heart
} from 'lucide-react';

const NAV_ICONS = {
  'dashboard':     Home,
  'camp-entry':    UserPlus,
  'donors':        Users,
  'excel-import':  FileSpreadsheet,
  'notifications': Bell,
  'staff':         Users2,
  'security':      ShieldCheck,
  'settings':      Settings,
};

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);

  const navItems = [
    { id: 'dashboard',     label: 'Home' },
    { id: 'camp-entry',    label: 'Add Donor' },
    { id: 'donors',        label: 'All Donors' },
    { id: 'excel-import',  label: 'Import Records' },
    { id: 'notifications', label: 'Send Reminders' },
    ...(isAdmin ? [
      { id: 'staff',    label: 'Staff' },
      { id: 'security', label: 'Activity Log' },
      { id: 'settings', label: 'Settings' }
    ] : [])
  ];

  const displayName = user?.name || 'Hospital Staff';
  const roleName    = user?.role === 'admin' ? 'Administrator' : 'Staff';
  const initials    = displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'HS';

  // Close sidebar when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setSidebarOpen(false);
      }
    };
    if (sidebarOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sidebarOpen]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleNavClick = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    setSidebarOpen(false);
    logout();
  };

  return (
    <>
      {/* ── Top Header Bar ─────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        width: '100%'
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>

          {/* Left: Hamburger + Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

            {/* Hamburger Button */}
            <button
              id="sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              title="Open Menu"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px', borderRadius: '8px', color: '#334155',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Menu size={24} />
            </button>

            {/* Logo */}
            <div
              onClick={() => setActiveTab('dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '9px',
                background: '#dc2626', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Heart size={18} color="#fff" fill="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  Apex Hospital
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                  Blood Bank System
                </div>
              </div>
            </div>
          </div>

          {/* Right: User info + Register Donor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

            {/* User info (hidden on small screens) */}
            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'none' }} className="sm-show">
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{roleName}</div>
              </div>
              {/* Avatar */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#eff6ff', border: '2px solid #bfdbfe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: '#1e40af', cursor: 'default'
              }} title={user?.email}>
                {initials}
              </div>
            </div>

            {/* Register Donor CTA */}
            <button
              onClick={() => setActiveTab('camp-entry')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', background: '#1e3a8a',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.15s', whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
              onMouseLeave={e => e.currentTarget.style.background = '#1e3a8a'}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
              Register Donor
            </button>
          </div>
        </div>
      </header>

      {/* ── Sidebar Overlay ──────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
            transition: 'opacity 0.2s'
          }}
        />
      )}

      {/* ── Sidebar Panel ────────────────────────────────────────── */}
      <nav
        ref={sidebarRef}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: '280px', zIndex: 200,
          background: '#fff',
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          willChange: 'transform'
        }}
      >
        {/* Sidebar Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: '#dc2626', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Heart size={20} color="#fff" fill="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Apex Hospital</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Blood Bank System</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px', borderRadius: '6px', color: '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: '#fafafa'
        }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: '#eff6ff', border: '2px solid #bfdbfe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: 700, color: '#1e40af', flexShrink: 0
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{user?.email}</div>
            <div style={{
              display: 'inline-block', marginTop: '3px',
              fontSize: '10px', fontWeight: 700, color: '#1e40af',
              background: '#eff6ff', borderRadius: '4px', padding: '1px 6px'
            }}>
              {roleName}
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.08em', padding: '8px 8px 4px', textTransform: 'uppercase' }}>
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = NAV_ICONS[item.id] || Home;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderRadius: '8px', border: 'none',
                  background: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#1e40af' : '#475569',
                  fontSize: '14px', fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left', marginBottom: '2px',
                  transition: 'background 0.12s, color 0.12s'
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {item.label}
                {isActive && (
                  <div style={{
                    marginLeft: 'auto', width: '6px', height: '6px',
                    borderRadius: '50%', background: '#1e40af'
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Logout Button at Bottom */}
        <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 12px', borderRadius: '8px',
              border: '1.5px solid #fee2e2',
              background: '#fff5f5', color: '#dc2626',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff5f5'}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </nav>
    </>
  );
}
