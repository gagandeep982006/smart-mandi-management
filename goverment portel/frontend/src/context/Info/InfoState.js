import InfoContext from "./InfoContext";

export default function AuthState(props) {
    const host = process.env.REACT_APP_HOST;

    const totalDistrict = async () => {
        try {
            const response = await fetch(
                `${host}/api/location/district/total`,
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

    const totalState = async () => {
        try {
            const response = await fetch(
                `${host}/api/location/state/total`,
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

    const totalTehsil = async () => {
        try {
            const response = await fetch(
                `${host}/api/location/tehsil/total`,
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

    const totalFarmer = async () => {
        try {
            const response = await fetch(
                `${host}/api/farmer/total`,
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

    const totalMandis = async () => {
        try {
            const response = await fetch(
                `${host}/api/mandis/gettotalmandis`,
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

    const totalCrops = async () => {
        try {
            const response = await fetch(
                `${host}/api/crops/total`,
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

    const totalCounter = async () => {
        try {
            const response = await fetch(
                `${host}/api/mandicounters/total`,
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

    const totalProcurementSession = async () => {
        try {
            const response = await fetch(
                `${host}/api/procurement/total`,
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
        <InfoContext.Provider value ={{totalDistrict, totalState, totalTehsil,totalFarmer, totalMandis,totalCrops,totalCounter,totalProcurementSession
        }}>
            {props.children}
        </InfoContext.Provider>
    );
}