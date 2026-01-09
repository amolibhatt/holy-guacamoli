import { pgTable, text, serial, integer, jsonb, boolean } from "drizzle-orm/pg-core";
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
  boardId: integer("board_id"),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: text("correct_answer").notNull(),
  points: integer("points").notNull(), // 10-100
});

// === RELATIONS ===
export const boardsRelations = relations(boards, ({ many }) => ({
  categories: many(categories),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  board: one(boards, {
    fields: [categories.boardId],
    references: [boards.id],
  }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  category: one(categories, {
    fields: [questions.categoryId],
    references: [categories.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertBoardSchema = createInsertSchema(boards).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Board = typeof boards.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

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
