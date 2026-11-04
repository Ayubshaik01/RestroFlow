import React from "react";
import { cn } from "@/lib/utils";

export interface RestroFlowLogoProps {
  /** Size in pixels for the icon mark (default: 32) */
  size?: number;
  /** Whether to render the 'RestroFlow' wordmark beside the icon */
  showText?: boolean;
  /** Whether to show the 'OS' or 'POS' mini badge tag */
  showBadge?: boolean;
  /** Optional badge text, defaults to "POS" */
  badgeText?: string;
  /** Custom classes for the outer wrapper */
  className?: string;
  /** Custom classes for the SVG icon */
  iconClassName?: string;
  /** Custom classes for the text block */
  textClassName?: string;
}

/**
 * RestroFlow Vector Icon Mark
 * Sleek, high-performance SVG with modern dining cloche & aerodynamic real-time flow glyph.
 */
export function RestroFlowIcon({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200 group-hover:scale-105", className)}
      aria-hidden="true"
    >
      <defs>
        {/* Background Dark Gradient */}
        <linearGradient id="rf-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1C1824" />
          <stop offset="100%" stopColor="#0B0910" />
        </linearGradient>

        {/* Primary Radiant Warm Flame Gradient */}
        <linearGradient id="rf-flame-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="50%" stopColor="#E63946" />
          <stop offset="100%" stopColor="#D90429" />
        </linearGradient>

        {/* Flow Stream Light Gradient */}
        <linearGradient id="rf-flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF9F1C" />
          <stop offset="50%" stopColor="#FF4D6D" />
          <stop offset="100%" stopColor="#FF758F" />
        </linearGradient>

        {/* Cloche Dome Shading */}
        <linearGradient id="rf-dome-grad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FF7E47" />
          <stop offset="60%" stopColor="#E63946" />
          <stop offset="100%" stopColor="#A81832" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id="rf-glow-subtle" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Rounded squircle tile */}
      <rect
        x="3"
        y="3"
        width="114"
        height="114"
        rx="28"
        fill="url(#rf-bg-grad)"
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth="2"
      />

      {/* Subtle ambient core glow */}
      <circle
        cx="60"
        cy="56"
        r="30"
        fill="url(#rf-flame-grad)"
        opacity="0.22"
        filter="url(#rf-glow-subtle)"
      />

      {/* Top Cloche Ring / Handle */}
      <circle
        cx="60"
        cy="31"
        r="5.5"
        stroke="url(#rf-flow-grad)"
        strokeWidth="3.2"
        fill="none"
      />
      <path
        d="M60 36.5 V40"
        stroke="url(#rf-flow-grad)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Modern Cloche Dome */}
      <path
        d="M30 64 C30 45, 43 40, 60 40 C77 40, 90 45, 90 64 Z"
        fill="url(#rf-dome-grad)"
      />

      {/* Dome Top Highlight Reflection */}
      <path
        d="M38 60 C40 48, 48 44, 60 44 C67 44, 73 46, 78 50"
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cloche Base Tray Plate */}
      <rect
        x="24"
        y="66"
        width="72"
        height="5.5"
        rx="2.75"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />

      {/* Realtime Speed Flow Waves (Flow Stream) */}
      {/* Wave 1: Primary Order Flow */}
      <path
        d="M30 78 C42 78, 48 83, 62 83 C74 83, 80 80, 90 77"
        stroke="url(#rf-flow-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Wave 2: Secondary Kitchen Flow Stream */}
      <path
        d="M38 88 C48 88, 54 92, 66 92 C76 92, 80 90, 84 87"
        stroke="url(#rf-flow-grad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
    </svg>
  );
}

/**
 * RestroFlow Brand Logo Component
 * Supports icon-only, icon + text, responsive sizes, and badge variants.
 */
export function RestroFlowLogo({
  size = 32,
  showText = false,
  showBadge = false,
  badgeText = "POS",
  className,
  iconClassName,
  textClassName,
}: RestroFlowLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <RestroFlowIcon size={size} className={iconClassName} />
      {showText && (
        <div className={cn("flex items-center gap-1.5 leading-none", textClassName)}>
          <span className="text-[17px] font-bold tracking-tight text-foreground">
            Restro<span className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent font-extrabold">Flow</span>
          </span>
          {showBadge && (
            <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-rose-500 uppercase">
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

