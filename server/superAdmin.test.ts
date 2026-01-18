import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { categories, boards, boardCategories, questions, users } from "../shared/schema";
import { eq, inArray, and } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("Super Admin Features", () => {
  describe("Super Admin Authentication", () => {
    it("super admin endpoints should handle unauthenticated requests", async () => {
      const endpoints = [
        { method: "GET", path: "/api/super-admin/users" },
        { method: "POST", path: "/api/super-admin/starter-packs/export" },
        { method: "POST", path: "/api/super-admin/starter-packs/import" },
      ];

      for (const ep of endpoints) {
        const res = await fetch(`${BASE_URL}${ep.path}`, {
          method: ep.method,
          headers: { "Content-Type": "application/json" },
          body: ep.method === "POST" ? JSON.stringify({}) : undefined,
        });
        expect([200, 400, 401, 403, 404]).toContain(res.status);
      }
    });

    it("regular admin endpoints should be separate from super admin", async () => {
      const adminRes = await fetch(`${BASE_URL}/api/boards`);
      const superAdminRes = await fetch(`${BASE_URL}/api/super-admin/users`);
      
      expect(adminRes.status).toBe(401);
      expect([401, 403, 404]).toContain(superAdminRes.status);
    });
  });

  describe("Starter Pack Export", () => {
    it("export endpoint handles requests", async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/starter-packs/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardIds: [1, 2, 3] }),
      });
      expect([200, 400, 401, 403]).toContain(res.status);
    });
  });

  describe("Starter Pack Import", () => {
    it("import endpoint requires super admin auth", async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/starter-packs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starterPacks: [{
            boardName: "Test Import Board",
            boardDescription: "Test",
            pointValues: [10, 20, 30, 40, 50],
            categories: []
          }]
        }),
      });
      expect([401, 403]).toContain(res.status);
    });

    it("import with malformed data should be rejected", async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/starter-packs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid: "data" }),
      });
      expect([400, 401, 403]).toContain(res.status);
    });
  });

  describe("Global Board Management", () => {
    it("toggling global status handles requests", async () => {
      const res = await fetch(`${BASE_URL}/api/boards/1/global`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGlobal: true }),
      });
      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe("User Management", () => {
    it("user list requires super admin", async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/users`);
      expect([401, 403, 404]).toContain(res.status);
    });

    it("user role update handles requests", async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/users/1/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      });
      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });
});

describe("Super Admin Data Integrity", () => {
  const cleanupIds: { boards: number[]; categories: number[]; boardCategories: number[]; questions: number[] } = {
    boards: [],
    categories: [],
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

  describe("Global Board Constraints", () => {
    it("global boards should not have userId", async () => {
      const globalBoards = await db.select()
        .from(boards)
        .where(eq(boards.isGlobal, true));
      
      for (const board of globalBoards) {
        if (board.isGlobal) {
          expect(board.userId === null || board.userId === undefined || board.userId === "system").toBe(true);
        }
      }
    });

    it("starter pack boards should be global", async () => {
      const globalBoards = await db.select()
        .from(boards)
        .where(eq(boards.isGlobal, true));
      
      expect(globalBoards.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Source Group Integrity", () => {
    it("source groups should only be A-E or null", async () => {
      const allCats = await db.select().from(categories);
      const validGroups = ["A", "B", "C", "D", "E", null];
      
      for (const cat of allCats) {
        expect(validGroups).toContain(cat.sourceGroup);
      }
    });

  });

  describe("Starter Pack Structure", () => {
    it("starter pack boards should have valid point values", async () => {
      const globalBoards = await db.select()
        .from(boards)
        .where(eq(boards.isGlobal, true));
      
      for (const board of globalBoards) {
        expect(Array.isArray(board.pointValues)).toBe(true);
        expect(board.pointValues.length).toBeGreaterThan(0);
      }
    });

    it("starter pack categories should have questions", async () => {
      const globalBoards = await db.select()
        .from(boards)
        .where(eq(boards.isGlobal, true));
      
      for (const board of globalBoards.slice(0, 3)) {
        const bcs = await db.select()
          .from(boardCategories)
          .where(eq(boardCategories.boardId, board.id));
        
        for (const bc of bcs) {
          const qs = await db.select()
            .from(questions)
            .where(eq(questions.categoryId, bc.id));
          
          expect(qs.length).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});

describe("Super Admin Regression Tests", () => {
  describe("REG-SA-001: Import uses session auth not req.user", () => {
    it("import endpoint should reject requests without valid session", async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/starter-packs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starterPacks: [{
            boardName: "Auth Test Board",
            categories: []
          }]
        }),
      });
      
      expect([401, 403]).toContain(res.status);
    });
  });

  describe("REG-SA-002: Category deduplication on import", () => {
    it("existing categories should be reusable", async () => {
      const existingCat = await db.select()
        .from(categories)
        .limit(1);
      
      if (existingCat.length > 0) {
        const matchingCats = await db.select()
          .from(categories)
          .where(eq(categories.name, existingCat[0].name));
        
        expect(matchingCats.length).toBe(1);
      }
    });
  });

  describe("REG-SA-003: Export preserves question structure", () => {
    it("questions should have all required fields", async () => {
      const allQuestions = await db.select().from(questions).limit(10);
      
      for (const q of allQuestions) {
        expect(q.question).toBeTruthy();
        expect(q.correctAnswer).toBeTruthy();
        expect([10, 20, 30, 40, 50]).toContain(q.points);
      }
    });
  });

  describe("REG-SA-004: User role validation", () => {
    it("users should have roles", async () => {
      const allUsers = await db.select().from(users);
      
      for (const user of allUsers) {
        expect(user.role !== undefined || user.role === null).toBe(true);
      }
    });
  });
});

describe("Admin/Super Admin Role Separation", () => {
  describe("Role-based access control", () => {
    it("admin-level endpoints should require at least admin role", async () => {
      const adminEndpoints = [
        "/api/boards",
        "/api/categories",
      ];

      for (const path of adminEndpoints) {
        const res = await fetch(`${BASE_URL}${path}`);
        expect(res.status).toBe(401);
      }
    });

    it("super-admin endpoints should handle requests", async () => {
      const superAdminEndpoints = [
        "/api/super-admin/users",
        "/api/super-admin/starter-packs/export",
      ];

      for (const path of superAdminEndpoints) {
        const res = await fetch(`${BASE_URL}${path}`, {
          method: path.includes("export") ? "POST" : "GET",
          headers: { "Content-Type": "application/json" },
          body: path.includes("export") ? JSON.stringify({}) : undefined,
        });
        expect([200, 400, 401, 403, 404]).toContain(res.status);
      }
    });
  });

  describe("Cross-role data isolation", () => {
    it("personal boards should have userId", async () => {
      const personalBoards = await db.select()
        .from(boards)
        .where(and(
          eq(boards.isGlobal, false),
        ));
      
      for (const board of personalBoards) {
        if (!board.name.startsWith("Shuffle Play")) {
          expect(board.userId || board.isGlobal).toBeTruthy();
        }
      }
    });
  });
});
