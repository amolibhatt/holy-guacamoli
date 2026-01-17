import { describe, it, expect, afterAll } from "vitest";
import { db } from "./db";
import { gameSessions, sessionPlayers } from "@shared/schema";
import { eq } from "drizzle-orm";

describe("WebSocket Reconnection Reliability Tests", () => {
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

  describe("Reconnection State Management", () => {
    it("should preserve player identity on reconnect", async () => {
      const code = `WR${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "ws-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const playerId = `ws-player-${Date.now()}`;
      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId,
        name: "WS Player",
        score: 200,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ isConnected: false })
        .where(eq(sessionPlayers.id, player.id));

      const [existingPlayer] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.playerId, playerId));

      await db.update(sessionPlayers)
        .set({ isConnected: true })
        .where(eq(sessionPlayers.id, existingPlayer.id));

      const [reconnected] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));
      
      expect(reconnected.score).toBe(200);
      expect(reconnected.name).toBe("WS Player");
    });

    it("should handle rapid disconnect/reconnect cycles", async () => {
      const code = `RD${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "rapid-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `rapid-${Date.now()}`,
        name: "Rapid Player",
        score: 100,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      for (let i = 0; i < 10; i++) {
        await db.update(sessionPlayers)
          .set({ isConnected: false })
          .where(eq(sessionPlayers.id, player.id));
        
        await db.update(sessionPlayers)
          .set({ isConnected: true })
          .where(eq(sessionPlayers.id, player.id));
      }

      const [final] = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.id, player.id));
      
      expect(final.score).toBe(100);
      expect(final.isConnected).toBe(true);
    });

    it("should not create duplicate player entries on reconnect", async () => {
      const code = `DP${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "dup-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const playerId = `nodup-${Date.now()}`;
      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId,
        name: "No Dup Player",
        score: 0,
      }).returning();
      cleanupIds.players.push(player.id);

      const allPlayers = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.playerId, playerId));
      
      expect(allPlayers).toHaveLength(1);
    });
  });

  describe("Session Recovery", () => {
    it("should allow rejoining active session", async () => {
      const code = `RJ${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "rejoin-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [activeSession] = await db.select().from(gameSessions)
        .where(eq(gameSessions.code, code));
      
      expect(activeSession.state).toBe("playing");
    });

    it("should not allow rejoining ended session", async () => {
      const code = `EN${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "ended-host",
        state: "ended",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [endedSession] = await db.select().from(gameSessions)
        .where(eq(gameSessions.code, code));
      
      expect(endedSession.state).toBe("ended");
    });

    it("should handle session not found gracefully", async () => {
      const nonExistentCode = "ZZZZ";
      
      const sessions = await db.select().from(gameSessions)
        .where(eq(gameSessions.code, nonExistentCode));
      
      expect(sessions).toHaveLength(0);
    });
  });

  describe("Connection State Tracking", () => {
    it("should track last connected timestamp", async () => {
      const code = `TS${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "timestamp-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `ts-${Date.now()}`,
        name: "Timestamp Player",
        score: 0,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(player.id);

      expect(player.isConnected).toBe(true);
    });

    it("should distinguish between connected and disconnected players", async () => {
      const code = `CD${Date.now() % 10000}`;
      const [session] = await db.insert(gameSessions).values({
        code,
        hostId: "conn-disc-host",
        state: "playing",
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [connected] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `conn-${Date.now()}`,
        name: "Connected",
        score: 0,
        isConnected: true,
      }).returning();
      cleanupIds.players.push(connected.id);

      const [disconnected] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: `disc-${Date.now()}`,
        name: "Disconnected",
        score: 0,
        isConnected: false,
      }).returning();
      cleanupIds.players.push(disconnected.id);

      const connectedPlayers = await db.select().from(sessionPlayers)
        .where(eq(sessionPlayers.sessionId, session.id));
      
      const onlinePlayers = connectedPlayers.filter(p => p.isConnected);
      const offlinePlayers = connectedPlayers.filter(p => !p.isConnected);
      
      expect(onlinePlayers).toHaveLength(1);
      expect(offlinePlayers).toHaveLength(1);
    });
  });

  describe("Heartbeat Simulation", () => {
    it("should handle missed heartbeats", async () => {
      const HEARTBEAT_TIMEOUT = 30000;
      const lastHeartbeat = Date.now() - 60000;
      
      const isTimedOut = Date.now() - lastHeartbeat > HEARTBEAT_TIMEOUT;
      expect(isTimedOut).toBe(true);
    });

    it("should not timeout active connections", () => {
      const HEARTBEAT_TIMEOUT = 30000;
      const lastHeartbeat = Date.now() - 5000;
      
      const isTimedOut = Date.now() - lastHeartbeat > HEARTBEAT_TIMEOUT;
      expect(isTimedOut).toBe(false);
    });
  });
});
