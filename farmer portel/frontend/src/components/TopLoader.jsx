import React, { useState, useEffect } from 'react';
import { topLoader } from '../utils/topLoader';

/**
 * TopLoader Component
 * Renders an ultra-smooth progress bar at the very top of the window
 * during tab/page navigation and background operations.
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
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '3.5px',
        zIndex: 999999,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      <div
        style={{
          width: `${loaderState.progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #1b5e20 0%, #2e7d32 45%, #4ade80 80%, #bbf7d0 100%)',
          boxShadow: '0 0 10px rgba(46, 125, 50, 0.8), 0 0 5px rgba(74, 222, 128, 0.9)',
          transition: loaderState.progress === 100
            ? 'width 0.2s ease-out, opacity 0.3s ease-out'
            : 'width 0.35s cubic-bezier(0.1, 0.05, 0.25, 1)',
          opacity: loaderState.visible ? 1 : 0,
          position: 'relative'
        }}
      >
        {/* Glowing Head Peg */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '90px',
            height: '100%',
            boxShadow: '0 0 14px #4ade80, 0 0 6px #2e7d32',
            opacity: 1,
            transform: 'rotate(3deg) translate(0px, -4px)'
          }}
        />
      </div>
    </div>
  );
}
