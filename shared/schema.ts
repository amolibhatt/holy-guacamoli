import { pgTable, text, serial, integer, jsonb, boolean, unique, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

// Game Status - controls display on homepage
export const GAME_STATUSES = ["active", "coming_soon", "hidden"] as const;
export type GameStatus = typeof GAME_STATUSES[number];

// Game Types Catalog - defines available games with visibility controls
export const gameTypes = pgTable("game_types", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("gamepad"),
  status: text("status").notNull().$type<GameStatus>().default("active"),
  hostEnabled: boolean("host_enabled").notNull().default(true),
  playerEnabled: boolean("player_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Double Dip Game Tables
export const DOUBLE_DIP_CATEGORIES = ["deep_end", "danger_zone", "daily_loop", "rewind", "glitch"] as const;
export type DoubleDipCategory = typeof DOUBLE_DIP_CATEGORIES[number];

export const doubleDipPairs = pgTable("double_dip_pairs", {
  id: serial("id").primaryKey(),
  userAId: text("user_a_id").notNull(),
  userBId: text("user_b_id"),
  inviteCode: text("invite_code").notNull().unique(),
  status: text("status").notNull().$type<"pending" | "active" | "ended">().default("pending"),
  streakCount: integer("streak_count").notNull().default(0),
  lastCompletedDate: text("last_completed_date"),
  anniversaryDate: text("anniversary_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_pairs_user_a").on(table.userAId),
  index("idx_pairs_user_b").on(table.userBId),
  index("idx_pairs_status").on(table.status),
]);

export const QUESTION_TYPES = ["open_ended", "multiple_choice"] as const;
export type QuestionType = typeof QUESTION_TYPES[number];

export const doubleDipQuestions = pgTable("double_dip_questions", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().$type<DoubleDipCategory>(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull().$type<QuestionType>().default("open_ended"),
  options: jsonb("options").$type<string[]>(),
  isFutureLocked: boolean("is_future_locked").notNull().default(false),
  unlockAfterDays: integer("unlock_after_days"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export interface CategoryInsight {
  category: string;
  compatibilityScore: number;
  insight: string;
}

export const doubleDipDailySets = pgTable("double_dip_daily_sets", {
  id: serial("id").primaryKey(),
  pairId: integer("pair_id").notNull(),
  dateKey: text("date_key").notNull(),
  questionIds: jsonb("question_ids").$type<number[]>().notNull(),
  userACompleted: boolean("user_a_completed").notNull().default(false),
  userBCompleted: boolean("user_b_completed").notNull().default(false),
  revealed: boolean("revealed").notNull().default(false),
  followupTask: text("followup_task"),
  categoryInsights: jsonb("category_insights").$type<CategoryInsight[]>(),
  weeklyStakeScored: boolean("weekly_stake_scored").notNull().default(false),
  firstCompleterId: text("first_completer_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.pairId, table.dateKey),
  index("idx_daily_sets_pair").on(table.pairId),
  index("idx_daily_sets_date").on(table.dateKey),
]);

export const doubleDipAnswers = pgTable("double_dip_answers", {
  id: serial("id").primaryKey(),
  dailySetId: integer("daily_set_id").notNull(),
  questionId: integer("question_id").notNull(),
  userId: text("user_id").notNull(),
  answerText: text("answer_text").notNull(),
  prediction: text("prediction"),
  isTimeCapsule: boolean("is_time_capsule").notNull().default(false),
  unlockDate: text("unlock_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.dailySetId, table.questionId, table.userId),
  index("idx_answers_daily_set").on(table.dailySetId),
  index("idx_answers_user").on(table.userId),
]);

export const doubleDipReactions = pgTable("double_dip_reactions", {
  id: serial("id").primaryKey(),
  answerId: integer("answer_id").notNull(),
  userId: text("user_id").notNull(),
  reaction: text("reaction").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.answerId, table.userId),
  index("idx_reactions_answer").on(table.answerId),
]);

export const MILESTONE_TYPES = ["streak", "compatibility", "favorite", "first_reveal", "category_master", "anniversary"] as const;
export type MilestoneType = typeof MILESTONE_TYPES[number];

export const doubleDipMilestones = pgTable("double_dip_milestones", {
  id: serial("id").primaryKey(),
  pairId: integer("pair_id").notNull(),
  type: text("type").notNull().$type<MilestoneType>(),
  title: text("title").notNull(),
  description: text("description"),
  value: integer("value"),
  dailySetId: integer("daily_set_id"),
  answerId: integer("answer_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_milestones_pair").on(table.pairId),
  index("idx_milestones_type").on(table.type),
]);

export const doubleDipFavorites = pgTable("double_dip_favorites", {
  id: serial("id").primaryKey(),
  pairId: integer("pair_id").notNull(),
  answerId: integer("answer_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.answerId, table.userId),
  index("idx_favorites_pair").on(table.pairId),
]);

export const SYNC_STAKES = [
  { id: "massage", winner: "Winner gets a 30-min massage", loser: "Loser gives a 30-min massage" },
  { id: "dishes", winner: "Winner is free from dishes", loser: "Loser does all dishes for 3 days" },
  { id: "breakfast", winner: "Winner gets breakfast in bed", loser: "Loser makes breakfast in bed" },
  { id: "movie", winner: "Winner picks the next movie", loser: "Loser watches winner's pick with no complaints" },
  { id: "chores", winner: "Winner gets a chore-free day", loser: "Loser handles all chores for a day" },
  { id: "dessert", winner: "Winner gets their favorite dessert", loser: "Loser makes or buys the dessert" },
  { id: "date", winner: "Winner picks the next date activity", loser: "Loser plans and executes the date" },
] as const;

export const doubleDipWeeklyStakes = pgTable("double_dip_weekly_stakes", {
  id: serial("id").primaryKey(),
  pairId: integer("pair_id").notNull(),
  weekStartDate: text("week_start_date").notNull(),
  stakeId: text("stake_id").notNull(),
  userAScore: integer("user_a_score").notNull().default(0),
  userBScore: integer("user_b_score").notNull().default(0),
  winnerId: text("winner_id"),
  isRevealed: boolean("is_revealed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.pairId, table.weekStartDate),
  index("idx_weekly_stakes_pair").on(table.pairId),
]);

// Sequence Squeeze Game Tables
export const sequenceQuestions = pgTable("sequence_questions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  question: text("question").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctOrder: jsonb("correct_order").$type<string[]>().notNull(), // e.g. ["C", "D", "B", "A"]
  hint: text("hint"),
  isActive: boolean("is_active").notNull().default(true),
  isStarterPack: boolean("is_starter_pack").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sequenceSessions = pgTable("sequence_sessions", {
  id: serial("id").primaryKey(),
  hostId: text("host_id").notNull(),
  roomCode: text("room_code").notNull().unique(),
  questionId: integer("question_id"),
  status: text("status").notNull().$type<"waiting" | "playing" | "revealing" | "finished">().default("waiting"),
  startedAt: timestamp("started_at"),
  revealAt: timestamp("reveal_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sequenceSubmissions = pgTable("sequence_submissions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  playerId: text("player_id").notNull(),
  playerName: text("player_name").notNull(),
  playerAvatar: text("player_avatar"),
  sequence: jsonb("sequence").$type<string[]>().notNull(), // e.g. ["A", "C", "B", "D"]
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  timeMs: integer("time_ms").notNull(), // milliseconds from question start
  isCorrect: boolean("is_correct"),
}, (table) => [
  unique().on(table.sessionId, table.playerId),
  index("idx_submissions_session").on(table.sessionId),
]);

// PsyOp Game Tables
export const psyopQuestions = pgTable("psyop_questions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  factText: text("fact_text").notNull(), // The full fact with [REDACTED] placeholder
  correctAnswer: text("correct_answer").notNull(), // The actual word that fills the blank
  category: text("category"), // Optional category for organizing questions
  isActive: boolean("is_active").notNull().default(true),
  isStarterPack: boolean("is_starter_pack").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const psyopSessions = pgTable("psyop_sessions", {
  id: serial("id").primaryKey(),
  hostId: text("host_id").notNull(),
  roomCode: text("room_code").notNull().unique(),
  status: text("status").notNull().$type<"waiting" | "submitting" | "voting" | "revealing" | "finished">().default("waiting"),
  timerSeconds: integer("timer_seconds").notNull().default(30), // Configurable timer
  currentRoundId: integer("current_round_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const psyopRounds = pgTable("psyop_rounds", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  questionId: integer("question_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  status: text("status").notNull().$type<"submitting" | "voting" | "revealing" | "complete">().default("submitting"),
  submissionDeadline: timestamp("submission_deadline"),
  votingDeadline: timestamp("voting_deadline"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.sessionId, table.roundNumber),
  index("idx_psyop_rounds_session").on(table.sessionId),
]);

export const psyopSubmissions = pgTable("psyop_submissions", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull(),
  playerId: text("player_id").notNull(),
  playerName: text("player_name").notNull(),
  playerAvatar: text("player_avatar"),
  lieText: text("lie_text").notNull(), // The player's believable lie
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.roundId, table.playerId),
  index("idx_psyop_submissions_round").on(table.roundId),
]);

export const psyopVotes = pgTable("psyop_votes", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull(),
  voterId: text("voter_id").notNull(), // The player who voted
  voterName: text("voter_name").notNull(),
  votedForId: integer("voted_for_id"), // submission_id if voted for a lie, null if voted for truth
  votedForTruth: boolean("voted_for_truth").notNull().default(false), // True if they voted for the real answer
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.roundId, table.voterId),
  index("idx_psyop_votes_round").on(table.roundId),
]);

// TimeWarp Game - era-filtered image guessing game
export const TIME_WARP_ERAS = ["past", "present", "future"] as const;
export type TimeWarpEra = typeof TIME_WARP_ERAS[number];

export const timeWarpQuestions = pgTable("time_warp_questions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  imageUrl: text("image_url").notNull(),
  era: text("era").notNull().$type<TimeWarpEra>(),
  answer: text("answer").notNull(),
  hint: text("hint"),
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
  isStarterPack: boolean("is_starter_pack").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_time_warp_user").on(table.userId),
  index("idx_time_warp_era").on(table.era),
]);

// Meme No Harm Game - meme matching and voting party game
export const memePrompts = pgTable("meme_prompts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  prompt: text("prompt").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isStarterPack: boolean("is_starter_pack").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_meme_prompts_user").on(table.userId),
]);

export const memeImages = pgTable("meme_images", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  isActive: boolean("is_active").notNull().default(true),
  isStarterPack: boolean("is_starter_pack").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_meme_images_user").on(table.userId),
]);

export const memeSessions = pgTable("meme_sessions", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  hostId: text("host_id").notNull(),
  status: text("status").notNull().$type<"lobby" | "playing" | "voting" | "results" | "finished">().default("lobby"),
  currentRound: integer("current_round").notNull().default(0),
  totalRounds: integer("total_rounds").notNull().default(5),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_meme_sessions_code").on(table.roomCode),
]);

export const memePlayers = pgTable("meme_players", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  name: text("name").notNull(),
  score: integer("score").notNull().default(0),
  hand: jsonb("hand").$type<number[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_meme_players_session").on(table.sessionId),
]);

export const memeRounds = pgTable("meme_rounds", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  promptId: integer("prompt_id").notNull(),
  status: text("status").notNull().$type<"selecting" | "voting" | "results">().default("selecting"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_meme_rounds_session").on(table.sessionId),
]);

export const memeSubmissions = pgTable("meme_submissions", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull(),
  playerId: integer("player_id").notNull(),
  imageId: integer("image_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_meme_submissions_round").on(table.roundId),
]);

export const memeVotes = pgTable("meme_votes", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull(),
  voterId: integer("voter_id").notNull(),
  submissionId: integer("submission_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_meme_votes_round").on(table.roundId),
  unique().on(table.roundId, table.voterId),
]);

// Board visibility - controls who can see/use the board
export const BOARD_VISIBILITIES = ["private", "tenant", "public"] as const;
export type BoardVisibility = typeof BOARD_VISIBILITIES[number];

// Source Groups for Smart Category Management (A through E)
export const SOURCE_GROUPS = ["A", "B", "C", "D", "E"] as const;
export type SourceGroup = typeof SOURCE_GROUPS[number];

export const MODERATION_STATUSES = ["approved", "pending", "flagged", "hidden"] as const;
export type ModerationStatus = typeof MODERATION_STATUSES[number];

export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  description: text("description"),
  pointValues: jsonb("point_values").$type<number[]>().notNull().default([10, 20, 30, 40, 50]),
  theme: text("theme").notNull().default("birthday"),
  visibility: text("visibility").notNull().$type<BoardVisibility>().default("private"),
  isGlobal: boolean("is_global").notNull().default(false),
  colorCode: text("color_code").default("#6366f1"),
  sortOrder: integer("sort_order").notNull().default(0),
  isStarterPack: boolean("is_starter_pack").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  moderationStatus: text("moderation_status").$type<ModerationStatus>().default("approved"),
  moderatedBy: text("moderated_by"),
  moderatedAt: timestamp("moderated_at"),
  flagReason: text("flag_reason"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  rule: text("rule"),
  imageUrl: text("image_url").notNull(),
  sourceGroup: text("source_group").$type<SourceGroup>(),
  isActive: boolean("is_active").notNull().default(false),
});

export const boardCategories = pgTable("board_categories", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull(),
  categoryId: integer("category_id").notNull(),
  position: integer("position").notNull().default(0),
}, (table) => [
  unique().on(table.boardId, table.categoryId),
]);

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: text("correct_answer").notNull(),
  points: integer("points").notNull(),
  imageUrl: text("image_url"),
  audioUrl: text("audio_url"),
  videoUrl: text("video_url"),
  answerImageUrl: text("answer_image_url"),
  answerAudioUrl: text("answer_audio_url"),
  answerVideoUrl: text("answer_video_url"),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const GAME_MODES = ["jeopardy", "heads_up", "board", "sequence", "blitzgrid"] as const;
export type GameMode = typeof GAME_MODES[number];

export interface BoardModeSettings {
  categoryCount?: number;
  pointLevels?: number[];
  enableBuzzers?: boolean;
}

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  mode: text("mode").notNull().$type<GameMode>().default("jeopardy"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gameBoards = pgTable("game_boards", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  boardId: integer("board_id").notNull(),
  position: integer("position").notNull().default(0),
}, (table) => [
  unique().on(table.gameId, table.boardId),
]);

export const headsUpDecks = pgTable("heads_up_decks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  timerSeconds: integer("timer_seconds").notNull().default(60),
});

export const headsUpCards = pgTable("heads_up_cards", {
  id: serial("id").primaryKey(),
  deckId: integer("deck_id").notNull(),
  prompt: text("prompt").notNull(),
  hints: jsonb("hints").$type<string[]>().default([]),
});

export const gameDecks = pgTable("game_decks", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  deckId: integer("deck_id").notNull(),
  position: integer("position").notNull().default(0),
}, (table) => [
  unique().on(table.gameId, table.deckId),
]);

// Game Sessions - for maintaining player connections and scores across boards/modes
export const SESSION_STATES = ["waiting", "active", "paused", "ended"] as const;
export type SessionState = typeof SESSION_STATES[number];

export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  hostId: text("host_id").notNull(),
  gameId: integer("game_id"),
  currentBoardId: integer("current_board_id"),
  currentMode: text("current_mode").$type<GameMode>().default("board"),
  state: text("state").$type<SessionState>().notNull().default("waiting"),
  buzzerLocked: boolean("buzzer_locked").notNull().default(true),
  playedCategoryIds: jsonb("played_category_ids").$type<number[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessionPlayers = pgTable("session_players", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  playerId: text("player_id").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull().default("cat"),
  score: integer("score").notNull().default(0),
  isConnected: boolean("is_connected").notNull().default(true),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.sessionId, table.playerId),
]);

export const PLAYER_AVATARS = [
  { id: "cat", emoji: "🐱", label: "Cat" },
  { id: "dog", emoji: "🐶", label: "Dog" },
  { id: "fox", emoji: "🦊", label: "Fox" },
  { id: "bear", emoji: "🐻", label: "Bear" },
  { id: "panda", emoji: "🐼", label: "Panda" },
  { id: "koala", emoji: "🐨", label: "Koala" },
  { id: "lion", emoji: "🦁", label: "Lion" },
  { id: "unicorn", emoji: "🦄", label: "Unicorn" },
  { id: "dragon", emoji: "🐲", label: "Dragon" },
  { id: "alien", emoji: "👽", label: "Alien" },
  { id: "robot", emoji: "🤖", label: "Robot" },
  { id: "ghost", emoji: "👻", label: "Ghost" },
] as const;

export type AvatarId = typeof PLAYER_AVATARS[number]["id"];

export const sessionCompletedQuestions = pgTable("session_completed_questions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  questionId: integer("question_id").notNull(),
  answeredByPlayerId: text("answered_by_player_id"),
  pointsAwarded: integer("points_awarded").default(0),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.sessionId, table.questionId),
]);

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  game: one(games, {
    fields: [gameSessions.gameId],
    references: [games.id],
  }),
  currentBoard: one(boards, {
    fields: [gameSessions.currentBoardId],
    references: [boards.id],
  }),
  players: many(sessionPlayers),
  completedQuestions: many(sessionCompletedQuestions),
}));

export const sessionPlayersRelations = relations(sessionPlayers, ({ one }) => ({
  session: one(gameSessions, {
    fields: [sessionPlayers.sessionId],
    references: [gameSessions.id],
  }),
}));

export const sessionCompletedQuestionsRelations = relations(sessionCompletedQuestions, ({ one }) => ({
  session: one(gameSessions, {
    fields: [sessionCompletedQuestions.sessionId],
    references: [gameSessions.id],
  }),
  question: one(questions, {
    fields: [sessionCompletedQuestions.questionId],
    references: [questions.id],
  }),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  gameBoards: many(gameBoards),
  gameDecks: many(gameDecks),
  sessions: many(gameSessions),
}));

export const gameBoardsRelations = relations(gameBoards, ({ one }) => ({
  game: one(games, {
    fields: [gameBoards.gameId],
    references: [games.id],
  }),
  board: one(boards, {
    fields: [gameBoards.boardId],
    references: [boards.id],
  }),
}));

export const gameDecksRelations = relations(gameDecks, ({ one }) => ({
  game: one(games, {
    fields: [gameDecks.gameId],
    references: [games.id],
  }),
  deck: one(headsUpDecks, {
    fields: [gameDecks.deckId],
    references: [headsUpDecks.id],
  }),
}));

export const headsUpDecksRelations = relations(headsUpDecks, ({ many }) => ({
  cards: many(headsUpCards),
  gameDecks: many(gameDecks),
}));

export const headsUpCardsRelations = relations(headsUpCards, ({ one }) => ({
  deck: one(headsUpDecks, {
    fields: [headsUpCards.deckId],
    references: [headsUpDecks.id],
  }),
}));

export const doubleDipPairsRelations = relations(doubleDipPairs, ({ many }) => ({
  dailySets: many(doubleDipDailySets),
}));

export const doubleDipDailySetsRelations = relations(doubleDipDailySets, ({ one, many }) => ({
  pair: one(doubleDipPairs, {
    fields: [doubleDipDailySets.pairId],
    references: [doubleDipPairs.id],
  }),
  answers: many(doubleDipAnswers),
}));

export const doubleDipAnswersRelations = relations(doubleDipAnswers, ({ one, many }) => ({
  dailySet: one(doubleDipDailySets, {
    fields: [doubleDipAnswers.dailySetId],
    references: [doubleDipDailySets.id],
  }),
  question: one(doubleDipQuestions, {
    fields: [doubleDipAnswers.questionId],
    references: [doubleDipQuestions.id],
  }),
  reactions: many(doubleDipReactions),
}));

export const doubleDipReactionsRelations = relations(doubleDipReactions, ({ one }) => ({
  answer: one(doubleDipAnswers, {
    fields: [doubleDipReactions.answerId],
    references: [doubleDipAnswers.id],
  }),
}));

export const doubleDipMilestonesRelations = relations(doubleDipMilestones, ({ one }) => ({
  pair: one(doubleDipPairs, {
    fields: [doubleDipMilestones.pairId],
    references: [doubleDipPairs.id],
  }),
  dailySet: one(doubleDipDailySets, {
    fields: [doubleDipMilestones.dailySetId],
    references: [doubleDipDailySets.id],
  }),
}));

export const doubleDipFavoritesRelations = relations(doubleDipFavorites, ({ one }) => ({
  pair: one(doubleDipPairs, {
    fields: [doubleDipFavorites.pairId],
    references: [doubleDipPairs.id],
  }),
  answer: one(doubleDipAnswers, {
    fields: [doubleDipFavorites.answerId],
    references: [doubleDipAnswers.id],
  }),
}));

export const boardsRelations = relations(boards, ({ many }) => ({
  boardCategories: many(boardCategories),
  gameBoards: many(gameBoards),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  boardCategories: many(boardCategories),
  questions: many(questions),
}));

export const boardCategoriesRelations = relations(boardCategories, ({ one }) => ({
  board: one(boards, {
    fields: [boardCategories.boardId],
    references: [boards.id],
  }),
  category: one(categories, {
    fields: [boardCategories.categoryId],
    references: [categories.id],
  }),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  category: one(categories, {
    fields: [questions.categoryId],
    references: [categories.id],
  }),
}));

export const insertBoardSchema = createInsertSchema(boards).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true }).extend({
  sourceGroup: z.enum(SOURCE_GROUPS).nullable().optional(),
});
export const insertBoardCategorySchema = createInsertSchema(boardCategories).omit({ id: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertGameSchema = createInsertSchema(games).omit({ id: true, createdAt: true });
export const insertGameBoardSchema = createInsertSchema(gameBoards).omit({ id: true });
export const insertHeadsUpDeckSchema = createInsertSchema(headsUpDecks).omit({ id: true });
export const insertHeadsUpCardSchema = createInsertSchema(headsUpCards).omit({ id: true });
export const insertGameDeckSchema = createInsertSchema(gameDecks).omit({ id: true });
export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionPlayerSchema = createInsertSchema(sessionPlayers).omit({ id: true, joinedAt: true, lastSeenAt: true });
export const insertSessionCompletedQuestionSchema = createInsertSchema(sessionCompletedQuestions).omit({ id: true, completedAt: true });
export const insertGameTypeSchema = createInsertSchema(gameTypes).omit({ id: true, createdAt: true });
export const insertDoubleDipPairSchema = createInsertSchema(doubleDipPairs).omit({ id: true, createdAt: true });
export const insertDoubleDipQuestionSchema = createInsertSchema(doubleDipQuestions).omit({ id: true, createdAt: true });
export const insertDoubleDipDailySetSchema = createInsertSchema(doubleDipDailySets).omit({ id: true, createdAt: true });
export const insertDoubleDipAnswerSchema = createInsertSchema(doubleDipAnswers).omit({ id: true, createdAt: true });
export const insertDoubleDipReactionSchema = createInsertSchema(doubleDipReactions).omit({ id: true, createdAt: true });
export const insertDoubleDipMilestoneSchema = createInsertSchema(doubleDipMilestones).omit({ id: true, createdAt: true });
export const insertDoubleDipFavoriteSchema = createInsertSchema(doubleDipFavorites).omit({ id: true, createdAt: true });
export const insertDoubleDipWeeklyStakeSchema = createInsertSchema(doubleDipWeeklyStakes).omit({ id: true, createdAt: true });
export const insertSequenceQuestionSchema = createInsertSchema(sequenceQuestions).omit({ id: true, createdAt: true });
export const insertSequenceSessionSchema = createInsertSchema(sequenceSessions).omit({ id: true, createdAt: true });
export const insertSequenceSubmissionSchema = createInsertSchema(sequenceSubmissions).omit({ id: true, submittedAt: true });
export const insertPsyopQuestionSchema = createInsertSchema(psyopQuestions).omit({ id: true, createdAt: true });
export const insertPsyopSessionSchema = createInsertSchema(psyopSessions).omit({ id: true, createdAt: true });
export const insertPsyopRoundSchema = createInsertSchema(psyopRounds).omit({ id: true, createdAt: true });
export const insertPsyopSubmissionSchema = createInsertSchema(psyopSubmissions).omit({ id: true, submittedAt: true });
export const insertPsyopVoteSchema = createInsertSchema(psyopVotes).omit({ id: true, submittedAt: true });
export const insertTimeWarpQuestionSchema = createInsertSchema(timeWarpQuestions).omit({ id: true, createdAt: true });

export type Board = typeof boards.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type BoardCategory = typeof boardCategories.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GameBoard = typeof gameBoards.$inferSelect;
export type HeadsUpDeck = typeof headsUpDecks.$inferSelect;
export type HeadsUpCard = typeof headsUpCards.$inferSelect;
export type GameDeck = typeof gameDecks.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type SessionPlayer = typeof sessionPlayers.$inferSelect;
export type SessionCompletedQuestion = typeof sessionCompletedQuestions.$inferSelect;
export type GameType = typeof gameTypes.$inferSelect;
export type DoubleDipPair = typeof doubleDipPairs.$inferSelect;
export type DoubleDipQuestion = typeof doubleDipQuestions.$inferSelect;
export type DoubleDipDailySet = typeof doubleDipDailySets.$inferSelect;
export type DoubleDipAnswer = typeof doubleDipAnswers.$inferSelect;
export type DoubleDipReaction = typeof doubleDipReactions.$inferSelect;
export type DoubleDipMilestone = typeof doubleDipMilestones.$inferSelect;
export type DoubleDipFavorite = typeof doubleDipFavorites.$inferSelect;
export type DoubleDipWeeklyStake = typeof doubleDipWeeklyStakes.$inferSelect;
export type InsertDoubleDipWeeklyStake = z.infer<typeof insertDoubleDipWeeklyStakeSchema>;
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertBoardCategory = z.infer<typeof insertBoardCategorySchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type InsertGameBoard = z.infer<typeof insertGameBoardSchema>;
export type InsertHeadsUpDeck = z.infer<typeof insertHeadsUpDeckSchema>;
export type InsertHeadsUpCard = z.infer<typeof insertHeadsUpCardSchema>;
export type InsertGameDeck = z.infer<typeof insertGameDeckSchema>;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type InsertSessionPlayer = z.infer<typeof insertSessionPlayerSchema>;
export type InsertSessionCompletedQuestion = z.infer<typeof insertSessionCompletedQuestionSchema>;
export type InsertGameType = z.infer<typeof insertGameTypeSchema>;
export type InsertDoubleDipPair = z.infer<typeof insertDoubleDipPairSchema>;
export type InsertDoubleDipQuestion = z.infer<typeof insertDoubleDipQuestionSchema>;
export type InsertDoubleDipDailySet = z.infer<typeof insertDoubleDipDailySetSchema>;
export type InsertDoubleDipAnswer = z.infer<typeof insertDoubleDipAnswerSchema>;
export type InsertDoubleDipReaction = z.infer<typeof insertDoubleDipReactionSchema>;
export type InsertDoubleDipMilestone = z.infer<typeof insertDoubleDipMilestoneSchema>;
export type InsertDoubleDipFavorite = z.infer<typeof insertDoubleDipFavoriteSchema>;
export type SequenceQuestion = typeof sequenceQuestions.$inferSelect;
export type SequenceSession = typeof sequenceSessions.$inferSelect;
export type SequenceSubmission = typeof sequenceSubmissions.$inferSelect;
export type InsertSequenceQuestion = z.infer<typeof insertSequenceQuestionSchema>;
export type InsertSequenceSession = z.infer<typeof insertSequenceSessionSchema>;
export type InsertSequenceSubmission = z.infer<typeof insertSequenceSubmissionSchema>;
export type PsyopQuestion = typeof psyopQuestions.$inferSelect;
export type PsyopSession = typeof psyopSessions.$inferSelect;
export type PsyopRound = typeof psyopRounds.$inferSelect;
export type PsyopSubmission = typeof psyopSubmissions.$inferSelect;
export type PsyopVote = typeof psyopVotes.$inferSelect;
export type InsertPsyopQuestion = z.infer<typeof insertPsyopQuestionSchema>;
export type InsertPsyopSession = z.infer<typeof insertPsyopSessionSchema>;
export type InsertPsyopRound = z.infer<typeof insertPsyopRoundSchema>;
export type InsertPsyopSubmission = z.infer<typeof insertPsyopSubmissionSchema>;
export type InsertPsyopVote = z.infer<typeof insertPsyopVoteSchema>;
export type TimeWarpQuestion = typeof timeWarpQuestions.$inferSelect;
export type InsertTimeWarpQuestion = z.infer<typeof insertTimeWarpQuestionSchema>;

// Meme No Harm insert schemas
export const insertMemePromptSchema = createInsertSchema(memePrompts).omit({ id: true, createdAt: true });
export const insertMemeImageSchema = createInsertSchema(memeImages).omit({ id: true, createdAt: true });
export const insertMemeSessionSchema = createInsertSchema(memeSessions).omit({ id: true, createdAt: true });
export const insertMemePlayerSchema = createInsertSchema(memePlayers).omit({ id: true, createdAt: true });
export const insertMemeRoundSchema = createInsertSchema(memeRounds).omit({ id: true, createdAt: true });
export const insertMemeSubmissionSchema = createInsertSchema(memeSubmissions).omit({ id: true, createdAt: true });
export const insertMemeVoteSchema = createInsertSchema(memeVotes).omit({ id: true, createdAt: true });

// Meme No Harm types
export type MemePrompt = typeof memePrompts.$inferSelect;
export type MemeImage = typeof memeImages.$inferSelect;
export type MemeSession = typeof memeSessions.$inferSelect;
export type MemePlayer = typeof memePlayers.$inferSelect;
export type MemeRound = typeof memeRounds.$inferSelect;
export type MemeSubmission = typeof memeSubmissions.$inferSelect;
export type MemeVote = typeof memeVotes.$inferSelect;
export type InsertMemePrompt = z.infer<typeof insertMemePromptSchema>;
export type InsertMemeImage = z.infer<typeof insertMemeImageSchema>;
export type InsertMemeSession = z.infer<typeof insertMemeSessionSchema>;
export type InsertMemePlayer = z.infer<typeof insertMemePlayerSchema>;
export type InsertMemeRound = z.infer<typeof insertMemeRoundSchema>;
export type InsertMemeSubmission = z.infer<typeof insertMemeSubmissionSchema>;
export type InsertMemeVote = z.infer<typeof insertMemeVoteSchema>;

export type BoardCategoryWithCategory = BoardCategory & { category: Category };
export type BoardCategoryWithCount = BoardCategoryWithCategory & { questionCount: number; position: number };
export type BoardCategoryWithQuestions = BoardCategory & { category: Category; questions: Question[] };

export type GameWithBoards = Game & { boards: Board[] };
export type GameWithDecks = Game & { decks: HeadsUpDeck[] };
export type HeadsUpDeckWithCards = HeadsUpDeck & { cards: HeadsUpCard[] };
export type HeadsUpDeckWithCardCount = HeadsUpDeck & { cardCount: number };
export type GameSessionWithPlayers = GameSession & { players: SessionPlayer[] };
export type GameSessionWithDetails = GameSession & { 
  players: SessionPlayer[]; 
  boardName?: string;
  playedCategories?: { id: number; name: string }[];
};
export type GameSessionFull = GameSession & { 
  players: SessionPlayer[]; 
  completedQuestions: number[];
  currentBoard?: Board | null;
};

export type VerifyAnswerRequest = {
  questionId: number;
  answer: string;
};

export type VerifyAnswerResponse = {
  correct: boolean;
  correctAnswer: string;
  points: number;
};

// Admin Announcements table for broadcasts
export const adminAnnouncements = pgTable("admin_announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().$type<"info" | "warning" | "success">().default("info"),
  createdBy: text("created_by").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminAnnouncementSchema = createInsertSchema(adminAnnouncements).omit({ id: true, createdAt: true });
export type AdminAnnouncement = typeof adminAnnouncements.$inferSelect;
export type InsertAdminAnnouncement = z.infer<typeof insertAdminAnnouncementSchema>;
