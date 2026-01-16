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
    card: 'from-violet-400/30 to-purple-500/15 border-violet-400/60',
    cardTitle: 'text-violet-800',
    cardSub: 'text-violet-600',
    cardIcon: 'text-violet-500',
    header: 'from-violet-500 via-purple-500 to-violet-600',
    tile: 'from-violet-500/25 to-purple-600/15',
    tileBorder: 'border-violet-500/50 hover:border-violet-400/80',
    tileText: 'text-violet-300',
    progress: 'bg-violet-500',
  },
  teal: {
    card: 'from-teal-400/30 to-cyan-500/15 border-teal-400/60',
    cardTitle: 'text-teal-800',
    cardSub: 'text-teal-600',
    cardIcon: 'text-teal-500',
    header: 'from-teal-500 via-cyan-500 to-teal-600',
    tile: 'from-teal-500/25 to-cyan-600/15',
    tileBorder: 'border-teal-500/50 hover:border-teal-400/80',
    tileText: 'text-teal-300',
    progress: 'bg-teal-500',
  },
  amber: {
    card: 'from-amber-400/30 to-orange-500/15 border-amber-400/60',
    cardTitle: 'text-amber-800',
    cardSub: 'text-amber-700',
    cardIcon: 'text-amber-600',
    header: 'from-amber-500 via-orange-500 to-amber-600',
    tile: 'from-amber-500/25 to-orange-600/15',
    tileBorder: 'border-amber-500/50 hover:border-amber-400/80',
    tileText: 'text-amber-300',
    progress: 'bg-amber-500',
  },
  emerald: {
    card: 'from-emerald-400/30 to-green-500/15 border-emerald-400/60',
    cardTitle: 'text-emerald-800',
    cardSub: 'text-emerald-600',
    cardIcon: 'text-emerald-500',
    header: 'from-emerald-500 via-green-500 to-emerald-600',
    tile: 'from-emerald-500/25 to-green-600/15',
    tileBorder: 'border-emerald-500/50 hover:border-emerald-400/80',
    tileText: 'text-emerald-300',
    progress: 'bg-emerald-500',
  },
  rose: {
    card: 'from-rose-400/30 to-pink-500/15 border-rose-400/60',
    cardTitle: 'text-rose-800',
    cardSub: 'text-rose-600',
    cardIcon: 'text-rose-500',
    header: 'from-rose-500 via-pink-500 to-rose-600',
    tile: 'from-rose-500/25 to-pink-600/15',
    tileBorder: 'border-rose-500/50 hover:border-rose-400/80',
    tileText: 'text-rose-300',
    progress: 'bg-rose-500',
  },
  sky: {
    card: 'from-sky-400/30 to-blue-500/15 border-sky-400/60',
    cardTitle: 'text-sky-800',
    cardSub: 'text-sky-600',
    cardIcon: 'text-sky-500',
    header: 'from-sky-500 via-blue-500 to-sky-600',
    tile: 'from-sky-500/25 to-blue-600/15',
    tileBorder: 'border-sky-500/50 hover:border-sky-400/80',
    tileText: 'text-sky-300',
    progress: 'bg-sky-500',
  },
  coral: {
    card: 'from-red-400/30 to-orange-500/15 border-red-400/60',
    cardTitle: 'text-red-800',
    cardSub: 'text-red-600',
    cardIcon: 'text-red-500',
    header: 'from-red-500 via-orange-500 to-red-600',
    tile: 'from-red-500/25 to-orange-600/15',
    tileBorder: 'border-red-500/50 hover:border-red-400/80',
    tileText: 'text-red-300',
    progress: 'bg-red-500',
  },
  lime: {
    card: 'from-lime-400/30 to-green-500/15 border-lime-400/60',
    cardTitle: 'text-lime-800',
    cardSub: 'text-lime-700',
    cardIcon: 'text-lime-600',
    header: 'from-lime-500 via-green-500 to-lime-600',
    tile: 'from-lime-500/25 to-green-600/15',
    tileBorder: 'border-lime-500/50 hover:border-lime-400/80',
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
