interface AvocadoIconProps {
  className?: string;
}

export function AvocadoIcon({ className = "w-7 h-7" }: AvocadoIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A7C2F" />
          <stop offset="50%" stopColor="#3D6B26" />
          <stop offset="100%" stopColor="#2D5A1A" />
        </linearGradient>
        <linearGradient id="fleshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4E87C" />
          <stop offset="40%" stopColor="#C5DC5E" />
          <stop offset="100%" stopColor="#A8C94A" />
        </linearGradient>
        <linearGradient id="pitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="50%" stopColor="#6B4E10" />
          <stop offset="100%" stopColor="#4A370C" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
        </filter>
      </defs>
      <path
        d="M32 4C20 4 10 18 10 34C10 50 20 60 32 60C44 60 54 50 54 34C54 18 44 4 32 4Z"
        fill="url(#skinGradient)"
        filter="url(#shadow)"
      />
      <ellipse cx="32" cy="36" rx="16" ry="20" fill="url(#fleshGradient)" />
      <ellipse cx="32" cy="40" rx="10" ry="12" fill="url(#pitGradient)" />
      <ellipse cx="29" cy="37" rx="3" ry="4" fill="#A07818" opacity="0.5" />
      <path
        d="M22 28C24 24 28 22 32 22C28 24 26 28 26 32"
        stroke="#E8F5A0"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
