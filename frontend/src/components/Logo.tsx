'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 28,
  className = '',
  showText = false,
}) => {
  const [loadError, setLoadError] = useState(false);

  return (
    <div
      className={`logo-container ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {!loadError ? (
          <Image
            src="/logo.webp"
            alt="AI Incident Evidence & Runbook Assistant Logo"
            width={size}
            height={size}
            unoptimized={true}
            priority={true}
            style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }}
            onError={() => setLoadError(true)}
          />
        ) : (
          <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="AI Incident Evidence & Runbook Assistant Logo"
          >
            <defs>
              <linearGradient
                id="inlineShieldGrad"
                x1="0"
                y1="0"
                x2="32"
                y2="32"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            <path
              d="M16 2L4 6.5V15C4 22.5 9.2 28.5 16 30C22.8 28.5 28 22.5 28 15V6.5L16 2Z"
              fill="#080c16"
              stroke="url(#inlineShieldGrad)"
              strokeWidth="2"
            />
            <circle cx="16" cy="11" r="2.5" fill="#38bdf8" />
            <circle cx="11" cy="19" r="2" fill="#10b981" />
            <circle cx="21" cy="19" r="2" fill="#ef4444" />
            <line
              x1="16"
              y1="11"
              x2="11"
              y2="19"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="2 1"
            />
            <line x1="16" y1="11" x2="21" y2="19" stroke="#a855f7" strokeWidth="1.5" />
            <line x1="11" y1="19" x2="21" y2="19" stroke="#6366f1" strokeWidth="1.5" />
          </svg>
        )}
      </div>

      {showText && (
        <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
          <span style={{ color: '#ffffff' }}>Incident</span>
          <span style={{ color: '#38bdf8' }}>Assistant</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
