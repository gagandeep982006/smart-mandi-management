import ProcurementContext from "./ProcurementContext";

export default function AuthState(props) {
    const host = process.env.REACT_APP_HOST;
    const getProcurementSession = async () => {
        try {
            const response = await fetch(
                `${host}/api/procurement`,
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

    const addProcurementSession = async (payload) => {
        try {
            const response = await fetch(
                `${host}/api/procurement/addprocurementsession`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        session_name:payload.session_name,
                        start_date:payload.start_date,
                        end_date:payload.end_date,
                        crop_id:payload.crop_id
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const removeProcurementSession = async (session_id) => {
        try {
            const response = await fetch(
                `${host}/api/procurement/removeprocurementsession/${session_id}`,
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

    const updateProcurementSession = async (session_id,payload) => {
        try {
            const response = await fetch(
                `${host}/api/procurement/${session_id}/dates`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body:JSON.stringify({
                        start_date:payload.start_date, 
                        end_date:payload.end_date
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const getProcurementQuota = async (state_id) => {
        try {
            const response = await fetch(
                `${host}/api/procurement/quota/state/${state_id}`,
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

    const addProcurementQuota = async (payload) => {
        try {
            const response = await fetch(
                `${host}/api/procurement/addprocurementQuota`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body:JSON.stringify({
                        state_id:payload.state_id,
                        crop_id:payload.crop_id,
                        amount:payload.amount,
                        lsp:payload.lsp,
                        msp:payload.msp
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const removeProcurementQuota = async (quota_id) => {
        try {
            const response = await fetch(
                `${host}/api/procurement/removeprocurementquota/${quota_id}`,
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

    const updateProcurementQuota = async (quota_id,payload) => {
        try {
            const response = await fetch(
                `${host}/api/procurement/updatequota/${quota_id}`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body:JSON.stringify({
                        state_id:payload.state_id, 
                        crop_id:payload.crop_id, 
                        amount:payload.amount,
                        lsp:payload.lsp,
                        msp:payload.msp
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
        <ProcurementContext.Provider value ={{ getProcurementSession,addProcurementSession,removeProcurementSession,updateProcurementSession,
            updateProcurementQuota,removeProcurementQuota,addProcurementQuota,getProcurementQuota
         }}>
            {props.children}
        </ProcurementContext.Provider>
    );
}