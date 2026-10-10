import MandiContext from "./MandiContext";

export default function AuthState(props) {
    const host = process.env.REACT_APP_HOST;

    const getMandis = async (page,limit,payload) => {
        try {
            const response = await fetch(
                `${host}/api/mandis/getmandis?page=${page}&limit=${limit}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        state_id: payload.state_id,
                        district_id: payload.district_id,
                        tehsil_id: payload.tehsil_id
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const addMandi = async (payload) => {
        try {
            const response = await fetch(
                `${host}/api/mandis/addmandi`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        mandi_name: payload.mandi_name,
                        tehsil_id: payload.tehsil_id,
                        capacity: payload.capacity
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const deleteMandi = async (mandi_id) => {
        try {
            const response = await fetch(
                `${host}/api/mandis/removemandi/${mandi_id}`,
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

    const updateMandi = async (mandi_id,payload) => {
        try {
            const response = await fetch(
                `${host}/api/mandis/update/${mandi_id}`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        mandi_name: payload.mandi_name,
                        capacity: payload.capacity
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const addMandiCounter = async (payload) => {
        try {
            const response = await fetch(
                `${host}/api/mandicounters/addcounter`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        mandi_id: payload.mandi_id,
                        counter_number:payload.counter_number,
                        counter_name:payload.counter_name,
                        crop_id:payload.crop_id,
                        capacity_per_day:payload.capacity_per_day,
                        status:payload.status
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const deleteMandiCounter = async (counter_id) => {
        try {
            const response = await fetch(
                `${host}/api/mandicounters/removecounter/${counter_id}`,
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

    const updateMandiCounter = async (counter_id,payload) => {
        try {
            const response = await fetch(
                `${host}/api/mandicounters/updatecounter/${counter_id}`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        counter_number:payload.counter_number,
                        counter_name:payload.counter_name,
                        crop_id:payload.crop_id,
                        capacity_per_day:payload.capacity_per_day,
                        status:payload.status
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const getMandiCounter = async (mandi_id) => {
        try {
            const response = await fetch(
                `${host}/api/mandicounters/mandicounter/${mandi_id}`,
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

    const getMandiByTehsil = async (tehsil_id) => {
        try {
            const response = await fetch(
                `${host}/api/mandicounters/tehsil/${tehsil_id}`,
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

    return (
        <MandiContext.Provider value ={{ getMandis,addMandi,deleteMandi,updateMandi,addMandiCounter,deleteMandiCounter,updateMandiCounter,getMandiCounter,getMandiByTehsil }}>
            {props.children}
        </MandiContext.Provider>
    );
}