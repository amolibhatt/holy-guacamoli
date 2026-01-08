import { db } from "./db";
import { categories, questions, type Category, type InsertCategory, type Question, type InsertQuestion } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getQuestionsByCategory(categoryId: number): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  deleteCategory(id: number): Promise<boolean>;
  deleteQuestion(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
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

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db.insert(questions).values(question).returning();
    return newQuestion;
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
