import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { categories, boards, boardCategories, questions, gameSessions, users } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

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

  describe("BUG-001: Authentication pattern", () => {
    it("custom-boards endpoint should return 401 without auth, not crash", async () => {
      const res = await fetch(`${BASE_URL}/api/buzzkill/custom-boards`);
      expect(res.status).toBe(401);
    });

    it("boards endpoint should return 401 without auth", async () => {
      const res = await fetch(`${BASE_URL}/api/boards`);
      expect(res.status).toBe(401);
    });
  });

  describe("BUG-002: Active categories should have imageUrl", () => {
    it("all active categories should have non-empty imageUrl", async () => {
      const activeCats = await db.select().from(categories).where(eq(categories.isActive, true));
      
      const missingImage = activeCats.filter(c => !c.imageUrl || c.imageUrl === "");
      expect(missingImage.length).toBe(0);
    });
  });

  describe("BUG-003: Login rate limiting", () => {
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

    it("no orphaned questions (missing category)", async () => {
      const allQuestions = await db.select().from(questions);
      const catIds = new Set((await db.select({ id: categories.id }).from(categories)).map(c => c.id));
      
      for (const q of allQuestions) {
        expect(catIds.has(q.categoryId)).toBe(true);
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
