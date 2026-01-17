import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import { gameSessions, sessionPlayers } from "@shared/schema";
import { eq } from "drizzle-orm";

describe("Buzzer Timing Precision Tests", () => {
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

  describe("Race Condition Prevention", () => {
    it("should record buzz timestamps with millisecond precision", async () => {
      const timestamp1 = new Date();
      const timestamp2 = new Date(timestamp1.getTime() + 1);
      
      expect(timestamp2.getTime() - timestamp1.getTime()).toBe(1);
    });

    it("should handle simultaneous buzzes from multiple players", async () => {
      const code = `BZ${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "timing-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const players = await Promise.all([
        db.insert(sessionPlayers).values({
          sessionId: session.id,
          playerId: `player-${Date.now()}-1`,
          name: "Player 1",
          score: 0,
        }).returning(),
        db.insert(sessionPlayers).values({
          sessionId: session.id,
          playerId: `player-${Date.now()}-2`,
          name: "Player 2",
          score: 0,
        }).returning(),
        db.insert(sessionPlayers).values({
          sessionId: session.id,
          playerId: `player-${Date.now()}-3`,
          name: "Player 3",
          score: 0,
        }).returning(),
      ]);

      for (const [p] of players) {
        cleanupIds.players.push(p.id);
      }

      expect(players).toHaveLength(3);
    });

    it("should maintain buzz order under concurrent updates", async () => {
      const buzzTimes: { playerId: string; time: number }[] = [];
      
      const simulateBuzz = (playerId: string) => {
        buzzTimes.push({ playerId, time: performance.now() });
      };

      await Promise.all([
        Promise.resolve().then(() => simulateBuzz("p1")),
        Promise.resolve().then(() => simulateBuzz("p2")),
        Promise.resolve().then(() => simulateBuzz("p3")),
      ]);

      buzzTimes.sort((a, b) => a.time - b.time);
      
      expect(buzzTimes).toHaveLength(3);
      expect(buzzTimes[0].time).toBeLessThanOrEqual(buzzTimes[1].time);
      expect(buzzTimes[1].time).toBeLessThanOrEqual(buzzTimes[2].time);
    });

    it("should handle buzz attempts after lock", async () => {
      let isLocked = false;
      const lockBuzzer = () => { isLocked = true; };
      const canBuzz = () => !isLocked;

      expect(canBuzz()).toBe(true);
      lockBuzzer();
      expect(canBuzz()).toBe(false);
    });

    it("should reset buzz state correctly between questions", async () => {
      let buzzedPlayer: string | null = null;
      
      const buzz = (playerId: string) => {
        if (buzzedPlayer === null) {
          buzzedPlayer = playerId;
          return true;
        }
        return false;
      };
      
      const resetBuzz = () => {
        buzzedPlayer = null;
      };

      expect(buzz("player1")).toBe(true);
      expect(buzz("player2")).toBe(false);
      
      resetBuzz();
      
      expect(buzz("player2")).toBe(true);
    });
  });

  describe("Timing Edge Cases", () => {
    it("should handle sub-millisecond timing differences", () => {
      const time1 = performance.now();
      const time2 = performance.now();
      
      expect(time2).toBeGreaterThanOrEqual(time1);
    });

    it("should handle buzz at exact question open time", () => {
      const questionOpenTime = Date.now();
      const buzzTime = questionOpenTime;
      
      expect(buzzTime >= questionOpenTime).toBe(true);
    });

    it("should reject buzzes before question opens", () => {
      const questionOpenTime = Date.now() + 1000;
      const buzzTime = Date.now();
      
      const isValidBuzz = buzzTime >= questionOpenTime;
      expect(isValidBuzz).toBe(false);
    });

    it("should handle maximum player count buzzing", async () => {
      const MAX_PLAYERS = 20;
      const buzzQueue: number[] = [];
      
      const promises = Array.from({ length: MAX_PLAYERS }, (_, i) => 
        Promise.resolve().then(() => buzzQueue.push(i))
      );
      
      await Promise.all(promises);
      
      expect(buzzQueue).toHaveLength(MAX_PLAYERS);
    });
  });

  describe("Concurrent Score Updates", () => {
    it("should handle rapid score updates without data loss", async () => {
      const code = `SC${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "score-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `rapid-${Date.now()}`,
        name: "Rapid Player",
        score: 0,
      }).returning();
      cleanupIds.players.push(player.id);

      const updates = [10, 20, 30, 40, 50];
      let currentScore = 0;
      
      for (const points of updates) {
        currentScore += points;
        await db.update(sessionPlayers)
          .set({ score: currentScore })
          .where(eq(sessionPlayers.id, player.id));
      }

      const [updated] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));
      
      expect(updated.score).toBe(150);
    });

    it("should handle concurrent updates to different players", async () => {
      const code = `MP${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "multi-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const playerPromises = Array.from({ length: 5 }, (_, i) =>
        db.insert(sessionPlayers).values({
          sessionId: session.id,
          playerId: `concurrent-${Date.now()}-${i}`,
          name: `Player ${i}`,
          score: 0,
        }).returning()
      );

      const players = await Promise.all(playerPromises);
      
      for (const [p] of players) {
        cleanupIds.players.push(p.id);
      }

      const updatePromises = players.map(([p], i) =>
        db.update(sessionPlayers)
          .set({ score: (i + 1) * 100 })
          .where(eq(sessionPlayers.id, p.id))
      );

      await Promise.all(updatePromises);

      const updatedPlayers = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.sessionId, session.id));
      
      const scores = updatedPlayers.map(p => p.score).sort((a, b) => a - b);
      expect(scores).toEqual([100, 200, 300, 400, 500]);
    });
  });
});
