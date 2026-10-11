const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

/**
 * Universal fetch wrapper with credentials: "include"
 */
export async function apiFetch(endpoint, options = {}) {
    const config = {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    };

    if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }

    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const response = await fetch(`${API_BASE}${cleanEndpoint}`, config);
    let data;
    try {
        data = await response.json();
    } catch (err) {
        data = { success: false, message: "Invalid server response" };
    }

    if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
}

// Authentication APIs
export const authApi = {
    requestOtp: (aadhaar, mobile) => apiFetch("/api/auth/request-otp", {
        method: "POST",
        body: { aadhaar, mobile }
    }),
    verifyOtp: (aadhaar, mobile, otp) => apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: { aadhaar, mobile, otp }
    }),
    logout: () => apiFetch("/api/auth/logout", {
        method: "POST"
    }),
    getMe: () => apiFetch("/api/auth/me")
};

// Farmer Portal APIs
export const farmerApi = {
    getProfile: () => apiFetch("/api/farmer/profile"),
    getLand: () => apiFetch("/api/farmer/land"),
    getProcurementSessions: (all = false) => apiFetch(`/api/farmer/procurement-sessions?all=${all}`),
    getAvailableCrops: (sessionId = null) => apiFetch(`/api/farmer/available-crops${sessionId ? `?session_id=${sessionId}` : ""}`),
    getAvailableMandis: (cropId = null) => apiFetch(`/api/farmer/available-mandis${cropId ? `?crop_id=${cropId}` : ""}`),
    getAvailableCounters: (mandiId, cropId, date = null) => apiFetch(`/api/farmer/available-counters?mandi_id=${mandiId}&crop_id=${cropId}${date ? `&date=${date}` : ""}`),
    getAvailableSlots: (mandiId, counterId, date, excludeBookingId = null) => apiFetch(`/api/farmer/available-slots?mandi_id=${mandiId}&counter_id=${counterId}&date=${date}${excludeBookingId ? `&exclude_booking_id=${excludeBookingId}` : ""}`),
    getAllocation: (cropId, sessionId) => apiFetch(`/api/farmer/allocation?crop_id=${cropId}&session_id=${sessionId}`),
    createBooking: (data) => apiFetch("/api/farmer/bookings", {
        method: "POST",
        body: data
    }),
    getBookings: (page = 1, limit = 10) => apiFetch(`/api/farmer/bookings?page=${page}&limit=${limit}`),
    getCurrentBooking: () => apiFetch("/api/farmer/bookings/current"),
    cancelBooking: (bookingId) => apiFetch(`/api/farmer/bookings/${bookingId}/cancel`, {
        method: "PATCH"
    }),
    deleteBooking: (bookingId) => apiFetch(`/api/farmer/bookings/${bookingId}`, {
        method: "DELETE"
    }),
    deleteToken: (tokenId = null) => apiFetch(`/api/farmer/token${tokenId ? `/${tokenId}` : ""}`, {
        method: "DELETE"
    }),
    rescheduleBooking: (bookingId, data) => apiFetch(`/api/farmer/bookings/${bookingId}/reschedule`, {
        method: "PATCH",
        body: data
    }),
    getToken: () => apiFetch("/api/farmer/token"),
    getPayments: () => apiFetch("/api/farmer/payment"),
    getHistory: (page = 1, limit = 10) => apiFetch(`/api/farmer/history?page=${page}&limit=${limit}`),
    getRecentBookings: (page = 1, limit = 10) => apiFetch(`/api/farmer/recent-bookings?page=${page}&limit=${limit}`),
    getDashboard: () => apiFetch("/api/farmer/dashboard"),
    getEarlyCallRequests: () => apiFetch("/api/farmer/early-call-requests"),
    respondEarlyCallRequest: (requestId, action, responseMessage = "") => apiFetch(`/api/farmer/early-call-requests/${requestId}/respond`, {
        method: "POST",
        body: { action, response: responseMessage }
    })
};
