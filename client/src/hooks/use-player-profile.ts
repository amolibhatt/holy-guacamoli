import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

const SERVER_GUEST_ID_KEY = "holyguacamoli_server_guest_id";
const MERGED_FLAG_KEY = "holyguacamoli_merged";

// Store the server-issued guestId (received from /api/player/guest)
function getStoredServerGuestId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SERVER_GUEST_ID_KEY);
}

function storeServerGuestId(guestId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SERVER_GUEST_ID_KEY, guestId);
  }
}

function clearStoredServerGuestId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SERVER_GUEST_ID_KEY);
  }
}

function setMergedFlag(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(MERGED_FLAG_KEY, "true");
  }
}

function hasMergedFlag(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MERGED_FLAG_KEY) === "true";
}

function clearMergedFlag(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(MERGED_FLAG_KEY);
  }
}

export interface PlayerProfile {
  id: string;
  guestId: string | null;
  userId: string | null;
  displayName: string;
  avatarId: string;
  totalGamesPlayed: number;
  totalPointsEarned: number;
  totalWins: number;
  personalityScores: Record<string, number> | null;
  dominantTrait: string | null;
  createdAt: Date;
  lastPlayedAt: Date | null;
}

export interface PlayerGameStats {
  id: string;
  userId: string;
  gameSlug: string;
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  highestScore: number;
  correctAnswers: number | null;
  incorrectAnswers: number | null;
  avgResponseTimeMs: number | null;
  fastestBuzzMs: number | null;
  perfectRounds: number | null;
  successfulDeceptions: number | null;
  caughtLiars: number | null;
  totalVotesReceived: number | null;
  correctWinnerPicks: number | null;
}

export interface PlayerBadge {
  id: string;
  profileId: string;
  badgeType: string;
  gameSlug: string | null;
  earnedAt: Date;
  definition: {
    name: string;
    description: string;
    icon: string;
  };
}

export interface FullPlayerProfile {
  profile: PlayerProfile;
  stats: PlayerGameStats[];
  badges: PlayerBadge[];
  personality: Record<string, number>;
}

export function usePlayerProfile(displayName?: string) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [serverGuestId, setServerGuestId] = useState<string | null>(null);

  // Initialize from stored server-issued guest ID
  useEffect(() => {
    const storedId = getStoredServerGuestId();
    if (storedId) {
      setServerGuestId(storedId);
    }
  }, []);

  // Get or create guest profile - server issues guestId
  const {
    data: guestProfile,
    isLoading: isGuestLoading,
  } = useQuery<FullPlayerProfile>({
    queryKey: ["/api/player/guest", displayName],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/player/guest", {
        displayName: displayName || `Player_${Date.now().toString(36)}`,
      });
      const profileResponse = await response.json();
      
      // Store the server-issued guestId
      if (profileResponse.serverGuestId) {
        storeServerGuestId(profileResponse.serverGuestId);
        setServerGuestId(profileResponse.serverGuestId);
      }
      
      // Fetch full profile after creation
      const fullProfile = await fetch(`/api/player/profile/${profileResponse.id}`, {
        credentials: "include",
      });
      if (!fullProfile.ok) throw new Error("Failed to fetch profile");
      return fullProfile.json();
    },
    enabled: !isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Get authenticated user's profile
  const {
    data: userProfile,
    isLoading: isUserLoading,
  } = useQuery<FullPlayerProfile>({
    queryKey: ["/api/player/me"],
    queryFn: async () => {
      const response = await fetch("/api/player/me", {
        credentials: "include",
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Merge guest to user mutation - server uses session guestId, no client-provided guestId
  const mergeMutation = useMutation({
    mutationFn: async () => {
      // Server uses session-stored guestId, we don't send it
      const response = await apiRequest("POST", "/api/player/merge", {});
      return response.json();
    },
    onSuccess: () => {
      setMergedFlag(); // Mark as merged to prevent re-attempts
      clearStoredServerGuestId();
      setServerGuestId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/player/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player/guest"] });
    },
  });

  // Auto-merge when user logs in and has guest data (idempotent)
  useEffect(() => {
    // Skip if already merged or merge in progress
    if (hasMergedFlag()) return;
    
    if (isAuthenticated && serverGuestId && !mergeMutation.isPending && !mergeMutation.isSuccess) {
      mergeMutation.mutate();
    }
  }, [isAuthenticated, serverGuestId]);

  // Update stats mutation - server uses session for ownership verification
  const updateStatsMutation = useMutation({
    mutationFn: async (data: {
      profileId: string;
      gameSlug: string;
      updates: {
        points?: number;
        won?: boolean;
        correctAnswers?: number;
        incorrectAnswers?: number;
        responseTimeMs?: number;
        perfectRound?: boolean;
        successfulDeception?: boolean;
        caughtLiar?: boolean;
        votesReceived?: number;
        pickedWinner?: boolean;
      };
    }) => {
      // guestId is now stored in session (set when guest profile created), not sent in request
      const response = await apiRequest("POST", "/api/player/stats", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/player/me"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/player/guest"] });
      }
    },
  });

  const currentProfile = isAuthenticated ? userProfile : guestProfile;
  const isLoading = isAuthenticated ? isUserLoading : isGuestLoading;

  return {
    profile: currentProfile,
    isLoading,
    isGuest: !isAuthenticated,
    guestId: serverGuestId, // Server-issued guest ID
    
    // Actions
    updateStats: updateStatsMutation.mutate,
    isUpdatingStats: updateStatsMutation.isPending,
    
    merge: mergeMutation.mutate,
    isMerging: mergeMutation.isPending,
    mergeError: mergeMutation.error,
    
    // Helper to check if guest has progress worth saving
    hasProgress: currentProfile 
      ? (currentProfile.profile.totalGamesPlayed > 0 || 
         currentProfile.badges.length > 0)
      : false,
  };
}
