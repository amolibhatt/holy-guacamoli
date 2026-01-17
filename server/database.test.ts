import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { categories, boards, boardCategories, questions, gameSessions, sessionPlayers } from "../shared/schema";
import { eq, inArray, sql, and } from "drizzle-orm";

describe("Database Integrity Tests", () => {
  const cleanupIds: { 
    categories: number[]; 
    boards: number[]; 
    boardCategories: number[]; 
    questions: number[];
    sessions: number[];
    players: number[];
  } = {
    categories: [],
    boards: [],
    boardCategories: [],
    questions: [],
    sessions: [],
    players: [],
  };

  afterEach(async () => {
    if (cleanupIds.players.length > 0) {
      await db.delete(sessionPlayers).where(inArray(sessionPlayers.id, cleanupIds.players));
      cleanupIds.players = [];
    }
    if (cleanupIds.sessions.length > 0) {
      await db.delete(gameSessions).where(inArray(gameSessions.id, cleanupIds.sessions));
      cleanupIds.sessions = [];
    }
    if (cleanupIds.questions.length > 0) {
      await db.delete(questions).where(inArray(questions.id, cleanupIds.questions));
      cleanupIds.questions = [];
    }
    if (cleanupIds.boardCategories.length > 0) {
      await db.delete(boardCategories).where(inArray(boardCategories.id, cleanupIds.boardCategories));
      cleanupIds.boardCategories = [];
    }
    if (cleanupIds.categories.length > 0) {
      await db.delete(categories).where(inArray(categories.id, cleanupIds.categories));
      cleanupIds.categories = [];
    }
    if (cleanupIds.boards.length > 0) {
      await db.delete(boards).where(inArray(boards.id, cleanupIds.boards));
      cleanupIds.boards = [];
    }
  });

  describe("Referential Integrity", () => {
    it("boardCategories should reference valid boards", async () => {
      const orphanedBCs = await db.select()
        .from(boardCategories)
        .leftJoin(boards, eq(boardCategories.boardId, boards.id))
        .where(sql`${boards.id} IS NULL`);
      
      expect(orphanedBCs.length).toBe(0);
    });

    it("boardCategories should reference valid categories", async () => {
      const orphanedBCs = await db.select()
        .from(boardCategories)
        .leftJoin(categories, eq(boardCategories.categoryId, categories.id))
        .where(sql`${categories.id} IS NULL`);
      
      expect(orphanedBCs.length).toBe(0);
    });

    it("questions should reference valid boardCategories", async () => {
      const orphanedQs = await db.select()
        .from(questions)
        .leftJoin(boardCategories, eq(questions.boardCategoryId, boardCategories.id))
        .where(sql`${boardCategories.id} IS NULL`);
      
      expect(orphanedQs.length).toBe(0);
    });

    it("sessionPlayers should reference valid sessions", async () => {
      const orphanedPlayers = await db.select()
        .from(sessionPlayers)
        .leftJoin(gameSessions, eq(sessionPlayers.sessionId, gameSessions.id))
        .where(sql`${gameSessions.id} IS NULL`);
      
      expect(orphanedPlayers.length).toBe(0);
    });
  });

  describe("Data Constraints", () => {
    it("category names should not be empty", async () => {
      const emptyNames = await db.select()
        .from(categories)
        .where(sql`${categories.name} = '' OR ${categories.name} IS NULL`);
      
      expect(emptyNames.length).toBe(0);
    });

    it("board names should not be empty", async () => {
      const emptyNames = await db.select()
        .from(boards)
        .where(sql`${boards.name} = '' OR ${boards.name} IS NULL`);
      
      expect(emptyNames.length).toBe(0);
    });

    it("question points should be positive", async () => {
      const invalidPoints = await db.select()
        .from(questions)
        .where(sql`${questions.points} <= 0`);
      
      expect(invalidPoints.length).toBe(0);
    });

    it("questions should have valid point values", async () => {
      const validPoints = [10, 20, 30, 40, 50];
      const allQuestions = await db.select().from(questions);
      
      for (const q of allQuestions) {
        expect(validPoints).toContain(q.points);
      }
    });
  });

  describe("Unique Constraints", () => {
    it("room codes should be unique for sessions", async () => {
      const activeSessions = await db.select()
        .from(gameSessions);
      
      const roomCodes = activeSessions.map(s => s.code);
      const uniqueCodes = new Set(roomCodes);
      
      expect(uniqueCodes.size).toBe(roomCodes.length);
    });

    it("board-category pairs should be unique", async () => {
      const allBCs = await db.select().from(boardCategories);
      
      const pairs = allBCs.map(bc => `${bc.boardId}-${bc.categoryId}`);
      const uniquePairs = new Set(pairs);
      
      expect(uniquePairs.size).toBe(pairs.length);
    });
  });

  describe("Cascade Operations", () => {
    it("should handle board deletion with categories", async () => {
      const [board] = await db.insert(boards).values({
        name: "Cascade Test Board",
        description: "Test",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "Cascade Test Category",
        description: "Test",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      const [bc] = await db.insert(boardCategories).values({
        boardId: board.id,
        categoryId: cat.id,
        position: 0,
      }).returning();
      cleanupIds.boardCategories.push(bc.id);

      await db.delete(boardCategories).where(eq(boardCategories.id, bc.id));
      cleanupIds.boardCategories = [];

      const remainingBCs = await db.select()
        .from(boardCategories)
        .where(eq(boardCategories.id, bc.id));
      
      expect(remainingBCs.length).toBe(0);
    });

    it("should handle question deletion from board category", async () => {
      const [board] = await db.insert(boards).values({
        name: "Question Delete Test",
        description: "Test",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "Question Delete Cat",
        description: "Test",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      const [bc] = await db.insert(boardCategories).values({
        boardId: board.id,
        categoryId: cat.id,
        position: 0,
      }).returning();
      cleanupIds.boardCategories.push(bc.id);

      const [q] = await db.insert(questions).values({
        boardCategoryId: bc.id,
        question: "Test?",
        options: ["Yes", "No"],
        correctAnswer: "Yes",
        points: 10,
      }).returning();
      cleanupIds.questions.push(q.id);

      await db.delete(questions).where(eq(questions.id, q.id));
      cleanupIds.questions = [];

      const remainingQs = await db.select()
        .from(questions)
        .where(eq(questions.id, q.id));
      
      expect(remainingQs.length).toBe(0);
    });
  });

  describe("Transaction Safety", () => {
    it("should handle concurrent inserts", async () => {
      const insertPromises = Array(5).fill(null).map((_, i) => 
        db.insert(categories).values({
          name: `Concurrent Cat ${i}`,
          description: "Test",
          imageUrl: "/test.png",
          isActive: false,
        }).returning()
      );

      const results = await Promise.all(insertPromises);
      results.forEach(r => cleanupIds.categories.push(r[0].id));

      expect(results.length).toBe(5);
      const ids = results.map(r => r[0].id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it("should handle concurrent updates", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Concurrent Update Cat",
        description: "Original",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      const updatePromises = Array(10).fill(null).map((_, i) => 
        db.update(categories)
          .set({ description: `Update ${i}` })
          .where(eq(categories.id, cat.id))
      );

      await Promise.all(updatePromises);

      const [final] = await db.select()
        .from(categories)
        .where(eq(categories.id, cat.id));
      
      expect(final.description).toMatch(/Update \d/);
    });
  });

  describe("JSONB Column Integrity", () => {
    it("board pointValues should be valid arrays", async () => {
      const allBoards = await db.select().from(boards);
      
      for (const board of allBoards) {
        expect(Array.isArray(board.pointValues)).toBe(true);
        for (const pv of board.pointValues) {
          expect(typeof pv).toBe("number");
        }
      }
    });

    it("question options should be valid arrays when present", async () => {
      const allQuestions = await db.select().from(questions);
      
      for (const q of allQuestions) {
        if (q.options) {
          expect(Array.isArray(q.options)).toBe(true);
        }
      }
    });
  });

  describe("NULL Handling", () => {
    it("should handle null sourceGroup", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Null Source Group",
        description: "Test",
        imageUrl: "/test.png",
        isActive: false,
        sourceGroup: null,
      }).returning();
      cleanupIds.categories.push(cat.id);

      expect(cat.sourceGroup).toBeNull();
    });

    it("should handle null rule", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Null Rule",
        description: "Test",
        imageUrl: "/test.png",
        isActive: false,
        rule: null,
      }).returning();
      cleanupIds.categories.push(cat.id);

      expect(cat.rule).toBeNull();
    });

    it("should handle null userId on board", async () => {
      const [board] = await db.insert(boards).values({
        name: "Null User Board",
        description: "Test",
        pointValues: [10, 20, 30, 40, 50],
        userId: null,
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.userId).toBeNull();
    });
  });
});
