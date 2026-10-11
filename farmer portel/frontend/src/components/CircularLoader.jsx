import React from 'react';

/**
 * Universal Circular Loader (React Loader)
 * Used across the portal when fetching or displaying data.
 */
export default function CircularLoader({
  size = 36,
  color = 'var(--primary-600, #1b5e20)',
  trackColor = '#e2e8f0',
  strokeWidth = 3.5,
  text = null,
  center = false,
  className = '',
  style = {}
}) {
  const numSize = typeof size === 'number'
    ? size
    : size === 'sm' ? 18
    : size === 'lg' ? 48
    : 36;

  const radius = (numSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 72% arc for clear spinning visibility
  const strokeDashoffset = circumference * 0.28;

  return (
    <div
      className={`circular-loader-wrapper ${className}`}
      style={{
        display: center ? 'flex' : 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: text ? '0.75rem' : '0',
        padding: center ? '2.5rem 1rem' : '0',
        ...style
      }}
      role="status"
      aria-label={text || 'Loading'}
    >
      <div
        className="circular-loader-spinner"
        style={{
          width: numSize,
          height: numSize,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <svg
          width={numSize}
          height={numSize}
          viewBox={`0 0 ${numSize} ${numSize}`}
          style={{
            animation: 'circular-loader-spin 0.85s linear infinite',
            transformOrigin: 'center',
            display: 'block'
          }}
        >
          {/* Background Track Circle */}
          <circle
            cx={numSize / 2}
            cy={numSize / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Active Spinning Arc Segment */}
          <circle
            cx={numSize / 2}
            cy={numSize / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
      </div>

      {text && (
        <span
          style={{
            fontSize: numSize <= 22 ? '0.8rem' : '0.875rem',
            color: 'var(--gray-600, #475569)',
            fontWeight: 500,
            textAlign: 'center'
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}
