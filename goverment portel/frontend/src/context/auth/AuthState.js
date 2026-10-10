import AuthContext from './AuthContext'

export default function AuthState(props) {
    const host = process.env.REACT_APP_HOST;

        const GovLogoutAPI = async () => {
        try {
            const response = await fetch(
                `${host}/api/auth/logout`,
                {
                    method: "POST",
                    credentials: "include"
                }
            );
            const data = await response.json();
            return data.success;
        } catch (error) {
            return false;
        }
    };

    const checkAuth = async () => {
        try {
            const response = await fetch(
                `${host}/api/auth/me`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );
            const data = await response.json();
            return data.success ? data.user : null;
        } catch (error) {
            return null;
        }
    };

    const requestOtpAPI = async (phoneNumber) => {
        try {
            const response = await fetch(`${host}/api/auth/request-otp`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_number: phoneNumber })
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: "Network error requesting OTP" };
        }
    };

    const verifyOtpAPI = async (phoneNumber, otp) => {
        try {
            const response = await fetch(`${host}/api/auth/verify-otp`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_number: phoneNumber, otp })
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: "Network error verifying OTP" };
        }
    };

    const getProfileAPI = async () => {
        try {
            const response = await fetch(`${host}/api/auth/profile`, {
                method: "GET",
                credentials: "include"
            });
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            return null;
        }
    };

    return (
        <AuthContext.Provider value={{ GovLogoutAPI, checkAuth, requestOtpAPI, verifyOtpAPI, getProfileAPI }}>
            {props.children}
        </AuthContext.Provider>
    );
}