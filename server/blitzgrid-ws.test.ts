import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { createServer, type Server as HttpServer } from "http";
import express from "express";
import WebSocket from "ws";
import { registerRoutes } from "./routes";

let httpServer: HttpServer;
let serverPort: number;
const activeConnections: WebSocket[] = [];

function getWsUrl(): string {
  return `ws://localhost:${serverPort}/ws`;
}

function createWsClient(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(getWsUrl());
    activeConnections.push(ws);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
    setTimeout(() => reject(new Error("WS connection timeout")), 5000);
  });
}

function send(ws: WebSocket, data: object) {
  ws.send(JSON.stringify(data));
}

function waitForMessage(ws: WebSocket, type: string, timeoutMs = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${type}"`)), timeoutMs);
    const handler = (raw: WebSocket.Data) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === type) {
          clearTimeout(timer);
          ws.off("message", handler);
          resolve(data);
        }
      } catch {}
    };
    ws.on("message", handler);
  });
}

function waitForAnyMessage(ws: WebSocket, timeoutMs = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout waiting for any message")), timeoutMs);
    const handler = (raw: WebSocket.Data) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type !== "pong") {
          clearTimeout(timer);
          ws.off("message", handler);
          resolve(data);
        }
      } catch {}
    };
    ws.on("message", handler);
  });
}

function collectMessages(ws: WebSocket, durationMs = 500): Promise<any[]> {
  return new Promise((resolve) => {
    const messages: any[] = [];
    const handler = (raw: WebSocket.Data) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type !== "pong") messages.push(data);
      } catch {}
    };
    ws.on("message", handler);
    setTimeout(() => {
      ws.off("message", handler);
      resolve(messages);
    }, durationMs);
  });
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => {
      const addr = httpServer.address();
      serverPort = typeof addr === "object" && addr ? addr.port : 0;
      resolve();
    });
  });
}, 15000);

afterEach(() => {
  for (const ws of activeConnections) {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }
  activeConnections.length = 0;
});

afterAll(async () => {
  for (const ws of activeConnections) {
    try { ws.close(); } catch {}
  }
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
}, 10000);

async function createRoom(): Promise<{ hostWs: WebSocket; roomCode: string }> {
  const hostWs = await createWsClient();
  send(hostWs, { type: "host:create" });
  const created = await waitForMessage(hostWs, "room:created");
  return { hostWs, roomCode: created.code };
}

async function joinRoom(code: string, name: string, avatar = "cat"): Promise<{ playerWs: WebSocket; playerId: string; reconnectToken: string }> {
  const playerWs = await createWsClient();
  send(playerWs, { type: "player:join", code, name, avatar });
  const joined = await waitForMessage(playerWs, "joined");
  return { playerWs, playerId: joined.playerId, reconnectToken: joined.reconnectToken };
}

describe("BlitzGrid WebSocket Integration", () => {
  describe("Room Creation & Joining", () => {
    it("host creates a room and receives a 4-char code", async () => {
      const { roomCode } = await createRoom();
      expect(roomCode).toMatch(/^[A-Z0-9]{4}$/);
    });

    it("player joins room and host is notified", async () => {
      const { hostWs, roomCode } = await createRoom();
      const hostNotification = waitForMessage(hostWs, "player:joined");

      const { playerId } = await joinRoom(roomCode, "Alice");
      expect(playerId).toBeTruthy();

      const notif = await hostNotification;
      expect(notif.player.name).toBe("Alice");
    });

    it("player gets error for non-existent room", async () => {
      const playerWs = await createWsClient();
      send(playerWs, { type: "player:join", code: "ZZZZ", name: "Ghost" });
      const error = await waitForMessage(playerWs, "error");
      expect(error.message).toBe("Room not found");
    });

    it("host can rejoin existing room", async () => {
      const { hostWs, roomCode } = await createRoom();
      await joinRoom(roomCode, "Alice");

      const hostWs2 = await createWsClient();
      send(hostWs2, { type: "host:join", code: roomCode });
      const joined = await waitForMessage(hostWs2, "room:joined");
      expect(joined.code).toBe(roomCode);
      expect(joined.players).toHaveLength(1);

      hostWs.close();
    });
  });

  describe("Buzzer Lock/Unlock Flow", () => {
    it("player receives buzzer unlock notification", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:unlock", newQuestion: true });
      const unlocked = await waitForMessage(playerWs, "buzzer:unlocked");
      expect(unlocked.newQuestion).toBe(true);
    });

    it("player receives buzzer lock notification", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:unlock", newQuestion: true });
      await waitForMessage(playerWs, "buzzer:unlocked");

      send(hostWs, { type: "host:lock" });
      const locked = await waitForMessage(playerWs, "buzzer:locked");
      expect(locked.type).toBe("buzzer:locked");
    });
  });

  describe("Buzz Queue & Judging", () => {
    it("player buzz appears in host queue", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:unlock", newQuestion: true });
      await waitForMessage(playerWs, "buzzer:unlocked");

      const hostBuzzPromise = waitForMessage(hostWs, "player:buzzed");
      send(playerWs, { type: "player:buzz" });

      const buzzConfirm = await waitForMessage(playerWs, "buzz:confirmed");
      expect(buzzConfirm.position).toBe(1);

      const hostBuzz = await hostBuzzPromise;
      expect(hostBuzz.playerId).toBe(playerId);
      expect(hostBuzz.position).toBe(1);
    });

    it("passed player cannot buzz again on same question", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:unlock", newQuestion: true });
      await waitForMessage(playerWs, "buzzer:unlocked");

      send(playerWs, { type: "player:buzz" });
      await waitForMessage(playerWs, "buzz:confirmed");

      send(hostWs, { type: "host:passPlayer", playerId });
      const blocked = await waitForMessage(playerWs, "buzzer:blocked");
      expect(blocked.type).toBe("buzzer:blocked");

      send(hostWs, { type: "host:unlock", newQuestion: false });
      await waitForMessage(playerWs, "buzzer:unlocked");

      const msgs = collectMessages(playerWs, 300);
      send(playerWs, { type: "player:buzz" });
      const collected = await msgs;
      const buzzConfirm = collected.find(m => m.type === "buzz:confirmed");
      expect(buzzConfirm).toBeUndefined();
    });

    it("passed player CAN buzz on next question (newQuestion=true)", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:unlock", newQuestion: true });
      await waitForMessage(playerWs, "buzzer:unlocked");
      send(playerWs, { type: "player:buzz" });
      await waitForMessage(playerWs, "buzz:confirmed");

      send(hostWs, { type: "host:passPlayer", playerId });
      await waitForMessage(playerWs, "buzzer:blocked");

      send(hostWs, { type: "host:unlock", newQuestion: true });
      await waitForMessage(playerWs, "buzzer:unlocked");

      send(playerWs, { type: "player:buzz" });
      const confirm = await waitForMessage(playerWs, "buzz:confirmed");
      expect(confirm.position).toBe(1);
    });
  });

  describe("Score Updates & Feedback", () => {
    it("score update reaches player", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:updateScore", playerId, points: 50 });
      const scoreUpdate = await waitForMessage(playerWs, "score:updated");
      expect(scoreUpdate.score).toBe(50);
    });

    it("feedback reaches player", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:feedback", playerId, correct: true, points: 30 });
      const feedback = await waitForMessage(playerWs, "feedback");
      expect(feedback.correct).toBe(true);
      expect(feedback.points).toBe(30);
    });

    it("rejects score updates exceeding bounds", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:updateScore", playerId, points: 10001 });
      const msgs = collectMessages(playerWs, 300);
      const collected = await msgs;
      const scoreMsg = collected.find(m => m.type === "score:updated");
      expect(scoreMsg).toBeUndefined();
    });

    it("scores sync sent to all players after update", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs: p1Ws, playerId: p1Id } = await joinRoom(roomCode, "Alice");
      const { playerWs: p2Ws } = await joinRoom(roomCode, "Bob");

      const p2Sync = waitForMessage(p2Ws, "scores:sync");
      send(hostWs, { type: "host:updateScore", playerId: p1Id, points: 40 });

      const sync = await p2Sync;
      expect(sync.players).toBeDefined();
      const alice = sync.players.find((p: any) => p.id === p1Id);
      expect(alice?.score).toBe(40);
    });
  });

  describe("Game End & Next Grid (Bug Fix: gameEnded reset)", () => {
    it("game end sends leaderboard to players", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:updateScore", playerId, points: 100 });
      await waitForMessage(playerWs, "score:updated");

      send(hostWs, { type: "host:endGame", playerStats: [{ playerId, correctAnswers: 3, wrongAnswers: 1, totalPoints: 100, bestStreak: 2, won: true }] });
      const ended = await waitForMessage(playerWs, "game:ended");
      expect(ended.leaderboard).toBeDefined();
      expect(ended.leaderboard).toHaveLength(1);
      expect(ended.leaderboard[0].score).toBe(100);
    });

    it("duplicate endGame is rejected (idempotency)", async () => {
      const { hostWs, roomCode } = await createRoom();
      await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:endGame" });
      const first = await waitForMessage(hostWs, "game:ended");
      expect(first.alreadyEnded).toBeUndefined();

      send(hostWs, { type: "host:endGame" });
      const second = await waitForMessage(hostWs, "game:ended");
      expect(second.alreadyEnded).toBe(true);
    });

    it("startNextGrid resets gameEnded so endGame works again", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:endGame" });
      await waitForMessage(hostWs, "game:ended");

      send(hostWs, { type: "host:startNextGrid", boardId: 1, gridName: "Grid 2" });
      const nextGrid = await waitForMessage(playerWs, "host:startNextGrid");
      expect(nextGrid.gridName).toBe("Grid 2");

      send(hostWs, { type: "host:endGame" });
      const ended = await waitForMessage(hostWs, "game:ended");
      expect(ended.alreadyEnded).toBeUndefined();
    });
  });

  describe("Player Disconnect & Reconnection", () => {
    it("host is notified when player disconnects", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId } = await joinRoom(roomCode, "Alice");

      const disconnectNotif = waitForMessage(hostWs, "player:disconnected");
      playerWs.close();
      const notif = await disconnectNotif;
      expect(notif.playerId).toBe(playerId);
    });

    it("player can reconnect with token", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId, reconnectToken } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:updateScore", playerId, points: 75 });
      await waitForMessage(playerWs, "score:updated");

      playerWs.close();
      await waitForMessage(hostWs, "player:disconnected");

      const playerWs2 = await createWsClient();
      send(playerWs2, { type: "player:join", code: roomCode, name: "Alice", playerId, reconnectToken });
      const rejoined = await waitForMessage(playerWs2, "joined");
      expect(rejoined.playerId).toBe(playerId);
      expect(rejoined.score).toBe(75);
    });

    it("reconnect with invalid token is rejected", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId } = await joinRoom(roomCode, "Alice");
      playerWs.close();
      await waitForMessage(hostWs, "player:disconnected");

      const playerWs2 = await createWsClient();
      send(playerWs2, { type: "player:join", code: roomCode, name: "Alice", playerId, reconnectToken: "bad-token" });
      const error = await waitForMessage(playerWs2, "error");
      expect(error.message).toBe("Invalid reconnect token");
    });

    it("players notified when host disconnects", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs } = await joinRoom(roomCode, "Alice");

      hostWs.close();
      const notif = await waitForMessage(playerWs, "host:disconnected");
      expect(notif.type).toBe("host:disconnected");
    });
  });

  describe("Room Close & Kick", () => {
    it("host closing room notifies players", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:closeRoom" });
      const closed = await waitForMessage(playerWs, "room:closed");
      expect(closed.reason).toBe("Host closed the game");
    });

    it("kicking a player sends kicked event", async () => {
      const { hostWs, roomCode } = await createRoom();
      const { playerWs, playerId } = await joinRoom(roomCode, "Alice");

      send(hostWs, { type: "host:kickPlayer", playerId });
      const kicked = await waitForMessage(playerWs, "kicked");
      expect(kicked.type).toBe("kicked");
    });
  });

  describe("Ping/Pong", () => {
    it("server responds to ping with pong", async () => {
      const ws = await createWsClient();
      send(ws, { type: "ping" });
      const pong = await waitForMessage(ws, "pong");
      expect(pong.type).toBe("pong");
    });
  });
});
