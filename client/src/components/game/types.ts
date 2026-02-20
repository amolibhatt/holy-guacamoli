export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error" | "reconnecting";

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
}
