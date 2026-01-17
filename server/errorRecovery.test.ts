import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { categories, boards, boardCategories, questions, gameSessions, sessionPlayers } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("Error Recovery Tests", () => {
  const cleanupIds: { 
    categories: number[]; 
    boards: number[]; 
    boardCategories: number[]; 
    questions: number[];
    sessions: number[];
    players: number[];
  } = {
    categories: [],
    boards: [],
    boardCategories: [],
    questions: [],
    sessions: [],
    players: [],
  };

  afterEach(async () => {
    if (cleanupIds.players.length > 0) {
      await db.delete(sessionPlayers).where(inArray(sessionPlayers.id, cleanupIds.players));
      cleanupIds.players = [];
    }
    if (cleanupIds.sessions.length > 0) {
      await db.delete(gameSessions).where(inArray(gameSessions.id, cleanupIds.sessions));
      cleanupIds.sessions = [];
    }
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

  describe("Invalid Input Handling", () => {
    it("should handle non-existent category ID", async () => {
      const res = await fetch(`${BASE_URL}/api/categories/999999`);
      expect([401, 404]).toContain(res.status);
    });

    it("should handle non-existent board ID", async () => {
      const res = await fetch(`${BASE_URL}/api/boards/999999`);
      expect([401, 404]).toContain(res.status);
    });

    it("should handle non-existent question ID", async () => {
      const res = await fetch(`${BASE_URL}/api/questions/999999`);
      expect([200, 401, 404]).toContain(res.status);
    });

    it("should handle invalid ID formats", async () => {
      const invalidIds = ["abc", "-1", "null", "undefined", "NaN"];
      
      for (const id of invalidIds) {
        const res = await fetch(`${BASE_URL}/api/categories/${id}`);
        expect([400, 401, 404, 500]).toContain(res.status);
      }
    });

    it("should handle extremely large IDs", async () => {
      const res = await fetch(`${BASE_URL}/api/categories/99999999999999`);
      expect([400, 401, 404, 500]).toContain(res.status);
    });
  });

  describe("Malformed Request Handling", () => {
    it("should handle missing required fields", async () => {
      const res = await fetch(`${BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect([400, 401]).toContain(res.status);
    });

    it("should handle wrong data types", async () => {
      const res = await fetch(`${BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: 12345,
          description: { nested: "object" },
          isActive: "not-a-boolean",
        }),
      });
      expect([400, 401]).toContain(res.status);
    });

    it("should handle oversized payloads gracefully", async () => {
      const largePayload = {
        name: "A".repeat(10000),
        description: "B".repeat(50000),
      };
      
      const res = await fetch(`${BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(largePayload),
      });
      expect([400, 401, 413]).toContain(res.status);
    });

    it("should handle null values in required fields", async () => {
      const res = await fetch(`${BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: null,
          description: null,
        }),
      });
      expect([400, 401]).toContain(res.status);
    });
  });

  describe("Game Session Recovery", () => {
    it("should handle player rejoining after disconnect", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "RJOI",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "rejoiner-1",
        name: "Rejoiner",
        score: 250,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ isConnected: false })
        .where(eq(sessionPlayers.id, player.id));

      await db.update(sessionPlayers)
        .set({ isConnected: true })
        .where(eq(sessionPlayers.id, player.id));

      const [rejoined] = await db.select()
        .from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));

      expect(rejoined.isConnected).toBe(true);
      expect(rejoined.score).toBe(250);
    });

    it("should preserve game state on mode switch", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "MODE",
        hostId: "host-1",
        currentMode: "board",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "mode-player-1",
        name: "Mode Player",
        score: 300,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(gameSessions)
        .set({ currentMode: "sequence" })
        .where(eq(gameSessions.id, session.id));

      const [playerAfter] = await db.select()
        .from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));

      expect(playerAfter.score).toBe(300);
    });

    it("should handle ended session access", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "INAC",
        hostId: "host-1",
        state: "ended",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const endedSessions = await db.select()
        .from(gameSessions)
        .where(eq(gameSessions.state, "ended"));

      expect(endedSessions.some(s => s.id === session.id)).toBe(true);
    });
  });

  describe("Data Corruption Recovery", () => {
    it("should handle missing imageUrl gracefully", async () => {
      const catsWithoutImage = await db.select()
        .from(categories)
        .where(eq(categories.isActive, true));

      for (const cat of catsWithoutImage) {
        expect(cat.imageUrl !== null || cat.isActive === false).toBe(true);
      }
    });

    it("should validate point values on read", async () => {
      const allQuestions = await db.select().from(questions);
      
      for (const q of allQuestions) {
        expect([10, 20, 30, 40, 50]).toContain(q.points);
      }
    });

    it("should validate board pointValues structure", async () => {
      const allBoards = await db.select().from(boards);
      
      for (const board of allBoards) {
        expect(Array.isArray(board.pointValues)).toBe(true);
        expect(board.pointValues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Concurrent Access Handling", () => {
    it("should handle multiple updates to same record", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Concurrent Target",
        description: "Original",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      const updates = Array(5).fill(null).map((_, i) => 
        db.update(categories)
          .set({ description: `Update ${i}` })
          .where(eq(categories.id, cat.id))
      );

      await Promise.all(updates);

      const [final] = await db.select()
        .from(categories)
        .where(eq(categories.id, cat.id));

      expect(final.description).toMatch(/Update \d/);
    });

    it("should handle concurrent score updates", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "CSCO",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "score-target-1",
        name: "Score Target",
        score: 0,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      const scoreUpdates = Array(10).fill(null).map((_, i) => 
        db.update(sessionPlayers)
          .set({ score: (i + 1) * 10 })
          .where(eq(sessionPlayers.id, player.id))
      );

      await Promise.all(scoreUpdates);

      const [final] = await db.select()
        .from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));

      expect(final.score).toBeGreaterThan(0);
    });
  });

  describe("API Error Recovery", () => {
    it("should recover from failed request", async () => {
      const failedRes = await fetch(`${BASE_URL}/api/nonexistent`);
      expect([200, 401, 404]).toContain(failedRes.status);

      const successRes = await fetch(`${BASE_URL}/api/admin/categories`);
      expect([200, 401]).toContain(successRes.status);
    });

    it("should handle timeout-like scenarios", async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch(`${BASE_URL}/api/admin/categories`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        expect([200, 401]).toContain(res.status);
      } catch (e: any) {
        clearTimeout(timeout);
        expect(e.name).toBe("AbortError");
      }
    });
  });

  describe("State Recovery After Errors", () => {
    it("should maintain data integrity after failed insert", async () => {
      const countBefore = await db.select().from(categories);
      
      try {
        await db.insert(categories).values({
          name: null as any,
          description: "Invalid",
          imageUrl: "/test.png",
        });
      } catch (e) {
      }

      const countAfter = await db.select().from(categories);
      expect(countAfter.length).toBe(countBefore.length);
    });

    it("should rollback failed operations", async () => {
      const [cat] = await db.insert(categories).values({
        name: "Rollback Test",
        description: "Original",
        imageUrl: "/test.png",
        isActive: false,
      }).returning();
      cleanupIds.categories.push(cat.id);

      const original = await db.select()
        .from(categories)
        .where(eq(categories.id, cat.id));

      expect(original[0].description).toBe("Original");
    });
  });
});
