import { pgTable, text, serial, integer, jsonb, boolean, unique, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

// Game Types Catalog - defines available games with visibility controls
export const gameTypes = pgTable("game_types", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("gamepad"),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const doubleDipQuestions = pgTable("double_dip_questions", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().$type<DoubleDipCategory>(),
  questionText: text("question_text").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const doubleDipDailySets = pgTable("double_dip_daily_sets", {
  id: serial("id").primaryKey(),
  pairId: integer("pair_id").notNull(),
  dateKey: text("date_key").notNull(),
  questionIds: jsonb("question_ids").$type<number[]>().notNull(),
  userACompleted: boolean("user_a_completed").notNull().default(false),
  userBCompleted: boolean("user_b_completed").notNull().default(false),
  revealed: boolean("revealed").notNull().default(false),
  followupTask: text("followup_task"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.pairId, table.dateKey),
]);

export const doubleDipAnswers = pgTable("double_dip_answers", {
  id: serial("id").primaryKey(),
  dailySetId: integer("daily_set_id").notNull(),
  questionId: integer("question_id").notNull(),
  userId: text("user_id").notNull(),
  answerText: text("answer_text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.dailySetId, table.questionId, table.userId),
]);

export const doubleDipReactions = pgTable("double_dip_reactions", {
  id: serial("id").primaryKey(),
  answerId: integer("answer_id").notNull(),
  userId: text("user_id").notNull(),
  reaction: text("reaction").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.answerId, table.userId),
]);

export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  description: text("description"),
  pointValues: jsonb("point_values").$type<number[]>().notNull().default([10, 20, 30, 40, 50]),
  theme: text("theme").notNull().default("birthday"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
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
  boardCategoryId: integer("board_category_id").notNull(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: text("correct_answer").notNull(),
  points: integer("points").notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const GAME_MODES = ["jeopardy", "heads_up", "board"] as const;
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

export const boardsRelations = relations(boards, ({ many }) => ({
  boardCategories: many(boardCategories),
  gameBoards: many(gameBoards),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  boardCategories: many(boardCategories),
}));

export const boardCategoriesRelations = relations(boardCategories, ({ one, many }) => ({
  board: one(boards, {
    fields: [boardCategories.boardId],
    references: [boards.id],
  }),
  category: one(categories, {
    fields: [boardCategories.categoryId],
    references: [categories.id],
  }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  boardCategory: one(boardCategories, {
    fields: [questions.boardCategoryId],
    references: [boardCategories.id],
  }),
}));

export const insertBoardSchema = createInsertSchema(boards).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
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

export type BoardCategoryWithCategory = BoardCategory & { category: Category };
export type BoardCategoryWithCount = BoardCategoryWithCategory & { questionCount: number; position: number };
export type BoardCategoryWithQuestions = BoardCategory & { category: Category; questions: Question[] };

export type GameWithBoards = Game & { boards: Board[] };
export type GameWithDecks = Game & { decks: HeadsUpDeck[] };
export type HeadsUpDeckWithCards = HeadsUpDeck & { cards: HeadsUpCard[] };
export type HeadsUpDeckWithCardCount = HeadsUpDeck & { cardCount: number };
export type GameSessionWithPlayers = GameSession & { players: SessionPlayer[] };
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
