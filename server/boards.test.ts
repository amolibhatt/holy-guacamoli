import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { boards, boardCategories, categories } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("Boards Management", () => {
  const cleanupIds: { boards: number[]; boardCategories: number[]; categories: number[] } = {
    boards: [],
    boardCategories: [],
    categories: [],
  };

  afterEach(async () => {
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

  describe("Board Creation", () => {
    it("should create board with default point values", async () => {
      const [board] = await db.insert(boards).values({
        name: "Test Board",
        description: "A test board",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.name).toBe("Test Board");
      expect(board.pointValues).toEqual([10, 20, 30, 40, 50]);
    });

    it("should create board with custom point values", async () => {
      const [board] = await db.insert(boards).values({
        name: "Custom Points Board",
        description: "Different point values",
        pointValues: [100, 200, 300, 400, 500],
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.pointValues).toEqual([100, 200, 300, 400, 500]);
    });

    it("should create board with userId for personal boards", async () => {
      const [board] = await db.insert(boards).values({
        name: "Personal Board",
        description: "User's board",
        pointValues: [10, 20, 30, 40, 50],
        userId: "user-123",
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.userId).toBe("user-123");
    });

    it("should create global board", async () => {
      const [board] = await db.insert(boards).values({
        name: "Global Board",
        description: "Shared board",
        pointValues: [10, 20, 30, 40, 50],
        isGlobal: true,
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.isGlobal).toBe(true);
    });
  });

  describe("Board Updates", () => {
    it("should update board name", async () => {
      const [board] = await db.insert(boards).values({
        name: "Original Name",
        description: "A board",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      await db.update(boards)
        .set({ name: "Updated Name" })
        .where(eq(boards.id, board.id));

      const [updated] = await db.select().from(boards).where(eq(boards.id, board.id));
      expect(updated.name).toBe("Updated Name");
    });

    it("should toggle global status", async () => {
      const [board] = await db.insert(boards).values({
        name: "Toggle Board",
        description: "Will toggle global",
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
  });

  describe("Board-Category Relationships", () => {
    it("should support multiple categories per board", async () => {
      const [board] = await db.insert(boards).values({
        name: "Multi-Cat Board",
        description: "Has many categories",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      for (let i = 0; i < 5; i++) {
        const [cat] = await db.insert(categories).values({
          name: `Category ${i}`,
          description: `Category ${i}`,
          imageUrl: "/test.png",
          isActive: false,
        }).returning();
        cleanupIds.categories.push(cat.id);

        const [bc] = await db.insert(boardCategories).values({
          boardId: board.id,
          categoryId: cat.id,
          position: i,
        }).returning();
        cleanupIds.boardCategories.push(bc.id);
      }

      const links = await db.select().from(boardCategories).where(eq(boardCategories.boardId, board.id));
      expect(links.length).toBe(5);
    });

    it("should maintain category positions", async () => {
      const [board] = await db.insert(boards).values({
        name: "Positioned Board",
        description: "Categories have positions",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat1] = await db.insert(categories).values({
        name: "First Category",
        description: "Position 0",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat1.id);

      const [cat2] = await db.insert(categories).values({
        name: "Second Category",
        description: "Position 1",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat2.id);

      const [bc1] = await db.insert(boardCategories).values({
        boardId: board.id,
        categoryId: cat1.id,
        position: 0,
      }).returning();
      cleanupIds.boardCategories.push(bc1.id);

      const [bc2] = await db.insert(boardCategories).values({
        boardId: board.id,
        categoryId: cat2.id,
        position: 1,
      }).returning();
      cleanupIds.boardCategories.push(bc2.id);

      expect(bc1.position).toBe(0);
      expect(bc2.position).toBe(1);
    });
  });
});

describe("Board API Endpoints", () => {
  it("GET /api/boards should require authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/boards`);
    expect(res.status).toBe(401);
  });

  it("POST /api/boards should require authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/boards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", description: "Test" }),
    });
    expect(res.status).toBe(401);
  });
});
