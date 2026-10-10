import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import DashboardLayout from "./components/layout/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PendingPaymentsPage from "./pages/PendingPaymentsPage";
import ProcessingPaymentsPage from "./pages/ProcessingPaymentsPage";
import PaidPaymentsPage from "./pages/PaidPaymentsPage";
import CancelledPaymentsPage from "./pages/CancelledPaymentsPage";
import FailedPaymentsPage from "./pages/FailedPaymentsPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
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
