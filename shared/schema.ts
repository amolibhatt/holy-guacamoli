import { pgTable, text, serial, integer, jsonb, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===
export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  pointValues: jsonb("point_values").$type<number[]>().notNull().default([10, 20, 30, 40, 50]),
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

// === RELATIONS ===
export const boardsRelations = relations(boards, ({ many }) => ({
  boardCategories: many(boardCategories),
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

// === EXPLICIT API CONTRACT TYPES ===
export type Board = typeof boards.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type BoardCategory = typeof boardCategories.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertBoardCategory = z.infer<typeof insertBoardCategorySchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

// Extended types for UI
export type BoardCategoryWithCategory = BoardCategory & { category: Category };
export type BoardCategoryWithCount = BoardCategoryWithCategory & { questionCount: number };
export type BoardCategoryWithQuestions = BoardCategory & { category: Category; questions: Question[] };

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
