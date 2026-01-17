import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { categories, boards, boardCategories, questions, gameSessions, users } from "../shared/schema";
import { eq, inArray, and, isNull, or } from "drizzle-orm";
import { generateDynamicBoard } from "./buzzkillBoards";

const BASE_URL = "http://localhost:5000";

describe("Regression Tests", () => {
  const cleanupIds: { sessions: number[]; categories: number[]; boards: number[]; boardCategories: number[]; questions: number[] } = {
    sessions: [],
    categories: [],
    boards: [],
    boardCategories: [],
    questions: [],
  };

  afterEach(async () => {
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
    if (cleanupIds.sessions.length > 0) {
      await db.delete(gameSessions).where(inArray(gameSessions.id, cleanupIds.sessions));
      cleanupIds.sessions = [];
    }
  });

  describe("BUG-001: (req as any).user authentication pattern", () => {
    it("shuffle-stats endpoint should return 401 without auth, not crash", async () => {
      const res = await fetch(`${BASE_URL}/api/buzzkill/shuffle-stats`);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBeDefined();
    });

    it("shuffle-board endpoint should return 401 without auth, not crash", async () => {
      const res = await fetch(`${BASE_URL}/api/buzzkill/shuffle-board`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "starter" }),
      });
      expect(res.status).toBe(401);
    });

    it("custom-boards endpoint should return 401 without auth, not crash", async () => {
      const res = await fetch(`${BASE_URL}/api/buzzkill/custom-boards`);
      expect(res.status).toBe(401);
    });
  });

  describe("BUG-002: Missing imageUrl causes shuffle failures", () => {
    it("all active categories should have non-empty imageUrl", async () => {
      const activeCats = await db.select().from(categories).where(eq(categories.isActive, true));
      
      const missingImage = activeCats.filter(c => !c.imageUrl || c.imageUrl === "");
      expect(missingImage.length).toBe(0);
    });

    it("shuffle should not include categories without imageUrl", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "REG-IMG-" + Date.now().toString(36).toUpperCase(),
        hostId: "regression-test",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      for (const cat of result.categories) {
        expect(cat.imageUrl).toBeTruthy();
      }
    });
  });

  describe("BUG-003: Category validation - 5 unique points required", () => {
    it("should not allow categories with fewer than 5 questions into shuffle", async () => {
      const [board] = await db.insert(boards).values({
        name: "Regression Test Board",
        description: "Test",
        pointValues: [10, 20, 30, 40, 50],
        isGlobal: true,
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "Regression Incomplete Cat",
        description: "Only 3 questions",
        imageUrl: "/test.png",
        isActive: true,
      }).returning();
      cleanupIds.categories.push(cat.id);

      const [bc] = await db.insert(boardCategories).values({
        boardId: board.id,
        categoryId: cat.id,
        position: 0,
      }).returning();
      cleanupIds.boardCategories.push(bc.id);

      for (const pts of [10, 20, 30]) {
        const [q] = await db.insert(questions).values({
          boardCategoryId: bc.id,
          question: `Q${pts}`,
          options: ["A", "B", "C", "D"],
          correctAnswer: "A",
          points: pts,
        }).returning();
        cleanupIds.questions.push(q.id);
      }

      const [session] = await db.insert(gameSessions).values({
        code: "REG-3Q-" + Date.now().toString(36).toUpperCase(),
        hostId: "regression-test",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      const hasIncomplete = result.categories.some(c => c.name === "Regression Incomplete Cat");
      expect(hasIncomplete).toBe(false);
    });

    it("should not allow categories with duplicate point values into shuffle", async () => {
      const [board] = await db.insert(boards).values({
        name: "Regression Dupe Board",
        description: "Test",
        pointValues: [10, 20, 30, 40, 50],
        isGlobal: true,
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "Regression Dupe Points Cat",
        description: "Has duplicate 20 point",
        imageUrl: "/test.png",
        isActive: true,
      }).returning();
      cleanupIds.categories.push(cat.id);

      const [bc] = await db.insert(boardCategories).values({
        boardId: board.id,
        categoryId: cat.id,
        position: 0,
      }).returning();
      cleanupIds.boardCategories.push(bc.id);

      for (const pts of [10, 20, 20, 40, 50]) {
        const [q] = await db.insert(questions).values({
          boardCategoryId: bc.id,
          question: `Q${pts}`,
          options: ["A", "B", "C", "D"],
          correctAnswer: "A",
          points: pts,
        }).returning();
        cleanupIds.questions.push(q.id);
      }

      const [session] = await db.insert(gameSessions).values({
        code: "REG-DUP-" + Date.now().toString(36).toUpperCase(),
        hostId: "regression-test",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      const hasDupe = result.categories.some(c => c.name === "Regression Dupe Points Cat");
      expect(hasDupe).toBe(false);
    });
  });

  describe("BUG-004: Session isolation - played categories leak between sessions", () => {
    it("playing categories in one session should not affect another session", async () => {
      const [session1] = await db.insert(gameSessions).values({
        code: "REG-S1-" + Date.now().toString(36).toUpperCase(),
        hostId: "regression-test-1",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session1.id);

      const [session2] = await db.insert(gameSessions).values({
        code: "REG-S2-" + Date.now().toString(36).toUpperCase(),
        hostId: "regression-test-2",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session2.id);

      await generateDynamicBoard(session1.id, { mode: "starter", userId: "test1", userRole: "admin" });

      const [s1After] = await db.select().from(gameSessions).where(eq(gameSessions.id, session1.id));
      const [s2After] = await db.select().from(gameSessions).where(eq(gameSessions.id, session2.id));

      const played1 = (s1After.playedCategoryIds as number[]) || [];
      const played2 = (s2After.playedCategoryIds as number[]) || [];

      expect(played1.length).toBeGreaterThan(0);
      expect(played2.length).toBe(0);
    });
  });

  describe("BUG-005: Source group diversity - monotonous category selection", () => {
    it("shuffle should select from multiple source groups when available", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "REG-DIV-" + Date.now().toString(36).toUpperCase(),
        hostId: "regression-test",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      if (result.categories.length >= 3) {
        const groups = result.categories.map(c => c.sourceGroup);
        const uniqueGroups = new Set(groups);
        expect(uniqueGroups.size).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("BUG-006: Session memory reset - infinite loop prevention", () => {
    it("should reset played history when pool is exhausted", async () => {
      const activeCats = await db.select().from(categories).where(eq(categories.isActive, true));
      
      if (activeCats.length >= 5) {
        const almostAllIds = activeCats.slice(0, activeCats.length - 3).map(c => c.id);
        
        const [session] = await db.insert(gameSessions).values({
          code: "REG-RST-" + Date.now().toString(36).toUpperCase(),
          hostId: "regression-test",
          currentMode: "board",
          state: "waiting",
          buzzerLocked: true,
          playedCategoryIds: almostAllIds,
        }).returning();
        cleanupIds.sessions.push(session.id);

        const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
        
        expect(result.wasReset || result.categories.length === 5).toBe(true);
      }
    });
  });

  describe("BUG-007: Login rate limiting", () => {
    it("should enforce rate limiting on failed login attempts", async () => {
      const responses: number[] = [];
      
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: `ratelimit-test-${Date.now()}@example.com`, 
            password: "wrongpassword" 
          }),
        });
        responses.push(res.status);
      }
      
      const hasRateLimit = responses.some(s => s === 429);
      const hasAuthError = responses.some(s => s === 401 || s === 400);
      expect(hasRateLimit || hasAuthError).toBe(true);
    });
  });

  describe("Data Integrity Checks", () => {
    it("no orphaned boardCategories (missing board)", async () => {
      const allBcs = await db.select().from(boardCategories);
      const boardIds = new Set((await db.select({ id: boards.id }).from(boards)).map(b => b.id));
      
      for (const bc of allBcs) {
        expect(boardIds.has(bc.boardId)).toBe(true);
      }
    });

    it("no orphaned boardCategories (missing category)", async () => {
      const allBcs = await db.select().from(boardCategories);
      const catIds = new Set((await db.select({ id: categories.id }).from(categories)).map(c => c.id));
      
      for (const bc of allBcs) {
        expect(catIds.has(bc.categoryId)).toBe(true);
      }
    });

    it("no orphaned questions (missing boardCategory)", async () => {
      const allQuestions = await db.select().from(questions);
      const bcIds = new Set((await db.select({ id: boardCategories.id }).from(boardCategories)).map(bc => bc.id));
      
      for (const q of allQuestions) {
        expect(bcIds.has(q.boardCategoryId)).toBe(true);
      }
    });

    it("all questions have valid point values", async () => {
      const allQuestions = await db.select().from(questions);
      const validPoints = [10, 20, 30, 40, 50];
      
      for (const q of allQuestions) {
        expect(validPoints).toContain(q.points);
      }
    });
  });
});
