
import { useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate();

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        {/* Mobile Hamburger Button */}
        <button 
          className="hamburger-btn" 
          onClick={onToggleSidebar} 
          aria-label="Open Navigation Menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Search Bar */}
        <div className="topbar-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search mandis, farmers, crops..."
            className="search-field"
          />
        </div>
      </div>

      {/* User Profile */}
      <div 
        className="topbar-profile" 
        onClick={() => navigate('/profile')} 
        style={{ cursor: 'pointer' }}
        title="View My Profile"
      >
        <div className="profile-avatar">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <div className="profile-details">
          <span className="profile-name">My Profile</span>
          <span className="profile-role">Official Details</span>
        </div>
        <span className="profile-dropdown-arrow">▾</span>
      </div>
    </header>
  );
}