import React from 'react';
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarCheck2,
  Ticket,
  CreditCard,
  History,
  User,
  LogOut,
  Sprout,
  ShieldCheck,
  X
} from 'lucide-react';

export default function Sidebar({
  farmer,
  activeTab,
  setActiveTab,
  onLogout,
  isOpen,
  onClose
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', hindi: 'डैशबोर्ड', icon: LayoutDashboard },
    { id: 'book-slot', label: 'Book Slot', hindi: 'स्लॉट बुक करें', icon: CalendarPlus },
    { id: 'bookings', label: 'My Booking', hindi: 'मेरी बुकिंग', icon: CalendarCheck2 },
    { id: 'token', label: 'My Token', hindi: 'टोकन विवरण', icon: Ticket },
    { id: 'history', label: 'Sales History', hindi: 'बिक्री इतिहास', icon: History },
    { id: 'payments', label: 'Payments', hindi: 'भुगतान स्थिति', icon: CreditCard },
    { id: 'profile', label: 'Profile', hindi: 'प्रोफ़ाइल एवं भूमि', icon: User },
  ];

  const handleSelect = (tabId) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`portal-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Sidebar Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-wrap">
            <div className="brand-icon-box">
              <Sprout size={24} color="#ffffff" />
            </div>
            <div className="brand-text">
              <div className="brand-heading">e-Kisan Portal</div>
              <div className="brand-sub">हरियाणा ई-उपार्जन पोर्टल</div>
            </div>
          </div>
          {/* Mobile close button */}
          <button 
            className="sidebar-close-btn" 
            onClick={onClose}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Farmer Profile Mini Card */}
        {farmer && (
          <div className="sidebar-profile-card">
            <div className="sidebar-avatar">
              {farmer.name ? farmer.name.charAt(0).toUpperCase() : 'K'}
            </div>
            <div className="sidebar-farmer-info">
              <div className="farmer-name-text">{farmer.name}</div>
              <div className="farmer-tehsil-text">
                {farmer.tehsil_name || 'Tehsil'} • {farmer.district_name || 'District'}
              </div>
              <div className="farmer-verify-badge">
                <ShieldCheck size={12} />
                <span>VERIFIED FARMER</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="sidebar-nav">
          <div className="nav-group-label">MAIN NAVIGATION</div>
          <ul className="sidebar-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="nav-item-wrapper">
                  <button
                    className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelect(item.id)}
                  >
                    <Icon size={20} className="nav-icon" />
                    <div className="nav-label-box">
                      <span className="nav-primary-label">{item.label}</span>
                      <span className="nav-hindi-label">{item.hindi}</span>
                    </div>
                    {isActive && <div className="active-pill" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer with Logout */}
        <div className="sidebar-footer">
          <button 
            className="sidebar-logout-btn" 
            onClick={onLogout}
            title="Sign Out of Farmer Portal"
          >
            <LogOut size={18} />
            <div style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: 600 }}>Logout</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>लॉगआउट करें</span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
