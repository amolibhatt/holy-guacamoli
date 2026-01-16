export const BOARD_COLORS = ['violet', 'cyan', 'orange', 'green', 'pink', 'blue', 'red', 'yellow'] as const;
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
}> = {
  violet: {
    card: 'from-violet-500/30 to-violet-600/15 border-violet-400/50',
    cardTitle: 'text-violet-900',
    cardSub: 'text-violet-700',
    cardIcon: 'text-violet-600',
    header: 'from-violet-500 to-violet-700',
    tile: 'from-violet-500/20 to-violet-600/10',
    tileBorder: 'border-violet-500/30 hover:border-violet-500/60',
    tileText: 'text-violet-400',
  },
  cyan: {
    card: 'from-cyan-500/30 to-cyan-600/15 border-cyan-400/50',
    cardTitle: 'text-cyan-900',
    cardSub: 'text-cyan-700',
    cardIcon: 'text-cyan-600',
    header: 'from-cyan-500 to-cyan-700',
    tile: 'from-cyan-500/20 to-cyan-600/10',
    tileBorder: 'border-cyan-500/30 hover:border-cyan-500/60',
    tileText: 'text-cyan-400',
  },
  orange: {
    card: 'from-orange-500/30 to-orange-600/15 border-orange-400/50',
    cardTitle: 'text-orange-900',
    cardSub: 'text-orange-700',
    cardIcon: 'text-orange-600',
    header: 'from-orange-500 to-orange-700',
    tile: 'from-orange-500/20 to-orange-600/10',
    tileBorder: 'border-orange-500/30 hover:border-orange-500/60',
    tileText: 'text-orange-400',
  },
  green: {
    card: 'from-green-500/30 to-green-600/15 border-green-400/50',
    cardTitle: 'text-green-900',
    cardSub: 'text-green-700',
    cardIcon: 'text-green-600',
    header: 'from-green-500 to-green-700',
    tile: 'from-green-500/20 to-green-600/10',
    tileBorder: 'border-green-500/30 hover:border-green-500/60',
    tileText: 'text-green-400',
  },
  pink: {
    card: 'from-pink-500/30 to-pink-600/15 border-pink-400/50',
    cardTitle: 'text-pink-900',
    cardSub: 'text-pink-700',
    cardIcon: 'text-pink-600',
    header: 'from-pink-500 to-pink-700',
    tile: 'from-pink-500/20 to-pink-600/10',
    tileBorder: 'border-pink-500/30 hover:border-pink-500/60',
    tileText: 'text-pink-400',
  },
  blue: {
    card: 'from-blue-500/30 to-blue-600/15 border-blue-400/50',
    cardTitle: 'text-blue-900',
    cardSub: 'text-blue-700',
    cardIcon: 'text-blue-600',
    header: 'from-blue-500 to-blue-700',
    tile: 'from-blue-500/20 to-blue-600/10',
    tileBorder: 'border-blue-500/30 hover:border-blue-500/60',
    tileText: 'text-blue-400',
  },
  red: {
    card: 'from-red-500/30 to-red-600/15 border-red-400/50',
    cardTitle: 'text-red-900',
    cardSub: 'text-red-700',
    cardIcon: 'text-red-600',
    header: 'from-red-500 to-red-700',
    tile: 'from-red-500/20 to-red-600/10',
    tileBorder: 'border-red-500/30 hover:border-red-500/60',
    tileText: 'text-red-400',
  },
  yellow: {
    card: 'from-yellow-500/30 to-yellow-600/15 border-yellow-400/50',
    cardTitle: 'text-yellow-900',
    cardSub: 'text-yellow-700',
    cardIcon: 'text-yellow-600',
    header: 'from-yellow-500 to-yellow-700',
    tile: 'from-yellow-500/20 to-yellow-600/10',
    tileBorder: 'border-yellow-500/30 hover:border-yellow-500/60',
    tileText: 'text-yellow-400',
  },
};

export function getBoardColorConfig(colorCode: string | null | undefined) {
  return boardColorConfig[(colorCode as BoardColor) || 'violet'] || boardColorConfig.violet;
}
