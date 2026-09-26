import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Overview & Stock' },
    { id: 'camp-entry', label: 'Live Camp Entry' },
    { id: 'donors', label: 'Donors Directory' },
    { id: 'excel-import', label: 'Excel Migration' },
    { id: 'notifications', label: 'Reminders' },
    ...(isAdmin ? [
      { id: 'security', label: 'Audit & Security' },
      { id: 'settings', label: 'Settings' }
    ] : [])
  ];

  const displayName = user?.name || 'Dr. R. Sharma';
  const roleName = user?.role === 'admin' ? 'Chief Medical Officer' : 'Camp Officer';
  const initials = displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'RS';

  return (
    <header className="w-full bg-white border-b border-surface-border sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Upper branding row */}
        <div className="h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img
              alt="Apex Hospital Blood Bank Logo"
              className="h-9 w-auto object-contain cursor-pointer"
              onClick={() => setActiveTab('dashboard')}
              src="https://lh3.googleusercontent.com/aida/AEtjO1Xm6WQ__w7QRVA5t4ujaWilR2yk1B7TaH58aWOIqKa3UPOyOS_QlkPQkLFleS8vZ5WC2919MVmiroUOWWtMpg89zlKubWMhVv8M22IXCxJJi4qJxIc8v_VzKMU02_y9QlGGHbxVTJeq7NqluefRt7UkMfRzAYUdizGbKyINFHlA9hH0PfzO76ddNqL825-Wf3c5BWxq2v8na7bxTZNppQYoNfEwR-P71r9dC_YJ65L1igCPM_cqE_RXwA"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback if external image is blocked */}
            <div style={{ display: 'none' }} className="items-center gap-2 font-bold text-primary text-lg">
              <span className="text-secondary font-black text-xl">♥</span> Apex Hospital
            </div>
            <span className="hidden md:inline-block h-5 w-px bg-surface-border"></span>
            <span className="hidden md:inline-block text-xs font-medium text-text-muted tracking-wide">
              Station #04 • On-Premise System
            </span>
          </div>

          <div className="flex items-center gap-6">
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

            <button
              onClick={() => setActiveTab('camp-entry')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-md transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Register Donor
            </button>
          </div>
        </div>

        {/* Flat, Understated Navigation */}
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
