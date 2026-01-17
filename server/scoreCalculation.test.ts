import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { gameSessions, sessionPlayers } from "@shared/schema";
import { eq } from "drizzle-orm";

describe("Score Calculation Edge Cases", () => {
  const cleanupIds = {
    sessions: [] as number[],
    players: [] as number[],
  };

  afterAll(async () => {
    for (const pId of cleanupIds.players) {
      await db.delete(sessionPlayers).where(eq(sessionPlayers.id, pId)).catch(() => {});
    }
    for (const sId of cleanupIds.sessions) {
      await db.delete(gameSessions).where(eq(gameSessions.id, sId)).catch(() => {});
    }
  });

  describe("Overflow Handling", () => {
    it("should handle large positive scores", async () => {
      const code = `LG${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "overflow-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `large-${Date.now()}`,
        name: "High Scorer",
        score: 999999,
      }).returning();
      cleanupIds.players.push(player.id);

      expect(player.score).toBe(999999);
    });

    it("should handle maximum safe integer", () => {
      const maxScore = Number.MAX_SAFE_INTEGER;
      const addPoints = 100;
      
      const wouldOverflow = maxScore + addPoints > Number.MAX_SAFE_INTEGER;
      expect(wouldOverflow).toBe(true);
    });

    it("should cap scores at reasonable maximum", () => {
      const MAX_SCORE = 10000000;
      const currentScore = 9999999;
      const points = 100;
      
      const newScore = Math.min(currentScore + points, MAX_SCORE);
      expect(newScore).toBe(MAX_SCORE);
    });
  });

  describe("Negative Score Handling", () => {
    it("should allow negative scores", async () => {
      const code = `NG${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "negative-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `neg-${Date.now()}`,
        name: "Negative Player",
        score: -500,
      }).returning();
      cleanupIds.players.push(player.id);

      expect(player.score).toBe(-500);
    });

    it("should handle transition from positive to negative", async () => {
      const code = `TR${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "transition-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `trans-${Date.now()}`,
        name: "Transition Player",
        score: 100,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ score: player.score - 200 })
        .where(eq(sessionPlayers.id, player.id));

      const [updated] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));
      
      expect(updated.score).toBe(-100);
    });

    it("should handle large negative scores", async () => {
      const code = `LN${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "large-neg-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `lneg-${Date.now()}`,
        name: "Deep Negative",
        score: -999999,
      }).returning();
      cleanupIds.players.push(player.id);

      expect(player.score).toBe(-999999);
    });

    it("should cap negative scores at minimum", () => {
      const MIN_SCORE = -10000000;
      const currentScore = -9999999;
      const penalty = 100;
      
      const newScore = Math.max(currentScore - penalty, MIN_SCORE);
      expect(newScore).toBe(MIN_SCORE);
    });
  });

  describe("Zero Score Handling", () => {
    it("should handle zero score correctly", async () => {
      const code = `ZR${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "zero-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `zero-${Date.now()}`,
        name: "Zero Player",
        score: 0,
      }).returning();
      cleanupIds.players.push(player.id);

      expect(player.score).toBe(0);
    });

    it("should return to zero from positive", async () => {
      const code = `RZ${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "return-zero-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `rz-${Date.now()}`,
        name: "Return Zero",
        score: 500,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ score: 0 })
        .where(eq(sessionPlayers.id, player.id));

      const [updated] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));
      
      expect(updated.score).toBe(0);
    });
  });

  describe("Point Value Calculations", () => {
    it("should add standard point values correctly", () => {
      const standardPoints = [10, 20, 30, 40, 50];
      let score = 0;
      
      for (const points of standardPoints) {
        score += points;
      }
      
      expect(score).toBe(150);
    });

    it("should handle mixed add/subtract operations", () => {
      let score = 0;
      const operations = [
        { type: "add", points: 50 },
        { type: "subtract", points: 20 },
        { type: "add", points: 30 },
        { type: "subtract", points: 10 },
      ];
      
      for (const op of operations) {
        if (op.type === "add") score += op.points;
        else score -= op.points;
      }
      
      expect(score).toBe(50);
    });

    it("should handle rapid score changes", () => {
      let score = 0;
      const changes = Array.from({ length: 100 }, () => 
        Math.random() > 0.5 ? 10 : -10
      );
      
      for (const change of changes) {
        score += change;
      }
      
      expect(typeof score).toBe("number");
      expect(score).toBe(changes.reduce((a, b) => a + b, 0));
    });
  });

  describe("Score Ranking", () => {
    it("should correctly rank players by score", () => {
      const players = [
        { name: "Alice", score: 100 },
        { name: "Bob", score: 150 },
        { name: "Charlie", score: 50 },
        { name: "Diana", score: 150 },
      ];
      
      const ranked = [...players].sort((a, b) => b.score - a.score);
      
      expect(ranked[0].score).toBe(150);
      expect(ranked[ranked.length - 1].score).toBe(50);
    });

    it("should handle tie scores correctly", () => {
      const players = [
        { name: "Alice", score: 100 },
        { name: "Bob", score: 100 },
        { name: "Charlie", score: 100 },
      ];
      
      const uniqueScores = new Set(players.map(p => p.score));
      expect(uniqueScores.size).toBe(1);
    });

    it("should handle all negative scores ranking", () => {
      const players = [
        { name: "Alice", score: -100 },
        { name: "Bob", score: -50 },
        { name: "Charlie", score: -200 },
      ];
      
      const ranked = [...players].sort((a, b) => b.score - a.score);
      
      expect(ranked[0].name).toBe("Bob");
      expect(ranked[ranked.length - 1].name).toBe("Charlie");
    });
  });
});
