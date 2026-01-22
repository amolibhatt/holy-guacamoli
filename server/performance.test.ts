import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { categories, boards, boardCategories, questions } from "../shared/schema";
import { eq, inArray, sql } from "drizzle-orm";

describe("Performance Tests", () => {
  const cleanupIds: { categories: number[]; boards: number[]; boardCategories: number[]; questions: number[] } = {
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
  });

  describe("Database Query Performance", () => {
    it("should fetch categories in reasonable time", async () => {
      const start = performance.now();
      
      await db.select().from(categories).limit(100);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it("should fetch boards with categories efficiently", async () => {
      const start = performance.now();
      
      const allBoards = await db.select().from(boards).limit(50);
      for (const board of allBoards.slice(0, 5)) {
        await db.select()
          .from(boardCategories)
          .where(eq(boardCategories.boardId, board.id));
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    it("should fetch questions by board category efficiently", async () => {
      const bcs = await db.select().from(boardCategories).limit(10);
      
      const start = performance.now();
      
      for (const bc of bcs) {
        await db.select()
          .from(questions)
          .where(eq(questions.categoryId, bc.id));
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    it("should handle count queries efficiently", async () => {
      const start = performance.now();
      
      const result = await db.select({ count: sql<number>`count(*)` }).from(categories);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
      expect(Number(result[0].count)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Bulk Operations Performance", () => {
    it("should insert multiple categories efficiently", async () => {
      const categoriesToInsert = Array(20).fill(null).map((_, i) => ({
        name: `Perf Test Category ${i}`,
        description: "Performance test category",
        imageUrl: "/test.png",
        isActive: false,
      }));

      const start = performance.now();
      
      const inserted = await db.insert(categories).values(categoriesToInsert).returning();
      inserted.forEach(c => cleanupIds.categories.push(c.id));
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(3000);
      expect(inserted.length).toBe(20);
    });

    it("should bulk update efficiently", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Bulk Update Test",
        description: "Test",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      const start = performance.now();
      
      for (let i = 0; i < 10; i++) {
        await db.update(categories)
          .set({ description: `Updated ${i}` })
          .where(eq(categories.id, cat.id));
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });

  describe("Complex Query Performance", () => {
    it("should join tables efficiently", async () => {
      const start = performance.now();
      
      const result = await db.select({
        categoryName: categories.name,
        boardId: boardCategories.boardId,
      })
      .from(categories)
      .innerJoin(boardCategories, eq(categories.id, boardCategories.categoryId))
      .limit(50);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it("should filter active categories efficiently", async () => {
      const start = performance.now();
      
      await db.select()
        .from(categories)
        .where(eq(categories.isActive, true));
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it("should aggregate data efficiently", async () => {
      const start = performance.now();
      
      await db.select({
        sourceGroup: categories.sourceGroup,
        count: sql<number>`count(*)`,
      })
      .from(categories)
      .groupBy(categories.sourceGroup);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });

  describe("API Response Times", () => {
    const BASE_URL = "http://localhost:5000";

    it("GET /api/categories should respond", async () => {
      const start = performance.now();
      
      await fetch(`${BASE_URL}/api/categories`);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10000);
    });

    it("GET /api/buzzkill/boards should respond quickly", async () => {
      const start = performance.now();
      
      await fetch(`${BASE_URL}/api/buzzkill/boards`);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    it("health check should be fast", async () => {
      const start = performance.now();
      
      const res = await fetch(`${BASE_URL}/api/health`);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
      expect([200, 404]).toContain(res.status);
    });
  });

  describe("Memory and Resource Usage", () => {
    it("should handle large result sets", async () => {
      const allCategories = await db.select().from(categories);
      
      expect(allCategories.length).toBeLessThan(10000);
    });

    it("should handle pagination correctly", async () => {
      const page1 = await db.select().from(categories).limit(10).offset(0);
      const page2 = await db.select().from(categories).limit(10).offset(10);
      
      if (page1.length === 10 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });
  });
});
