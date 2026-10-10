import { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/auth/AuthContext';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { GovLogoutAPI } = useContext(AuthContext);

  const handleLogout = async (e) => {
    e.preventDefault();
    if (GovLogoutAPI) {
      await GovLogoutAPI();
    }
    navigate('/login');
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="leaf-icon">🌱</span>
          <div className="brand-texts">
            <h2 className="brand-title">Mandi Management</h2>
            <p className="brand-subtitle">Agri Supply Chain</p>
          </div>
        </div>
        {/* Close icon visible on mobile only */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          ✕
        </button>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">🏠</span> Home
        </NavLink>
        <NavLink to="/states" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">🏛️</span> States
        </NavLink>
        <NavLink to="/districts" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">🏙️</span> Districts
        </NavLink>
        <NavLink to="/tehsils" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">🌿</span> Tehsils
        </NavLink>
        <NavLink to="/mandis" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">🏪</span> Mandis
        </NavLink>
        <NavLink to="/mandi-counters" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">🪟</span> Mandi Counters
        </NavLink>
        <NavLink to="/crops" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">🍃</span> Crops
        </NavLink>
        <NavLink to="/farmers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">👥</span> Farmers
        </NavLink>
        <NavLink to="/procurement" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">📊</span> Procurement Session
        </NavLink>
        <NavLink to="/adduser" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">👨‍💼</span> Add User
        </NavLink>
        <NavLink to="/addmandiuser" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">👨‍💼</span> Add MandiUser
        </NavLink>
        <NavLink to="/payment-users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">💳</span> State Payment Users
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">👤</span> My Profile
        </NavLink>
        <NavLink to="/chatbot" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="link-icon">🤖</span> Chatbot
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <button onClick={handleLogout} className="sidebar-link logout-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
          <span className="link-icon">⇥</span> Logout
        </button>
      </div>
    </aside>
  );
}