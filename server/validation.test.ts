import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { categories, boards, boardCategories, questions, gameSessions } from "../shared/schema";
import { eq, inArray, and, sql } from "drizzle-orm";
import { generateDynamicBoard } from "./buzzkillBoards";

describe("Input Validation", () => {
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

  describe("Category Name Validation", () => {
    it("should accept valid category names", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Valid Category Name",
        description: "A valid description",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      expect(cat.name).toBe("Valid Category Name");
    });

    it("should accept category names with special characters", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Category: Special! (Test)",
        description: "Has special chars",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      expect(cat.name).toBe("Category: Special! (Test)");
    });
  });

  describe("Point Value Validation", () => {
    it("should accept standard point values", async () => {
      const validPoints = [10, 20, 30, 40, 50];
      const [board] = await db.insert(boards).values({
        name: "Points Test",
        description: "Test",
        pointValues: validPoints,
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.pointValues).toEqual(validPoints);
    });

    it("should accept empty point values array", async () => {
      const [board] = await db.insert(boards).values({
        name: "Empty Points",
        description: "No points",
        pointValues: [],
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.pointValues).toEqual([]);
    });
  });

  describe("Question Options Validation", () => {
    it("should accept array of options", async () => {
      const [board] = await db.insert(boards).values({
        name: "Options Test Board",
        description: "Test",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "Options Test Cat",
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
        categoryId: bc.id,
        question: "What is the answer?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: "Option A",
        points: 10,
      }).returning();
      cleanupIds.questions.push(q.id);

      expect(q.options).toEqual(["Option A", "Option B", "Option C", "Option D"]);
    });

    it("should accept empty options array", async () => {
      const [board] = await db.insert(boards).values({
        name: "No Options Board",
        description: "Test",
        pointValues: [10, 20, 30, 40, 50],
      }).returning();
      cleanupIds.boards.push(board.id);

      const [cat] = await db.insert(categories).values({
        name: "No Options Cat",
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
        categoryId: bc.id,
        question: "Free response question",
        options: [],
        correctAnswer: "Any answer",
        points: 10,
      }).returning();
      cleanupIds.questions.push(q.id);

      expect(q.options).toEqual([]);
    });
  });

  describe("Source Group Validation", () => {
    it("should accept valid source groups A-E", async () => {
      for (const group of ["A", "B", "C", "D", "E"]) {
        const [cat] = await db.insert(categories).values({
          name: `Validation Group ${group}`,
          description: "Test",
          imageUrl: "/test.png",
          isActive: false,
          sourceGroup: group,
        }).returning();
        cleanupIds.categories.push(cat.id);
        
        expect(cat.sourceGroup).toBe(group);
      }
    });
  });

  describe("Session Code Validation", () => {
    it("should accept alphanumeric session codes", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "ABC123",
        hostId: "test",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      expect(session.code).toBe("ABC123");
    });

    it("should accept session codes with hyphens", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "ABC-123",
        hostId: "test",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      expect(session.code).toBe("ABC-123");
    });
  });
});

describe("Boundary Testing", () => {
  const cleanupIds: { categories: number[]; boards: number[] } = {
    categories: [],
    boards: [],
  };

  afterEach(async () => {
    if (cleanupIds.categories.length > 0) {
      await db.delete(categories).where(inArray(categories.id, cleanupIds.categories));
      cleanupIds.categories = [];
    }
    if (cleanupIds.boards.length > 0) {
      await db.delete(boards).where(inArray(boards.id, cleanupIds.boards));
      cleanupIds.boards = [];
    }
  });

  describe("String Length Boundaries", () => {
    it("should handle long category names", async () => {
      const longName = "A".repeat(200);
      const [cat] = await db.insert(categories).values({
        name: longName,
        description: "Long name test",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      expect(cat.name.length).toBe(200);
    });

    it("should handle long descriptions", async () => {
      const longDesc = "B".repeat(500);
      const [cat] = await db.insert(categories).values({
        name: "Long Desc Cat",
        description: longDesc,
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      expect(cat.description.length).toBe(500);
    });
  });

  describe("Numeric Boundaries", () => {
    it("should handle large point values", async () => {
      const [board] = await db.insert(boards).values({
        name: "Large Points",
        description: "Test",
        pointValues: [1000, 2000, 3000, 4000, 5000],
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.pointValues).toContain(5000);
    });

    it("should handle zero point values", async () => {
      const [board] = await db.insert(boards).values({
        name: "Zero Points",
        description: "Test",
        pointValues: [0, 10, 20, 30, 40],
      }).returning();
      cleanupIds.boards.push(board.id);

      expect(board.pointValues).toContain(0);
    });
  });
});
