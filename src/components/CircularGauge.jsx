import React from 'react';

const CircularGauge = ({ 
  value, 
  max = 100, 
  size = 120, 
  strokeWidth = 10, 
  color = 'var(--color-primary)', 
  trackColor = 'var(--color-surface-container-high)',
  label,
  subLabel
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Cap value at max for calculation
  const safeValue = Math.min(value, max);
  const strokeDashoffset = circumference - (safeValue / max) * circumference;

  return (
    <div className="circular-gauge" style={{ width: size, height: size, position: 'relative' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: size * 0.22, fontWeight: '800', color: 'var(--color-on-surface)', lineHeight: 1 }}>
          {label || Math.round(value)}
        </span>
        {subLabel && (
          <span style={{ fontSize: size * 0.1, color: 'var(--color-on-surface-variant)', marginTop: 4, fontWeight: 500 }}>
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default CircularGauge;
