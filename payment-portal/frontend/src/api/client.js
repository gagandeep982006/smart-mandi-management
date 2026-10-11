const rawBase = (process.env.REACT_APP_API_URL || "http://localhost:5004/api").trim().replace(/\/+$/, "");
const BASE_URL = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;

/**
 * Universal API fetch wrapper with credentials: "include" for HttpOnly cookies.
 */
export async function apiRequest(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${cleanEndpoint}`;

    const defaultHeaders = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    };

    const config = {
        ...options,
        credentials: "include", // Mandatory for cookie transmission
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const error = new Error(data?.message || `Request failed with status ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    } catch (err) {
        if (!err.status && err.name === "TypeError") {
            const networkError = new Error("Unable to connect to payment server. Check if backend is running.");
            networkError.status = 503;
            throw networkError;
        }
        throw err;
    }
}
