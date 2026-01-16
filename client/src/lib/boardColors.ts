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
  rose: 'fuchsia',
  emerald: 'teal',
  coral: 'fuchsia',
  lime: 'teal',
};

export function getBoardColorConfig(colorCode: string | null | undefined) {
  if (!colorCode) return boardColorConfig.violet;
  const mapped = legacyColorMap[colorCode];
  if (mapped) return boardColorConfig[mapped];
  return boardColorConfig[colorCode as BoardColor] || boardColorConfig.violet;
}

export function getColorName(colorCode: string | null | undefined): BoardColor {
  if (!colorCode) return 'violet';
  const mapped = legacyColorMap[colorCode];
  if (mapped) return mapped;
  if (colorCode in boardColorConfig) return colorCode as BoardColor;
  return 'violet';
}
