import React from 'react';

/** Flat Headspace-style scenes for home cards — no Lucide icons. */

type SceneProps = { className?: string };

export function WorkPlanScene({ className }: SceneProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden fill="none">
      {/* desk blotter */}
      <ellipse cx="80" cy="88" rx="70" ry="10" fill="#E08A55" opacity="0.45" />
      {/* open notebook */}
      <rect x="38" y="28" width="52" height="58" rx="4" fill="#fff" />
      <rect x="90" y="28" width="32" height="58" rx="4" fill="#F3F0E8" />
      <path d="M90 28v58" stroke="#D4CFC4" strokeWidth="2" />
      {/* lines */}
      <path d="M48 42h28M48 52h24M48 62h28M48 72h16" stroke="#5D7EB3" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      {/* check dots */}
      <circle cx="44" cy="42" r="2.5" fill="#F9A778" />
      <circle cx="44" cy="52" r="2.5" fill="#F9A778" />
      <circle cx="44" cy="62" r="2.5" fill="#5D7EB3" />
      {/* pencil */}
      <g transform="rotate(-28 118 48)">
        <rect x="108" y="40" width="36" height="8" rx="2" fill="#5D7EB3" />
        <path d="M144 40l10 4-10 4V40z" fill="#F9A778" />
        <rect x="108" y="40" width="6" height="8" fill="#2A3A52" />
      </g>
      {/* little plant accent */}
      <ellipse cx="28" cy="78" rx="10" ry="4" fill="#2A3A52" opacity="0.25" />
      <path d="M28 78c-6-14 2-28 2-28s10 12 4 28" fill="#3D6B4F" />
      <path d="M28 78c6-12-1-24-1-24s-9 10-3 24" fill="#5A9A6E" />
    </svg>
  );
}

export function ApprovalsScene({ className }: SceneProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden fill="none">
      <ellipse cx="80" cy="90" rx="58" ry="8" fill="#152238" opacity="0.12" />
      {/* document */}
      <rect x="42" y="18" width="56" height="70" rx="5" fill="#fff" />
      <path d="M54 36h32M54 46h28M54 56h32M54 66h18" stroke="#5D7EB3" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      {/* stamp circle */}
      <circle cx="108" cy="58" r="26" fill="#F9A778" />
      <circle cx="108" cy="58" r="20" stroke="#fff" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.7" />
      {/* check */}
      <path
        d="M96 58l8 8 16-18"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MouScene({ className }: SceneProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden fill="none">
      <ellipse cx="80" cy="88" rx="60" ry="9" fill="#152238" opacity="0.1" />
      {/* two documents overlapping */}
      <rect x="34" y="22" width="48" height="62" rx="4" fill="#fff" transform="rotate(-8 58 53)" />
      <rect x="72" y="20" width="48" height="62" rx="4" fill="#EEF2F8" transform="rotate(6 96 51)" />
      {/* seal */}
      <circle cx="80" cy="62" r="18" fill="#F9A778" />
      <circle cx="80" cy="62" r="12" fill="#E08A55" />
      <path d="M80 52v20M70 62h20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      {/* ribbon tails */}
      <path d="M72 78l-6 14 8-4 2 8 6-16" fill="#5D7EB3" />
      <path d="M88 78l6 14-8-4-2 8-6-16" fill="#7B96C4" />
    </svg>
  );
}

export function ReportingScene({ className }: SceneProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden fill="none">
      {/* soft hills */}
      <path d="M0 72c28-18 48-8 72-14s40-20 88-6v48H0V72z" fill="#152238" opacity="0.18" />
      {/* clipboard board */}
      <rect x="48" y="14" width="64" height="72" rx="6" fill="#fff" />
      <rect x="66" y="8" width="28" height="12" rx="3" fill="#F9A778" />
      {/* mini bars on page */}
      <rect x="58" y="56" width="10" height="20" rx="2" fill="#9BB0D4" />
      <rect x="72" y="44" width="10" height="32" rx="2" fill="#5D7EB3" />
      <rect x="86" y="36" width="10" height="40" rx="2" fill="#F9A778" />
      <rect x="100" y="50" width="10" height="26" rx="2" fill="#7B96C4" />
      {/* line chart hint */}
      <path
        d="M58 34c10-8 18 4 28-2s14-10 24-4"
        stroke="#5D7EB3"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export function DashboardScene({ className }: SceneProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden fill="none">
      {/* sky dots */}
      <circle cx="28" cy="22" r="3" fill="#fff" opacity="0.35" />
      <circle cx="132" cy="18" r="2.5" fill="#fff" opacity="0.25" />
      <circle cx="118" cy="32" r="2" fill="#F9A778" opacity="0.7" />
      {/* platform */}
      <ellipse cx="80" cy="86" rx="62" ry="10" fill="#152238" opacity="0.2" />
      {/* tall bars as buildings / chart */}
      <rect x="30" y="48" width="18" height="38" rx="4" fill="#9BB0D4" />
      <rect x="54" y="32" width="18" height="54" rx="4" fill="#fff" />
      <rect x="78" y="40" width="18" height="46" rx="4" fill="#F9A778" />
      <rect x="102" y="24" width="18" height="62" rx="4" fill="#BCCBE3" />
      {/* windows */}
      <rect x="58" y="40" width="5" height="5" rx="1" fill="#5D7EB3" opacity="0.5" />
      <rect x="66" y="40" width="5" height="5" rx="1" fill="#5D7EB3" opacity="0.5" />
      <rect x="58" y="50" width="5" height="5" rx="1" fill="#5D7EB3" opacity="0.5" />
      <rect x="66" y="50" width="5" height="5" rx="1" fill="#5D7EB3" opacity="0.5" />
      {/* sun */}
      <circle cx="128" cy="28" r="12" fill="#F9A778" />
      <circle cx="128" cy="28" r="7" fill="#FFE0C8" />
    </svg>
  );
}

export function FeedbackScene({ className }: SceneProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden fill="none">
      <ellipse cx="80" cy="90" rx="55" ry="8" fill="#152238" opacity="0.15" />
      {/* big bubble */}
      <rect x="28" y="18" width="72" height="48" rx="16" fill="#fff" />
      <path d="M44 66l-8 14 22-10" fill="#fff" />
      <circle cx="48" cy="42" r="4" fill="#5D7EB3" />
      <circle cx="64" cy="42" r="4" fill="#5D7EB3" />
      <circle cx="80" cy="42" r="4" fill="#5D7EB3" />
      {/* reply bubble */}
      <rect x="88" y="48" width="48" height="32" rx="12" fill="#F9A778" />
      <path d="M120 80l6 12-18-8" fill="#F9A778" />
      <path d="M100 62h24M100 70h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function OfflineScene({ className }: SceneProps) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden fill="none">
      {/* soft ground wash */}
      <ellipse cx="80" cy="88" rx="58" ry="10" fill="#E08A55" opacity="0.35" />
      {/* wifi arcs + dot, centered */}
      <g transform="translate(80 52)">
        <path
          d="M-36 -8c20-22 52-22 72 0"
          stroke="#5D7EB3"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.45"
        />
        <path
          d="M-24 6c13-14 35-14 48 0"
          stroke="#5D7EB3"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M-12 20c6-7 18-7 24 0"
          stroke="#5D7EB3"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="0" cy="34" r="6" fill="#5D7EB3" />
        {/* bold slash */}
        <path
          d="M-38 -22 L38 42"
          stroke="#fff"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M-38 -22 L38 42"
          stroke="#152238"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
