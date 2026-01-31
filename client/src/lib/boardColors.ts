export const BOARD_COLORS = ['rose', 'violet', 'lime', 'teal', 'sky'] as const;
export type BoardColor = typeof BOARD_COLORS[number];

// Neon color palette for dark theme retro gaming aesthetic
export const neonColorConfig: Record<BoardColor, {
  border: string;
  glow: string;
  text: string;
  icon: string;
  shadowColor: string;
}> = {
  rose: {
    border: '#e879f9',
    glow: 'rgba(232, 121, 249, 0.4)',
    text: '#f0abfc',
    icon: '#e879f9',
    shadowColor: 'rgba(232, 121, 249, 0.5)',
  },
  violet: {
    border: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.4)',
    text: '#c4b5fd',
    icon: '#a78bfa',
    shadowColor: 'rgba(167, 139, 250, 0.5)',
  },
  lime: {
    border: '#a3e635',
    glow: 'rgba(163, 230, 53, 0.4)',
    text: '#bef264',
    icon: '#a3e635',
    shadowColor: 'rgba(163, 230, 53, 0.5)',
  },
  teal: {
    border: '#2dd4bf',
    glow: 'rgba(45, 212, 191, 0.4)',
    text: '#5eead4',
    icon: '#2dd4bf',
    shadowColor: 'rgba(45, 212, 191, 0.5)',
  },
  sky: {
    border: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.4)',
    text: '#7dd3fc',
    icon: '#38bdf8',
    shadowColor: 'rgba(56, 189, 248, 0.5)',
  },
};

export const boardColorConfig: Record<BoardColor, {
  card: string;
  cardTitle: string;
  cardSub: string;
  cardIcon: string;
  header: string;
  tile: string;
  tileBorder: string;
  tileText: string;
  progress: string;
  bg: string;
  badge: string;
  badgeText: string;
  light: string;
  lightBorder: string;
  lightText: string;
  icon: string;
  dialogBorder: string;
  accent: string;
  accentDark: string;
}> = {
  rose: {
    card: 'from-rose-100/80 via-pink-100/60 to-fuchsia-100/80 border-pink-200/60',
    cardTitle: 'text-rose-700',
    cardSub: 'text-pink-600',
    cardIcon: 'text-rose-500',
    header: 'from-rose-300 via-pink-300 to-fuchsia-300',
    tile: 'from-rose-100/90 via-pink-100/80 to-fuchsia-100/90',
    tileBorder: 'border-pink-200/60 hover:border-pink-300/80',
    tileText: 'text-rose-600',
    progress: 'bg-gradient-to-r from-rose-300 via-pink-300 to-fuchsia-300',
    bg: 'bg-gradient-to-r from-rose-300 via-pink-300 to-fuchsia-300',
    badge: 'bg-white/90 border-pink-200/50',
    badgeText: 'text-rose-700',
    light: 'bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50',
    lightBorder: 'border-pink-200/50',
    lightText: 'text-rose-700',
    icon: 'text-rose-500',
    dialogBorder: 'border-pink-200/50',
    accent: 'text-rose-600',
    accentDark: 'text-rose-800',
  },
  violet: {
    card: 'from-violet-100/80 via-purple-100/60 to-indigo-100/80 border-violet-200/60',
    cardTitle: 'text-violet-700',
    cardSub: 'text-purple-600',
    cardIcon: 'text-violet-500',
    header: 'from-violet-400 via-purple-400 to-indigo-400',
    tile: 'from-violet-100/90 via-purple-100/80 to-indigo-100/90',
    tileBorder: 'border-violet-200/60 hover:border-violet-300/80',
    tileText: 'text-violet-600',
    progress: 'bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400',
    bg: 'bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400',
    badge: 'bg-white/90 border-violet-200/50',
    badgeText: 'text-violet-700',
    light: 'bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50',
    lightBorder: 'border-violet-200/50',
    lightText: 'text-violet-700',
    icon: 'text-violet-500',
    dialogBorder: 'border-violet-200/50',
    accent: 'text-violet-600',
    accentDark: 'text-violet-800',
  },
  lime: {
    card: 'from-lime-100/80 via-green-100/60 to-emerald-100/80 border-lime-200/60',
    cardTitle: 'text-lime-700',
    cardSub: 'text-green-600',
    cardIcon: 'text-lime-500',
    header: 'from-lime-400 via-green-400 to-emerald-400',
    tile: 'from-lime-100/90 via-green-100/80 to-emerald-100/90',
    tileBorder: 'border-lime-200/60 hover:border-lime-300/80',
    tileText: 'text-lime-600',
    progress: 'bg-gradient-to-r from-lime-400 via-green-400 to-emerald-400',
    bg: 'bg-gradient-to-r from-lime-400 via-green-400 to-emerald-400',
    badge: 'bg-white/90 border-lime-200/50',
    badgeText: 'text-lime-700',
    light: 'bg-gradient-to-br from-lime-50 via-green-50 to-emerald-50',
    lightBorder: 'border-lime-200/50',
    lightText: 'text-lime-700',
    icon: 'text-lime-500',
    dialogBorder: 'border-lime-200/50',
    accent: 'text-lime-600',
    accentDark: 'text-lime-800',
  },
  teal: {
    card: 'from-teal-100/80 via-emerald-100/60 to-cyan-100/80 border-teal-200/60',
    cardTitle: 'text-teal-700',
    cardSub: 'text-emerald-600',
    cardIcon: 'text-teal-500',
    header: 'from-teal-400 via-emerald-400 to-cyan-400',
    tile: 'from-teal-100/90 via-emerald-100/80 to-cyan-100/90',
    tileBorder: 'border-teal-200/60 hover:border-teal-300/80',
    tileText: 'text-teal-600',
    progress: 'bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400',
    bg: 'bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400',
    badge: 'bg-white/90 border-teal-200/50',
    badgeText: 'text-teal-700',
    light: 'bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50',
    lightBorder: 'border-teal-200/50',
    lightText: 'text-teal-700',
    icon: 'text-teal-500',
    dialogBorder: 'border-teal-200/50',
    accent: 'text-teal-600',
    accentDark: 'text-teal-800',
  },
  sky: {
    card: 'from-sky-100/80 via-blue-100/60 to-indigo-100/80 border-sky-200/60',
    cardTitle: 'text-sky-700',
    cardSub: 'text-blue-600',
    cardIcon: 'text-sky-500',
    header: 'from-sky-400 via-blue-400 to-indigo-400',
    tile: 'from-sky-100/90 via-blue-100/80 to-indigo-100/90',
    tileBorder: 'border-sky-200/60 hover:border-sky-300/80',
    tileText: 'text-sky-600',
    progress: 'bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400',
    bg: 'bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400',
    badge: 'bg-white/90 border-sky-200/50',
    badgeText: 'text-sky-700',
    light: 'bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50',
    lightBorder: 'border-sky-200/50',
    lightText: 'text-sky-700',
    icon: 'text-sky-500',
    dialogBorder: 'border-sky-200/50',
    accent: 'text-sky-600',
    accentDark: 'text-sky-800',
  },
};

const legacyColorMap: Record<string, BoardColor> = {
  cyan: 'teal',
  orange: 'lime',
  green: 'lime',
  pink: 'rose',
  fuchsia: 'rose',
  blue: 'sky',
  red: 'rose',
  yellow: 'lime',
  amber: 'lime',
  purple: 'violet',
};

export function getBoardColorConfig(colorCode: string | null | undefined) {
  if (!colorCode) return boardColorConfig.rose;
  const mapped = legacyColorMap[colorCode];
  if (mapped) return boardColorConfig[mapped];
  return boardColorConfig[colorCode as BoardColor] || boardColorConfig.violet;
}

export function getBoardColorName(colorCode: string | null | undefined): BoardColor {
  if (!colorCode) return 'rose';
  const mapped = legacyColorMap[colorCode];
  if (mapped) return mapped;
  if (BOARD_COLORS.includes(colorCode as BoardColor)) return colorCode as BoardColor;
  return 'violet';
}
