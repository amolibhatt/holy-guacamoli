import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { users, categories, boards, boardCategories, questions } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("API Routes Authentication", () => {
  describe("Protected Endpoints", () => {
    const protectedEndpoints = [
      { method: "GET", path: "/api/boards" },
      { method: "GET", path: "/api/categories" },
      { method: "GET", path: "/api/buzzkill/custom-boards" },
      { method: "GET", path: "/api/buzzkill/category-groups" },
    ];

    for (const endpoint of protectedEndpoints) {
      it(`${endpoint.method} ${endpoint.path} should require authentication`, async () => {
        const response = await fetch(`${BASE_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: endpoint.method === "POST" ? { "Content-Type": "application/json" } : {},
          body: endpoint.method === "POST" ? JSON.stringify({}) : undefined,
        });
        
        expect(response.status).toBe(401);
      });
    }
  });

  describe("Public Endpoints", () => {
    it("GET /api/auth/user should return 401 for unauthenticated requests", async () => {
      const response = await fetch(`${BASE_URL}/api/auth/user`);
      expect(response.status).toBe(401);
    });

    it("POST /api/auth/login should accept login attempts", async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "wrong" }),
      });
      
      expect([400, 401, 403, 429]).toContain(response.status);
    });

    it("GET /api/buzzkill/starter-packs should be publicly accessible", async () => {
      const response = await fetch(`${BASE_URL}/api/buzzkill/starter-packs`);
      expect(response.status).toBe(200);
    });

    it("GET /api/categories should be publicly accessible", async () => {
      const response = await fetch(`${BASE_URL}/api/categories`);
      expect(response.status).toBe(200);
    });
  });
});


describe("Database Integrity", () => {
  it("all active categories should have imageUrl", async () => {
    const activeCats = await db.select().from(categories).where(eq(categories.isActive, true));
    
    for (const cat of activeCats) {
      expect(cat.imageUrl).toBeTruthy();
    }
  });

  it("all boards should have valid pointValues array", async () => {
    const allBoards = await db.select().from(boards);
    
    for (const board of allBoards) {
      expect(Array.isArray(board.pointValues)).toBe(true);
      expect(board.pointValues.length).toBeGreaterThan(0);
    }
  });

  it("all questions should have valid point values", async () => {
    const allQuestions = await db.select().from(questions);
    
    for (const q of allQuestions) {
      expect([10, 20, 30, 40, 50]).toContain(q.points);
    }
  });

  it("boardCategories should reference valid boards and categories", async () => {
    const allBcs = await db.select().from(boardCategories);
    const boardIds = new Set((await db.select({ id: boards.id }).from(boards)).map(b => b.id));
    const catIds = new Set((await db.select({ id: categories.id }).from(categories)).map(c => c.id));
    
    for (const bc of allBcs) {
      expect(boardIds.has(bc.boardId)).toBe(true);
      expect(catIds.has(bc.categoryId)).toBe(true);
    }
  });
});

describe("Category Validation Rules", () => {
  it("Most live categories should have valid point distributions", async () => {
    const activeCats = await db.select().from(categories).where(eq(categories.isActive, true));
    
    let validCount = 0;
    let totalWith5Questions = 0;
    
    for (const cat of activeCats) {
      const bcs = await db.select().from(boardCategories).where(eq(boardCategories.categoryId, cat.id));
      if (bcs.length === 0) continue;
      
      const qs = await db.select().from(questions).where(eq(questions.categoryId, bcs[0].id));
      
      if (qs.length === 5) {
        totalWith5Questions++;
        const pointsSet = new Set(qs.map(q => q.points));
        if (pointsSet.size === 5) {
          validCount++;
        }
      }
    }
    
    if (totalWith5Questions > 0) {
      const validRatio = validCount / totalWith5Questions;
      expect(validRatio).toBeGreaterThanOrEqual(0.8);
    }
  });
});
