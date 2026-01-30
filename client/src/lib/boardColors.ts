export const BOARD_COLORS = ['violet', 'fuchsia', 'amber', 'teal', 'sky'] as const;
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
  violet: {
    card: 'from-violet-500/25 to-violet-600/10 border-violet-500/40',
    cardTitle: 'text-violet-700',
    cardSub: 'text-violet-600',
    cardIcon: 'text-violet-500',
    header: 'from-violet-500 to-violet-600',
    tile: 'from-violet-500/20 to-violet-600/10',
    tileBorder: 'border-violet-500/40 hover:border-violet-400/70',
    tileText: 'text-violet-300',
    progress: 'bg-violet-500',
    bg: 'bg-violet-500',
    badge: 'bg-white/90 border-white/50',
    badgeText: 'text-violet-700',
    light: 'bg-violet-500/10 dark:bg-violet-500/20',
    lightBorder: 'border-violet-500/40 dark:border-violet-400/50',
    lightText: 'text-violet-700 dark:text-violet-300',
    icon: 'text-violet-500 dark:text-violet-400',
    dialogBorder: 'border-violet-500/30 dark:border-violet-400/40',
    accent: 'text-violet-600 dark:text-violet-300',
    accentDark: 'text-violet-800 dark:text-violet-100',
  },
  fuchsia: {
    card: 'from-fuchsia-500/25 to-fuchsia-600/10 border-fuchsia-500/40',
    cardTitle: 'text-fuchsia-700',
    cardSub: 'text-fuchsia-600',
    cardIcon: 'text-fuchsia-500',
    header: 'from-fuchsia-500 to-fuchsia-600',
    tile: 'from-fuchsia-500/20 to-fuchsia-600/10',
    tileBorder: 'border-fuchsia-500/40 hover:border-fuchsia-400/70',
    tileText: 'text-fuchsia-300',
    progress: 'bg-fuchsia-500',
    bg: 'bg-fuchsia-500',
    badge: 'bg-white/90 border-white/50',
    badgeText: 'text-fuchsia-700',
    light: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/20',
    lightBorder: 'border-fuchsia-500/40 dark:border-fuchsia-400/50',
    lightText: 'text-fuchsia-700 dark:text-fuchsia-300',
    icon: 'text-fuchsia-500 dark:text-fuchsia-400',
    dialogBorder: 'border-fuchsia-500/30 dark:border-fuchsia-400/40',
    accent: 'text-fuchsia-600 dark:text-fuchsia-300',
    accentDark: 'text-fuchsia-800 dark:text-fuchsia-100',
  },
  amber: {
    card: 'from-amber-500/25 to-amber-600/10 border-amber-500/40',
    cardTitle: 'text-amber-700',
    cardSub: 'text-amber-600',
    cardIcon: 'text-amber-500',
    header: 'from-amber-500 to-amber-600',
    tile: 'from-amber-500/20 to-amber-600/10',
    tileBorder: 'border-amber-500/40 hover:border-amber-400/70',
    tileText: 'text-amber-300',
    progress: 'bg-amber-500',
    bg: 'bg-amber-500',
    badge: 'bg-white/90 border-white/50',
    badgeText: 'text-amber-700',
    light: 'bg-amber-500/10 dark:bg-amber-500/20',
    lightBorder: 'border-amber-500/40 dark:border-amber-400/50',
    lightText: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-500 dark:text-amber-400',
    dialogBorder: 'border-amber-500/30 dark:border-amber-400/40',
    accent: 'text-amber-600 dark:text-amber-300',
    accentDark: 'text-amber-800 dark:text-amber-100',
  },
  teal: {
    card: 'from-teal-500/25 to-teal-600/10 border-teal-500/40',
    cardTitle: 'text-teal-700',
    cardSub: 'text-teal-600',
    cardIcon: 'text-teal-500',
    header: 'from-teal-500 to-teal-600',
    tile: 'from-teal-500/20 to-teal-600/10',
    tileBorder: 'border-teal-500/40 hover:border-teal-400/70',
    tileText: 'text-teal-300',
    progress: 'bg-teal-500',
    bg: 'bg-teal-500',
    badge: 'bg-white/90 border-white/50',
    badgeText: 'text-teal-700',
    light: 'bg-teal-500/10 dark:bg-teal-500/20',
    lightBorder: 'border-teal-500/40 dark:border-teal-400/50',
    lightText: 'text-teal-700 dark:text-teal-300',
    icon: 'text-teal-500 dark:text-teal-400',
    dialogBorder: 'border-teal-500/30 dark:border-teal-400/40',
    accent: 'text-teal-600 dark:text-teal-300',
    accentDark: 'text-teal-800 dark:text-teal-100',
  },
  sky: {
    card: 'from-sky-500/25 to-sky-600/10 border-sky-500/40',
    cardTitle: 'text-sky-700',
    cardSub: 'text-sky-600',
    cardIcon: 'text-sky-500',
    header: 'from-sky-500 to-sky-600',
    tile: 'from-sky-500/20 to-sky-600/10',
    tileBorder: 'border-sky-500/40 hover:border-sky-400/70',
    tileText: 'text-sky-300',
    progress: 'bg-sky-500',
    bg: 'bg-sky-500',
    badge: 'bg-white/90 border-white/50',
    badgeText: 'text-sky-700',
    light: 'bg-sky-500/10 dark:bg-sky-500/20',
    lightBorder: 'border-sky-500/40 dark:border-sky-400/50',
    lightText: 'text-sky-700 dark:text-sky-300',
    icon: 'text-sky-500 dark:text-sky-400',
    dialogBorder: 'border-sky-500/30 dark:border-sky-400/40',
    accent: 'text-sky-600 dark:text-sky-300',
    accentDark: 'text-sky-800 dark:text-sky-100',
  },
};

const legacyColorMap: Record<string, BoardColor> = {
  cyan: 'teal',
  orange: 'amber',
  green: 'teal',
  pink: 'fuchsia',
  blue: 'sky',
  red: 'fuchsia',
  yellow: 'amber',
  purple: 'violet',
};

export function getBoardColorConfig(colorCode: string | null | undefined) {
  if (!colorCode) return boardColorConfig.violet;
  const mapped = legacyColorMap[colorCode];
  if (mapped) return boardColorConfig[mapped];
  return boardColorConfig[colorCode as BoardColor] || boardColorConfig.violet;
}

export function getBoardColorName(colorCode: string | null | undefined): BoardColor {
  if (!colorCode) return 'violet';
  const mapped = legacyColorMap[colorCode];
  if (mapped) return mapped;
  if (BOARD_COLORS.includes(colorCode as BoardColor)) return colorCode as BoardColor;
  return 'violet';
}
