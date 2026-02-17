import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { 
  playerProfiles, 
  playerGameStats, 
  playerBadges,
  pendingGuestData,
  type PlayerProfile,
  type PlayerGameStats,
  type PlayerBadge,
  type BadgeType,
  type PersonalityTrait,
  PERSONALITY_TRAITS
} from "@shared/models/auth";

// Badge definitions with requirements
// Icons are lucide-react icon names to be mapped on frontend
const BADGE_DEFINITIONS: Record<BadgeType, {
  name: string;
  description: string;
  icon: string;
  requirement: (stats: PlayerGameStats) => boolean;
}> = {
  first_blood: {
    name: "First Blood",
    description: "Win your first game",
    icon: "target",
    requirement: (stats) => stats.gamesWon >= 1,
  },
  trivia_titan: {
    name: "Trivia Titan",
    description: "Answer 50 questions correctly",
    icon: "brain",
    requirement: (stats) => (stats.correctAnswers || 0) >= 50,
  },
  streak_master: {
    name: "Streak Master",
    description: "Get 5 correct answers in a row",
    icon: "flame",
    requirement: () => false, // Tracked separately during gameplay
  },
  category_king: {
    name: "Category King",
    description: "Dominate a single category",
    icon: "crown",
    requirement: () => false,
  },
  perfect_order: {
    name: "Perfect Order",
    description: "Complete 10 perfect rounds in Sort Circuit",
    icon: "sparkles",
    requirement: (stats) => (stats.perfectRounds || 0) >= 10,
  },
  speed_demon: {
    name: "Speed Demon",
    description: "Buzz in under 500ms",
    icon: "zap",
    requirement: (stats) => (stats.fastestBuzzMs || Infinity) < 500,
  },
  comeback_kid: {
    name: "Comeback Kid",
    description: "Win after being in last place",
    icon: "rocket",
    requirement: () => false,
  },
  master_deceiver: {
    name: "Master Deceiver",
    description: "Fool 20 players in PsyOp",
    icon: "drama",
    requirement: (stats) => (stats.successfulDeceptions || 0) >= 20,
  },
  truth_seeker: {
    name: "Truth Seeker",
    description: "Catch 20 liars in PsyOp",
    icon: "search",
    requirement: (stats) => (stats.caughtLiars || 0) >= 20,
  },
  creative_genius: {
    name: "Creative Genius",
    description: "Create memorable fake answers",
    icon: "palette",
    requirement: () => false,
  },
  meme_lord: {
    name: "Meme Lord",
    description: "Receive 50 votes in Meme No Harm",
    icon: "laugh",
    requirement: (stats) => (stats.totalVotesReceived || 0) >= 50,
  },
  people_champion: {
    name: "People's Champion",
    description: "Pick the winning meme 10 times",
    icon: "trophy",
    requirement: (stats) => (stats.correctWinnerPicks || 0) >= 10,
  },
  dark_horse: {
    name: "Dark Horse",
    description: "Win despite low expectations",
    icon: "star",
    requirement: () => false,
  },
  party_starter: {
    name: "Party Starter",
    description: "Play 10 games",
    icon: "party-popper",
    requirement: (stats) => stats.gamesPlayed >= 10,
  },
  loyal_player: {
    name: "Loyal Player",
    description: "Play 50 games total",
    icon: "gem",
    requirement: (stats) => stats.gamesPlayed >= 50,
  },
  social_butterfly: {
    name: "Social Butterfly",
    description: "Play all 5 game types",
    icon: "users",
    requirement: () => false,
  },
};

export class PlayerProfileService {
  
  // Get or create a guest profile
  async getOrCreateGuestProfile(guestId: string, displayName: string): Promise<PlayerProfile> {
    const existing = await db.select().from(playerProfiles).where(eq(playerProfiles.guestId, guestId)).limit(1);
    
    if (existing.length > 0) {
      // Update display name if changed
      if (existing[0].displayName !== displayName) {
        await db.update(playerProfiles)
          .set({ displayName, updatedAt: new Date() })
          .where(eq(playerProfiles.id, existing[0].id));
        return { ...existing[0], displayName };
      }
      return existing[0];
    }
    
    // Create new guest profile
    const [profile] = await db.insert(playerProfiles).values({
      guestId,
      displayName,
      avatarId: "cat",
    }).returning();
    
    return profile;
  }
  
  // Get profile by user ID (for authenticated users)
  async getProfileByUserId(userId: string): Promise<PlayerProfile | null> {
    const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
    return profile || null;
  }
  
  // Get profile by guest ID
  async getProfileByGuestId(guestId: string): Promise<PlayerProfile | null> {
    const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.guestId, guestId)).limit(1);
    return profile || null;
  }
  
  // Get profile by ID
  async getProfileById(profileId: string): Promise<PlayerProfile | null> {
    const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, profileId)).limit(1);
    return profile || null;
  }
  
  // Update game stats after a game
  async updateGameStats(
    profileId: string,
    gameSlug: string,
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
    }
  ): Promise<void> {
    // Get existing stats or create new
    const [existing] = await db.select()
      .from(playerGameStats)
      .where(and(
        eq(playerGameStats.userId, profileId),
        eq(playerGameStats.gameSlug, gameSlug)
      ))
      .limit(1);
    
    if (existing) {
      // Update existing stats
      const updateData: Partial<PlayerGameStats> = {
        updatedAt: new Date(),
        lastPlayedAt: new Date(),
      };
      
      if (updates.points) {
        updateData.totalPoints = existing.totalPoints + updates.points;
        if (updates.points > (existing.highestScore || 0)) {
          updateData.highestScore = updates.points;
        }
      }
      if (updates.won) {
        updateData.gamesWon = existing.gamesWon + 1;
      }
      if (updates.correctAnswers) {
        updateData.correctAnswers = (existing.correctAnswers || 0) + updates.correctAnswers;
      }
      if (updates.incorrectAnswers) {
        updateData.incorrectAnswers = (existing.incorrectAnswers || 0) + updates.incorrectAnswers;
      }
      if (updates.responseTimeMs != null && updates.responseTimeMs > 0) {
        const totalAnswers = (existing.correctAnswers || 0) + (existing.incorrectAnswers || 0);
        if (existing.avgResponseTimeMs && totalAnswers > 0) {
          updateData.avgResponseTimeMs = Math.round(
            (existing.avgResponseTimeMs * totalAnswers + updates.responseTimeMs) / (totalAnswers + 1)
          );
        } else {
          updateData.avgResponseTimeMs = updates.responseTimeMs;
        }
        if (!existing.fastestBuzzMs || updates.responseTimeMs < existing.fastestBuzzMs) {
          updateData.fastestBuzzMs = updates.responseTimeMs;
        }
      }
      if (updates.perfectRound) {
        updateData.perfectRounds = (existing.perfectRounds || 0) + 1;
      }
      if (updates.successfulDeception) {
        updateData.successfulDeceptions = (existing.successfulDeceptions || 0) + 1;
      }
      if (updates.caughtLiar) {
        updateData.caughtLiars = (existing.caughtLiars || 0) + 1;
      }
      if (updates.votesReceived) {
        updateData.totalVotesReceived = (existing.totalVotesReceived || 0) + updates.votesReceived;
      }
      if (updates.pickedWinner) {
        updateData.correctWinnerPicks = (existing.correctWinnerPicks || 0) + 1;
      }
      
      // Increment games played
      updateData.gamesPlayed = existing.gamesPlayed + 1;
      
      await db.update(playerGameStats)
        .set(updateData)
        .where(eq(playerGameStats.id, existing.id));
    } else {
      // Create new stats entry
      await db.insert(playerGameStats).values({
        userId: profileId,
        gameSlug,
        gamesPlayed: 1,
        gamesWon: updates.won ? 1 : 0,
        totalPoints: updates.points || 0,
        highestScore: updates.points || 0,
        correctAnswers: updates.correctAnswers || 0,
        incorrectAnswers: updates.incorrectAnswers || 0,
        avgResponseTimeMs: updates.responseTimeMs || 0,
        fastestBuzzMs: updates.responseTimeMs,
        perfectRounds: updates.perfectRound ? 1 : 0,
        successfulDeceptions: updates.successfulDeception ? 1 : 0,
        caughtLiars: updates.caughtLiar ? 1 : 0,
        totalVotesReceived: updates.votesReceived || 0,
        correctWinnerPicks: updates.pickedWinner ? 1 : 0,
      });
    }
    
    // Update profile totals
    const profile = await this.getProfileById(profileId);
    if (profile) {
      await db.update(playerProfiles)
        .set({
          totalGamesPlayed: profile.totalGamesPlayed + 1,
          totalPointsEarned: profile.totalPointsEarned + (updates.points || 0),
          totalWins: profile.totalWins + (updates.won ? 1 : 0),
          lastPlayedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(playerProfiles.id, profileId));
    }
    
    // Check for new badges
    await this.checkAndAwardBadges(profileId, gameSlug);
    
    // Recalculate personality after stats change
    await this.calculatePersonality(profileId);
  }
  
  // Calculate personality traits based on stats
  async calculatePersonality(profileId: string): Promise<Record<string, number>> {
    const stats = await db.select().from(playerGameStats).where(eq(playerGameStats.userId, profileId));
    
    const scores: Record<string, number> = {};
    
    for (const gameStat of stats) {
      const gameTraits = PERSONALITY_TRAITS[gameStat.gameSlug as keyof typeof PERSONALITY_TRAITS];
      if (!gameTraits) continue;
      
      // Calculate trait scores based on game-specific logic
      if (gameStat.gameSlug === "blitzgrid") {
        const accuracy = gameStat.correctAnswers && gameStat.incorrectAnswers 
          ? gameStat.correctAnswers / (gameStat.correctAnswers + gameStat.incorrectAnswers) 
          : 0;
        const avgSpeed = gameStat.avgResponseTimeMs || 5000;
        
        scores.brain_trust = Math.round(accuracy * 100);
        scores.lucky_guesser = Math.round((1 - accuracy) * 50 + (gameStat.gamesWon / Math.max(1, gameStat.gamesPlayed)) * 50);
        scores.speed_demon = Math.round(Math.max(0, 100 - (avgSpeed / 50)));
        scores.careful_thinker = Math.round(Math.min(100, avgSpeed / 30));
      }
      
      if (gameStat.gameSlug === "sort_circuit") {
        const perfection = (gameStat.perfectRounds || 0) / Math.max(1, gameStat.gamesPlayed);
        scores.perfectionist = Math.round(perfection * 100);
        scores.chaos_agent = Math.round((1 - perfection) * 100);
      }
      
      if (gameStat.gameSlug === "psyop") {
        const deceptionRate = (gameStat.successfulDeceptions || 0) / Math.max(1, gameStat.gamesPlayed);
        const detectionRate = (gameStat.caughtLiars || 0) / Math.max(1, gameStat.gamesPlayed);
        
        scores.master_manipulator = Math.round(deceptionRate * 100);
        scores.bs_detector = Math.round(detectionRate * 100);
        scores.honest_abe = Math.round((1 - deceptionRate) * 100);
      }
      
      if (gameStat.gameSlug === "meme_no_harm") {
        const avgVotes = (gameStat.totalVotesReceived || 0) / Math.max(1, gameStat.gamesPlayed);
        const winnerPickRate = (gameStat.correctWinnerPicks || 0) / Math.max(1, gameStat.gamesPlayed);
        
        scores.comedy_genius = Math.round(Math.min(100, avgVotes * 20));
        scores.hivemind = Math.round(winnerPickRate * 100);
      }
    }
    
    // Update profile with personality scores
    const dominantTrait = Object.entries(scores).reduce(
      (max, [trait, score]) => score > max.score ? { trait, score } : max,
      { trait: "", score: 0 }
    ).trait as PersonalityTrait;
    
    await db.update(playerProfiles)
      .set({ 
        personalityScores: scores,
        dominantTrait: dominantTrait || null,
        updatedAt: new Date(),
      })
      .where(eq(playerProfiles.id, profileId));
    
    return scores;
  }
  
  // Check and award badges
  async checkAndAwardBadges(profileId: string, gameSlug?: string): Promise<PlayerBadge[]> {
    const stats = await db.select()
      .from(playerGameStats)
      .where(eq(playerGameStats.userId, profileId));
    
    const existingBadges = await db.select()
      .from(playerBadges)
      .where(eq(playerBadges.profileId, profileId));
    
    const existingBadgeTypes = new Set(existingBadges.map(b => b.badgeType));
    const newBadges: PlayerBadge[] = [];
    
    for (const stat of stats) {
      for (const [badgeType, def] of Object.entries(BADGE_DEFINITIONS)) {
        if (existingBadgeTypes.has(badgeType as BadgeType)) continue;
        
        if (def.requirement(stat)) {
          const [badge] = await db.insert(playerBadges).values({
            profileId,
            badgeType: badgeType as BadgeType,
            gameSlug: stat.gameSlug,
          }).returning();
          
          newBadges.push(badge);
          existingBadgeTypes.add(badgeType as BadgeType);
        }
      }
    }
    
    return newBadges;
  }
  
  // Get all badges for a profile
  async getBadges(profileId: string): Promise<(PlayerBadge & { definition: typeof BADGE_DEFINITIONS[BadgeType] })[]> {
    const badges = await db.select().from(playerBadges).where(eq(playerBadges.profileId, profileId));
    
    return badges.map(badge => ({
      ...badge,
      definition: BADGE_DEFINITIONS[badge.badgeType as BadgeType],
    }));
  }
  
  // Get game stats for a profile
  async getGameStats(profileId: string): Promise<PlayerGameStats[]> {
    return db.select().from(playerGameStats).where(eq(playerGameStats.userId, profileId));
  }
  
  // Merge guest data to user account
  async mergeGuestToUser(guestId: string, userId: string): Promise<PlayerProfile | null> {
    // Find guest profile
    const [guestProfile] = await db.select()
      .from(playerProfiles)
      .where(eq(playerProfiles.guestId, guestId))
      .limit(1);
    
    if (!guestProfile) return null;
    
    // Check if user already has a profile
    const [existingUserProfile] = await db.select()
      .from(playerProfiles)
      .where(eq(playerProfiles.userId, userId))
      .limit(1);
    
    if (existingUserProfile) {
      // Merge stats into existing profile
      await db.update(playerProfiles)
        .set({
          totalGamesPlayed: existingUserProfile.totalGamesPlayed + guestProfile.totalGamesPlayed,
          totalPointsEarned: existingUserProfile.totalPointsEarned + guestProfile.totalPointsEarned,
          totalWins: existingUserProfile.totalWins + guestProfile.totalWins,
          updatedAt: new Date(),
        })
        .where(eq(playerProfiles.id, existingUserProfile.id));
      
      // Update game stats to point to user profile
      await db.update(playerGameStats)
        .set({ userId: existingUserProfile.id })
        .where(eq(playerGameStats.userId, guestProfile.id));
      
      // Transfer badges
      await db.update(playerBadges)
        .set({ profileId: existingUserProfile.id })
        .where(eq(playerBadges.profileId, guestProfile.id));
      
      // Delete guest profile
      await db.delete(playerProfiles).where(eq(playerProfiles.id, guestProfile.id));
      
      // Recalculate personality with merged stats
      await this.calculatePersonality(existingUserProfile.id);
      
      // Re-fetch to return fresh data after merge
      const [freshProfile] = await db.select()
        .from(playerProfiles)
        .where(eq(playerProfiles.id, existingUserProfile.id))
        .limit(1);
      return freshProfile || existingUserProfile;
    } else {
      // Convert guest profile to user profile
      const [updatedProfile] = await db.update(playerProfiles)
        .set({
          userId,
          guestId: null,
          updatedAt: new Date(),
        })
        .where(eq(playerProfiles.id, guestProfile.id))
        .returning();
      
      // Recalculate personality for the converted profile
      await this.calculatePersonality(updatedProfile.id);
      
      return updatedProfile;
    }
  }
  
  // Get full profile with stats and badges
  async getFullProfile(profileId: string): Promise<{
    profile: PlayerProfile;
    stats: PlayerGameStats[];
    badges: (PlayerBadge & { definition: typeof BADGE_DEFINITIONS[BadgeType] })[];
    personality: Record<string, number>;
  } | null> {
    const profile = await this.getProfileById(profileId);
    if (!profile) return null;
    
    const stats = await this.getGameStats(profileId);
    const badges = await this.getBadges(profileId);
    const personality = profile.personalityScores || {};
    
    return { profile, stats, badges, personality };
  }
}

export const playerProfileService = new PlayerProfileService();
