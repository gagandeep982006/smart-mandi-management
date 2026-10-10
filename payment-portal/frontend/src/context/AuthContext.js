import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check existing session via /api/auth/me
    const checkAuth = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiRequest("/auth/me");
            if (res.success && res.user) {
                setUser(res.user);
            } else {
                setUser(null);
            }
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const requestOtp = async (phoneNumber) => {
        setError(null);
        try {
            const res = await apiRequest("/auth/request-otp", {
                method: "POST",
                body: { phone_number: phoneNumber }
            });
            if (res.success) {
                return res;
            }
            throw new Error(res.message || "Failed to send OTP");
        } catch (err) {
            setError(err.message || "Failed to send OTP");
            throw err;
        }
    };

    const verifyOtp = async (phoneNumber, otp) => {
        setError(null);
        try {
            const res = await apiRequest("/auth/verify-otp", {
                method: "POST",
                body: { phone_number: phoneNumber, otp }
            });
            if (res.success && res.user) {
                setUser(res.user);
                return res.user;
            }
            throw new Error(res.message || "OTP verification failed");
        } catch (err) {
            setError(err.message || "OTP verification failed");
            throw err;
        }
    };

    const getProfile = async () => {
        try {
            const res = await apiRequest("/auth/profile");
            if (res.success) {
                return res.data;
            }
            throw new Error(res.message || "Failed to fetch profile");
        } catch (err) {
            console.error("Profile fetch error:", err);
            throw err;
        }
    };

        const logout = async () => {
        try {
            await apiRequest("/auth/logout", { method: "POST" });
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            setUser(null);
        }
    };

    const hasPermission = (permission) => {
        if (!user || !Array.isArray(user.permissions)) return false;
        return user.permissions.includes(permission);
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            error, 
            logout, 
            checkAuth, 
            requestOtp, 
            verifyOtp, 
            getProfile, 
            hasPermission 
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
