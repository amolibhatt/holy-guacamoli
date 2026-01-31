export const BLITZGRID_COLORS = {
  primary: {
    gradient: 'from-rose-300 via-pink-300 to-fuchsia-300',
    gradientDark: 'from-rose-400 via-pink-400 to-fuchsia-400',
    bg: 'bg-gradient-to-r from-rose-300 via-pink-300 to-fuchsia-300',
    bgBr: 'bg-gradient-to-br from-rose-300 via-pink-300 to-fuchsia-300',
    text: 'bg-gradient-to-r from-rose-300 via-pink-300 to-fuchsia-300 bg-clip-text text-transparent',
    textDark: 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent',
  },
  light: {
    gradient: 'from-rose-100/60 via-pink-100/50 to-fuchsia-100/40',
    bg: 'bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50',
    card: 'from-rose-100/80 via-pink-100/60 to-fuchsia-100/80',
  },
  border: {
    light: 'border-pink-200/60',
    medium: 'border-pink-300',
    default: 'border-pink-200/50',
  },
  shadow: {
    color: '#f9a8d4',
    colorDark: 'rgba(244, 114, 182, 0.4)',
    sm: 'shadow-pink-300/30',
    md: 'shadow-pink-300/40',
    lg: 'shadow-pink-300/50',
  },
  text: {
    primary: 'text-pink-600',
    dark: 'text-pink-700',
    muted: 'text-pink-500',
  },
  button: {
    primary: 'bg-gradient-to-r from-rose-300 via-pink-300 to-fuchsia-300 text-white',
  },
  canvas: {
    gradientStops: ['#fda4af', '#f9a8d4', '#f0abfc'] as const,
    primaryHex: '#f472b6',
    lightHex: '#fce7f3',
    darkHex: '#be185d',
    bgGradient: ['#fdf2f8', '#fce7f3', '#fbcfe8'] as const,
  },
} as const;

export const BLITZGRID_SPARKLE_COLORS = ['#fda4af', '#f9a8d4', '#f0abfc'] as const;
