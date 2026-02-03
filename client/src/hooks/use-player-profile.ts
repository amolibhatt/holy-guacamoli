import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

const GUEST_ID_KEY = "holyguacamoli_guest_id";

function generateGuestId(): string {
  return "guest_" + crypto.randomUUID();
}

function getStoredGuestId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GUEST_ID_KEY);
}

function storeGuestId(guestId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
}

function clearStoredGuestId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(GUEST_ID_KEY);
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
  const [guestId, setGuestId] = useState<string | null>(null);

  // Initialize or retrieve guest ID
  useEffect(() => {
    let storedGuestId = getStoredGuestId();
    if (!storedGuestId) {
      storedGuestId = generateGuestId();
      storeGuestId(storedGuestId);
    }
    setGuestId(storedGuestId);
  }, []);

  // Get or create guest profile
  const {
    data: guestProfile,
    isLoading: isGuestLoading,
  } = useQuery<FullPlayerProfile>({
    queryKey: ["/api/player/guest", guestId, displayName],
    queryFn: async () => {
      if (!guestId) throw new Error("No guest ID");
      const response = await apiRequest("POST", "/api/player/guest", {
        guestId,
        displayName: displayName || `Player_${guestId.slice(-6)}`,
      });
      const profile = await response.json();
      // Fetch full profile after creation
      const fullProfile = await fetch(`/api/player/profile/${profile.id}`, {
        credentials: "include",
      });
      if (!fullProfile.ok) throw new Error("Failed to fetch profile");
      return fullProfile.json();
    },
    enabled: !!guestId && !isAuthenticated,
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

  // Merge guest to user mutation
  const mergeMutation = useMutation({
    mutationFn: async () => {
      const storedGuestId = getStoredGuestId();
      if (!storedGuestId) throw new Error("No guest data to merge");
      
      const response = await apiRequest("POST", "/api/player/merge", { 
        guestId: storedGuestId 
      });
      return response.json();
    },
    onSuccess: () => {
      clearStoredGuestId();
      queryClient.invalidateQueries({ queryKey: ["/api/player/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player/guest"] });
    },
  });

  // Auto-merge when user logs in and has guest data
  useEffect(() => {
    if (isAuthenticated && guestId && !mergeMutation.isPending && !mergeMutation.isSuccess) {
      const storedGuestId = getStoredGuestId();
      if (storedGuestId) {
        mergeMutation.mutate();
      }
    }
  }, [isAuthenticated, guestId]);

  // Update stats mutation
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
    guestId,
    
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
