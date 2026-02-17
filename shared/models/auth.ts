import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, integer, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Subscription plans
export const SUBSCRIPTION_PLANS = ["free", "pro", "party_pack"] as const;
export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[number];

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Host users table (email/password auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role").notNull().default("user"),
  // Subscription fields
  subscriptionPlan: varchar("subscription_plan").notNull().$type<SubscriptionPlan>().default("free"),
  subscriptionStatus: varchar("subscription_status").notNull().default("active"), // active, cancelled, expired
  razorpayCustomerId: varchar("razorpay_customer_id"),
  razorpaySubscriptionId: varchar("razorpay_subscription_id"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table for transaction history
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  razorpayOrderId: varchar("razorpay_order_id").notNull(),
  razorpayPaymentId: varchar("razorpay_payment_id"),
  razorpaySignature: varchar("razorpay_signature"),
  amount: integer("amount").notNull(), // in paise (INR cents)
  currency: varchar("currency").notNull().default("INR"),
  status: varchar("status").notNull().default("created"), // created, paid, failed
  plan: varchar("plan").notNull().$type<SubscriptionPlan>(),
  description: varchar("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payments_user").on(table.userId),
  index("idx_payments_order").on(table.razorpayOrderId),
]);

// Insert schema for registration
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  role: true,
  subscriptionPlan: true,
  subscriptionStatus: true,
  razorpayCustomerId: true,
  razorpaySubscriptionId: true,
  subscriptionExpiresAt: true,
  lastLoginAt: true,
  createdAt: true, 
  updatedAt: true 
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Safe user type without password (for frontend)
export type SafeUser = Omit<User, "password">;

// Payment types
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============================================
// PLAYER PROFILES & PERSONALITY SYSTEM
// ============================================

// Personality archetypes per game
export const PERSONALITY_TRAITS = {
  blitzgrid: ["brain_trust", "lucky_guesser", "speed_demon", "careful_thinker", "category_snob"] as const,
  sort_circuit: ["chaos_agent", "perfectionist", "speedrunner", "methodical"] as const,
  psyop: ["master_manipulator", "bs_detector", "creative_liar", "honest_abe"] as const,
  meme_no_harm: ["comedy_genius", "crowd_pleaser", "edgelord", "hivemind"] as const,
  past_forward: ["time_traveler", "era_specialist", "history_buff"] as const,
} as const;

export type PersonalityTrait = typeof PERSONALITY_TRAITS[keyof typeof PERSONALITY_TRAITS][number];

// Badge definitions
export const BADGE_TYPES = [
  // Blitzgrid badges
  "first_blood", "trivia_titan", "streak_master", "category_king",
  // Sort Circuit badges  
  "perfect_order", "speed_demon", "comeback_kid",
  // PsyOp badges
  "master_deceiver", "truth_seeker", "creative_genius",
  // Meme No Harm badges
  "meme_lord", "people_champion", "dark_horse",
  // General badges
  "party_starter", "loyal_player", "social_butterfly",
] as const;
export type BadgeType = typeof BADGE_TYPES[number];

// Player profiles - works for both guests and authenticated users
export const playerProfiles = pgTable("player_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identity - either guest or linked to user
  guestId: varchar("guest_id").unique(), // For guests (browser fingerprint or generated ID)
  userId: varchar("user_id").unique(), // Links to users table when converted
  
  // Display info
  displayName: varchar("display_name").notNull(),
  avatarId: varchar("avatar_id").default("cat"),
  
  // Overall stats
  totalGamesPlayed: integer("total_games_played").notNull().default(0),
  totalPointsEarned: integer("total_points_earned").notNull().default(0),
  totalWins: integer("total_wins").notNull().default(0),
  
  // Personality scores (0-100 scale for each trait)
  personalityScores: jsonb("personality_scores").$type<Record<string, number>>().default({}),
  dominantTrait: varchar("dominant_trait").$type<PersonalityTrait>(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastPlayedAt: timestamp("last_played_at"),
}, (table) => [
  index("idx_player_profiles_guest").on(table.guestId),
  index("idx_player_profiles_user").on(table.userId),
]);

// Per-game statistics for personality calculation
export const playerGameStats = pgTable("player_game_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Links to player profile or user
  gameSlug: varchar("game_slug").notNull(), // blitzgrid, sort_circuit, psyop, etc.
  
  // Common stats
  gamesPlayed: integer("games_played").notNull().default(0),
  gamesWon: integer("games_won").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  highestScore: integer("highest_score").default(0),
  
  // Blitzgrid-specific
  correctAnswers: integer("correct_answers").default(0),
  incorrectAnswers: integer("incorrect_answers").default(0),
  avgResponseTimeMs: integer("avg_response_time_ms").default(0),
  fastestBuzzMs: integer("fastest_buzz_ms"),
  categoryStats: jsonb("category_stats").$type<Record<string, { correct: number; total: number }>>().default({}),
  
  // Sort Circuit-specific
  perfectRounds: integer("perfect_rounds").default(0),
  avgOrderAccuracy: integer("avg_order_accuracy").default(0), // 0-100
  
  // PsyOp-specific
  successfulDeceptions: integer("successful_deceptions").default(0),
  caughtLiars: integer("caught_liars").default(0),
  timesDeceived: integer("times_deceived").default(0),
  
  // Meme No Harm-specific
  totalVotesReceived: integer("total_votes_received").default(0),
  correctWinnerPicks: integer("correct_winner_picks").default(0),
  
  // Timestamps
  lastPlayedAt: timestamp("last_played_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_player_game_stats_user").on(table.userId),
  index("idx_player_game_stats_game").on(table.gameSlug),
]);

// Earned badges
export const playerBadges = pgTable("player_badges", {
  id: serial("id").primaryKey(),
  profileId: varchar("profile_id").notNull(),
  badgeType: varchar("badge_type").notNull().$type<BadgeType>(),
  gameSlug: varchar("game_slug"), // Which game earned it (null for general badges)
  
  // Badge metadata
  earnedAt: timestamp("earned_at").defaultNow(),
  sessionId: integer("session_id"), // Which game session earned it
  
  // For "level" badges (e.g., Bronze/Silver/Gold)
  level: integer("level").default(1),
}, (table) => [
  index("idx_player_badges_profile").on(table.profileId),
]);

// Pending guest data (for merge after signup)
export const pendingGuestData = pgTable("pending_guest_data", {
  id: serial("id").primaryKey(),
  guestId: varchar("guest_id").notNull().unique(),
  
  // Accumulated data to merge
  totalPoints: integer("total_points").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  
  // Pending badges to award
  pendingBadges: jsonb("pending_badges").$type<Array<{ type: BadgeType; gameSlug?: string; sessionId?: number }>>().default([]),
  
  // Game-specific stats to merge
  gameStats: jsonb("game_stats").$type<Record<string, object>>().default({}),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Clean up old guest data
});

// Insert schemas
export const insertPlayerProfileSchema = createInsertSchema(playerProfiles).omit({ 
  id: true, createdAt: true, updatedAt: true, lastPlayedAt: true 
});
export const insertPlayerGameStatsSchema = createInsertSchema(playerGameStats).omit({ 
  id: true, createdAt: true, updatedAt: true, lastPlayedAt: true
});
export const insertPlayerBadgeSchema = createInsertSchema(playerBadges).omit({ 
  id: true, earnedAt: true 
});
export const insertPendingGuestDataSchema = createInsertSchema(pendingGuestData).omit({ 
  id: true, createdAt: true 
});

// Types
export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type InsertPlayerProfile = z.infer<typeof insertPlayerProfileSchema>;
export type PlayerGameStats = typeof playerGameStats.$inferSelect;
export type PlayerBadge = typeof playerBadges.$inferSelect;
export type PendingGuestData = typeof pendingGuestData.$inferSelect;
