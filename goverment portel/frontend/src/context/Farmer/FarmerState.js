import FarmerContext from "./FarmerContext";

export default function FarmerState(props) {
    const host = (process.env.REACT_APP_HOST || "").replace(/\/+$/, "");

    const addFarmer = async (payload) => {
        try {
            const response = await fetch(
                `${host}/api/farmer/addfarmer`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name:payload.name,
                        mobile_number:payload.mobile_number,
                        email:payload.email,
                        address:payload.address,
                        state_id:payload.state_id,
                        district_id:payload.district_id,
                        tehsil_id:payload.tehsil_id,
                        aadhaar_number:payload.aadhaar_number,

                        bank_name:payload.bank_name,
                        account_number:payload.account_number,
                        ifsc_code:payload.ifsc_code
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const getFarmerByAddhar = async (addhar_number) => {
        try {
            const response = await fetch(
                `${host}/api/farmer/getfarmer/aadhaar/${addhar_number}`,
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const getFarmers = async (payload,payload2) => {
        try {
            const response = await fetch(
                `${host}/api/farmer?page=${payload.page}&limit=${payload.limit}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload2 || {})
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const removeFarmer = async (farmer_id) => {
        try {
            const response = await fetch(
                `${host}/api/farmer/removefarmer/${farmer_id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const updateFarmer = async (farmerId, updatePayload) => {
        try {
            const response = await fetch(`${host}/api/farmer/update/${farmerId}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatePayload),
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const addFarmerLand = async (payload) => {
        try {
            const response = await fetch(
                `${host}/api/farmer/land/addland`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        farmer_id:payload.farmer_id,
                        area:payload.area,
                        ownership_type:payload.ownership_type,
                        land_type:payload.land_type
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const removeFarmerLand = async (land_id) => {
        try {
            const response = await fetch(
                `${host}/api/farmer/land/removeland/${land_id}`,
                {
                    method: "DELETE",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const getFarmerLand = async (farmer_id) => {
        try {
            const response = await fetch(
                `${host}/api/farmer/land/farmer/${farmer_id}`,
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const changeLandVerificationStatus = async (land_id,status) => {
        try {
            const response = await fetch(
                `${host}/api/farmer/land/${land_id}/verification`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        land_verification:status
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    return (
        <FarmerContext.Provider value ={{ addFarmer,getFarmers ,getFarmerByAddhar,removeFarmer,updateFarmer,addFarmerLand,removeFarmerLand,getFarmerLand,changeLandVerificationStatus}}>
            {props.children}
        </FarmerContext.Provider>
    );
}