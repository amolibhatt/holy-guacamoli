interface AvocadoIconProps {
  className?: string;
}

export function AvocadoIcon({ className = "w-7 h-7" }: AvocadoIconProps) {
  return (
    <svg
      viewBox="0 0 64 72"
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
        <linearGradient id="partyHat" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="33%" stopColor="#FFE66D" />
          <stop offset="66%" stopColor="#4ECDC4" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <filter id="funShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.2"/>
        </filter>
      </defs>
      
      <circle cx="8" cy="20" r="2" fill="#FF6B6B" />
      <circle cx="56" cy="18" r="2.5" fill="#4ECDC4" />
      <circle cx="12" cy="35" r="1.5" fill="#FFE66D" />
      <circle cx="52" cy="40" r="2" fill="#A855F7" />
      <circle cx="6" cy="50" r="1.5" fill="#FF6B9D" />
      <circle cx="58" cy="55" r="2" fill="#22C55E" />
      
      <rect x="4" y="28" width="3" height="6" rx="1" fill="#FFE66D" transform="rotate(-20 4 28)" />
      <rect x="55" y="30" width="3" height="5" rx="1" fill="#FF6B6B" transform="rotate(15 55 30)" />
      <rect x="10" cy="55" width="2" height="4" rx="0.5" fill="#4ECDC4" transform="rotate(-10 10 55)" />
      <rect x="50" y="60" width="2.5" height="5" rx="0.5" fill="#A855F7" transform="rotate(25 50 60)" />
      
      <polygon points="5,45 7,42 9,45" fill="#FF6B9D" />
      <polygon points="55,25 57,22 59,25" fill="#22C55E" />
      <polygon points="8,12 10,9 12,12" fill="#4ECDC4" />
      <polygon points="52,48 54,45 56,48" fill="#FFE66D" />
      
      <path
        d="M32 20 C20 20 10 33 10 49 C10 67 20 72 32 72 C44 72 54 67 54 49 C54 33 44 20 32 20Z"
        fill="url(#avoSkinFun)"
        filter="url(#funShadow)"
      />
      
      <ellipse cx="32" cy="52" rx="17" ry="16" fill="url(#avoFleshFun)" />
      
      <circle cx="32" cy="56" r="9" fill="url(#avoPitFun)" />
      <ellipse cx="29" cy="54" rx="3" ry="3.5" fill="#E8C9A0" opacity="0.5" />
      
      <circle cx="25" cy="46" r="3.5" fill="#2D2D2D" />
      <circle cx="39" cy="46" r="3.5" fill="#2D2D2D" />
      <circle cx="26" cy="45" r="1.3" fill="white" />
      <circle cx="40" cy="45" r="1.3" fill="white" />
      
      <path
        d="M27 52 Q32 56 37 52"
        stroke="#2D2D2D"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      
      <circle cx="20" cy="50" r="3.5" fill="#FFB6C1" opacity="0.6" />
      <circle cx="44" cy="50" r="3.5" fill="#FFB6C1" opacity="0.6" />
      
      <path
        d="M22 20 L32 2 L42 20"
        fill="url(#partyHat)"
        stroke="#FFF"
        strokeWidth="1"
      />
      <path d="M24 18 L32 5 L40 18" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      
      <circle cx="32" cy="2" r="3" fill="#FFE66D" />
      <circle cx="32" cy="2" r="1.5" fill="#FF6B6B" />
      
      <line x1="27" y1="12" x2="27" y2="16" stroke="#FFF" strokeWidth="1.5" opacity="0.7" />
      <line x1="32" y1="10" x2="32" y2="14" stroke="#FFF" strokeWidth="1.5" opacity="0.7" />
      <line x1="37" y1="12" x2="37" y2="16" stroke="#FFF" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}
