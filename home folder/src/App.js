import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Store, 
  Sprout, 
  CreditCard, 
  ExternalLink, 
  Settings2, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  RefreshCw,
  X,
  Lock,
  Layers,
  Activity,
  FileCheck2,
  Users
} from 'lucide-react';

const DEFAULT_PORTALS = [
  {
    id: 'farmer',
    name: 'Farmer Portal',
    hindiName: 'किसान पोर्टल',
    category: 'farmer',
    roleTag: 'Farmer Self-Service',
    defaultPort: 3002,
    defaultUrl: 'http://localhost:3002',
    icon: Sprout,
    themeColor: '#16a34a',
    accentBg: '#dcfce7',
    badgeColor: '#15803d',
    description: 'Self-service portal for registered farmers to book crop selling appointments, track queue tokens, and view payment vouchers.',
    features: [
      'Aadhaar & Mobile OTP authentication',
      'Seasonal crop slot & counter appointment booking',
      'Digital token pass with real-time queue position',
      '30-minute anti-hoarding booking cancellation lock',
      'Land parcel quotas & bank account status inspection'
    ],
    recommendedFor: 'Registered Farmers, Land Cultivators & Agricultural Producers'
  },
  {
    id: 'mandi',
    name: 'Mandi Portal',
    hindiName: 'मंडी संचालन पोर्टल',
    category: 'mandi',
    roleTag: 'Mandi Operations',
    defaultPort: 3000,
    defaultUrl: 'http://localhost:3000',
    icon: Store,
    themeColor: '#d97706',
    accentBg: '#fef3c7',
    badgeColor: '#b45309',
    description: 'Operational counter and yard management system for Mandi staff to call tokens, record net weights, and process grain procurement.',
    features: [
      'Phone OTP authentication with 4-tier PBAC',
      'Live counter queue management & arrival calling',
      'Weighbridge capture & automatic MSP calculations',
      '7-day delayed effective scheduling for hours & days',
      'Immediate payment record generation upon completion'
    ],
    recommendedFor: 'Mandi Staff, Weighbridge Operators & Yard Officers'
  },
  {
    id: 'gov',
    name: 'Government Portal',
    hindiName: 'सरकारी प्रशासन पोर्टल',
    category: 'gov',
    roleTag: 'Administration & Policy',
    defaultPort: 3001,
    defaultUrl: 'http://localhost:3001',
    icon: Building2,
    themeColor: '#1e40af',
    accentBg: '#dbeafe',
    badgeColor: '#1e3a8a',
    description: 'Centralized administrative engine for three-tier location hierarchy, officer onboarding, crop price setup, and quota enforcement.',
    features: [
      '3-Tier Jurisdictional Scoping (State → District → Tehsil)',
      'Role & Permission-Based Access Control (RBAC & PBAC)',
      'Mandi yard, weighing counter & crop procurement setup',
      'Aadhaar blind index security (HMAC-SHA256 & bcrypt)',
      'User management for Mandi, Payment & Nodal officers'
    ],
    recommendedFor: 'System Administrators, State/District/Tehsil Nodal Officers'
  },
  {
    id: 'payment',
    name: 'Payment Portal',
    hindiName: 'भुगतान संवितरण पोर्टल',
    category: 'payment',
    roleTag: 'Finance & DBT',
    defaultPort: 3004,
    defaultUrl: 'http://localhost:3004',
    icon: CreditCard,
    themeColor: '#7c3aed',
    accentBg: '#ede9fe',
    badgeColor: '#6d28d9',
    description: 'State-isolated payment disbursement management system to verify beneficiary details and execute MSP bank transfers.',
    features: [
      'State-isolated disbursement ledger & approval workflow',
      'Atomic status transitions (Pending → Processing → Paid)',
      'Optimized MySQL read views (vw_payment_details)',
      'Farmer beneficiary bank verification & proof capture',
      'Non-blocking MongoDB financial audit logging'
    ],
    recommendedFor: 'State Finance Officers & Payment Disbursement Approvers'
  }
];

export default function App() {
  const [portals, setPortals] = useState(() => {
    const saved = localStorage.getItem('hub_portal_configs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return DEFAULT_PORTALS.map(p => ({
          ...p,
          url: parsed[p.id] || p.defaultUrl
        }));
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_PORTALS.map(p => ({
      ...p,
      url: p.defaultUrl
    }));
  });

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempUrls, setTempUrls] = useState({});

  const saveConfig = () => {
    const updated = portals.map(p => ({
      ...p,
      url: tempUrls[p.id] || p.defaultUrl
    }));
    setPortals(updated);
    localStorage.setItem('hub_portal_configs', JSON.stringify(tempUrls));
    setShowConfigModal(false);
  };

  const resetConfig = () => {
    const map = {};
    DEFAULT_PORTALS.forEach(p => {
      map[p.id] = p.defaultUrl;
    });
    setTempUrls(map);
  };

  const filteredPortals = portals.filter(p => {
    const matchesFilter = activeFilter === 'all' || p.category === activeFilter;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      p.name.toLowerCase().includes(term) ||
      p.hindiName.includes(term) ||
      p.roleTag.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.features.some(f => f.toLowerCase().includes(term));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="app-layout">
      {/* Top Tricolor Strip */}
      <div className="top-tricolor" />

      {/* Navigation Header */}
      <header className="header-wrapper">
        <div className="container header-inner">
          <div className="brand-section">
            <div className="brand-emblem">
              🏛️
            </div>
            <div className="brand-titles">
              <h1>राष्ट्रीय कृषि खरीद पोर्टल हब</h1>
              <p>National Agricultural Procurement Unified Gateway • Government of India</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-pill">
            <ShieldCheck size={16} />
            <span>Secure Unified Procurement Infrastructure</span>
          </div>
          <h1 className="hero-title">
            One Gateway. <span>Four Powerful Portals.</span>
          </h1>
          <p className="hero-desc">
            Seamlessly navigate between Government Administration, Yard Weighbridge Operations, 
            Farmer Self-Service, and State Payment Disbursements in the unified agricultural procurement ecosystem.
          </p>

          {/* Search Bar */}
          <div style={{ maxWidth: '520px', margin: '0 auto 1.5rem', position: 'relative' }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} 
            />
            <input 
              type="text"
              placeholder="Search by role, feature, keyword (e.g. quota, weighbridge, dbt, token)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                borderRadius: '9999px',
                border: '1px solid var(--border)',
                background: 'white',
                fontSize: '0.9rem',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)'
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="filter-bar">
            <button 
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              <Layers size={15} /> All Portals ({portals.length})
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'farmer' ? 'active' : ''}`}
              onClick={() => setActiveFilter('farmer')}
            >
              <Sprout size={15} /> 🌾 Farmer Portal
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'mandi' ? 'active' : ''}`}
              onClick={() => setActiveFilter('mandi')}
            >
              <Store size={15} /> 🏢 Mandi Portal
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'gov' ? 'active' : ''}`}
              onClick={() => setActiveFilter('gov')}
            >
              <Building2 size={15} /> 🏛️ Government Portal
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'payment' ? 'active' : ''}`}
              onClick={() => setActiveFilter('payment')}
            >
              <CreditCard size={15} /> 💳 Payment Portal
            </button>
          </div>
        </div>
      </section>

      {/* Main Portals Grid */}
      <main className="container">
        <div className="portals-grid">
          {filteredPortals.map((portal) => {
            const IconComponent = portal.icon;
            return (
              <div 
                key={portal.id} 
                className="portal-card"
                style={{ borderTop: `4px solid ${portal.themeColor}` }}
              >
                <div className="card-header">
                  <div 
                    className="card-icon-wrap"
                    style={{ background: portal.accentBg, color: portal.themeColor }}
                  >
                    <IconComponent size={28} />
                  </div>
                  <div 
                    className="port-pill"
                    style={{ background: portal.accentBg, color: portal.badgeColor }}
                  >
                    PORT {portal.defaultPort}
                  </div>
                </div>

                <div 
                  className="card-role-tag"
                  style={{ background: portal.accentBg, color: portal.badgeColor }}
                >
                  {portal.roleTag}
                </div>

                <h3 className="card-title">{portal.name}</h3>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: portal.themeColor, marginBottom: '0.6rem' }}>
                  {portal.hindiName}
                </div>

                <p className="card-desc">{portal.description}</p>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Key Capabilities:
                  </div>
                  <ul className="features-list">
                    {portal.features.map((feature, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={15} style={{ color: portal.themeColor, flexShrink: 0 }} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1.25rem', padding: '0.6rem 0.8rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <strong>Audience:</strong> {portal.recommendedFor}
                </div>

                <a 
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-action-btn"
                  style={{ background: portal.themeColor }}
                >
                  <span>Launch {portal.name}</span>
                  <ExternalLink size={16} />
                </a>
              </div>
            );
          })}
        </div>

        {/* End-to-End System Workflow */}
        <section className="flow-section">
          <div className="section-heading">
            <h2>Procurement Lifecycle Architecture</h2>
            <p>How the four portals cooperate seamlessly across physical and financial operations</p>
          </div>

          <div className="flow-step-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#16a34a', color: 'white', padding: '6px', borderRadius: '8px' }}>
                <Lock size={18} />
              </div>
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#15803d' }}>Enterprise Security Architecture Across All 4 Portals</h4>
                <p style={{ fontSize: '0.825rem', color: '#166534', marginTop: '2px' }}>
                  All portals share unified server-side in-memory JavaScript Map abuse protection (5-minute OTP cooldown, failed attempt lockout, generic security responses) alongside HttpOnly JWT authentication and cryptographic HMAC-SHA256 Aadhaar hashing.
                </p>
              </div>
            </div>
          </div>

          <div className="flow-grid">
            <div className="flow-step-card">
              <div className="flow-step-num" style={{ background: '#1e40af' }}>1</div>
              <div className="flow-step-title">Government Setup</div>
              <div className="flow-step-desc">
                Admins configure Mandis, assign procurement crops, set MSP rates, define seasonal quotas, and provision field officers.
              </div>
            </div>

            <div className="flow-step-card">
              <div className="flow-step-num" style={{ background: '#16a34a' }}>2</div>
              <div className="flow-step-title">Farmer Slot Booking</div>
              <div className="flow-step-desc">
                Farmers log in using Aadhaar/Phone OTP, select available mandi counters, book procurement slots, and receive queue tokens.
              </div>
            </div>

            <div className="flow-step-card">
              <div className="flow-step-num" style={{ background: '#d97706' }}>3</div>
              <div className="flow-step-title">Mandi Yard Weighing</div>
              <div className="flow-step-desc">
                Operators call arrival tokens, inspect grain quality, weigh bags at assigned counters, and generate completion vouchers.
              </div>
            </div>

            <div className="flow-step-card">
              <div className="flow-step-num" style={{ background: '#7c3aed' }}>4</div>
              <div className="flow-step-title">Payment Disbursement</div>
              <div className="flow-step-desc">
                Finance officers inspect procurement proofs via MySQL read views and authorize direct bank account transfers for farmers.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Port Configuration Modal */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Configure Portal URLs & Ports</h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Modify the target URLs if your services run on custom ports, Docker containers, or remote network hosts:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
              {portals.map(p => (
                <div key={p.id}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    {p.name} (Default: Port {p.defaultPort})
                  </label>
                  <input 
                    type="text"
                    value={tempUrls[p.id] || ''}
                    onChange={(e) => setTempUrls({ ...tempUrls, [p.id]: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={resetConfig}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                Reset Defaults
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => setShowConfigModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    color: '#334155',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={saveConfig}
                  style={{
                    background: 'var(--primary)',
                    border: 'none',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: 700
                  }}
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer-wrap">
        <div className="container footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🌾</span>
            <strong style={{ color: '#0f172a' }}>National Agricultural Procurement Ecosystem</strong>
          </div>
          <p className="footer-credits">
            Ministry of Agriculture & Farmers Welfare • Food, Civil Supplies & Consumer Affairs Department
          </p>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Direct Links: Mandi (3000) • Government (3001) • Farmer (3002) • Payment (3004) • Gateway Hub (3005)
          </div>
        </div>
      </footer>
    </div>
  );
}
