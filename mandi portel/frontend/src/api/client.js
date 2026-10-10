/**
 * API client configured with credentials: "include"
 * Reads HttpOnly cookie automatically.
 */
export async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    
    const defaultHeaders = {
        "Accept": "application/json"
    };

    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
        defaultHeaders["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        },
        credentials: "include" // REQUIRED: sends HttpOnly cookie
    };

    const response = await fetch(url, config);

    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = { success: false, message: response.statusText || "Server error" };
    }

    if (!response.ok) {
        const error = new Error(data.message || "An error occurred");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}
