export const BOARD_COLORS = ['violet', 'cyan', 'orange', 'green', 'pink', 'blue', 'red', 'yellow'] as const;
export type BoardColor = typeof BOARD_COLORS[number];

export const boardColorConfig: Record<BoardColor, {
  card: string;
  cardTitle: string;
  cardSub: string;
  cardIcon: string;
  header: string;
}> = {
  violet: {
    card: 'from-violet-500/30 to-violet-600/15 border-violet-400/50',
    cardTitle: 'text-violet-900',
    cardSub: 'text-violet-700',
    cardIcon: 'text-violet-600',
    header: 'from-violet-500 to-violet-700',
  },
  cyan: {
    card: 'from-cyan-500/30 to-cyan-600/15 border-cyan-400/50',
    cardTitle: 'text-cyan-900',
    cardSub: 'text-cyan-700',
    cardIcon: 'text-cyan-600',
    header: 'from-cyan-500 to-cyan-700',
  },
  orange: {
    card: 'from-orange-500/30 to-orange-600/15 border-orange-400/50',
    cardTitle: 'text-orange-900',
    cardSub: 'text-orange-700',
    cardIcon: 'text-orange-600',
    header: 'from-orange-500 to-orange-700',
  },
  green: {
    card: 'from-green-500/30 to-green-600/15 border-green-400/50',
    cardTitle: 'text-green-900',
    cardSub: 'text-green-700',
    cardIcon: 'text-green-600',
    header: 'from-green-500 to-green-700',
  },
  pink: {
    card: 'from-pink-500/30 to-pink-600/15 border-pink-400/50',
    cardTitle: 'text-pink-900',
    cardSub: 'text-pink-700',
    cardIcon: 'text-pink-600',
    header: 'from-pink-500 to-pink-700',
  },
  blue: {
    card: 'from-blue-500/30 to-blue-600/15 border-blue-400/50',
    cardTitle: 'text-blue-900',
    cardSub: 'text-blue-700',
    cardIcon: 'text-blue-600',
    header: 'from-blue-500 to-blue-700',
  },
  red: {
    card: 'from-red-500/30 to-red-600/15 border-red-400/50',
    cardTitle: 'text-red-900',
    cardSub: 'text-red-700',
    cardIcon: 'text-red-600',
    header: 'from-red-500 to-red-700',
  },
  yellow: {
    card: 'from-yellow-500/30 to-yellow-600/15 border-yellow-400/50',
    cardTitle: 'text-yellow-900',
    cardSub: 'text-yellow-700',
    cardIcon: 'text-yellow-600',
    header: 'from-yellow-500 to-yellow-700',
  },
};

export function getBoardColorConfig(colorCode: string | null | undefined) {
  return boardColorConfig[(colorCode as BoardColor) || 'violet'] || boardColorConfig.violet;
}
