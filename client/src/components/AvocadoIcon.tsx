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
        <linearGradient id="avoSkin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#65B741" />
          <stop offset="100%" stopColor="#3A7D1E" />
        </linearGradient>
        <linearGradient id="avoFlesh" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8F5A3" />
          <stop offset="100%" stopColor="#C5E063" />
        </linearGradient>
        <linearGradient id="avoPit" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A67C52" />
          <stop offset="100%" stopColor="#6B4423" />
        </linearGradient>
        <filter id="avoShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.25"/>
        </filter>
      </defs>
      
      <ellipse 
        cx="32" 
        cy="35" 
        rx="22" 
        ry="26" 
        fill="url(#avoSkin)" 
        filter="url(#avoShadow)"
      />
      
      <ellipse 
        cx="32" 
        cy="37" 
        rx="16" 
        ry="19" 
        fill="url(#avoFlesh)"
      />
      
      <circle 
        cx="32" 
        cy="42" 
        r="10" 
        fill="url(#avoPit)"
      />
      
      <ellipse cx="28" cy="40" rx="3" ry="4" fill="#B8956B" opacity="0.4" />
      
      <ellipse cx="23" cy="30" rx="3" ry="4" fill="#1a1a1a" />
      <ellipse cx="41" cy="30" rx="3" ry="4" fill="#1a1a1a" />
      
      <ellipse cx="24" cy="29" rx="1.2" ry="1.5" fill="white" />
      <ellipse cx="42" cy="29" rx="1.2" ry="1.5" fill="white" />
      
      <path
        d="M26 35 Q32 40 38 35"
        stroke="#3A7D1E"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      
      <ellipse cx="18" cy="34" rx="3" ry="2" fill="#FF9B9B" opacity="0.5" />
      <ellipse cx="46" cy="34" rx="3" ry="2" fill="#FF9B9B" opacity="0.5" />
      
      <path
        d="M32 9 L32 14"
        stroke="#3A7D1E"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="8" rx="4" ry="3" fill="#65B741" />
    </svg>
  );
}
