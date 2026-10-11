import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CounterDetail from "./pages/CounterDetail";
import CompletedFarmers from "./pages/CompletedFarmers";
import MandiSettings from "./pages/MandiSettings";
import CounterTimings from "./pages/CounterTimings";
import ChatbotPage from "./pages/ChatbotPage";
import Profile from "./pages/Profile";
import TopLoader from "./components/TopLoader";
import { topLoader } from "./utils/topLoader";

function ProtectedLayout() {
    const { user, loading } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Automatically close mobile drawer and trigger topLoader when navigating
    React.useEffect(() => {
        setSidebarOpen(false);
        topLoader.start();
        const t = setTimeout(() => {
            topLoader.done();
        }, 220);
        return () => clearTimeout(t);
    }, [location.pathname]);

    if (loading) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-main)"
            }}>
                <div style={{
                    width: "40px",
                    height: "40px",
                    border: "3px solid #e2e8f0",
                    borderTopColor: "var(--primary)",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                }} />
                <p style={{ fontSize: "0.95rem", fontWeight: 500 }}>Connecting to Mandi Operations Desk...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div style={{ display: "flex", minHeight: "100vh", width: "100%", position: "relative" }}>
            {/* Dimmed backdrop for mobile drawer */}
            {sidebarOpen && (
                <div 
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.55)",
                        backdropFilter: "blur(2px)",
                        zIndex: 998
                    }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Persistent Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Application Area */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                backgroundColor: "var(--bg-main)"
            }}>
                {/* Top Header */}
                <Header onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

                {/* Page Content Slot */}
                <main style={{ flex: 1 }}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/counter/:counter_id" element={<CounterDetail />} />
                        <Route path="/completed" element={<CompletedFarmers />} />
                        <Route path="/settings" element={<MandiSettings />} />
                        <Route path="/counter-timings" element={<CounterTimings />} />
                        <Route path="/chatbot" element={<ChatbotPage />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <TopLoader />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/*" element={<ProtectedLayout />} />
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </AuthProvider>
    );
}
