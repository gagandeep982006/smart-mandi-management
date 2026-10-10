import React, { useState } from 'react';
import { 
  Sprout, 
  LayoutDashboard, 
  CalendarPlus, 
  CalendarCheck2, 
  Ticket, 
  CreditCard, 
  History, 
  User, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({ farmer, activeTab, setActiveTab, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'book-slot', label: 'Book Slot', icon: CalendarPlus },
    { id: 'bookings', label: 'My Bookings', icon: CalendarCheck2 },
    { id: 'token', label: 'Queue Token', icon: Ticket },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'history', label: 'Sales History', icon: History },
    { id: 'profile', label: 'Land & Profile', icon: User },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Gov Bar */}
      <div className="header-top">
        <span>
          <ShieldCheck size={14} /> Government of Haryana • Food, Civil Supplies & Consumer Affairs Department
        </span>
        <span>
          e-Kisan Mandi Procurement Self-Service Portal
        </span>
      </div>

      {/* Main Navbar */}
      <header className="portal-navbar">
        <div className="navbar-container">
          {/* Brand */}
          <div className="navbar-brand" onClick={() => handleTabClick('dashboard')}>
            <div className="brand-icon">
              <Sprout size={26} />
            </div>
            <div>
              <div className="brand-title">e-Kisan Mandi Portal</div>
              <div className="brand-subtitle">किसान ई-उपार्जन एवं टोकन प्रणाली</div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <ul className="nav-links">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleTabClick(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Farmer Chip & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {farmer && (
              <div className="farmer-pill">
                <div className="farmer-avatar">
                  {farmer.name ? farmer.name.charAt(0).toUpperCase() : 'K'}
                </div>
                <div className="farmer-info">
                  <span className="farmer-name">{farmer.name}</span>
                  <span className="farmer-tehsil">
                    {farmer.tehsil_name || 'Tehsil'} • {farmer.district_name || 'District'}
                  </span>
                </div>
              </div>
            )}

            <button 
              className="btn-logout" 
              onClick={onLogout} 
              title="Sign Out of Portal"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--gray-700)'
              }}
              className="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--gray-200)',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleTabClick(item.id)}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}
