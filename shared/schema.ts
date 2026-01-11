import { pgTable, text, serial, integer, jsonb, boolean, unique, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Auth exports (required for Replit Auth)
export * from "./models/auth";

// === TABLE DEFINITIONS ===
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

// Game mode enum values
export const GAME_MODES = ["jeopardy", "heads_up"] as const;
export type GameMode = typeof GAME_MODES[number];

// Games table - container for different game types
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  mode: text("mode").notNull().$type<GameMode>().default("jeopardy"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Junction table linking games to boards (for Jeopardy mode with multiple boards)
export const gameBoards = pgTable("game_boards", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  boardId: integer("board_id").notNull(),
  position: integer("position").notNull().default(0),
}, (table) => [
  unique().on(table.gameId, table.boardId),
]);

// Heads Up decks (like categories for the forehead guessing game)
export const headsUpDecks = pgTable("heads_up_decks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  timerSeconds: integer("timer_seconds").notNull().default(60),
});

// Heads Up cards (prompts to guess in Heads Up mode)
export const headsUpCards = pgTable("heads_up_cards", {
  id: serial("id").primaryKey(),
  deckId: integer("deck_id").notNull(),
  prompt: text("prompt").notNull(),
  hints: jsonb("hints").$type<string[]>().default([]),
});

// Junction table linking games to heads up decks
export const gameDecks = pgTable("game_decks", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  deckId: integer("deck_id").notNull(),
  position: integer("position").notNull().default(0),
}, (table) => [
  unique().on(table.gameId, table.deckId),
]);

// === RELATIONS ===
export const gamesRelations = relations(games, ({ many }) => ({
  gameBoards: many(gameBoards),
  gameDecks: many(gameDecks),
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

// === BASE SCHEMAS ===
export const insertBoardSchema = createInsertSchema(boards).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertBoardCategorySchema = createInsertSchema(boardCategories).omit({ id: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertGameSchema = createInsertSchema(games).omit({ id: true, createdAt: true });
export const insertGameBoardSchema = createInsertSchema(gameBoards).omit({ id: true });
export const insertHeadsUpDeckSchema = createInsertSchema(headsUpDecks).omit({ id: true });
export const insertHeadsUpCardSchema = createInsertSchema(headsUpCards).omit({ id: true });
export const insertGameDeckSchema = createInsertSchema(gameDecks).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===
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
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertBoardCategory = z.infer<typeof insertBoardCategorySchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type InsertGameBoard = z.infer<typeof insertGameBoardSchema>;
export type InsertHeadsUpDeck = z.infer<typeof insertHeadsUpDeckSchema>;
export type InsertHeadsUpCard = z.infer<typeof insertHeadsUpCardSchema>;
export type InsertGameDeck = z.infer<typeof insertGameDeckSchema>;

// Extended types for UI
export type BoardCategoryWithCategory = BoardCategory & { category: Category };
export type BoardCategoryWithCount = BoardCategoryWithCategory & { questionCount: number; position: number };
export type BoardCategoryWithQuestions = BoardCategory & { category: Category; questions: Question[] };

// Game extended types
export type GameWithBoards = Game & { boards: Board[] };
export type GameWithDecks = Game & { decks: HeadsUpDeck[] };
export type HeadsUpDeckWithCards = HeadsUpDeck & { cards: HeadsUpCard[] };
export type HeadsUpDeckWithCardCount = HeadsUpDeck & { cardCount: number };

// Request types
export type VerifyAnswerRequest = {
  questionId: number;
  answer: string;
};

// Response types
export type VerifyAnswerResponse = {
  correct: boolean;
  correctAnswer: string;
  points: number;
};
