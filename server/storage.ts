import { db } from "./db";
import { boards, categories, boardCategories, questions, type Board, type InsertBoard, type Category, type InsertCategory, type BoardCategory, type InsertBoardCategory, type Question, type InsertQuestion, type BoardCategoryWithCategory, type BoardCategoryWithCount, type BoardCategoryWithQuestions } from "@shared/schema";
import { eq, and, asc, count, inArray } from "drizzle-orm";

export interface IStorage {
  getBoards(): Promise<Board[]>;
  getBoard(id: number): Promise<Board | undefined>;
  createBoard(board: InsertBoard): Promise<Board>;
  updateBoard(id: number, data: Partial<InsertBoard>): Promise<Board | undefined>;
  deleteBoard(id: number): Promise<boolean>;
  
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  getBoardCategories(boardId: number): Promise<BoardCategoryWithCount[]>;
  getBoardCategory(id: number): Promise<BoardCategory | undefined>;
  getBoardCategoryByIds(boardId: number, categoryId: number): Promise<BoardCategory | undefined>;
  createBoardCategory(data: InsertBoardCategory): Promise<BoardCategory>;
  deleteBoardCategory(id: number): Promise<boolean>;
  
  getQuestionsByBoardCategory(boardCategoryId: number): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: number, data: Partial<InsertQuestion>): Promise<Question | undefined>;
  deleteQuestion(id: number): Promise<boolean>;
  
  getBoardWithCategoriesAndQuestions(boardId: number): Promise<BoardCategoryWithQuestions[]>;
  getBoardSummaries(): Promise<{ id: number; name: string; categoryCount: number; categories: { id: number; name: string; questionCount: number; remaining: number }[] }[]>;
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
    const bcs = await db.select().from(boardCategories).where(eq(boardCategories.boardId, id));
    for (const bc of bcs) {
      await db.delete(questions).where(eq(questions.boardCategoryId, bc.id));
    }
    await db.delete(boardCategories).where(eq(boardCategories.boardId, id));
    const result = await db.delete(boards).where(eq(boards.id, id)).returning();
    return result.length > 0;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const bcs = await db.select().from(boardCategories).where(eq(boardCategories.categoryId, id));
    for (const bc of bcs) {
      await db.delete(questions).where(eq(questions.boardCategoryId, bc.id));
    }
    await db.delete(boardCategories).where(eq(boardCategories.categoryId, id));
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  async getBoardCategories(boardId: number): Promise<BoardCategoryWithCount[]> {
    const result = await db
      .select({
        id: boardCategories.id,
        boardId: boardCategories.boardId,
        categoryId: boardCategories.categoryId,
        category: categories,
      })
      .from(boardCategories)
      .innerJoin(categories, eq(boardCategories.categoryId, categories.id))
      .where(eq(boardCategories.boardId, boardId));
    
    if (result.length === 0) return [];
    
    const bcIds = result.map(r => r.id);
    const counts = await db
      .select({ 
        boardCategoryId: questions.boardCategoryId, 
        count: count() 
      })
      .from(questions)
      .where(inArray(questions.boardCategoryId, bcIds))
      .groupBy(questions.boardCategoryId);
    
    const countMap = new Map(counts.map(c => [c.boardCategoryId, c.count]));
    
    return result.map(r => ({
      id: r.id,
      boardId: r.boardId,
      categoryId: r.categoryId,
      category: r.category,
      questionCount: countMap.get(r.id) || 0,
    }));
  }

  async getBoardCategory(id: number): Promise<BoardCategory | undefined> {
    const [bc] = await db.select().from(boardCategories).where(eq(boardCategories.id, id));
    return bc;
  }

  async getBoardCategoryByIds(boardId: number, categoryId: number): Promise<BoardCategory | undefined> {
    const [bc] = await db.select().from(boardCategories)
      .where(and(eq(boardCategories.boardId, boardId), eq(boardCategories.categoryId, categoryId)));
    return bc;
  }

  async createBoardCategory(data: InsertBoardCategory): Promise<BoardCategory> {
    const [newBc] = await db.insert(boardCategories).values(data).returning();
    return newBc;
  }

  async deleteBoardCategory(id: number): Promise<boolean> {
    await db.delete(questions).where(eq(questions.boardCategoryId, id));
    const result = await db.delete(boardCategories).where(eq(boardCategories.id, id)).returning();
    return result.length > 0;
  }

  async getQuestionsByBoardCategory(boardCategoryId: number): Promise<Question[]> {
    return await db.select().from(questions)
      .where(eq(questions.boardCategoryId, boardCategoryId))
      .orderBy(asc(questions.points));
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db.insert(questions).values(question as any).returning();
    return newQuestion;
  }

  async updateQuestion(id: number, data: Partial<InsertQuestion>): Promise<Question | undefined> {
    const [updated] = await db.update(questions).set(data as any).where(eq(questions.id, id)).returning();
    return updated;
  }

  async deleteQuestion(id: number): Promise<boolean> {
    const result = await db.delete(questions).where(eq(questions.id, id)).returning();
    return result.length > 0;
  }

  async getBoardWithCategoriesAndQuestions(boardId: number): Promise<BoardCategoryWithQuestions[]> {
    const bcs = await this.getBoardCategories(boardId);
    const result: BoardCategoryWithQuestions[] = [];
    
    for (const bc of bcs) {
      const qs = await this.getQuestionsByBoardCategory(bc.id);
      result.push({
        ...bc,
        questions: qs,
      });
    }
    
    return result;
  }

  async getBoardSummaries(): Promise<{ id: number; name: string; categoryCount: number; categories: { id: number; name: string; questionCount: number; remaining: number }[] }[]> {
    const allBoards = await this.getBoards();
    const summaries = [];
    
    for (const board of allBoards) {
      const bcs = await this.getBoardCategories(board.id);
      summaries.push({
        id: board.id,
        name: board.name,
        categoryCount: bcs.length,
        categories: bcs.map(bc => ({
          id: bc.category.id,
          name: bc.category.name,
          questionCount: bc.questionCount,
          remaining: 5 - bc.questionCount,
        })),
      });
    }
    
    return summaries;
  }
}

export const storage = new DatabaseStorage();
