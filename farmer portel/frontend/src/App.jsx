import React, { useState, useEffect } from 'react';
import { authApi, farmerApi } from './api';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import BookingWizard from './components/BookingWizard';
import BookingsList from './components/BookingsList';
import TokenView from './components/TokenView';
import PaymentView from './components/PaymentView';
import HistoryView from './components/HistoryView';
import ProfileView from './components/ProfileView';
import RescheduleModal from './components/RescheduleModal';
import CancelModal from './components/CancelModal';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from './context/LanguageContext';

export default function App() {
  const { lang, t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [farmer, setFarmer] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  // Modals state
  const [rescheduleBookingTarget, setRescheduleBookingTarget] = useState(null);
  const [cancelBookingTarget, setCancelBookingTarget] = useState(null);

  // Toast notification state
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Check auth status on mount
  const checkAuth = async () => {
    setAuthLoading(true);
    try {
      const res = await authApi.getMe();
      if (res.success && (res.authenticated || res.farmer)) {
        setIsAuthenticated(true);
        if (res.farmer) setFarmer(res.farmer);
        await loadDashboard();
      } else {
        setIsAuthenticated(false);
        setFarmer(null);
      }
    } catch (err) {
      setIsAuthenticated(false);
      setFarmer(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Load dashboard data
  const loadDashboard = async () => {
    try {
      const res = await farmerApi.getDashboard();
      if (res.success) {
        setDashboardData(res.data);
        if (res.data.farmer) {
          setFarmer(res.data.farmer);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSuccess = async (loggedInFarmer) => {
    if (loggedInFarmer) {
      setIsAuthenticated(true);
      setFarmer(loggedInFarmer);
    }
    showToast('Login successful! Welcome to the Farmer Portal.');
    await checkAuth();
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setIsAuthenticated(false);
      setFarmer(null);
      setDashboardData(null);
      setActiveTab('dashboard');
      showToast('You have been logged out successfully.', 'info');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleBookingComplete = async (targetTab = 'token') => {
    showToast('Procurement booking confirmed and queue token issued!');
    await loadDashboard();
    setActiveTab(targetTab);
  };

  const handleRescheduleSuccess = async () => {
    setRescheduleBookingTarget(null);
    showToast('Your appointment slot was successfully rescheduled!');
    await loadDashboard();
  };

  const handleCancelSuccess = async () => {
    setCancelBookingTarget(null);
    showToast('Booking cancelled. Quota balance released back to your account.', 'info');
    await loadDashboard();
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        flexDirection: 'column',
        gap: '1rem',
        color: 'var(--gray-600)'
      }}>
        <RefreshCw size={36} className="animate-spin" color="var(--primary-600)" />
        <span style={{ fontWeight: 600 }}>Verifying secure farmer session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const getTabTitle = (tab) => {
    switch (tab) {
      case 'dashboard': return `${t('tabDashboard')} • ${lang === 'en' ? 'किसान डैशबोर्ड' : 'Dashboard'}`;
      case 'book-slot': return `${t('tabBookSlot')} • ${lang === 'en' ? 'उपार्जन स्लॉट बुकिंग' : 'Book Slot'}`;
      case 'bookings': return `${t('tabBookings')} • ${lang === 'en' ? 'मेरी बुकिंग्स' : 'My Bookings'}`;
      case 'token': return `${t('tabToken')} • ${lang === 'en' ? 'टोकन पास' : 'Queue Pass'}`;
      case 'payments': return `${t('tabPayments')} • ${lang === 'en' ? 'भुगतान स्थिति' : 'Payment Status'}`;
      case 'history': return `${t('tabHistory')} • ${lang === 'en' ? 'बिक्री इतिहास' : 'Sales History'}`;
      case 'profile': return `${t('tabProfile')} • ${lang === 'en' ? 'प्रोफ़ाइल एवं भूमि' : 'Profile & Land'}`;
      default: return 'Farmer Self-Service Portal';
    }
  };

  return (
    <div className="portal-app-layout">
      <Sidebar
        farmer={farmer}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="portal-main-area">
        <TopHeader
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          activeTabTitle={getTabTitle(activeTab)}
        />

        <main className="portal-content-scroll">
          {activeTab === 'dashboard' && (
            <Dashboard
              dashboardData={dashboardData}
              onNavigate={(tab) => setActiveTab(tab)}
              onReschedule={(b) => setRescheduleBookingTarget(b)}
              onCancel={(b) => setCancelBookingTarget(b)}
            />
          )}

          {activeTab === 'book-slot' && (
            <BookingWizard
              onBookingComplete={handleBookingComplete}
              onCancelWizard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingsList
              onNavigate={(tab) => setActiveTab(tab)}
              onReschedule={(b) => setRescheduleBookingTarget(b)}
              onCancel={(b) => setCancelBookingTarget(b)}
            />
          )}

          {activeTab === 'token' && (
            <TokenView onNavigate={(tab) => setActiveTab(tab)} />
          )}

          {activeTab === 'payments' && (
            <PaymentView />
          )}

          {activeTab === 'history' && (
            <HistoryView />
          )}

          {activeTab === 'profile' && (
            <ProfileView />
          )}
        </main>
      </div>

      {/* Global Modals */}
      {rescheduleBookingTarget && (
        <RescheduleModal
          booking={rescheduleBookingTarget}
          onClose={() => setRescheduleBookingTarget(null)}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      {cancelBookingTarget && (
        <CancelModal
          booking={cancelBookingTarget}
          onClose={() => setCancelBookingTarget(null)}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? (
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
