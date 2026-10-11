import TehsilContext from "./TehsilContext";

export default function TehsilState(props) {
    const host = (process.env.REACT_APP_HOST || "").replace(/\/+$/, "");

    const getTehsil = async (district_id) => {
        try {
            const response = await fetch(
                `${host}/api/location/tehsil/gettehsil/${district_id}`,
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

    const addTehsil = async(payload)=>{
        try {
            const response = await fetch(
                `${host}/api/location/tehsil/addtehsil`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        district_id: payload.district_id,
                        tehsil_name: payload.tehsil_name,
                        tehsil_code: payload.tehsil_code
                    })
                }
            );

            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    }

    const removeTehsil = async(teshil_id)=>{
        try {
            const response = await fetch(
                `${host}/api/location/tehsil/removetehsil/${teshil_id}`,
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
        <TehsilContext.Provider value ={{getTehsil, addTehsil, removeTehsil}}>
            {props.children}
        </TehsilContext.Provider>
    );
}