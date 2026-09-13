import React from "react";

interface OrbitDeskLogoProps {
  className?: string;
  showText?: boolean;
  theme?: "light" | "dark";
}

export default function OrbitDeskLogo({ className = "w-12 h-12", showText = false, theme = "light" }: OrbitDeskLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${showText ? "flex-col sm:flex-row text-center sm:text-left" : ""}`}>
      <div className={`relative shrink-0 ${className}`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Holographic Glowing Gradients */}
            <linearGradient id="orbitTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f3ff" />
              <stop offset="100%" stopColor="#09253b" />
            </linearGradient>

            <linearGradient id="ringTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            <linearGradient id="hexTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="hexLeftGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            <linearGradient id="hexRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* BACKGROUND GLOW */}
          <circle cx="100" cy="100" r="45" fill="#0c4a6e" fillOpacity="0.15" filter="url(#neonGlow)" />

          {/* MAIN CIRCULAR RING */}
          <circle
            cx="100"
            cy="100"
            r="62"
            stroke="url(#ringTealGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="240 70"
            transform="rotate(-15 100 100)"
            className="animate-[spin_40s_linear_infinite]"
          />

          {/* SECOND INNER DETAILED RING GRID */}
          <circle
            cx="100"
            cy="100"
            r="53"
            stroke="#0e7490"
            strokeWidth="1.5"
            strokeDasharray="4 8"
            opacity="0.6"
            className="animate-[spin_60s_linear_infinite_reverse]"
          />

          {/* 3D HEXAGON CENTER */}
          <g transform="translate(100, 100) scale(1.15)" filter="url(#softGlow)">
            {/* Isometric 3D Hexagon segments */}
            {/* Segment 1: Front Right Side of Hex */}
            <path
              d="M 0 0 L 26 -15 L 26 15 L 0 30 Z"
              fill="url(#hexRightGrad)"
              stroke="#0891b2"
              strokeWidth="1"
            />
            {/* Segment 2: Front Left Side of Hex */}
            <path
              d="M 0 0 L -26 -15 L -26 15 L 0 30 Z"
              fill="url(#hexLeftGrad)"
              stroke="#06b6d4"
              strokeWidth="1"
            />
            {/* Segment 3: Top Bevel */}
            <path
              d="M 0 -30 L 26 -15 L 0 0 L -26 -15 Z"
              fill="url(#hexTopGrad)"
              stroke="#22d3ee"
              strokeWidth="1"
            />

            {/* Inner Core Inner Cutout */}
            <polygon
              points="0,-12 11,-6 11,6 0,12 -11,6 -11,-6"
              fill="#080710"
              stroke="#00f3ff"
              strokeWidth="1.5"
              opacity="0.85"
            />
            
            {/* Central Core Star/Bead */}
            <circle cx="0" cy="0" r="3" fill="#ffffff" filter="url(#neonGlow)" />
          </g>

          {/* GLOWING PLANET / SATELLITE SYSTEM OUTER ORBIT RINGS */}
          {/* Main Angled Orbit - Ellipse rotated around center */}
          <ellipse
            cx="100"
            cy="100"
            rx="92"
            ry="24"
            fill="none"
            stroke="url(#ringTealGrad)"
            strokeWidth="3.5"
            transform="rotate(-22 100 100)"
            filter="url(#softGlow)"
          />

          {/* Orbital Satellite Nodes (Glowing planetary objects with glow layers) */}
          {/* Node 1 - Far Left-Bottom */}
          <g transform="rotate(-22 100 100)">
            {/* Outer Planet Aura */}
            <circle cx="10" cy="100" r="9" fill="#00f3ff" fillOpacity="0.25" filter="url(#neonGlow)" />
            <circle cx="10" cy="100" r="4.5" fill="#ffffff" />
            <circle cx="10" cy="100" r="2.5" fill="#00f3ff" />
          </g>

          {/* Node 2 - Front Center Passing Orb */}
          <g transform="rotate(-22 100 100)">
            <circle cx="150" cy="120" r="11" fill="#00f3ff" fillOpacity="0.3" filter="url(#neonGlow)" />
            <circle cx="150" cy="120" r="5.5" fill="#ffffff" />
            <circle cx="150" cy="120" r="3" fill="#00f3ff" />
          </g>

          {/* Node 3 - Small top right trailing beacon */}
          <g transform="rotate(-22 100 100)">
            <circle cx="180" cy="94" r="7" fill="#22d3ee" fillOpacity="0.3" filter="url(#neonGlow)" />
            <circle cx="180" cy="94" r="3.5" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-black font-logo flex items-center leading-none uppercase tracking-wide">
            <span className="text-cyan-600 dark:text-cyan-500 font-extrabold">ORBIT</span>
            <span className={`${theme === "light" ? "text-slate-850" : "text-white"} ml-2 font-extrabold`}>DESK</span>
          </h1>
          <p className={`text-[10px] md:text-xs ${theme === "light" ? "text-slate-500" : "text-slate-400"} font-mono tracking-[0.22em] uppercase mt-1 leading-none font-bold`}>
            GDS Simulator
          </p>
        </div>
      )}
    </div>
  );
}
