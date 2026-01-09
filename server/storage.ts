import { db } from "./db";
import { boards, categories, questions, type Board, type InsertBoard, type Category, type InsertCategory, type Question, type InsertQuestion } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

export interface IStorage {
  getBoards(): Promise<Board[]>;
  getBoard(id: number): Promise<Board | undefined>;
  createBoard(board: InsertBoard): Promise<Board>;
  updateBoard(id: number, data: Partial<InsertBoard>): Promise<Board | undefined>;
  deleteBoard(id: number): Promise<boolean>;
  getCategories(): Promise<Category[]>;
  getCategoriesByBoard(boardId: number | null): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getQuestionsByCategory(categoryId: number): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: number, data: Partial<InsertQuestion>): Promise<Question | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  deleteQuestion(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getBoards(): Promise<Board[]> {
    return await db.select().from(boards);
  }

  async getBoard(id: number): Promise<Board | undefined> {
    const [board] = await db.select().from(boards).where(eq(boards.id, id));
    return board;
  }

  async createBoard(board: InsertBoard): Promise<Board> {
    const [newBoard] = await db.insert(boards).values(board as any).returning();
    return newBoard;
  }

  async updateBoard(id: number, data: Partial<InsertBoard>): Promise<Board | undefined> {
    const [updated] = await db.update(boards).set(data as any).where(eq(boards.id, id)).returning();
    return updated;
  }

  async deleteBoard(id: number): Promise<boolean> {
    const boardCategories = await db.select().from(categories).where(eq(categories.boardId, id));
    for (const cat of boardCategories) {
      await db.delete(questions).where(eq(questions.categoryId, cat.id));
    }
    await db.delete(categories).where(eq(categories.boardId, id));
    const result = await db.delete(boards).where(eq(boards.id, id)).returning();
    return result.length > 0;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategoriesByBoard(boardId: number | null): Promise<Category[]> {
    if (boardId === null) {
      return await db.select().from(categories).where(isNull(categories.boardId));
    }
    return await db.select().from(categories).where(eq(categories.boardId, boardId));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getQuestionsByCategory(categoryId: number): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.categoryId, categoryId));
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return updated;
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db.insert(questions).values(question as any).returning();
    return newQuestion;
  }

  async updateQuestion(id: number, data: Partial<InsertQuestion>): Promise<Question | undefined> {
    const [updated] = await db.update(questions).set(data as any).where(eq(questions.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    await db.delete(questions).where(eq(questions.categoryId, id));
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  async deleteQuestion(id: number): Promise<boolean> {
    const result = await db.delete(questions).where(eq(questions.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
