import { describe, it, expect, afterAll } from "vitest";
import { db } from "./db";
import { gameSessions, sessionPlayers } from "@shared/schema";
import { eq } from "drizzle-orm";

describe("Session Persistence Tests", () => {
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

  describe("Game State Survives Database Operations", () => {
    it("should persist game session to database", async () => {
      const code = `PS${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "persist-host",
        state: "playing",
        currentMode: "buzzkill",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [retrieved] = await db.select().from(gameSessions)
        .where(eq(gameSessions.id, session.id));
      
      expect(retrieved.code).toBe(code);
      expect(retrieved.state).toBe("playing");
      expect(retrieved.currentMode).toBe("buzzkill");
    });

    it("should persist player scores across queries", async () => {
      const code = `SC${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "score-persist-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `persist-player-${Date.now()}`,
        name: "Persistent Player",
        score: 500,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ score: 750 })
        .where(eq(sessionPlayers.id, player.id));

      const [updated] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));
      
      expect(updated.score).toBe(750);
    });

    it("should maintain player list across session updates", async () => {
      const code = `PL${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "playerlist-host",
        state: "lobby",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const playerPromises = Array.from({ length: 5 }, (_, i) =>
        db.insert(sessionPlayers).values({
          sessionId: session.id,
          playerId: `list-player-${Date.now()}-${i}`,
          name: `Player ${i}`,
          score: 0,
        }).returning()
      );

      const players = await Promise.all(playerPromises);
      for (const [p] of players) {
        cleanupIds.players.push(p.id);
      }

      await db.update(gameSessions)
        .set({ state: "playing" })
        .where(eq(gameSessions.id, session.id));

      const sessionPlayers2 = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.sessionId, session.id));
      
      expect(sessionPlayers2).toHaveLength(5);
    });
  });

  describe("State Recovery", () => {
    it("should recover session by room code", async () => {
      const code = `RC${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "recovery-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [recovered] = await db.select().from(gameSessions)
        .where(eq(gameSessions.code, code));
      
      expect(recovered.id).toBe(session.id);
    });

    it("should recover all players in session", async () => {
      const code = `RP${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "recover-players-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player1] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `rp1-${Date.now()}`,
        name: "Player 1",
        score: 100,
      }).returning();
      cleanupIds.players.push(player1.id);

      const [player2] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `rp2-${Date.now()}`,
        name: "Player 2",
        score: 200,
      }).returning();
      cleanupIds.players.push(player2.id);

      const recoveredPlayers = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.sessionId, session.id));
      
      expect(recoveredPlayers).toHaveLength(2);
      expect(recoveredPlayers.map(p => p.score).sort()).toEqual([100, 200]);
    });

    it("should preserve game mode across recovery", async () => {
      const code = `GM${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "gamemode-host",
        state: "playing",
        currentMode: "sequence_squeeze",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [recovered] = await db.select().from(gameSessions)
        .where(eq(gameSessions.id, session.id));
      
      expect(recovered.currentMode).toBe("sequence_squeeze");
    });
  });

  describe("Connection State Tracking", () => {
    it("should track player connection status", async () => {
      const code = `CN${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "connection-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `conn-${Date.now()}`,
        name: "Connected Player",
        score: 0,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      expect(player.isConnected).toBe(true);

      await db.update(sessionPlayers)
        .set({ isConnected: false })
        .where(eq(sessionPlayers.id, player.id));

      const [disconnected] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));
      
      expect(disconnected.isConnected).toBe(false);
    });

    it("should handle reconnection with state preservation", async () => {
      const code = `RE${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "reconnect-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const playerId = `reconn-${Date.now()}`;
      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId,
        name: "Reconnecting Player",
        score: 350,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ isConnected: false })
        .where(eq(sessionPlayers.id, player.id));

      await db.update(sessionPlayers)
        .set({ isConnected: true })
        .where(eq(sessionPlayers.id, player.id));

      const [reconnected] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));
      
      expect(reconnected.score).toBe(350);
      expect(reconnected.isConnected).toBe(true);
    });
  });

  describe("Cross-Game Mode State", () => {
    it("should preserve scores when switching game modes", async () => {
      const code = `SW${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "switch-host",
        state: "playing",
        currentMode: "buzzkill",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `switch-${Date.now()}`,
        name: "Mode Switcher",
        score: 500,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(gameSessions)
        .set({ currentMode: "sequence_squeeze" })
        .where(eq(gameSessions.id, session.id));

      const [playerAfterSwitch] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));
      
      expect(playerAfterSwitch.score).toBe(500);
    });
  });
});
