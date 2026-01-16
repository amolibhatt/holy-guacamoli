export const BOARD_COLORS = ['violet', 'teal', 'amber', 'emerald', 'rose', 'sky', 'coral', 'lime'] as const;
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
    card: 'from-violet-400/25 to-purple-500/10 border-violet-300/50',
    cardTitle: 'text-violet-800',
    cardSub: 'text-violet-600',
    cardIcon: 'text-violet-500',
    header: 'from-violet-500 via-purple-500 to-violet-600',
    tile: 'from-violet-500/15 to-purple-600/8',
    tileBorder: 'border-violet-400/40 hover:border-violet-400/70',
    tileText: 'text-violet-300',
    progress: 'bg-violet-500',
  },
  teal: {
    card: 'from-teal-400/25 to-cyan-500/10 border-teal-300/50',
    cardTitle: 'text-teal-800',
    cardSub: 'text-teal-600',
    cardIcon: 'text-teal-500',
    header: 'from-teal-500 via-cyan-500 to-teal-600',
    tile: 'from-teal-500/15 to-cyan-600/8',
    tileBorder: 'border-teal-400/40 hover:border-teal-400/70',
    tileText: 'text-teal-300',
    progress: 'bg-teal-500',
  },
  amber: {
    card: 'from-amber-400/25 to-orange-500/10 border-amber-300/50',
    cardTitle: 'text-amber-800',
    cardSub: 'text-amber-700',
    cardIcon: 'text-amber-600',
    header: 'from-amber-500 via-orange-500 to-amber-600',
    tile: 'from-amber-500/15 to-orange-600/8',
    tileBorder: 'border-amber-400/40 hover:border-amber-400/70',
    tileText: 'text-amber-300',
    progress: 'bg-amber-500',
  },
  emerald: {
    card: 'from-emerald-400/25 to-green-500/10 border-emerald-300/50',
    cardTitle: 'text-emerald-800',
    cardSub: 'text-emerald-600',
    cardIcon: 'text-emerald-500',
    header: 'from-emerald-500 via-green-500 to-emerald-600',
    tile: 'from-emerald-500/15 to-green-600/8',
    tileBorder: 'border-emerald-400/40 hover:border-emerald-400/70',
    tileText: 'text-emerald-300',
    progress: 'bg-emerald-500',
  },
  rose: {
    card: 'from-rose-400/25 to-pink-500/10 border-rose-300/50',
    cardTitle: 'text-rose-800',
    cardSub: 'text-rose-600',
    cardIcon: 'text-rose-500',
    header: 'from-rose-500 via-pink-500 to-rose-600',
    tile: 'from-rose-500/15 to-pink-600/8',
    tileBorder: 'border-rose-400/40 hover:border-rose-400/70',
    tileText: 'text-rose-300',
    progress: 'bg-rose-500',
  },
  sky: {
    card: 'from-sky-400/25 to-blue-500/10 border-sky-300/50',
    cardTitle: 'text-sky-800',
    cardSub: 'text-sky-600',
    cardIcon: 'text-sky-500',
    header: 'from-sky-500 via-blue-500 to-sky-600',
    tile: 'from-sky-500/15 to-blue-600/8',
    tileBorder: 'border-sky-400/40 hover:border-sky-400/70',
    tileText: 'text-sky-300',
    progress: 'bg-sky-500',
  },
  coral: {
    card: 'from-red-400/25 to-orange-500/10 border-red-300/50',
    cardTitle: 'text-red-800',
    cardSub: 'text-red-600',
    cardIcon: 'text-red-500',
    header: 'from-red-500 via-orange-500 to-red-600',
    tile: 'from-red-500/15 to-orange-600/8',
    tileBorder: 'border-red-400/40 hover:border-red-400/70',
    tileText: 'text-red-300',
    progress: 'bg-red-500',
  },
  lime: {
    card: 'from-lime-400/25 to-green-500/10 border-lime-300/50',
    cardTitle: 'text-lime-800',
    cardSub: 'text-lime-700',
    cardIcon: 'text-lime-600',
    header: 'from-lime-500 via-green-500 to-lime-600',
    tile: 'from-lime-500/15 to-green-600/8',
    tileBorder: 'border-lime-400/40 hover:border-lime-400/70',
    tileText: 'text-lime-300',
    progress: 'bg-lime-500',
  },
};

const legacyColorMap: Record<string, BoardColor> = {
  cyan: 'teal',
  orange: 'amber',
  green: 'emerald',
  pink: 'rose',
  blue: 'sky',
  red: 'coral',
  yellow: 'lime',
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
