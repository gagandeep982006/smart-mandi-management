import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Sidebar/Header';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close the mobile drawer whenever a route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Auth verification via HttpOnly cookie
  useEffect(() => {
    const host = process.env.REACT_APP_HOST;
    fetch(`${host}/api/auth/me`, {
      method: "GET",
      credentials: "include"
    })
      .then((res) => {
        if (!res.ok) {
          navigate('/login');
        }
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate, location.pathname]);

  return (
    <div className="layout-root">
      {/* Dimmed backdrop for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with open/close state */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Container */}
      <div className="layout-body">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="layout-content-slot">
          <Outlet />
        </main>
      </div>
    </div>
  );
}