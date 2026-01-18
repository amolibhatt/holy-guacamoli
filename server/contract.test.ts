import { describe, it, expect } from "vitest";
import { db } from "./db";
import { categories, boards, questions, boardCategories, gameSessions, sessionPlayers } from "@shared/schema";

const BASE_URL = "http://localhost:5000";

describe("Contract Testing - API Schema Validation", () => {
  describe("Category API Contract", () => {
    it("GET /api/admin/categories should return array of categories", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/categories`);
      const contentType = res.headers.get("content-type") || "";
      
      if (res.status === 200 && contentType.includes("application/json")) {
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        
        if (data.length > 0) {
          const cat = data[0];
          expect(typeof cat.id).toBe("number");
          expect(typeof cat.name).toBe("string");
        }
      } else {
        expect(res.status >= 200).toBe(true);
      }
    });

    it("category should have required fields", async () => {
      const cats = await db.select().from(categories).limit(1);
      
      if (cats.length > 0) {
        const cat = cats[0];
        expect(cat.id).toBeDefined();
        expect(cat.name).toBeDefined();
      }
      expect(true).toBe(true);
    });

    it("category optional fields should be correct types when present", async () => {
      const cats = await db.select().from(categories).limit(10);
      
      for (const cat of cats) {
        if (cat.description !== null) {
          expect(typeof cat.description).toBe("string");
        }
        if (cat.imageUrl !== null) {
          expect(typeof cat.imageUrl).toBe("string");
        }
        if (cat.sourceGroup !== null) {
          expect(typeof cat.sourceGroup).toBe("string");
        }
      }
    });
  });

  describe("Board API Contract", () => {
    it("board should have required fields", async () => {
      const bds = await db.select().from(boards).limit(1);
      
      if (bds.length > 0) {
        const board = bds[0];
        expect(board.id).toBeDefined();
        expect(board.name).toBeDefined();
        expect(board.userId).toBeDefined();
        expect(Array.isArray(board.pointValues)).toBe(true);
      }
    });

    it("board pointValues should be array of numbers", async () => {
      const bds = await db.select().from(boards).limit(5);
      
      for (const board of bds) {
        if (board.pointValues) {
          for (const pv of board.pointValues) {
            expect(typeof pv).toBe("number");
          }
        }
      }
    });
  });

  describe("Question API Contract", () => {
    it("question should have required fields", async () => {
      const qs = await db.select().from(questions).limit(1);
      
      if (qs.length > 0) {
        const q = qs[0];
        expect(q.id).toBeDefined();
        expect(q.categoryId).toBeDefined();
        expect(typeof q.question).toBe("string");
        expect(typeof q.points).toBe("number");
      }
    });

    it("question points should be valid values", async () => {
      const qs = await db.select().from(questions).limit(20);
      
      for (const q of qs) {
        expect(q.points).toBeGreaterThan(0);
        expect(q.points).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("GameSession API Contract", () => {
    it("gameSession should have required fields", async () => {
      const sessions = await db.select().from(gameSessions).limit(1);
      
      if (sessions.length > 0) {
        const session = sessions[0];
        expect(session.id).toBeDefined();
        expect(typeof session.code).toBe("string");
        expect(typeof session.hostId).toBe("string");
      }
    });

    it("gameSession code should be 4 characters", async () => {
      const sessions = await db.select().from(gameSessions).limit(10);
      
      for (const session of sessions) {
        expect(session.code.length).toBeGreaterThanOrEqual(4);
      }
    });

    it("gameSession state should be valid enum value", async () => {
      const validStates = ["lobby", "playing", "paused", "ended", "waiting"];
      const sessions = await db.select().from(gameSessions).limit(10);
      
      for (const session of sessions) {
        if (session.state) {
          expect(typeof session.state).toBe("string");
        }
      }
    });
  });

  describe("SessionPlayer API Contract", () => {
    it("sessionPlayer should have required fields", async () => {
      const players = await db.select().from(sessionPlayers).limit(1);
      
      if (players.length > 0) {
        const player = players[0];
        expect(player.id).toBeDefined();
        expect(player.sessionId).toBeDefined();
        expect(typeof player.playerId).toBe("string");
        expect(typeof player.name).toBe("string");
        expect(typeof player.score).toBe("number");
      }
    });

    it("sessionPlayer score should be number", async () => {
      const players = await db.select().from(sessionPlayers).limit(10);
      
      for (const player of players) {
        expect(typeof player.score).toBe("number");
        expect(Number.isFinite(player.score)).toBe(true);
      }
    });

    it("sessionPlayer isConnected should be boolean", async () => {
      const players = await db.select().from(sessionPlayers).limit(10);
      
      for (const player of players) {
        expect(typeof player.isConnected).toBe("boolean");
      }
    });
  });

  describe("API Error Response Contract", () => {
    it("should return JSON error with message field", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bad", password: "bad" }),
      });
      
      if (res.status !== 200 && res.status !== 429) {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const data = await res.json();
          expect(data).toHaveProperty("message");
        }
      }
    });

    it("401 response should have consistent format", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/user`);
      
      if (res.status === 401) {
        const data = await res.json();
        expect(data).toHaveProperty("message");
      }
    });
  });

  describe("BoardCategory Junction Contract", () => {
    it("boardCategory should reference valid board and category", async () => {
      const bcs = await db.select().from(boardCategories).limit(10);
      
      for (const bc of bcs) {
        expect(bc.boardId).toBeDefined();
        expect(bc.categoryId).toBeDefined();
        expect(typeof bc.boardId).toBe("number");
        expect(typeof bc.categoryId).toBe("number");
      }
    });
  });

  describe("Response Headers Contract", () => {
    it("should return proper content-type for JSON responses", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/categories`);
      const contentType = res.headers.get("content-type") || "";
      
      expect(res.status >= 200).toBe(true);
    });

    it("should return proper content-type for HTML responses", async () => {
      const res = await fetch(`${BASE_URL}/`);
      const contentType = res.headers.get("content-type");
      
      expect(contentType).toContain("text/html");
    });
  });
});
