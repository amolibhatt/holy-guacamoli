import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { categories, boards, boardCategories, questions, gameSessions } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";
import { generateDynamicBoard } from "./buzzkillBoards";

describe("Buzzkill Shuffle Algorithm", () => {
  const testIds: { categories: number[]; boards: number[]; boardCategories: number[]; questions: number[]; sessions: number[] } = {
    categories: [],
    boards: [],
    boardCategories: [],
    questions: [],
    sessions: [],
  };

  async function createTestCategory(name: string, sourceGroup: string | null, isActive: boolean) {
    const [cat] = await db.insert(categories).values({
      name,
      description: "Test category",
      imageUrl: "/test.png",
      isActive,
      sourceGroup,
    }).returning();
    testIds.categories.push(cat.id);
    return cat;
  }

  async function createTestBoard(name: string, userId: string | null, isGlobal: boolean) {
    const [board] = await db.insert(boards).values({
      name,
      description: "Test board",
      pointValues: [10, 20, 30, 40, 50],
      userId,
      isGlobal,
    }).returning();
    testIds.boards.push(board.id);
    return board;
  }

  async function linkCategoryToBoard(boardId: number, categoryId: number) {
    const [bc] = await db.insert(boardCategories).values({
      boardId,
      categoryId,
      position: 0,
    }).returning();
    testIds.boardCategories.push(bc.id);
    return bc;
  }

  async function addValidQuestions(categoryId: number) {
    for (const pts of [10, 20, 30, 40, 50]) {
      const [q] = await db.insert(questions).values({
        categoryId,
        question: `Test Q ${pts}`,
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        points: pts,
      }).returning();
      testIds.questions.push(q.id);
    }
  }

  async function createSession(code: string, playedIds: number[] = []) {
    const [session] = await db.insert(gameSessions).values({
      code,
      hostId: "test-host",
      currentMode: "board",
      state: "waiting",
      buzzerLocked: true,
      playedCategoryIds: playedIds,
    }).returning();
    testIds.sessions.push(session.id);
    return session;
  }

  afterEach(async () => {
    if (testIds.questions.length > 0) {
      await db.delete(questions).where(inArray(questions.id, testIds.questions));
      testIds.questions = [];
    }
    if (testIds.boardCategories.length > 0) {
      await db.delete(boardCategories).where(inArray(boardCategories.id, testIds.boardCategories));
      testIds.boardCategories = [];
    }
    if (testIds.categories.length > 0) {
      await db.delete(categories).where(inArray(categories.id, testIds.categories));
      testIds.categories = [];
    }
    if (testIds.boards.length > 0) {
      await db.delete(boards).where(inArray(boards.id, testIds.boards));
      testIds.boards = [];
    }
    if (testIds.sessions.length > 0) {
      await db.delete(gameSessions).where(inArray(gameSessions.id, testIds.sessions));
      testIds.sessions = [];
    }
  });

  describe("generateDynamicBoard", () => {
    it("should return exactly 5 categories when enough are available", async () => {
      const board = await createTestBoard("Test Global", null, true);
      
      for (let i = 0; i < 6; i++) {
        const cat = await createTestCategory(`Test Cat ${i}`, ["A", "B", "C", "D", "E", null][i], true);
        const bc = await linkCategoryToBoard(board.id, cat.id);
        await addValidQuestions(bc.id);
      }
      
      const session = await createSession("TEST1");
      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      expect(result.categories.length).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it("should handle sparse data gracefully", async () => {
      const board = await createTestBoard("Test Sparse", null, true);
      
      for (let i = 0; i < 3; i++) {
        const cat = await createTestCategory(`Sparse Cat ${i}`, "A", true);
        const bc = await linkCategoryToBoard(board.id, cat.id);
        await addValidQuestions(bc.id);
      }
      
      const session = await createSession("TEST2");
      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      expect(result.categories.length).toBeLessThanOrEqual(5);
    });

    it("should track played categories in session", async () => {
      const board = await createTestBoard("Test Track", null, true);
      
      for (let i = 0; i < 6; i++) {
        const cat = await createTestCategory(`Track Cat ${i}`, ["A", "B", "C", "D", "E", null][i], true);
        const bc = await linkCategoryToBoard(board.id, cat.id);
        await addValidQuestions(bc.id);
      }
      
      const session = await createSession("TEST3");
      await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      const [updated] = await db.select().from(gameSessions).where(eq(gameSessions.id, session.id));
      const played = (updated.playedCategoryIds as number[]) || [];
      
      expect(played.length).toBe(5);
    });

    it("should handle previously played categories", async () => {
      const board = await createTestBoard("Test Reset", null, true);
      const createdCatIds: number[] = [];
      
      for (let i = 0; i < 7; i++) {
        const cat = await createTestCategory(`Reset Cat ${i}`, ["A", "B", "C", "D", "E", null, null][i], true);
        const bc = await linkCategoryToBoard(board.id, cat.id);
        await addValidQuestions(bc.id);
        createdCatIds.push(cat.id);
      }
      
      const prePlayedIds = createdCatIds.slice(0, 2);
      const session = await createSession("TEST4", prePlayedIds);
      
      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      expect(result.categories.length).toBe(5);
      const playedInResult = result.categories.filter(c => prePlayedIds.includes(c.id));
      expect(playedInResult.length).toBe(0);
    });

    it("should prefer diverse source groups", async () => {
      const board = await createTestBoard("Test Diverse", null, true);
      
      for (const group of ["A", "B", "C", "D", "E"]) {
        const cat = await createTestCategory(`Group ${group}`, group, true);
        const bc = await linkCategoryToBoard(board.id, cat.id);
        await addValidQuestions(bc.id);
      }
      
      const session = await createSession("TEST5");
      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      const groups = result.categories.map(c => c.sourceGroup);
      const uniqueGroups = new Set(groups);
      
      expect(uniqueGroups.size).toBeGreaterThanOrEqual(3);
    });

    it("should return no categories when session not found", async () => {
      const result = await generateDynamicBoard(999999, { mode: "starter", userId: "test", userRole: "admin" });
      
      expect(result.categories.length).toBe(0);
      expect(result.error).toBe("Session not found");
    });

    it("should prioritize personal categories in meld mode", async () => {
      const globalBoard = await createTestBoard("Test Global Meld", null, true);
      const personalBoard = await createTestBoard("Test Personal Meld", "test-user", false);
      
      for (let i = 0; i < 3; i++) {
        const cat = await createTestCategory(`Global Cat ${i}`, ["A", "B", "C"][i], true);
        const bc = await linkCategoryToBoard(globalBoard.id, cat.id);
        await addValidQuestions(bc.id);
      }
      
      for (let i = 0; i < 3; i++) {
        const cat = await createTestCategory(`Personal Cat ${i}`, ["D", "E", null][i], true);
        const bc = await linkCategoryToBoard(personalBoard.id, cat.id);
        await addValidQuestions(bc.id);
      }
      
      const session = await createSession("TEST6");
      const result = await generateDynamicBoard(session.id, { mode: "meld", userId: "test-user", userRole: "admin" });
      
      expect(result.categories.length).toBe(5);
    });
  });

  describe("Category Validation", () => {
    it("should only include categories with exactly 5 questions", async () => {
      const board = await createTestBoard("Test Valid", null, true);
      
      const validCat = await createTestCategory("Valid 5Q", "A", true);
      const validBc = await linkCategoryToBoard(board.id, validCat.id);
      await addValidQuestions(validBc.id);
      
      const invalidCat = await createTestCategory("Invalid 3Q", "B", true);
      const invalidBc = await linkCategoryToBoard(board.id, invalidCat.id);
      for (const pts of [10, 20, 30]) {
        const [q] = await db.insert(questions).values({
          categoryId: invalidBc.id,
          question: `Q${pts}`,
          options: ["A", "B", "C", "D"],
          correctAnswer: "A",
          points: pts,
        }).returning();
        testIds.questions.push(q.id);
      }
      
      for (let i = 0; i < 5; i++) {
        const cat = await createTestCategory(`Extra Cat ${i}`, ["C", "D", "E", null, null][i], true);
        const bc = await linkCategoryToBoard(board.id, cat.id);
        await addValidQuestions(bc.id);
      }
      
      const session = await createSession("TEST7");
      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      const hasInvalid = result.categories.some(c => c.name === "Invalid 3Q");
      expect(hasInvalid).toBe(false);
    });

    it("should reject categories with duplicate points", async () => {
      const board = await createTestBoard("Test Dupes", null, true);
      
      const dupeCat = await createTestCategory("Dupe Points", "A", true);
      const dupeBc = await linkCategoryToBoard(board.id, dupeCat.id);
      for (const pts of [10, 20, 20, 40, 50]) {
        const [q] = await db.insert(questions).values({
          categoryId: dupeBc.id,
          question: `Q${pts}`,
          options: ["A", "B", "C", "D"],
          correctAnswer: "A",
          points: pts,
        }).returning();
        testIds.questions.push(q.id);
      }
      
      for (let i = 0; i < 6; i++) {
        const cat = await createTestCategory(`Valid Cat ${i}`, ["B", "C", "D", "E", null, null][i], true);
        const bc = await linkCategoryToBoard(board.id, cat.id);
        await addValidQuestions(bc.id);
      }
      
      const session = await createSession("TEST8");
      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      const hasDupe = result.categories.some(c => c.name === "Dupe Points");
      expect(hasDupe).toBe(false);
    });

    it("should exclude inactive categories", async () => {
      const board = await createTestBoard("Test Inactive", null, true);
      
      const inactiveCat = await createTestCategory("Inactive Cat", "A", false);
      const inactiveBc = await linkCategoryToBoard(board.id, inactiveCat.id);
      await addValidQuestions(inactiveBc.id);
      
      for (let i = 0; i < 6; i++) {
        const cat = await createTestCategory(`Active Cat ${i}`, ["B", "C", "D", "E", null, null][i], true);
        const bc = await linkCategoryToBoard(board.id, cat.id);
        await addValidQuestions(bc.id);
      }
      
      const session = await createSession("TEST9");
      const result = await generateDynamicBoard(session.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      const hasInactive = result.categories.some(c => c.name === "Inactive Cat");
      expect(hasInactive).toBe(false);
    });
  });

  describe("Session Isolation", () => {
    it("should not share played categories between sessions", async () => {
      const board = await createTestBoard("Test Isolation", null, true);
      
      for (let i = 0; i < 10; i++) {
        const cat = await createTestCategory(`Iso Cat ${i}`, ["A", "B", "C", "D", "E"][i % 5], true);
        const bc = await linkCategoryToBoard(board.id, cat.id);
        await addValidQuestions(bc.id);
      }
      
      const session1 = await createSession("ISO1");
      const session2 = await createSession("ISO2");
      
      await generateDynamicBoard(session1.id, { mode: "starter", userId: "test", userRole: "admin" });
      
      const [s1] = await db.select().from(gameSessions).where(eq(gameSessions.id, session1.id));
      const [s2] = await db.select().from(gameSessions).where(eq(gameSessions.id, session2.id));
      
      const played1 = (s1.playedCategoryIds as number[]) || [];
      const played2 = (s2.playedCategoryIds as number[]) || [];
      
      expect(played1.length).toBe(5);
      expect(played2.length).toBe(0);
    });
  });
});
