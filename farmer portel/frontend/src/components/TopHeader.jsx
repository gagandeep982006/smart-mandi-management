import React from 'react';
import { Menu, ShieldCheck, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function TopHeader({ onToggleSidebar, activeTabTitle }) {
  const { lang, toggleLanguage, t } = useLanguage();

  return (
    <header className="portal-top-bar">
      <div className="top-bar-left">
        <button
          className="mobile-hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} />
        </button>
        <div className="top-bar-title-box">
          <span className="top-gov-badge">
            <ShieldCheck size={14} /> {t('govDepartment')}
          </span>
          <h1 className="page-heading-title">{activeTabTitle || 'Farmer Self-Service Portal'}</h1>
        </div>
      </div>

      <div className="top-bar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Bilingual Hindi / English Toggle Button */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="lang-toggle-btn"
          title={lang === 'en' ? 'Switch to Hindi (हिंदी)' : 'अंग्रेजी में बदलें (Switch to English)'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: lang === 'hi' ? '#eff6ff' : '#f0fdf4',
            border: lang === 'hi' ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
            color: lang === 'hi' ? '#1d4ed8' : '#166534',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.825rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <Globe size={15} />
          <span>{lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}</span>
        </button>

        <div className="portal-live-indicator">
          <span className="live-dot" />
          <span>{t('liveOperations')}</span>
        </div>
      </div>
    </header>
  );
}
