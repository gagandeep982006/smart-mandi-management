import React, { useState, useEffect } from "react";
import { topLoader } from "../../utils/topLoader";

/**
 * TopLoader Component (Payment Portal)
 * Renders a royal-blue progress bar at the very top of the window
 * during route navigation and API operations.
 */
export default function TopLoader() {
  const [loaderState, setLoaderState] = useState({
    active: false,
    progress: 0,
    visible: false
  });

  useEffect(() => {
    const unsubscribe = topLoader.subscribe(setLoaderState);
    return unsubscribe;
  }, []);

  if (!loaderState.visible && loaderState.progress === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "3.5px",
        zIndex: 999999,
        pointerEvents: "none",
        overflow: "hidden"
      }}
      aria-hidden="true"
    >
      <div
        style={{
          width: `${loaderState.progress}%`,
          height: "100%",
          background: "linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 80%, #93c5fd 100%)",
          boxShadow: "0 0 10px rgba(37, 99, 235, 0.8), 0 0 5px rgba(59, 130, 246, 0.9)",
          transition: loaderState.progress === 100
            ? "width 0.2s ease-out, opacity 0.3s ease-out"
            : "width 0.35s cubic-bezier(0.1, 0.05, 0.25, 1)",
          opacity: loaderState.visible ? 1 : 0,
          position: "relative"
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: "90px",
            height: "100%",
            boxShadow: "0 0 14px #60a5fa, 0 0 6px #2563eb",
            opacity: 1,
            transform: "rotate(3deg) translate(0px, -4px)"
          }}
        />
      </div>
    </div>
  );
}
