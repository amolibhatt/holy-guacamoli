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
        <linearGradient id="avoSkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5D9E3A" />
          <stop offset="30%" stopColor="#4A8A2C" />
          <stop offset="70%" stopColor="#3A7521" />
          <stop offset="100%" stopColor="#2A5A16" />
        </linearGradient>
        <linearGradient id="avoFleshGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#F0F7C4" />
          <stop offset="30%" stopColor="#E0ED8A" />
          <stop offset="60%" stopColor="#C8DE5C" />
          <stop offset="100%" stopColor="#A8C94A" />
        </linearGradient>
        <linearGradient id="avoPitGrad" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#C4956A" />
          <stop offset="40%" stopColor="#9B7245" />
          <stop offset="100%" stopColor="#5C4020" />
        </linearGradient>
        <radialGradient id="avoHighlight" cx="30%" cy="25%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="avoDropShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      <path
        d="M32 6 C22 6 12 16 10 30 C8 44 16 58 32 58 C48 58 56 44 54 30 C52 16 42 6 32 6Z"
        fill="url(#avoSkinGrad)"
        filter="url(#avoDropShadow)"
      />
      
      <ellipse 
        cx="32" 
        cy="36" 
        rx="17" 
        ry="18" 
        fill="url(#avoFleshGrad)"
      />
      
      <ellipse 
        cx="32" 
        cy="40" 
        rx="11" 
        ry="12" 
        fill="url(#avoPitGrad)"
      />
      
      <ellipse cx="28" cy="37" rx="4" ry="5" fill="rgba(196,149,106,0.35)" />
      
      <path
        d="M32 6 C22 6 12 16 10 30 C8 44 16 58 32 58 C48 58 56 44 54 30 C52 16 42 6 32 6Z"
        fill="url(#avoHighlight)"
      />
      
      <path
        d="M20 22 Q24 18 28 20"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
