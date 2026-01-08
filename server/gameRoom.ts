import { WebSocket, WebSocketServer } from "ws";
import type { Server } from "http";
import { randomUUID } from "crypto";

interface Player {
  id: string;
  name: string;
  ws: WebSocket;
}

interface GameRoom {
  code: string;
  hostWs: WebSocket | null;
  players: Map<string, Player>;
  buzzerQueue: string[];
  buzzerLocked: boolean;
  currentQuestion: number | null;
}

const rooms = new Map<string, GameRoom>();

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    let currentRoom: string | null = null;
    let playerId: string | null = null;
    let isHost = false;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "host:create": {
            const code = generateRoomCode();
            const room: GameRoom = {
              code,
              hostWs: ws,
              players: new Map(),
              buzzerQueue: [],
              buzzerLocked: true,
              currentQuestion: null,
            };
            rooms.set(code, room);
            currentRoom = code;
            isHost = true;
            ws.send(JSON.stringify({ type: "room:created", code }));
            break;
          }

          case "host:join": {
            const room = rooms.get(message.code);
            if (room) {
              room.hostWs = ws;
              currentRoom = message.code;
              isHost = true;
              ws.send(JSON.stringify({ 
                type: "room:joined", 
                code: message.code,
                players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name }))
              }));
            } else {
              ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
            }
            break;
          }

          case "player:join": {
            const room = rooms.get(message.code?.toUpperCase());
            if (room) {
              const name = String(message.name || "").trim().slice(0, 50);
              if (!name) {
                ws.send(JSON.stringify({ type: "error", message: "Name is required" }));
                break;
              }
              playerId = randomUUID();
              const player: Player = {
                id: playerId,
                name,
                ws,
              };
              room.players.set(playerId, player);
              currentRoom = message.code?.toUpperCase();

              ws.send(JSON.stringify({ 
                type: "joined", 
                playerId,
                buzzerLocked: room.buzzerLocked 
              }));

              if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                room.hostWs.send(JSON.stringify({
                  type: "player:joined",
                  player: { id: playerId, name: message.name },
                }));
              }
            } else {
              ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
            }
            break;
          }

          case "host:unlock": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                room.buzzerLocked = false;
                room.buzzerQueue = [];
                room.currentQuestion = message.questionId || null;

                room.players.forEach((player) => {
                  if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ type: "buzzer:unlocked" }));
                  }
                });
              }
            }
            break;
          }

          case "host:lock": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                room.buzzerLocked = true;

                room.players.forEach((player) => {
                  if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ type: "buzzer:locked" }));
                  }
                });
              }
            }
            break;
          }

          case "host:reset": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                room.buzzerQueue = [];
                room.players.forEach((player) => {
                  if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ type: "buzzer:reset" }));
                  }
                });
                ws.send(JSON.stringify({ type: "buzzer:reset" }));
              }
            }
            break;
          }

          case "player:buzz": {
            if (playerId && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && !room.buzzerLocked) {
                const player = room.players.get(playerId);
                if (player && !room.buzzerQueue.includes(playerId)) {
                  const position = room.buzzerQueue.length + 1;
                  room.buzzerQueue.push(playerId);

                  ws.send(JSON.stringify({ 
                    type: "buzz:confirmed", 
                    position 
                  }));

                  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                    room.hostWs.send(JSON.stringify({
                      type: "player:buzzed",
                      playerId,
                      playerName: player.name,
                      position,
                      timestamp: Date.now(),
                    }));
                  }
                }
              }
            }
            break;
          }

          case "host:feedback": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                const player = room.players.get(message.playerId);
                if (player && player.ws.readyState === WebSocket.OPEN) {
                  player.ws.send(JSON.stringify({
                    type: "feedback",
                    correct: message.correct,
                    points: message.points,
                  }));
                }
              }
            }
            break;
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.on("close", () => {
      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          if (isHost) {
            room.hostWs = null;
          } else if (playerId) {
            const player = room.players.get(playerId);
            room.players.delete(playerId);
            
            if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
              room.hostWs.send(JSON.stringify({
                type: "player:left",
                playerId,
                playerName: player?.name,
              }));
            }
          }

          if (!room.hostWs && room.players.size === 0) {
            rooms.delete(currentRoom);
          }
        }
      }
    });
  });

  return wss;
}

export function getRoomInfo(code: string) {
  const room = rooms.get(code);
  if (!room) return null;
  return {
    code: room.code,
    playerCount: room.players.size,
    players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name })),
  };
}
