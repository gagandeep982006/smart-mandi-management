import StateContext from "./StateContext";

export default function AuthState(props) {
    const host = (process.env.REACT_APP_HOST || "").replace(/\/+$/, "");

    const getState = async () => {
        try {
            const response = await fetch(
                `${host}/api/location/state/getstate`,
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
    
    const addState = async(_state_name,_state_code)=>{
        try {
            const response = await fetch(
                `${host}/api/location/state/addstate`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        state_name: _state_name,
                        state_code: _state_code
                    })
                }
            );

            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    }

    const removeState = async(state_id)=>{
        try {
            const response = await fetch(
                `${host}/api/location/state/removestate/${state_id}`,
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
    }

    return (
        <StateContext.Provider value ={{getState,addState,removeState}}>
            {props.children}
        </StateContext.Provider>
    );
}