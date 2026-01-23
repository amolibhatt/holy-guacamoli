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
}> = {
  violet: {
    card: 'from-violet-300/30 to-violet-400/15 border-violet-300/50',
    cardTitle: 'text-violet-600',
    cardSub: 'text-violet-500',
    cardIcon: 'text-violet-400',
    header: 'from-violet-400 to-violet-500',
    tile: 'from-violet-300/25 to-violet-400/15',
    tileBorder: 'border-violet-300/50 hover:border-violet-400/70',
    tileText: 'text-violet-600 dark:text-violet-300',
    progress: 'bg-violet-400',
    bg: 'bg-violet-400',
  },
  fuchsia: {
    card: 'from-fuchsia-300/30 to-fuchsia-400/15 border-fuchsia-300/50',
    cardTitle: 'text-fuchsia-600',
    cardSub: 'text-fuchsia-500',
    cardIcon: 'text-fuchsia-400',
    header: 'from-fuchsia-400 to-fuchsia-500',
    tile: 'from-fuchsia-300/25 to-fuchsia-400/15',
    tileBorder: 'border-fuchsia-300/50 hover:border-fuchsia-400/70',
    tileText: 'text-fuchsia-600 dark:text-fuchsia-300',
    progress: 'bg-fuchsia-400',
    bg: 'bg-fuchsia-400',
  },
  amber: {
    card: 'from-amber-300/30 to-amber-400/15 border-amber-300/50',
    cardTitle: 'text-amber-600',
    cardSub: 'text-amber-500',
    cardIcon: 'text-amber-400',
    header: 'from-amber-400 to-amber-500',
    tile: 'from-amber-300/25 to-amber-400/15',
    tileBorder: 'border-amber-300/50 hover:border-amber-400/70',
    tileText: 'text-amber-600 dark:text-amber-300',
    progress: 'bg-amber-400',
    bg: 'bg-amber-400',
  },
  teal: {
    card: 'from-teal-300/30 to-teal-400/15 border-teal-300/50',
    cardTitle: 'text-teal-600',
    cardSub: 'text-teal-500',
    cardIcon: 'text-teal-400',
    header: 'from-teal-400 to-teal-500',
    tile: 'from-teal-300/25 to-teal-400/15',
    tileBorder: 'border-teal-300/50 hover:border-teal-400/70',
    tileText: 'text-teal-600 dark:text-teal-300',
    progress: 'bg-teal-400',
    bg: 'bg-teal-400',
  },
  sky: {
    card: 'from-sky-300/30 to-sky-400/15 border-sky-300/50',
    cardTitle: 'text-sky-600',
    cardSub: 'text-sky-500',
    cardIcon: 'text-sky-400',
    header: 'from-sky-400 to-sky-500',
    tile: 'from-sky-300/25 to-sky-400/15',
    tileBorder: 'border-sky-300/50 hover:border-sky-400/70',
    tileText: 'text-sky-600 dark:text-sky-300',
    progress: 'bg-sky-400',
    bg: 'bg-sky-400',
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
