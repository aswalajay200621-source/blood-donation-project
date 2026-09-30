/**
 * ============================================================================
 * File: frontend/src/components/Navbar.jsx
 * Purpose: Global Clinical Navigation Bar & Hospital Header Component
 * ----------------------------------------------------------------------------
 * Description:
 * This component renders the top navigation header for the Apex Hospital
 * Blood Bank system across all active screens.
 *
 * Responsibilities:
 * 1. Displays official hospital branding, logo, and active station telemetry.
 * 2. Displays authenticated medical staff details (Name, Role, Initials Avatar).
 * 3. Provides quick click-to-logout functionality via the staff avatar badge.
 * 4. Provides a prominent primary CTA button ("+ Register Donor") to quickly
 *    open the Live Camp Entry intake mode.
 * 5. Renders the flat understated navigation tabs with real-time active indicators:
 *    - Overview & Stock (Dashboard)
 *    - Live Camp Entry
 *    - Donors Directory
 *    - Excel Migration
 *    - Reminders
 *    - Audit & Security (Admin only)
 *    - Settings (Admin only)
 * ============================================================================
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab }) {
  // Consume authenticated staff context and role
  const { user, logout, isAdmin } = useAuth();

  // Navigation tab definitions with admin-only conditional guards
  const navItems = [
    { id: 'dashboard', label: 'Home' },
    { id: 'camp-entry', label: 'Add Donor' },
    { id: 'donors', label: 'All Donors' },
    { id: 'excel-import', label: 'Import Records' },
    { id: 'notifications', label: 'Send Reminders' },
    ...(isAdmin ? [
      { id: 'security', label: 'Activity Log' },
      { id: 'settings', label: 'Settings' }
    ] : [])
  ];

  // Clinical profile formatting
  const displayName = user?.name || 'Dr. R. Sharma';
  const roleName = user?.role === 'admin' ? 'Administrator' : 'Staff';
  const initials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'RS';

  return (
    <header className="w-full bg-white border-b border-surface-border sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ================================================================= */}
        {/* Section 1: Upper Branding & Staff Session Controls */}
        {/* ================================================================= */}
        <div className="h-20 flex items-center justify-between">
          
          {/* Hospital Logo & System Telemetry */}
          <div className="flex items-center gap-6">
            <img
              alt="Apex Hospital Blood Bank Logo"
              className="h-9 w-auto object-contain cursor-pointer"
              onClick={() => setActiveTab('dashboard')}
              src="https://lh3.googleusercontent.com/aida/AEtjO1Xm6WQ__w7QRVA5t4ujaWilR2yk1B7TaH58aWOIqKa3UPOyOS_QlkPQkLFleS8vZ5WC2919MVmiroUOWWtMpg89zlKubWMhVv8M22IXCxJJi4qJxIc8v_VzKMU02_y9QlGGHbxVTJeq7NqluefRt7UkMfRzAYUdizGbKyINFHlA9hH0PfzO76ddNqL825-Wf3c5BWxq2v8na7bxTZNppQYoNfEwR-P71r9dC_YJ65L1igCPM_cqE_RXwA"
              onError={(e) => {
                // Graceful fallback to text logo if external image fails to load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback element if remote image is blocked */}
            <div style={{ display: 'none' }} className="items-center gap-2 font-bold text-primary text-lg">
              <span className="text-secondary font-black text-xl">♥</span> Apex Hospital
            </div>
            <span className="hidden md:inline-block h-5 w-px bg-surface-border"></span>
            <span className="hidden md:inline-block text-xs font-medium text-text-muted tracking-wide">
              Blood Bank System
            </span>
          </div>

          {/* User Profile & Quick Donor Registration Action */}
          <div className="flex items-center gap-6">
            {/* Staff Credentials */}
            <div className="hidden sm:flex items-center gap-3 text-right">
              <div>
                <div className="text-sm font-semibold text-text-main leading-tight">{displayName}</div>
                <div className="text-xs text-text-muted">{roleName}</div>
              </div>
              <div
                title={user?.email ? `${user.email} (Click to Sign Out)` : 'Click to Sign Out'}
                onClick={logout}
                className="w-9 h-9 rounded-full bg-surface-subtle border border-surface-border flex items-center justify-center text-primary font-medium text-sm cursor-pointer hover:border-secondary transition-colors"
              >
                {initials}
              </div>
            </div>

            {/* Quick Register Donor CTA Button */}
            <button
              onClick={() => setActiveTab('camp-entry')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-md transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Register Donor
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Section 2: Understated Flat Navigation Tabs */}
        {/* ================================================================= */}
        <nav className="flex items-center gap-8 overflow-x-auto text-sm">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`py-3.5 border-b-2 font-semibold whitespace-nowrap transition-colors bg-transparent border-t-0 border-l-0 border-r-0 cursor-pointer ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-main'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
