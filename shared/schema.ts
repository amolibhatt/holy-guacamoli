import { pgTable, text, serial, integer, jsonb, boolean, unique, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

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
