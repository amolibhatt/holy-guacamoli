import type { Board, GameType, GameStatus } from "@shared/schema";
import type { SafeUser } from "@shared/models/auth";
import type { UseMutationResult } from "@tanstack/react-query";

export interface SessionPlayer {
  id: number;
  name: string;
  avatar: string;
  score: number;
  isConnected: boolean;
  joinedAt: string;
}

export interface UserSession {
  id: number;
  code: string;
  state: string;
  currentMode: string;
  createdAt: string;
  updatedAt: string;
  playerCount: number;
  players: SessionPlayer[];
  winner: SessionPlayer | null;
}

export interface UserBoard {
  id: number;
  name: string;
  theme: string | null;
  createdAt: string;
}

export interface UserWithStats extends SafeUser {
  boardCount: number;
  boards: UserBoard[];
  gamesHosted: number;
  recentSessions: UserSession[];
  contentCounts?: {
    timeWarpQuestions: number;
    sequenceQuestions: number;
    psyopQuestions: number;
    memePrompts: number;
    memeImages: number;
  };
}

export interface BoardWithOwner extends Board {
  ownerEmail: string;
  ownerName: string;
  questionCount: number;
  categoryCount: number;
}

export interface FlaggedBoardWithOwner extends Board {
  ownerEmail: string;
  ownerName: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  type: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface GameSessionDetailed {
  id: number;
  code: string;
  hostId: string;
  currentMode: string | null;
  state: string;
  createdAt: string;
  updatedAt: string;
  host: { id: string; firstName: string | null; lastName: string | null; email: string | null };
  players: { id: number; name: string; avatar: string; score: number; isConnected: boolean; joinedAt: string }[];
  playerCount: number;
  winner: { id: number; name: string; score: number } | null;
  roundCount?: number;
}

export interface ComprehensiveDashboard {
  realtime: { activeGames: number; activePlayers: number };
  today: { games: number; players: number; newUsers: number; gamesChange: number; playersChange: number; usersChange: number };
  week: { games: number; players: number; newUsers: number };
  totals: { users: number; sessions: number; boards: number; blitzgridQuestions: number; sortCircuitQuestions: number; psyopQuestions: number; timeWarpQuestions: number; memePrompts: number; memeImages: number; starterPacks: number; flaggedContent: number };
  usersByRole: Record<string, number>;
  recentActivity: { id: number; code: string; state: string; createdAt: string; mode?: string | null; players?: string[] }[];
  topHostsWeek: { name: string; games: number }[];
  popularGridsWeek: { name: string; plays: number }[];
  popularSortCircuitWeek: { name: string; plays: number }[];
  popularPsyopWeek: { name: string; plays: number }[];
  popularTimewarpWeek: { name: string; plays: number }[];
  popularMemeWeek: { name: string; plays: number }[];
  sortCircuitSessions: number;
  psyopSessions: number;
  performance: { avgScore: number; highScore: number; completionRate: number; sortCircuitAccuracy: number; sortCircuitAvgTimeMs: number; sortCircuitCompletionRate: number; psyopTotalRounds: number; psyopDeceptionRate: number; psyopSessions: number; timewarpTotalPlays: number; timewarpQuestionCount: number; memeSessions: number; memeRounds: number; memePlayers: number; memeSubmissions: number; memeVotes: number };
}

export interface QuestionCreator {
  id: string;
  username: string;
  email: string | null;
}

export interface SequenceQuestionWithCreator {
  id: number;
  userId: string | null;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOrder: string[];
  hint: string | null;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  playCount: number;
  creator: QuestionCreator | null;
}

export interface PsyopQuestionWithCreator {
  id: number;
  userId: string | null;
  factText: string;
  correctAnswer: string;
  category: string | null;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  playCount: number;
  creator: QuestionCreator | null;
}

export interface TimeWarpQuestionItem {
  id: number;
  userId: string | null;
  imageUrl: string;
  era: string;
  answer: string;
  hint: string | null;
  category: string | null;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  creator: QuestionCreator | null;
}

export interface MemePromptItem {
  id: number;
  userId: string | null;
  prompt: string;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  creator: QuestionCreator | null;
}

export interface MemeImageItem {
  id: number;
  userId: string | null;
  imageUrl: string;
  caption: string | null;
  isActive: boolean;
  isStarterPack: boolean;
  createdAt: string;
  creator: QuestionCreator | null;
}

export function formatRelativeDate(dateStr: string | Date | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function getGameModeLabel(mode: string | null): string {
  switch (mode) {
    case 'buzzer': return 'BlitzGrid';
    case 'sequence': return 'Sort Circuit';
    case 'psyop': return 'PsyOp';
    case 'timewarp': return 'Past Forward';
    case 'meme': return 'Meme No Harm';
    default: return mode || 'Unknown';
  }
}

export function getHostDisplay(host: GameSessionDetailed['host'] | null | undefined): string {
  if (!host) return 'Unknown';
  if (host.firstName || host.lastName) {
    return `${host.firstName || ''} ${host.lastName || ''}`.trim();
  }
  if (host.email) return host.email;
  if (host.id) return `ID: ${host.id.slice(0, 8)}...`;
  return 'Unknown';
}
