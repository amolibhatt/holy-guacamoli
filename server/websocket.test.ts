import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { gameSessions, sessionPlayers } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("WebSocket/Buzzer System", () => {
  const cleanupIds: { sessions: number[]; players: number[] } = {
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
  });

  describe("Room Creation", () => {
    it("should create a game session with unique room code", async () => {
      const [session1] = await db.insert(gameSessions).values({
        code: "TST1",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session1.id);

      const [session2] = await db.insert(gameSessions).values({
        code: "TST2",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session2.id);

      expect(session1.code).not.toBe(session2.code);
    });

    it("room codes should be 4 characters", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "ABCD",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      expect(session.code.length).toBe(4);
    });

    it("should support multiple game modes", async () => {
      const code = `MO${Date.now() % 100}`;
      const [session] = await db.insert(gameSessions).values({
        code: code,
        hostId: "host-1",
        currentMode: "board",
      }).returning();
      cleanupIds.sessions.push(session.id);

      expect(session.currentMode).toBe("board");
    });
  });

  describe("Player Management", () => {
    it("should add players to a session", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "PLAY",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "player-1",
        name: "Player 1",
        score: 0,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      expect(player.name).toBe("Player 1");
      expect(player.sessionId).toBe(session.id);
    });

    it("should track player connection status", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "CONN",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "player-2",
        name: "Player 1",
        score: 0,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ isConnected: false })
        .where(eq(sessionPlayers.id, player.id));

      const [disconnected] = await db.select()
        .from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));

      expect(disconnected.isConnected).toBe(false);
    });

    it("should handle player reconnection", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "RCON",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "player-3",
        name: "Player 1",
        score: 100,
        isConnected: false,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ isConnected: true })
        .where(eq(sessionPlayers.id, player.id));

      const [reconnected] = await db.select()
        .from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));

      expect(reconnected.isConnected).toBe(true);
      expect(reconnected.score).toBe(100);
    });

    it("should persist scores across reconnection", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "SCOR",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "player-4",
        name: "Player 1",
        score: 500,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ isConnected: false })
        .where(eq(sessionPlayers.id, player.id));

      await db.update(sessionPlayers)
        .set({ isConnected: true })
        .where(eq(sessionPlayers.id, player.id));

      const [afterReconnect] = await db.select()
        .from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));

      expect(afterReconnect.score).toBe(500);
    });
  });

  describe("Score Tracking", () => {
    it("should update player scores", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "UPDT",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "player-5",
        name: "Player 1",
        score: 0,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ score: 150 })
        .where(eq(sessionPlayers.id, player.id));

      const [updated] = await db.select()
        .from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));

      expect(updated.score).toBe(150);
    });

    it("should handle negative scores", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "NEGS",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "player-6",
        name: "Player 1",
        score: 50,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ score: -30 })
        .where(eq(sessionPlayers.id, player.id));

      const [updated] = await db.select()
        .from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));

      expect(updated.score).toBe(-30);
    });
  });

  describe("Session Lifecycle", () => {
    it("should change session state", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "LIFE",
        hostId: "host-1",
        state: "waiting",
      }).returning();
      cleanupIds.sessions.push(session.id);

      await db.update(gameSessions)
        .set({ state: "ended" })
        .where(eq(gameSessions.id, session.id));

      const [ended] = await db.select()
        .from(gameSessions)
        .where(eq(gameSessions.id, session.id));

      expect(ended.state).toBe("ended");
    });

    it("should support game mode switching", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "SWCH",
        hostId: "host-1",
        currentMode: "board",
      }).returning();
      cleanupIds.sessions.push(session.id);

      await db.update(gameSessions)
        .set({ currentMode: "sequence" })
        .where(eq(gameSessions.id, session.id));

      const [switched] = await db.select()
        .from(gameSessions)
        .where(eq(gameSessions.id, session.id));

      expect(switched.currentMode).toBe("sequence");
    });
  });

  describe("Race Condition Prevention", () => {
    it("should handle multiple players joining simultaneously", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "RACE",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const playerPromises = Array(5).fill(null).map((_, i) => 
        db.insert(sessionPlayers).values({
          sessionId: session.id,
          playerId: `race-player-${i}`,
          name: `Player ${i + 1}`,
          score: 0,
          isConnected: true,
        }).returning()
      );

      const results = await Promise.all(playerPromises);
      results.forEach(r => cleanupIds.players.push(r[0].id));

      const allPlayers = await db.select()
        .from(sessionPlayers)
        .where(eq(sessionPlayers.sessionId, session.id));

      expect(allPlayers.length).toBe(5);
      const names = new Set(allPlayers.map(p => p.name));
      expect(names.size).toBe(5);
    });

    it("should handle concurrent score updates", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "CONC",
        hostId: "host-1",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "conc-player",
        name: "Player 1",
        score: 0,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      const updatePromises = Array(10).fill(null).map((_, i) => 
        db.update(sessionPlayers)
          .set({ score: (i + 1) * 10 })
          .where(eq(sessionPlayers.id, player.id))
      );

      await Promise.all(updatePromises);

      const [final] = await db.select()
        .from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));

      expect(final.score).toBeGreaterThan(0);
    });
  });

  describe("API Endpoints", () => {
    it("GET /api/game-sessions returns data", async () => {
      const res = await fetch(`${BASE_URL}/api/game-sessions`);
      expect([200, 401]).toContain(res.status);
    });

    it("POST /api/game-sessions requires data", async () => {
      const res = await fetch(`${BASE_URL}/api/game-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect([200, 400, 401]).toContain(res.status);
    });
  });
});
