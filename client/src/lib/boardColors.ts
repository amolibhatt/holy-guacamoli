export const BOARD_COLORS = ['rose', 'violet', 'amber', 'teal', 'sky'] as const;
export type BoardColor = typeof BOARD_COLORS[number];

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
  amber: {
    card: 'from-amber-100/80 via-yellow-100/60 to-orange-100/80 border-amber-200/60',
    cardTitle: 'text-amber-700',
    cardSub: 'text-yellow-600',
    cardIcon: 'text-amber-500',
    header: 'from-amber-400 via-yellow-400 to-orange-400',
    tile: 'from-amber-100/90 via-yellow-100/80 to-orange-100/90',
    tileBorder: 'border-amber-200/60 hover:border-amber-300/80',
    tileText: 'text-amber-600',
    progress: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400',
    bg: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400',
    badge: 'bg-white/90 border-amber-200/50',
    badgeText: 'text-amber-700',
    light: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50',
    lightBorder: 'border-amber-200/50',
    lightText: 'text-amber-700',
    icon: 'text-amber-500',
    dialogBorder: 'border-amber-200/50',
    accent: 'text-amber-600',
    accentDark: 'text-amber-800',
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
  orange: 'amber',
  green: 'teal',
  pink: 'rose',
  fuchsia: 'rose',
  blue: 'sky',
  red: 'rose',
  yellow: 'amber',
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
