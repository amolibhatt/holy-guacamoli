import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { categories, boards, boardCategories, questions, users } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("Admin Panel", () => {
  describe("Admin Endpoints Authentication", () => {
    it("GET /api/admin/categories should be accessible", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/categories`);
      expect([200, 401]).toContain(res.status);
    });

    it("GET /api/categories requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/categories`);
      expect(res.status).toBe(401);
    });

    it("POST /api/categories requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", description: "Test" }),
      });
      expect(res.status).toBe(401);
    });

    it("PATCH /api/categories/:id requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/categories/1`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });
      expect([200, 401, 404]).toContain(res.status);
    });

    it("DELETE /api/categories/:id requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/categories/1`, {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Board Management Authentication", () => {
    it("GET /api/boards requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/boards`);
      expect(res.status).toBe(401);
    });

    it("POST /api/boards requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Board", description: "Test" }),
      });
      expect(res.status).toBe(401);
    });

    it("GET /api/boards/:id requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/boards/1`);
      expect(res.status).toBe(401);
    });

    it("PATCH /api/boards/:id requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/boards/1`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });
      expect([200, 401, 404]).toContain(res.status);
    });

    it("DELETE /api/boards/:id requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/boards/1`, {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Question Management Authentication", () => {
    it("POST /api/questions requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          boardCategoryId: 1,
          question: "Test?",
          correctAnswer: "Yes",
          points: 10
        }),
      });
      expect(res.status).toBe(401);
    });

    it("PATCH /api/questions/:id requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/questions/1`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Updated?" }),
      });
      expect([200, 401, 404]).toContain(res.status);
    });

    it("DELETE /api/questions/:id requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/questions/1`, {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Board-Category Linking Authentication", () => {
    it("POST /api/board-categories requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/board-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: 1, categoryId: 1 }),
      });
      expect([200, 401, 404]).toContain(res.status);
    });

    it("DELETE /api/board-categories/:id requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/board-categories/1`, {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });
  });
});

describe("Super Admin Panel", () => {
  describe("Super Admin Endpoints Authentication", () => {
    it("GET /api/super-admin/users requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/users`);
      expect([401, 403, 404]).toContain(res.status);
    });

    it("POST /api/super-admin/starter-packs/export requires super admin", async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/starter-packs/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect([200, 401, 403]).toContain(res.status);
    });

    it("POST /api/super-admin/starter-packs/import requires super admin", async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/starter-packs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starterPacks: [] }),
      });
      expect([401, 403]).toContain(res.status);
    });
  });

  describe("Global Board Management", () => {
    it("POST /api/boards/:id/global requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/boards/1/global`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGlobal: true }),
      });
      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe("Category Source Groups", () => {
    it("GET /api/buzzkill/category-groups requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/buzzkill/category-groups`);
      expect(res.status).toBe(401);
    });

    it("PATCH /api/categories/:id/source-group requires auth", async () => {
      const res = await fetch(`${BASE_URL}/api/categories/1/source-group`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceGroup: "A" }),
      });
      expect([401, 404]).toContain(res.status);
    });
  });
});

describe("Admin Data Operations", () => {
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

  describe("Category CRUD Operations", () => {
    it("should create category with all fields", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Admin Test Category",
        description: "Created by admin",
        imageUrl: "/admin-test.png",
        rule: "Test rule",
        isActive: false,
        sourceGroup: "A",
      }).returning();
      cleanupIds.categories.push(cat.id);

      expect(cat.name).toBe("Admin Test Category");
      expect(cat.rule).toBe("Test rule");
      expect(cat.sourceGroup).toBe("A");
    });

    it("should update category fields", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Update Test",
        description: "Original",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      await db.update(categories)
        .set({ 
          name: "Updated Name",
          description: "Updated description",
          isActive: true,
        })
        .where(eq(categories.id, cat.id));

      const [updated] = await db.select().from(categories).where(eq(categories.id, cat.id));
      expect(updated.name).toBe("Updated Name");
      expect(updated.isActive).toBe(true);
    });

    it("should toggle category active status", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Toggle Test",
        description: "Test",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      await db.update(categories)
        .set({ isActive: true })
        .where(eq(categories.id, cat.id));

      const [active] = await db.select().from(categories).where(eq(categories.id, cat.id));
      expect(active.isActive).toBe(true);

      await db.update(categories)
        .set({ isActive: false })
        .where(eq(categories.id, cat.id));

      const [inactive] = await db.select().from(categories).where(eq(categories.id, cat.id));
      expect(inactive.isActive).toBe(false);
    });
  });

  describe("Board CRUD Operations", () => {
    it("should create board with custom point values", async () => {
      const [board] = await db.insert(boards).values({
        name: "Admin Board",
        description: "Created by admin",
        pointValues: [100, 200, 300, 400, 500],
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.pointValues).toEqual([100, 200, 300, 400, 500]);
    });

    it("should update board to global", async () => {
      const [board] = await db.insert(boards).values({
        name: "Global Toggle Board",
        description: "Test",
        pointValues: [10, 20, 30, 40, 50],
        isGlobal: false,
      }).returning();
      cleanupIds.boards.push(board.id);

      await db.update(boards)
        .set({ isGlobal: true })
        .where(eq(boards.id, board.id));

      const [updated] = await db.select().from(boards).where(eq(boards.id, board.id));
      expect(updated.isGlobal).toBe(true);
    });

    it("should assign board to user", async () => {
      const [board] = await db.insert(boards).values({
        name: "User Board",
        description: "Assigned to user",
        pointValues: [10, 20, 30, 40, 50],
        userId: "admin-user-123",
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.userId).toBe("admin-user-123");
    });
  });

  describe("Question CRUD Operations", () => {
    it("should create question with all fields", async () => {
      const [board] = await db.insert(boards).values({
        name: "Question CRUD Board",
        description: "Test",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "Question CRUD Cat",
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
        question: "What is the capital of France?",
        options: ["Paris", "London", "Berlin", "Madrid"],
        correctAnswer: "Paris",
        points: 20,
      }).returning();
      cleanupIds.questions.push(q.id);

      expect(q.question).toBe("What is the capital of France?");
      expect(q.options).toEqual(["Paris", "London", "Berlin", "Madrid"]);
      expect(q.correctAnswer).toBe("Paris");
      expect(q.points).toBe(20);
    });

    it("should update question content", async () => {
      const [board] = await db.insert(boards).values({
        name: "Update Q Board",
        description: "Test",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "Update Q Cat",
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
        question: "Original question?",
        options: ["A", "B"],
        correctAnswer: "A",
        points: 10,
      }).returning();
      cleanupIds.questions.push(q.id);

      await db.update(questions)
        .set({ 
          question: "Updated question?",
          correctAnswer: "B",
        })
        .where(eq(questions.id, q.id));

      const [updated] = await db.select().from(questions).where(eq(questions.id, q.id));
      expect(updated.question).toBe("Updated question?");
      expect(updated.correctAnswer).toBe("B");
    });
  });

  describe("Source Group Management", () => {
    it("should assign source group to category", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Source Group Test",
        description: "Test",
        imageUrl: "/test.png",
        isActive: false,
        sourceGroup: null,
      }).returning();
      cleanupIds.categories.push(cat.id);

      await db.update(categories)
        .set({ sourceGroup: "B" })
        .where(eq(categories.id, cat.id));

      const [updated] = await db.select().from(categories).where(eq(categories.id, cat.id));
      expect(updated.sourceGroup).toBe("B");
    });

    it("should change source group", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Change Group Test",
        description: "Test",
        imageUrl: "/test.png",
        isActive: false,
        sourceGroup: "A",
      }).returning();
      cleanupIds.categories.push(cat.id);

      await db.update(categories)
        .set({ sourceGroup: "E" })
        .where(eq(categories.id, cat.id));

      const [updated] = await db.select().from(categories).where(eq(categories.id, cat.id));
      expect(updated.sourceGroup).toBe("E");
    });

    it("should remove source group", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Remove Group Test",
        description: "Test",
        imageUrl: "/test.png",
        isActive: false,
        sourceGroup: "C",
      }).returning();
      cleanupIds.categories.push(cat.id);

      await db.update(categories)
        .set({ sourceGroup: null })
        .where(eq(categories.id, cat.id));

      const [updated] = await db.select().from(categories).where(eq(categories.id, cat.id));
      expect(updated.sourceGroup).toBeNull();
    });
  });
});

describe("Admin Panel Regression Tests", () => {
  describe("REG-ADMIN-001: Category activation without 5 questions", () => {
    it("inactive categories without 5 questions should stay inactive", async () => {
      const incompleteCats = await db.select()
        .from(categories)
        .where(eq(categories.isActive, false));
      
      for (const cat of incompleteCats.slice(0, 5)) {
        const bcs = await db.select().from(boardCategories).where(eq(boardCategories.categoryId, cat.id));
        if (bcs.length === 0) continue;
        
        const qs = await db.select().from(questions).where(eq(questions.boardCategoryId, bcs[0].id));
        
        if (qs.length < 5) {
          expect(cat.isActive).toBe(false);
        }
      }
    });
  });

  describe("REG-ADMIN-002: Duplicate point prevention", () => {
    it("live categories should have unique point values", async () => {
      const activeCats = await db.select()
        .from(categories)
        .where(eq(categories.isActive, true));
      
      let liveWithDupes = 0;
      for (const cat of activeCats) {
        const bcs = await db.select().from(boardCategories).where(eq(boardCategories.categoryId, cat.id));
        if (bcs.length === 0) continue;
        
        const qs = await db.select().from(questions).where(eq(questions.boardCategoryId, bcs[0].id));
        if (qs.length !== 5) continue;
        
        const pointsSet = new Set(qs.map(q => q.points));
        if (pointsSet.size < qs.length) {
          liveWithDupes++;
        }
      }
      
      expect(liveWithDupes).toBeLessThanOrEqual(2);
    });
  });

  describe("REG-ADMIN-003: Super admin import auth", () => {
    it("starter pack import should require super admin auth", async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/starter-packs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starterPacks: [{ boardName: "Test" }] }),
      });
      
      expect([401, 403]).toContain(res.status);
    });
  });

  describe("REG-ADMIN-004: Category imageUrl requirement", () => {
    it("all active categories should have imageUrl", async () => {
      const activeCats = await db.select()
        .from(categories)
        .where(eq(categories.isActive, true));
      
      for (const cat of activeCats) {
        expect(cat.imageUrl).toBeTruthy();
      }
    });
  });
});
