import { describe, it, expect, afterAll } from "vitest";
import { db } from "./db";
import { categories, gameSessions, sessionPlayers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

describe("Chaos Testing - Failure Scenarios", () => {
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

  describe("Network Failure Simulation", () => {
    it("should handle request timeout gracefully", async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100);
      
      try {
        await fetch("http://localhost:5000/api/admin/categories", {
          signal: controller.signal,
        });
      } catch (error: any) {
        expect(error.name === "AbortError" || error.code === "ABORT_ERR").toBe(true);
      } finally {
        clearTimeout(timeoutId);
      }
    });

    it("should recover after network hiccup", async () => {
      try {
        await fetch("http://invalid-host:9999/api/test");
      } catch {
      }
      
      const res = await fetch("http://localhost:5000/api/admin/categories");
      expect([200, 401]).toContain(res.status);
    });

    it("should handle connection refused", async () => {
      try {
        await fetch("http://localhost:59999/api/test");
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Database Timeout Simulation", () => {
    it("should handle slow queries", async () => {
      const start = Date.now();
      const result = await db.select().from(categories);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(30000);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should recover after query error", async () => {
      try {
        await db.execute(sql`SELECT * FROM nonexistent_table_abc`);
      } catch {
      }
      
      const result = await db.select().from(categories).limit(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle malformed SQL gracefully", async () => {
      try {
        await db.execute(sql`SELEC * FORM categories`);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Service Crash Recovery", () => {
    it("should persist game state in database", async () => {
      const code = `CH${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "chaos-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `chaos-${Date.now()}`,
        name: "Chaos Player",
        score: 500,
      }).returning();
      cleanupIds.players.push(player.id);

      const [recovered] = await db.select().from(gameSessions)
        .where(eq(gameSessions.code, code));
      
      expect(recovered.state).toBe("playing");
    });

    it("should allow state recovery after crash", async () => {
      const code = `RC${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "recovery-host",
        state: "playing",
        currentMode: "buzzkill",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const recovered = await db.select().from(gameSessions)
        .where(eq(gameSessions.code, code));
      
      expect(recovered).toHaveLength(1);
      expect(recovered[0].currentMode).toBe("buzzkill");
    });
  });

  describe("Partial Failure Handling", () => {
    it("should handle partial data scenarios", async () => {
      const code = `PF${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "partial-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [retrieved] = await db.select().from(gameSessions)
        .where(eq(gameSessions.id, session.id));
      
      expect(retrieved).toBeDefined();
    });

    it("should handle missing optional data", async () => {
      const cats = await db.select().from(categories)
        .where(eq(categories.isActive, true))
        .limit(1);
      
      if (cats.length > 0) {
        expect(cats[0].name).toBeDefined();
      }
    });
  });

  describe("Concurrent Failure Handling", () => {
    it("should handle multiple simultaneous errors", async () => {
      const errorPromises = Array.from({ length: 5 }, () =>
        db.execute(sql`SELECT * FROM nonexistent_${Date.now()}`)
          .catch(() => "error")
      );
      
      const results = await Promise.all(errorPromises);
      
      for (const result of results) {
        expect(result).toBe("error");
      }
    });

    it("should continue processing after partial failure", async () => {
      const operations = [
        db.select().from(categories).limit(1),
        db.execute(sql`SELECT * FROM bad_table`).catch(() => []),
        db.select().from(categories).limit(1),
      ];
      
      const results = await Promise.all(operations);
      
      expect(Array.isArray(results[0])).toBe(true);
      expect(Array.isArray(results[2])).toBe(true);
    });
  });

  describe("Invalid Input Handling", () => {
    it("should reject invalid JSON in request body", async () => {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid json",
      });
      
      expect([400, 429, 500]).toContain(res.status);
    });

    it("should handle extremely large payloads", async () => {
      const largeBody = JSON.stringify({
        email: "a".repeat(100000),
        password: "test",
      });
      
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: largeBody,
      });
      
      expect([400, 401, 413, 429, 500]).toContain(res.status);
    });

    it("should handle null bytes in input", async () => {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test\x00@test.com",
          password: "pass\x00word",
        }),
      });
      
      expect([400, 401, 429]).toContain(res.status);
    });
  });
});
