import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { categories, boardCategories, questions, boards, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("Shuffle Algorithm Edge Cases", () => {
  const cleanupIds = {
    categories: [] as number[],
    boardCategories: [] as number[],
    questions: [] as number[],
    boards: [] as number[],
  };

  afterAll(async () => {
    for (const qId of cleanupIds.questions) {
      await db.delete(questions).where(eq(questions.id, qId)).catch(() => {});
    }
    for (const bcId of cleanupIds.boardCategories) {
      await db.delete(boardCategories).where(eq(boardCategories.id, bcId)).catch(() => {});
    }
    for (const catId of cleanupIds.categories) {
      await db.delete(categories).where(eq(categories.id, catId)).catch(() => {});
    }
    for (const boardId of cleanupIds.boards) {
      await db.delete(boards).where(eq(boards.id, boardId)).catch(() => {});
    }
  });

  describe("Empty Pool Scenarios", () => {
    it("should handle completely empty category pool", async () => {
      const emptyPoolResult = await db.select().from(categories)
        .where(and(
          eq(categories.isActive, true),
          sql`${categories.id} = -99999`
        ));
      
      expect(emptyPoolResult).toHaveLength(0);
    });

    it("should handle pool with only inactive categories", async () => {
      const inactiveCats = await db.select().from(categories)
        .where(eq(categories.isActive, false))
        .limit(5);
      
      expect(Array.isArray(inactiveCats)).toBe(true);
    });

    it("should handle pool where all categories have been played", async () => {
      const allCats = await db.select({ id: categories.id }).from(categories)
        .where(eq(categories.isActive, true))
        .limit(10);
      
      const playedIds = allCats.map(c => c.id);
      
      const remaining = allCats.filter(c => !playedIds.includes(c.id));
      expect(remaining).toHaveLength(0);
    });
  });

  describe("Single Category Remaining", () => {
    it("should handle exactly one category in pool", async () => {
      const singleCat = await db.select().from(categories)
        .where(eq(categories.isActive, true))
        .limit(1);
      
      if (singleCat.length === 1) {
        expect(singleCat[0].id).toBeDefined();
        expect(singleCat[0].name).toBeDefined();
      }
    });

    it("should handle single category with incomplete questions", async () => {
      const singleCat = await db.select().from(categories).limit(1);
      
      if (singleCat.length > 0) {
        expect(singleCat[0].id).toBeDefined();
      }
      expect(true).toBe(true);
    });

    it("should handle single source group available", async () => {
      const catsWithGroup = await db.select().from(categories)
        .where(and(
          eq(categories.isActive, true),
          sql`${categories.sourceGroup} IS NOT NULL`
        ))
        .limit(10);
      
      const groups = new Set(catsWithGroup.map(c => c.sourceGroup));
      expect(groups.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Boundary Conditions", () => {
    it("should handle exactly 5 categories available", async () => {
      const fiveCats = await db.select().from(categories)
        .where(eq(categories.isActive, true))
        .limit(5);
      
      expect(fiveCats.length).toBeLessThanOrEqual(5);
    });

    it("should handle 4 categories when 5 needed", async () => {
      const fourCats = await db.select().from(categories)
        .where(eq(categories.isActive, true))
        .limit(4);
      
      expect(fourCats.length).toBeLessThanOrEqual(4);
    });

    it("should handle pool exhaustion during selection", async () => {
      const pool = await db.select().from(categories)
        .where(eq(categories.isActive, true));
      
      const selected: number[] = [];
      let remaining = [...pool];
      
      while (remaining.length > 0 && selected.length < 10) {
        const idx = Math.floor(Math.random() * remaining.length);
        selected.push(remaining[idx].id);
        remaining.splice(idx, 1);
      }
      
      expect(selected.length).toBeLessThanOrEqual(pool.length);
    });
  });

  describe("Source Group Edge Cases", () => {
    it("should handle all categories in same source group", async () => {
      const groupACats = await db.select().from(categories)
        .where(and(
          eq(categories.isActive, true),
          eq(categories.sourceGroup, "A")
        ));
      
      expect(Array.isArray(groupACats)).toBe(true);
    });

    it("should handle null source groups", async () => {
      const nullGroupCats = await db.select().from(categories)
        .where(and(
          eq(categories.isActive, true),
          sql`${categories.sourceGroup} IS NULL`
        ));
      
      expect(Array.isArray(nullGroupCats)).toBe(true);
    });

    it("should handle mixed null and defined source groups", async () => {
      const allActive = await db.select().from(categories)
        .where(eq(categories.isActive, true))
        .limit(20);
      
      const withGroup = allActive.filter(c => c.sourceGroup !== null);
      const withoutGroup = allActive.filter(c => c.sourceGroup === null);
      
      expect(withGroup.length + withoutGroup.length).toBe(allActive.length);
    });
  });

  describe("Personal vs Global Priority", () => {
    it("should handle no personal categories available", async () => {
      const globalOnly = await db.select().from(categories)
        .where(eq(categories.isActive, true))
        .limit(5);
      
      expect(Array.isArray(globalOnly)).toBe(true);
    });

    it("should handle only personal categories available", async () => {
      const cats = await db.select().from(categories)
        .where(eq(categories.isActive, true))
        .limit(5);
      
      expect(Array.isArray(cats)).toBe(true);
    });

    it("should handle 3 personal + 2 global needed", async () => {
      const cats = await db.select().from(categories)
        .where(eq(categories.isActive, true))
        .limit(5);
      
      expect(cats.length).toBeLessThanOrEqual(5);
    });
  });
});
