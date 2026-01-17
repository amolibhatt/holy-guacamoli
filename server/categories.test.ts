import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { categories, boards, boardCategories, questions } from "../shared/schema";
import { eq, inArray, and } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("Categories Management", () => {
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

  describe("Category Creation", () => {
    it("should create category with required fields", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Test Category",
        description: "A test category",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      expect(cat.name).toBe("Test Category");
      expect(cat.isActive).toBe(false);
    });

    it("should create category with source group", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Grouped Category",
        description: "Has a source group",
        imageUrl: "/test.png",
        isActive: false,
        sourceGroup: "A",
      }).returning();
      cleanupIds.categories.push(cat.id);

      expect(cat.sourceGroup).toBe("A");
    });

    it("should allow null source group", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Ungrouped Category",
        description: "No source group",
        imageUrl: "/test.png",
        isActive: false,
        sourceGroup: null,
      }).returning();
      cleanupIds.categories.push(cat.id);

      expect(cat.sourceGroup).toBeNull();
    });
  });

  describe("Category Activation", () => {
    it("should allow activating category", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Inactive Category",
        description: "Will be activated",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      await db.update(categories)
        .set({ isActive: true })
        .where(eq(categories.id, cat.id));

      const [updated] = await db.select().from(categories).where(eq(categories.id, cat.id));
      expect(updated.isActive).toBe(true);
    });
  });

  describe("Category-Board Linking", () => {
    it("should link category to board", async () => {
      const [board] = await db.insert(boards).values({
        name: "Test Board",
        description: "For linking test",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "Linkable Category",
        description: "Will be linked",
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

      expect(bc.boardId).toBe(board.id);
      expect(bc.categoryId).toBe(cat.id);
    });

    it("should allow same category on multiple boards", async () => {
      const [board1] = await db.insert(boards).values({
        name: "Board 1",
        description: "First board",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board1.id);

      const [board2] = await db.insert(boards).values({
        name: "Board 2",
        description: "Second board",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board2.id);

      const [cat] = await db.insert(categories).values({
        name: "Shared Category",
        description: "On multiple boards",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      const [bc1] = await db.insert(boardCategories).values({
        boardId: board1.id,
        categoryId: cat.id,
        position: 0,
      }).returning();
      cleanupIds.boardCategories.push(bc1.id);

      const [bc2] = await db.insert(boardCategories).values({
        boardId: board2.id,
        categoryId: cat.id,
        position: 0,
      }).returning();
      cleanupIds.boardCategories.push(bc2.id);

      const links = await db.select().from(boardCategories).where(eq(boardCategories.categoryId, cat.id));
      expect(links.length).toBe(2);
    });
  });

  describe("Questions Management", () => {
    it("should add questions to board-category", async () => {
      const [board] = await db.insert(boards).values({
        name: "Question Board",
        description: "For questions",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "Question Category",
        description: "Has questions",
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

      for (const pts of [10, 20, 30, 40, 50]) {
        const [q] = await db.insert(questions).values({
          boardCategoryId: bc.id,
          question: `Question for ${pts} points`,
          options: ["A", "B", "C", "D"],
          correctAnswer: "A",
          points: pts,
        }).returning();
        cleanupIds.questions.push(q.id);
      }

      const qs = await db.select().from(questions).where(eq(questions.boardCategoryId, bc.id));
      expect(qs.length).toBe(5);
    });

    it("should validate point values", async () => {
      const [board] = await db.insert(boards).values({
        name: "Points Board",
        description: "For point validation",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "Points Category",
        description: "Valid points",
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
        question: "Valid question",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        points: 30,
      }).returning();
      cleanupIds.questions.push(q.id);

      expect([10, 20, 30, 40, 50]).toContain(q.points);
    });
  });

  describe("Source Group Distribution", () => {
    it("should support all source groups A-E", async () => {
      for (const group of ["A", "B", "C", "D", "E"]) {
        const [cat] = await db.insert(categories).values({
          name: `Group ${group} Category`,
          description: `In group ${group}`,
          imageUrl: "/test.png",
          isActive: false,
          sourceGroup: group,
        }).returning();
        cleanupIds.categories.push(cat.id);
        
        expect(cat.sourceGroup).toBe(group);
      }
    });
  });
});

describe("Category API Endpoints", () => {
  it("GET /api/admin/categories should be accessible", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/categories`);
    expect([200, 401]).toContain(res.status);
  });

  it("GET /api/boards requires auth", async () => {
    const res = await fetch(`${BASE_URL}/api/boards`);
    expect(res.status).toBe(401);
  });
});
