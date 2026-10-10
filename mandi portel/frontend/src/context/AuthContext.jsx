import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [mandi, setMandi] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            // 1. Fetch current authenticated token context
            const authRes = await apiFetch("/api/auth/me");
            if (authRes.success && authRes.data) {
                // 2. Fetch enriched Mandi and user details
                try {
                    const mandiRes = await apiFetch("/api/mandi/me");
                    if (mandiRes.success && mandiRes.data) {
                        setUser(mandiRes.data.user);
                        setMandi(mandiRes.data.mandi);
                    } else {
                        setUser(authRes.data);
                    }
                } catch {
                    setUser(authRes.data);
                }
            } else {
                setUser(null);
                setMandi(null);
            }
        } catch {
            setUser(null);
            setMandi(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

        const logout = async () => {
        try {
            await apiFetch("/api/auth/logout", { method: "POST" });
        } catch (e) {
            console.error("Logout error:", e);
        }
        setUser(null);
        setMandi(null);
    };

    const requestOtp = async (phone_number) => {
        return await apiFetch("/api/auth/request-otp", {
            method: "POST",
            body: { phone_number }
        });
    };

    const verifyOtp = async (phone_number, otp) => {
        const res = await apiFetch("/api/auth/verify-otp", {
            method: "POST",
            body: { phone_number, otp }
        });
        await checkAuth();
        return res;
    };

    const getProfile = async () => {
        return await apiFetch("/api/auth/profile");
    };

    return (
        <AuthContext.Provider value={{ user, mandi, loading, logout, checkAuth, requestOtp, verifyOtp, getProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
