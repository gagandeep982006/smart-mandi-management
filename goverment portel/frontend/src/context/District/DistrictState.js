import Districtcontext from "./DistrictContext";

export default function AuthState(props) {
    const host = (process.env.REACT_APP_HOST || "").replace(/\/+$/, "");
    const getDistrict = async (state_id) => {
        try {
            const response = await fetch(
                `${host}/api/location/district/getdistrict/${state_id}`,
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

    const removeDistrict = async (district_id) => {
        try {
            const response = await fetch(
                `${host}/api/location/district/deletedistrict/${district_id}`,
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

    const addDistrict = async (payload) => {
        try {
            const response = await fetch(
                `${host}/api/location/district/adddistrict`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        state_id: payload.state_id,
                        district_name: payload.district_name,
                        district_code:payload.district_code
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
        <Districtcontext.Provider value ={{getDistrict ,removeDistrict, addDistrict}}>
            {props.children}
        </Districtcontext.Provider>
    );
}