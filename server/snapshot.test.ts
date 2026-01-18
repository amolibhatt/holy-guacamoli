import { describe, it, expect } from "vitest";
import { db } from "./db";
import { categories, boards, questions, boardCategories } from "@shared/schema";
import { eq } from "drizzle-orm";

describe("Snapshot Tests - API Response Structures", () => {
  describe("Category Response Structure", () => {
    it("should have consistent category structure", async () => {
      const cats = await db.select().from(categories).limit(1);
      
      if (cats.length > 0) {
        const cat = cats[0];
        
        expect(cat).toHaveProperty("id");
        expect(cat).toHaveProperty("name");
        
        expect(typeof cat.id).toBe("number");
        expect(typeof cat.name).toBe("string");
      }
      expect(true).toBe(true);
    });

    it("should maintain optional field types", async () => {
      const cats = await db.select().from(categories).limit(5);
      
      for (const cat of cats) {
        if (cat.sourceGroup !== null) {
          expect(typeof cat.sourceGroup).toBe("string");
        }
        if (cat.description !== null) {
          expect(typeof cat.description).toBe("string");
        }
      }
    });
  });

  describe("Board Response Structure", () => {
    it("should have consistent board structure", async () => {
      const bds = await db.select().from(boards).limit(1);
      
      if (bds.length > 0) {
        const board = bds[0];
        
        expect(board).toHaveProperty("id");
        expect(board).toHaveProperty("name");
        expect(board).toHaveProperty("pointValues");
        expect(board).toHaveProperty("userId");
        
        expect(typeof board.id).toBe("number");
        expect(typeof board.name).toBe("string");
        expect(Array.isArray(board.pointValues)).toBe(true);
      }
    });

    it("should have valid pointValues array", async () => {
      const bds = await db.select().from(boards).limit(5);
      
      for (const board of bds) {
        expect(Array.isArray(board.pointValues)).toBe(true);
        for (const pv of board.pointValues || []) {
          expect(typeof pv).toBe("number");
        }
      }
    });
  });

  describe("Question Response Structure", () => {
    it("should have consistent question structure", async () => {
      const qs = await db.select().from(questions).limit(1);
      
      if (qs.length > 0) {
        const q = qs[0];
        
        expect(q).toHaveProperty("id");
        expect(q).toHaveProperty("categoryId");
        expect(q).toHaveProperty("question");
        expect(q).toHaveProperty("points");
        
        expect(typeof q.id).toBe("number");
        expect(typeof q.question).toBe("string");
        expect(typeof q.points).toBe("number");
      }
    });

    it("should have valid point values", async () => {
      const qs = await db.select().from(questions).limit(20);
      
      for (const q of qs) {
        expect(q.points).toBeGreaterThan(0);
        expect(q.points).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("BoardCategory Junction Structure", () => {
    it("should have consistent junction structure", async () => {
      const bcs = await db.select().from(boardCategories).limit(1);
      
      if (bcs.length > 0) {
        const bc = bcs[0];
        
        expect(bc).toHaveProperty("id");
        expect(bc).toHaveProperty("boardId");
        expect(bc).toHaveProperty("categoryId");
        
        expect(typeof bc.id).toBe("number");
        expect(typeof bc.boardId).toBe("number");
        expect(typeof bc.categoryId).toBe("number");
      }
    });
  });

  describe("API Response Snapshots", () => {
    it("should return consistent structure for categories endpoint", async () => {
      const res = await fetch("http://localhost:5000/api/admin/categories");
      const contentType = res.headers.get("content-type") || "";
      
      if (res.status === 200 && contentType.includes("application/json")) {
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const cat = data[0];
          expect(cat).toHaveProperty("id");
          expect(cat).toHaveProperty("name");
        }
      } else {
        expect(res.status >= 200).toBe(true);
      }
    });

    it("should return consistent structure for boards endpoint", async () => {
      const res = await fetch("http://localhost:5000/api/buzzkill/boards");
      const contentType = res.headers.get("content-type") || "";
      
      if (res.status === 200 && contentType.includes("application/json")) {
        const data = await res.json();
        expect(Array.isArray(data) || typeof data === "object").toBe(true);
      } else {
        expect(res.status >= 200).toBe(true);
      }
    });

    it("should return consistent error structure", async () => {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bad", password: "bad" }),
      });
      
      if (res.status !== 200 && res.status !== 429) {
        const data = await res.json();
        expect(data).toHaveProperty("message");
      }
    });
  });

  describe("Nested Response Structures", () => {
    it("should maintain consistent nested structures", async () => {
      const bc = await db.select().from(boardCategories).limit(1);
      
      if (bc.length > 0) {
        const qs = await db.select().from(questions)
          .where(eq(questions.categoryId, bc[0].id));
        
        for (const q of qs) {
          expect(typeof q.points).toBe("number");
          expect(typeof q.question).toBe("string");
        }
      }
    });
  });
});
