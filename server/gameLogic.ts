export interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isConnected: boolean;
}

export interface BuzzEntry {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  position: number;
  timestamp: number;
}

export interface RoomState {
  buzzerLocked: boolean;
  buzzQueue: BuzzEntry[];
  passedPlayers: Set<string>;
  gameEnded: boolean;
  completedQuestions: Set<number>;
  players: Map<string, PlayerState>;
}

export interface PlayerGameStats {
  correctAnswers: number;
  wrongAnswers: number;
  totalPoints: number;
  pointsByCategory: Record<number, number>;
  currentStreak: number;
  bestStreak: number;
  biggestGain: number;
  lastAnswerTime?: number;
}

export interface GameStats {
  playerStats: Map<string, PlayerGameStats>;
  totalQuestions: number;
  startTime: number;
  mvpMoments: Array<{ type: string; playerId: string; description: string; value: number }>;
}

export function createEmptyRoomState(): RoomState {
  return {
    buzzerLocked: true,
    buzzQueue: [],
    passedPlayers: new Set(),
    gameEnded: false,
    completedQuestions: new Set(),
    players: new Map(),
  };
}

export function createEmptyGameStats(): GameStats {
  return {
    playerStats: new Map(),
    totalQuestions: 0,
    startTime: Date.now(),
    mvpMoments: [],
  };
}

export function addPlayerToRoom(room: RoomState, player: PlayerState): RoomState {
  const newPlayers = new Map(room.players);
  newPlayers.set(player.id, player);
  return { ...room, players: newPlayers };
}

export function removePlayerFromRoom(room: RoomState, playerId: string): RoomState {
  const newPlayers = new Map(room.players);
  newPlayers.delete(playerId);
  const newBuzzQueue = room.buzzQueue.filter(b => b.playerId !== playerId);
  return { ...room, players: newPlayers, buzzQueue: newBuzzQueue };
}

export function disconnectPlayer(room: RoomState, playerId: string): RoomState {
  const newPlayers = new Map(room.players);
  const player = newPlayers.get(playerId);
  if (player) {
    newPlayers.set(playerId, { ...player, isConnected: false });
  }
  const newBuzzQueue = room.buzzQueue.filter(b => b.playerId !== playerId);
  return { ...room, players: newPlayers, buzzQueue: newBuzzQueue };
}

export function unlockBuzzer(room: RoomState, isNewQuestion: boolean): RoomState {
  return {
    ...room,
    buzzerLocked: false,
    buzzQueue: [],
    passedPlayers: isNewQuestion ? new Set() : room.passedPlayers,
  };
}

export function lockBuzzer(room: RoomState): RoomState {
  return { ...room, buzzerLocked: true, buzzQueue: [] };
}

export function addBuzz(room: RoomState, playerId: string, playerName: string, playerAvatar?: string): { room: RoomState; position: number } | null {
  if (room.buzzerLocked) return null;
  if (room.passedPlayers.has(playerId)) return null;
  if (room.buzzQueue.some(b => b.playerId === playerId)) return null;

  const position = room.buzzQueue.length + 1;
  const entry: BuzzEntry = {
    playerId,
    playerName,
    playerAvatar,
    position,
    timestamp: Date.now(),
  };
  const newQueue = [...room.buzzQueue, entry];
  return {
    room: { ...room, buzzQueue: newQueue },
    position,
  };
}

export function passPlayer(room: RoomState, playerId: string): RoomState {
  const newQueue = room.buzzQueue.filter(b => b.playerId !== playerId);
  const newPassed = new Set(room.passedPlayers);
  newPassed.add(playerId);
  return { ...room, buzzQueue: newQueue, passedPlayers: newPassed };
}

export function validateScoreUpdate(points: number): boolean {
  return Number.isFinite(points) && Math.abs(points) <= 10000;
}

export function applyScoreUpdate(room: RoomState, playerId: string, points: number): RoomState {
  if (!validateScoreUpdate(points)) return room;
  const player = room.players.get(playerId);
  if (!player) return room;

  const newPlayers = new Map(room.players);
  newPlayers.set(playerId, { ...player, score: player.score + points });
  return { ...room, players: newPlayers };
}

export function getLeaderboard(room: RoomState): Array<{ playerId: string; playerName: string; playerAvatar: string; score: number }> {
  return Array.from(room.players.values())
    .map(p => ({
      playerId: p.id,
      playerName: p.name,
      playerAvatar: p.avatar,
      score: p.score,
    }))
    .sort((a, b) => b.score - a.score);
}

export function resetForNextGrid(room: RoomState): RoomState {
  return {
    ...room,
    buzzQueue: [],
    buzzerLocked: true,
    passedPlayers: new Set(),
    completedQuestions: new Set(),
    gameEnded: false,
  };
}

export function endGame(room: RoomState): RoomState | null {
  if (room.gameEnded) return null;
  return { ...room, gameEnded: true };
}

export function checkGameCompletion(revealedCount: number, totalCells: number, playerCount: number): boolean {
  return totalCells > 0 && revealedCount >= totalCells && playerCount > 0;
}

export function updateGameStats(
  stats: GameStats,
  playerId: string,
  playerName: string,
  points: number,
  categoryId: number | undefined,
  trackForGameplay: boolean,
): GameStats {
  if (!trackForGameplay || categoryId === undefined) {
    return stats;
  }

  const newPlayerStats = new Map(stats.playerStats);
  const existing = newPlayerStats.get(playerId) || {
    correctAnswers: 0,
    wrongAnswers: 0,
    totalPoints: 0,
    pointsByCategory: {},
    currentStreak: 0,
    bestStreak: 0,
    biggestGain: 0,
  };

  const isCorrect = points > 0;
  const updated: PlayerGameStats = {
    ...existing,
    correctAnswers: existing.correctAnswers + (isCorrect ? 1 : 0),
    wrongAnswers: existing.wrongAnswers + (!isCorrect && points < 0 ? 1 : 0),
    totalPoints: existing.totalPoints + points,
    currentStreak: isCorrect ? existing.currentStreak + 1 : 0,
    bestStreak: isCorrect ? Math.max(existing.bestStreak, existing.currentStreak + 1) : existing.bestStreak,
    biggestGain: isCorrect ? Math.max(existing.biggestGain, points) : existing.biggestGain,
    lastAnswerTime: Date.now(),
  };

  if (categoryId && isCorrect) {
    updated.pointsByCategory = {
      ...existing.pointsByCategory,
      [categoryId]: (existing.pointsByCategory[categoryId] || 0) + points,
    };
  }

  newPlayerStats.set(playerId, updated);

  const newMvpMoments = [...stats.mvpMoments];

  if (updated.currentStreak === 3) {
    newMvpMoments.push({
      type: 'streak',
      playerId,
      description: `${playerName} is on fire! 3 in a row`,
      value: 3,
    });
  }

  return {
    ...stats,
    playerStats: newPlayerStats,
    totalQuestions: stats.totalQuestions + (isCorrect || points < 0 ? 1 : 0),
    mvpMoments: newMvpMoments,
  };
}
