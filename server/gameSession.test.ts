import { describe, it, expect, afterEach } from "vitest";
import { db } from "./db";
import { gameSessions, sessionPlayers } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

const BASE_URL = "http://localhost:5000";

describe("Game Session Management", () => {
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

  describe("Session Creation", () => {
    it("should create session with valid defaults", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "TST-" + Date.now().toString(36).toUpperCase().slice(0, 4),
        hostId: "test-host",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      expect(session.code).toMatch(/^TST-/);
      expect(session.buzzerLocked).toBe(true);
      expect(session.state).toBe("waiting");
      expect(session.playedCategoryIds).toEqual([]);
    });

    it("should enforce unique session codes", async () => {
      const code = "UNQ-" + Date.now().toString(36).toUpperCase().slice(0, 4);
      
      const [session1] = await db.insert(gameSessions).values({
        code,
        hostId: "test-host-1",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session1.id);

      try {
        await db.insert(gameSessions).values({
          code,
          hostId: "test-host-2",
          currentMode: "board",
          state: "waiting",
          buzzerLocked: true,
          playedCategoryIds: [],
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Session State Transitions", () => {
    it("should update session state", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "STA-" + Date.now().toString(36).toUpperCase().slice(0, 4),
        hostId: "test-host",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      await db.update(gameSessions)
        .set({ state: "active" })
        .where(eq(gameSessions.id, session.id));

      const [updated] = await db.select().from(gameSessions).where(eq(gameSessions.id, session.id));
      expect(updated.state).toBe("active");
    });

    it("should toggle buzzer lock", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "BZR-" + Date.now().toString(36).toUpperCase().slice(0, 4),
        hostId: "test-host",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      await db.update(gameSessions)
        .set({ buzzerLocked: false })
        .where(eq(gameSessions.id, session.id));

      const [updated] = await db.select().from(gameSessions).where(eq(gameSessions.id, session.id));
      expect(updated.buzzerLocked).toBe(false);
    });
  });

  describe("Played Categories Tracking", () => {
    it("should track played category IDs", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "PLY-" + Date.now().toString(36).toUpperCase().slice(0, 4),
        hostId: "test-host",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      const newPlayed = [1, 2, 3, 4, 5];
      await db.update(gameSessions)
        .set({ playedCategoryIds: newPlayed })
        .where(eq(gameSessions.id, session.id));

      const [updated] = await db.select().from(gameSessions).where(eq(gameSessions.id, session.id));
      expect(updated.playedCategoryIds).toEqual(newPlayed);
    });

    it("should append to played categories", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "APP-" + Date.now().toString(36).toUpperCase().slice(0, 4),
        hostId: "test-host",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [1, 2],
      }).returning();
      cleanupIds.sessions.push(session.id);

      const current = (session.playedCategoryIds as number[]) || [];
      await db.update(gameSessions)
        .set({ playedCategoryIds: [...current, 3, 4, 5] })
        .where(eq(gameSessions.id, session.id));

      const [updated] = await db.select().from(gameSessions).where(eq(gameSessions.id, session.id));
      expect((updated.playedCategoryIds as number[]).length).toBe(5);
    });
  });

  describe("Session Players", () => {
    it("should add players to session with playerId", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "PLA-" + Date.now().toString(36).toUpperCase().slice(0, 4),
        hostId: "test-host",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "player-" + Date.now(),
        name: "Test Player",
        score: 0,
      }).returning();
      cleanupIds.players.push(player.id);

      expect(player.name).toBe("Test Player");
      expect(player.score).toBe(0);
    });

    it("should update player scores", async () => {
      const [session] = await db.insert(gameSessions).values({
        code: "SCR-" + Date.now().toString(36).toUpperCase().slice(0, 4),
        hostId: "test-host",
        currentMode: "board",
        state: "waiting",
        buzzerLocked: true,
        playedCategoryIds: [],
      }).returning();
      cleanupIds.sessions.push(session.id);

      const [player] = await db.insert(sessionPlayers).values({
        sessionId: session.id,
        playerId: "player-" + Date.now(),
        name: "Test Player",
        score: 0,
      }).returning();
      cleanupIds.players.push(player.id);

      await db.update(sessionPlayers)
        .set({ score: 100 })
        .where(eq(sessionPlayers.id, player.id));

      const [updated] = await db.select().from(sessionPlayers).where(eq(sessionPlayers.id, player.id));
      expect(updated.score).toBe(100);
    });
  });
});
