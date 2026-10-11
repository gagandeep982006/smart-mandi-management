import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import DashboardLayout from "./components/layout/DashboardLayout";
import TopLoader from "./components/common/TopLoader";
import { topLoader } from "./utils/topLoader";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PendingPaymentsPage from "./pages/PendingPaymentsPage";
import ProcessingPaymentsPage from "./pages/ProcessingPaymentsPage";
import PaidPaymentsPage from "./pages/PaidPaymentsPage";
import CancelledPaymentsPage from "./pages/CancelledPaymentsPage";
import FailedPaymentsPage from "./pages/FailedPaymentsPage";
import ProfilePage from "./pages/ProfilePage";

function RouteProgressTracker() {
    const location = useLocation();
    useEffect(() => {
        topLoader.start();
        const t = setTimeout(() => {
            topLoader.done();
        }, 220);
        return () => clearTimeout(t);
    }, [location.pathname]);
    return null;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <TopLoader />
                <RouteProgressTracker />
                <Routes>
                    {/* Public Login Route */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Dashboard Layout */}
                    <Route path="/" element={<DashboardLayout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="payments/pending" element={<PendingPaymentsPage />} />
                        <Route path="payments/processing" element={<ProcessingPaymentsPage />} />
                        <Route path="payments/paid" element={<PaidPaymentsPage />} />
                        <Route path="payments/cancelled" element={<CancelledPaymentsPage />} />
                        <Route path="payments/failed" element={<FailedPaymentsPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                    </Route>

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
