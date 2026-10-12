import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Sidebar/Header';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Close the mobile drawer whenever a route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Auth verification via HttpOnly cookie
  useEffect(() => {
    let isMounted = true;
    const host = (process.env.REACT_APP_HOST || "").replace(/\/+$/, "");
    fetch(`${host}/api/auth/me`, {
      method: "GET",
      credentials: "include"
    })
      .then((res) => {
        if (!res.ok) {
          navigate('/login');
        } else if (isMounted) {
          setAuthLoading(false);
        }
      })
      .catch(() => {
        navigate('/login');
      });
    return () => {
      isMounted = false;
    };
  }, [navigate, location.pathname]);

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#1b4332", fontSize: "0.95rem", fontWeight: 600 }}>Verifying session...</p>
      </div>
    );
  }

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