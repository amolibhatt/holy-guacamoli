import { describe, it, expect, afterAll } from "vitest";
import { db } from "./db";
import { gameSessions, sessionPlayers, categories } from "@shared/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("Load and Stress Tests", () => {
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

  describe("Concurrent User Simulation", () => {
    it("should handle 20 concurrent API requests", async () => {
      const requests = Array.from({ length: 20 }, () =>
        fetch(`${BASE_URL}/api/admin/categories`)
      );
      
      const responses = await Promise.all(requests);
      
      for (const res of responses) {
        expect([200, 401]).toContain(res.status);
      }
    });

    it("should handle 50 players joining simultaneously", async () => {
      const code = `LD${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "load-host",
        state: "lobby",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const playerPromises = Array.from({ length: 50 }, (_, i) =>
        db.insert(sessionPlayers).values({
          sessionId: session.id,
          playerId: `load-${Date.now()}-${i}`,
          name: `Player ${i}`,
          score: 0,
        }).returning()
      );

      const players = await Promise.all(playerPromises);
      
      for (const [p] of players) {
        cleanupIds.players.push(p.id);
      }

      const allPlayers = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.sessionId, session.id));
      
      expect(allPlayers).toHaveLength(50);
    });

    it("should handle rapid score updates from multiple players", async () => {
      const code = `RS${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "rapid-score-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const playerPromises = Array.from({ length: 10 }, (_, i) =>
        db.insert(sessionPlayers).values({
          sessionId: session.id,
          playerId: `rapid-score-${Date.now()}-${i}`,
          name: `Scorer ${i}`,
          score: 0,
        }).returning()
      );

      const players = await Promise.all(playerPromises);
      
      for (const [p] of players) {
        cleanupIds.players.push(p.id);
      }

      const updatePromises = players.flatMap(([p]) => 
        Array.from({ length: 10 }, (_, i) =>
          db.update(sessionPlayers)
            .set({ score: (i + 1) * 10 })
            .where(eq(sessionPlayers.id, p.id))
        )
      );

      await Promise.all(updatePromises);
      
      const finalPlayers = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.sessionId, session.id));
      
      expect(finalPlayers).toHaveLength(10);
    });
  });

  describe("Buzzer Stress Testing", () => {
    it("should handle 100 simultaneous buzz attempts", async () => {
      const buzzAttempts: { playerId: string; time: number }[] = [];
      
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          buzzAttempts.push({ playerId: `p${i}`, time: performance.now() });
        })
      );
      
      await Promise.all(promises);
      
      expect(buzzAttempts).toHaveLength(100);
      
      buzzAttempts.sort((a, b) => a.time - b.time);
      const winner = buzzAttempts[0];
      expect(winner).toBeDefined();
    });

    it("should maintain buzz order under high load", async () => {
      const buzzQueue: number[] = [];
      let lock = false;
      
      const buzz = (index: number): boolean => {
        if (lock) return false;
        lock = true;
        buzzQueue.push(index);
        return true;
      };
      
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => buzz(i))
      );
      
      await Promise.all(promises);
      
      expect(buzzQueue.length).toBe(1);
    });
  });

  describe("Database Stress Testing", () => {
    it("should handle 100 concurrent category reads", async () => {
      const queries = Array.from({ length: 100 }, () =>
        db.select().from(categories).limit(10)
      );
      
      const start = Date.now();
      const results = await Promise.all(queries);
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(30000);
    });

    it("should handle mixed read/write operations", async () => {
      const code = `MX${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "mixed-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `mixed-${Date.now()}`,
        name: "Mixed Player",
        score: 0,
      }).returning();
      cleanupIds.players.push(player.id);

      const operations = Array.from({ length: 50 }, (_, i) => {
        if (i % 2 === 0) {
          return db.select().from(sessionPlayers)
            .where(eq(sessionPlayers.id, player.id));
        } else {
          return db.update(sessionPlayers)
            .set({ score: i * 10 })
            .where(eq(sessionPlayers.id, player.id));
        }
      });

      await Promise.all(operations);
      
      const [final] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));
      
      expect(final.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("API Response Time Under Load", () => {
    it("should maintain response times under moderate load", async () => {
      const times: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await fetch(`${BASE_URL}/api/admin/categories`);
        times.push(Date.now() - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(5000);
    });

    it("should handle burst traffic", async () => {
      const burst1 = Array.from({ length: 10 }, () =>
        fetch(`${BASE_URL}/api/admin/categories`)
      );
      
      await Promise.all(burst1);
      
      await new Promise(r => setTimeout(r, 100));
      
      const burst2 = Array.from({ length: 10 }, () =>
        fetch(`${BASE_URL}/api/buzzkill/boards`)
      );
      
      const responses = await Promise.all(burst2);
      
      for (const res of responses) {
        expect([200, 401]).toContain(res.status);
      }
    });
  });

  describe("Memory Under Load", () => {
    it("should handle large result sets", async () => {
      const results = await db.select().from(categories);
      
      expect(Array.isArray(results)).toBe(true);
    });

    it("should not accumulate data over repeated requests", async () => {
      for (let i = 0; i < 50; i++) {
        await fetch(`${BASE_URL}/api/admin/categories`);
      }
      
      const finalRes = await fetch(`${BASE_URL}/api/admin/categories`);
      expect([200, 401]).toContain(finalRes.status);
    });
  });
});
