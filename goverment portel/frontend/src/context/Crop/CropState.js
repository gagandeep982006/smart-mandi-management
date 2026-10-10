import CropsContext from './CropContext'

export default function AuthState(props) {
    const host = process.env.REACT_APP_HOST;
    
    const getCrops = async () => {
        try {
            const response = await fetch(
                `${host}/api/crops/getcrops`,
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

    const addCrops = async (payload) => {
        try {
            const response = await fetch(
                `${host}/api/crops/addcrop`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        crop_name:payload.crop_name,
                        crop_type:payload.crop_type
                    })
                }
            );
            
            const data = await response.json();
            return data;

        } catch (error) {
            return false;
        }
    };

    const deleteCrop = async (crop_id) => {
        try {
            const response = await fetch(
                `${host}/api/crops/removecrop/${crop_id}`,
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

    const updateCrop = async (crop_id,payload) => {
        try {
            const response = await fetch(
                `${host}/api/crops/update/${crop_id}`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        crop_name:payload.crop_name,
                        crop_type:payload.crop_type
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
        <CropsContext.Provider value ={{ getCrops,addCrops,deleteCrop,updateCrop }}>
            {props.children}
        </CropsContext.Provider>
    );
}