import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ text = "Loading...", size = 24 }) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "36px 20px",
            color: "var(--gray-500)",
            gap: "10px"
        }}>
            <Loader2 size={size} style={{ animation: "spin 1s linear infinite" }} />
            {text && <span style={{ fontSize: "13.5px", fontWeight: 500 }}>{text}</span>}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
