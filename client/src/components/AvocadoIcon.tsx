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
        <linearGradient id="avoSkinFun" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7DD956" />
          <stop offset="50%" stopColor="#5BBF3A" />
          <stop offset="100%" stopColor="#3D9E22" />
        </linearGradient>
        <linearGradient id="avoFleshFun" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFDE7" />
          <stop offset="50%" stopColor="#F0F4C3" />
          <stop offset="100%" stopColor="#DCE775" />
        </linearGradient>
        <linearGradient id="avoPitFun" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#8B5A2B" />
        </linearGradient>
        <filter id="funShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.2"/>
        </filter>
      </defs>
      
      <path
        d="M32 5 C20 5 10 18 10 34 C10 52 20 59 32 59 C44 59 54 52 54 34 C54 18 44 5 32 5Z"
        fill="url(#avoSkinFun)"
        filter="url(#funShadow)"
      />
      
      <ellipse cx="32" cy="37" rx="17" ry="18" fill="url(#avoFleshFun)" />
      
      <circle cx="32" cy="42" r="10" fill="url(#avoPitFun)" />
      <ellipse cx="29" cy="40" rx="3" ry="4" fill="#E8C9A0" opacity="0.5" />
      
      <circle cx="25" cy="32" r="4" fill="#2D2D2D" />
      <circle cx="39" cy="32" r="4" fill="#2D2D2D" />
      <circle cx="26" cy="31" r="1.5" fill="white" />
      <circle cx="40" cy="31" r="1.5" fill="white" />
      
      <path
        d="M27 38 Q32 43 37 38"
        stroke="#2D2D2D"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      
      <circle cx="20" cy="36" r="4" fill="#FFB6C1" opacity="0.6" />
      <circle cx="44" cy="36" r="4" fill="#FFB6C1" opacity="0.6" />
      
      <path d="M32 5 L32 2" stroke="#5BBF3A" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="32" cy="2" rx="3" ry="2" fill="#7DD956" />
      <ellipse cx="36" cy="4" rx="4" ry="2" fill="#7DD956" transform="rotate(30 36 4)" />
    </svg>
  );
}
