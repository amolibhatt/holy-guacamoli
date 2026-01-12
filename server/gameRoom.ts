import { WebSocket, WebSocketServer } from "ws";
import type { Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import type { GameMode, SessionPlayer } from "@shared/schema";
import { PLAYER_AVATARS } from "@shared/schema";

const VALID_AVATAR_IDS = new Set(PLAYER_AVATARS.map(a => a.id as string));

function sanitizeAvatar(avatar: string | undefined): string {
  if (avatar && VALID_AVATAR_IDS.has(avatar)) {
    return avatar;
  }
  return "cat";
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  ws: WebSocket;
  lastPing: number;
  score: number;
}

interface SequenceSubmission {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  sequence: string[];
  timeMs: number;
}

type SequenceGameState = "lobby" | "animatedReveal" | "answering" | "result" | "leaderboard" | "gameComplete";

interface SequenceRoundState {
  questionId: number;
  question: any;
  correctOrder: string[];
  startTime: number;
  endTime: number;
  revealTimer: NodeJS.Timeout | null;
  answeringTimer: NodeJS.Timeout | null;
  submissions: Map<string, SequenceSubmission>;
  revealed: boolean;
  gameState: SequenceGameState;
  currentQuestionIndex: number;
  totalQuestions: number;
  sessionScores: Map<string, number>;
}

interface GameRoom {
  code: string;
  sessionId: number;
  hostId: string;
  hostWs: WebSocket | null;
  hostLastPing: number;
  players: Map<string, Player>;
  buzzerQueue: string[];
  buzzerLocked: boolean;
  currentQuestion: number | null;
  currentBoardId: number | null;
  currentMode: GameMode;
  sequenceRound: SequenceRoundState | null;
}

const rooms = new Map<string, GameRoom>();
const PING_INTERVAL = 10000; // 10 seconds
const PING_TIMEOUT = 30000; // 30 seconds without pong = dead
const ROOM_INACTIVE_TIMEOUT = 3600000; // 1 hour without host = cleanup

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function cleanupInactiveRooms() {
  const now = Date.now();
  const roomsToCleanup: string[] = [];
  
  rooms.forEach((room, code) => {
    const hostDisconnected = !room.hostWs || room.hostWs.readyState !== WebSocket.OPEN;
    const timeSinceHostPing = now - room.hostLastPing;
    
    if (hostDisconnected && timeSinceHostPing > ROOM_INACTIVE_TIMEOUT) {
      roomsToCleanup.push(code);
    }
  });
  
  roomsToCleanup.forEach(code => {
    const room = rooms.get(code);
    if (room) {
      room.players.forEach(player => {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({ type: "room:closed", reason: "Host disconnected" }));
          player.ws.close();
        }
      });
      rooms.delete(code);
      console.log(`[WebSocket] Cleaned up inactive room: ${code}`);
    }
  });
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  
  // Cleanup inactive rooms every 5 minutes
  setInterval(cleanupInactiveRooms, 300000);

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
            const hostId = message.hostId || randomUUID();
            
            (async () => {
              try {
                const session = await storage.createSession({
                  code,
                  hostId,
                  currentMode: "board",
                  state: "waiting",
                  buzzerLocked: true,
                });
                
                const room: GameRoom = {
                  code,
                  sessionId: session.id,
                  hostId,
                  hostWs: ws,
                  hostLastPing: Date.now(),
                  players: new Map(),
                  buzzerQueue: [],
                  buzzerLocked: true,
                  currentQuestion: null,
                  currentBoardId: null,
                  currentMode: "board",
                  sequenceRound: null,
                };
                rooms.set(code, room);
                currentRoom = code;
                isHost = true;
                ws.send(JSON.stringify({ type: "room:created", code, sessionId: session.id }));
              } catch (err) {
                console.error("Failed to create session:", err);
                ws.send(JSON.stringify({ type: "error", message: "Failed to create room" }));
              }
            })();
            break;
          }

          case "host:join": {
            const roomCode = message.code?.toUpperCase();
            let room = rooms.get(roomCode);
            
            if (!room) {
              (async () => {
                try {
                  const session = await storage.getSessionByCode(roomCode);
                  if (session && session.state !== 'ended') {
                    const players = await storage.getSessionPlayers(session.id);
                    const completedQuestions = await storage.getCompletedQuestions(session.id);
                    
                    room = {
                      code: session.code,
                      sessionId: session.id,
                      hostId: session.hostId,
                      hostWs: ws,
                      hostLastPing: Date.now(),
                      players: new Map(),
                      buzzerQueue: [],
                      buzzerLocked: session.buzzerLocked,
                      currentQuestion: null,
                      currentBoardId: session.currentBoardId,
                      currentMode: session.currentMode || "board",
                      sequenceRound: null,
                    };
                    
                    players.forEach(p => {
                      room!.players.set(p.playerId, {
                        id: p.playerId,
                        name: p.name,
                        avatar: p.avatar || "cat",
                        ws: null as any,
                        lastPing: 0,
                        score: p.score,
                      });
                    });
                    
                    rooms.set(roomCode, room);
                    currentRoom = roomCode;
                    isHost = true;
                    
                    ws.send(JSON.stringify({ 
                      type: "room:joined", 
                      code: roomCode,
                      sessionId: session.id,
                      players: players.map(p => ({ id: p.playerId, name: p.name, avatar: p.avatar || "cat", score: p.score })),
                      buzzerLocked: room.buzzerLocked,
                      currentBoardId: session.currentBoardId,
                      currentMode: session.currentMode,
                      completedQuestions,
                    }));
                  } else {
                    ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
                  }
                } catch (err) {
                  console.error("Failed to restore session:", err);
                  ws.send(JSON.stringify({ type: "error", message: "Failed to join room" }));
                }
              })();
            } else {
              room.hostWs = ws;
              room.hostLastPing = Date.now();
              currentRoom = roomCode;
              isHost = true;
              
              (async () => {
                const completedQuestions = await storage.getCompletedQuestions(room!.sessionId);
                ws.send(JSON.stringify({ 
                  type: "room:joined", 
                  code: roomCode,
                  sessionId: room!.sessionId,
                  players: Array.from(room!.players.values()).map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })),
                  buzzerLocked: room!.buzzerLocked,
                  currentBoardId: room!.currentBoardId,
                  currentMode: room!.currentMode,
                  completedQuestions,
                }));
              })();
            }
            break;
          }

          case "player:join": {
            const roomCode = message.code?.toUpperCase();
            let room = rooms.get(roomCode);
            
            (async () => {
              try {
                if (!room) {
                  const session = await storage.getSessionByCode(roomCode);
                  if (session && session.state !== 'ended') {
                    room = {
                      code: session.code,
                      sessionId: session.id,
                      hostId: session.hostId,
                      hostWs: null,
                      hostLastPing: 0,
                      players: new Map(),
                      buzzerQueue: [],
                      buzzerLocked: session.buzzerLocked,
                      currentQuestion: null,
                      currentBoardId: session.currentBoardId,
                      currentMode: session.currentMode || "board",
                      sequenceRound: null,
                    };
                    
                    const existingPlayers = await storage.getSessionPlayers(session.id);
                    existingPlayers.forEach(p => {
                      room!.players.set(p.playerId, {
                        id: p.playerId,
                        name: p.name,
                        avatar: p.avatar || "cat",
                        ws: null as any,
                        lastPing: 0,
                        score: p.score,
                      });
                    });
                    
                    rooms.set(roomCode, room);
                  }
                }
                
                if (room) {
                  const name = String(message.name || "").trim().slice(0, 50);
                  if (!name) {
                    ws.send(JSON.stringify({ type: "error", message: "Name is required" }));
                    return;
                  }
                  
                  const newPlayerId: string = message.playerId || randomUUID();
                  playerId = newPlayerId;
                  const existingPlayer = room.players.get(newPlayerId);
                  
                  let playerScore = 0;
                  if (existingPlayer) {
                    playerScore = existingPlayer.score;
                  }
                  
                  const avatar = sanitizeAvatar(message.avatar || existingPlayer?.avatar);
                  
                  const dbPlayer = await storage.addPlayerToSession({
                    sessionId: room.sessionId,
                    playerId: newPlayerId,
                    name: existingPlayer?.name || name,
                    avatar,
                    score: playerScore,
                    isConnected: true,
                  });
                  
                  // Remove any stale entries with the same name but different ID
                  room.players.forEach((p, key) => {
                    if (p.name === dbPlayer.name && key !== dbPlayer.playerId) {
                      room!.players.delete(key);
                    }
                  });
                  
                  const player: Player = {
                    id: dbPlayer.playerId,
                    name: dbPlayer.name,
                    avatar: dbPlayer.avatar,
                    ws,
                    lastPing: Date.now(),
                    score: dbPlayer.score,
                  };
                  room.players.set(dbPlayer.playerId, player);
                  playerId = dbPlayer.playerId;
                  currentRoom = roomCode;

                  ws.send(JSON.stringify({ 
                    type: "joined", 
                    playerId,
                    playerName: player.name,
                    score: player.score,
                    buzzerLocked: room.buzzerLocked,
                  }));

                  const allPlayers = Array.from(room.players.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                    score: p.score,
                  }));
                  
                  ws.send(JSON.stringify({
                    type: "scores:sync",
                    players: allPlayers,
                  }));
                  
                  room.players.forEach((p) => {
                    if (p.id !== newPlayerId && p.ws && p.ws.readyState === WebSocket.OPEN) {
                      p.ws.send(JSON.stringify({
                        type: "scores:sync",
                        players: allPlayers,
                      }));
                    }
                  });

                  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                    room.hostWs.send(JSON.stringify({
                      type: "player:joined",
                      player: { id: playerId, name: player.name, avatar: player.avatar, score: player.score },
                    }));
                  }
                } else {
                  ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
                }
              } catch (err) {
                console.error("Failed to join player:", err);
                ws.send(JSON.stringify({ type: "error", message: "Failed to join room" }));
              }
            })();
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
                      playerAvatar: player.avatar,
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

          case "host:sync": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                room.players.forEach((player) => {
                  if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ 
                      type: room.buzzerLocked ? "buzzer:locked" : "buzzer:unlocked" 
                    }));
                  }
                });
                ws.send(JSON.stringify({ 
                  type: "sync:complete",
                  playerCount: room.players.size,
                }));
              }
            }
            break;
          }

          case "host:kick": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && message.playerId) {
                const player = room.players.get(message.playerId);
                if (player) {
                  if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ type: "kicked" }));
                    player.ws.close();
                  }
                  room.players.delete(message.playerId);
                  storage.removePlayerFromSession(room.sessionId, message.playerId);
                  ws.send(JSON.stringify({ 
                    type: "player:left", 
                    playerId: message.playerId,
                    playerName: player.name,
                  }));
                }
              }
            }
            break;
          }

          case "host:updateScore": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && message.playerId && typeof message.points === 'number') {
                const player = room.players.get(message.playerId);
                if (player) {
                  (async () => {
                    try {
                      const updated = await storage.updatePlayerScore(room.sessionId, message.playerId, message.points);
                      if (updated) {
                        player.score = updated.score;
                        
                        ws.send(JSON.stringify({
                          type: "score:updated",
                          playerId: message.playerId,
                          score: updated.score,
                          change: message.points,
                        }));
                        
                        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                          player.ws.send(JSON.stringify({
                            type: "score:updated",
                            score: updated.score,
                            change: message.points,
                          }));
                        }
                        
                        room.players.forEach((p) => {
                          if (p.id !== message.playerId && p.ws && p.ws.readyState === WebSocket.OPEN) {
                            p.ws.send(JSON.stringify({
                              type: "scores:sync",
                              players: Array.from(room.players.values()).map(pl => ({ 
                                id: pl.id, 
                                name: pl.name, 
                                score: pl.score 
                              })),
                            }));
                          }
                        });
                      }
                    } catch (err) {
                      console.error("Failed to update score:", err);
                    }
                  })();
                }
              }
            }
            break;
          }

          case "host:setBoard": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                room.currentBoardId = message.boardId || null;
                storage.updateSession(room.sessionId, { currentBoardId: message.boardId });
                
                room.players.forEach((player) => {
                  if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ 
                      type: "board:changed", 
                      boardId: message.boardId 
                    }));
                  }
                });
                
                ws.send(JSON.stringify({ 
                  type: "board:set", 
                  boardId: message.boardId 
                }));
              }
            }
            break;
          }

          case "host:setMode": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && message.mode) {
                room.currentMode = message.mode;
                storage.updateSession(room.sessionId, { currentMode: message.mode });
                
                room.players.forEach((player) => {
                  if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ 
                      type: "mode:changed", 
                      mode: message.mode 
                    }));
                  }
                });
                
                ws.send(JSON.stringify({ 
                  type: "mode:set", 
                  mode: message.mode 
                }));
              }
            }
            break;
          }

          case "host:completeQuestion": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && message.questionId) {
                (async () => {
                  try {
                    await storage.markQuestionCompleted({
                      sessionId: room.sessionId,
                      questionId: message.questionId,
                      answeredByPlayerId: message.playerId || null,
                      pointsAwarded: message.points || 0,
                    });
                    
                    ws.send(JSON.stringify({
                      type: "question:completed",
                      questionId: message.questionId,
                    }));
                  } catch (err) {
                    console.error("Failed to complete question:", err);
                  }
                })();
              }
            }
            break;
          }

          case "host:resetBoard": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                (async () => {
                  try {
                    await storage.resetCompletedQuestions(room.sessionId);
                    ws.send(JSON.stringify({ type: "board:reset" }));
                  } catch (err) {
                    console.error("Failed to reset board:", err);
                  }
                })();
              }
            }
            break;
          }

          case "host:getScores": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                (async () => {
                  try {
                    const players = await storage.getSessionPlayers(room.sessionId);
                    ws.send(JSON.stringify({
                      type: "scores:list",
                      players: players.map(p => ({ 
                        id: p.playerId, 
                        name: p.name, 
                        score: p.score,
                        isConnected: room.players.has(p.playerId),
                      })),
                    }));
                  } catch (err) {
                    console.error("Failed to get scores:", err);
                  }
                })();
              }
            }
            break;
          }

          case "ping": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) room.hostLastPing = Date.now();
            } else if (playerId && currentRoom) {
              const room = rooms.get(currentRoom);
              const player = room?.players.get(playerId);
              if (player) player.lastPing = Date.now();
            }
            ws.send(JSON.stringify({ type: "pong" }));
            break;
          }

          // ========================================
          // Sequence Squeeze Game Handlers
          // ========================================

          case "sequence:host:switchMode": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && (room.currentMode === "board" || room.currentMode === "jeopardy" || room.currentMode === "heads_up")) {
                room.currentMode = "sequence" as GameMode;
                room.buzzerLocked = true;
                
                // Persist mode change to database
                if (room.sessionId > 0) {
                  storage.updateSession(room.sessionId, { currentMode: "sequence" }).catch(err => {
                    console.error("Failed to persist mode change:", err);
                  });
                }
                
                const existingScores = room.sequenceRound?.sessionScores || new Map<string, number>();
                room.players.forEach((player) => {
                  if (!existingScores.has(player.id)) {
                    existingScores.set(player.id, player.score);
                  }
                });
                
                room.sequenceRound = {
                  questionId: 0,
                  question: null,
                  correctOrder: [],
                  startTime: 0,
                  endTime: 0,
                  revealTimer: null,
                  answeringTimer: null,
                  submissions: new Map(),
                  revealed: false,
                  gameState: "lobby",
                  currentQuestionIndex: 0,
                  totalQuestions: 0,
                  sessionScores: existingScores,
                };
                
                const playerList = Array.from(room.players.values()).map(p => ({
                  playerId: p.id,
                  playerName: p.name,
                  playerAvatar: p.avatar,
                  score: existingScores.get(p.id) || p.score,
                }));
                
                room.players.forEach((player) => {
                  try {
                    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                      player.ws.send(JSON.stringify({
                        type: "room:modeChanged",
                        mode: "sequence",
                        score: existingScores.get(player.id) || player.score,
                      }));
                    }
                  } catch (e) {
                    console.error("Failed to notify player of mode change:", e);
                  }
                });
                
                ws.send(JSON.stringify({ 
                  type: "sequence:mode:switched",
                  code: room.code,
                  players: playerList,
                }));
              } else if (room && room.currentMode === "sequence") {
                const existingScores = room.sequenceRound?.sessionScores || new Map<string, number>();
                const playerList = Array.from(room.players.values()).map(p => ({
                  playerId: p.id,
                  playerName: p.name,
                  playerAvatar: p.avatar,
                  score: existingScores.get(p.id) || p.score,
                }));
                ws.send(JSON.stringify({ 
                  type: "sequence:mode:switched",
                  code: room.code,
                  players: playerList,
                }));
              }
            }
            break;
          }

          case "sequence:host:create": {
            (async () => {
              try {
                const code = generateRoomCode();
                const hostId = message.hostId || randomUUID();
                
                const session = await storage.createSession({
                  code,
                  hostId,
                  currentMode: "sequence",
                  state: "waiting",
                  buzzerLocked: true,
                });
                
                const room: GameRoom = {
                  code,
                  sessionId: session.id,
                  hostId,
                  hostWs: ws,
                  hostLastPing: Date.now(),
                  players: new Map(),
                  buzzerQueue: [],
                  buzzerLocked: true,
                  currentQuestion: null,
                  currentBoardId: null,
                  currentMode: "sequence",
                  sequenceRound: {
                    questionId: 0,
                    question: null,
                    correctOrder: [],
                    startTime: 0,
                    endTime: 0,
                    revealTimer: null,
                    answeringTimer: null,
                    submissions: new Map(),
                    revealed: false,
                    gameState: "lobby",
                    currentQuestionIndex: 0,
                    totalQuestions: 0,
                    sessionScores: new Map(),
                  },
                };
                
                rooms.set(code, room);
                currentRoom = code;
                isHost = true;
                ws.send(JSON.stringify({ 
                  type: "sequence:room:created", 
                  code,
                  sessionId: session.id,
                }));
              } catch (err) {
                console.error("Failed to create sequence room:", err);
                ws.send(JSON.stringify({ type: "error", message: "Failed to create room" }));
              }
            })();
            break;
          }

          case "sequence:player:join": {
            const roomCode = message.code?.toUpperCase();
            const room = rooms.get(roomCode);
            
            if (room) {
              (async () => {
                try {
                  const name = String(message.name || "").trim().slice(0, 50);
                  if (!name) {
                    ws.send(JSON.stringify({ type: "error", message: "Name is required" }));
                    return;
                  }
                  
                  const newPlayerId = message.playerId || randomUUID();
                  playerId = newPlayerId;
                  const avatar = sanitizeAvatar(message.avatar);
                  
                  let existingScore = 0;
                  if (room.sessionId > 0) {
                    const dbPlayer = await storage.addPlayerToSession({
                      sessionId: room.sessionId,
                      playerId: newPlayerId,
                      name,
                      avatar,
                    });
                    existingScore = dbPlayer?.score || 0;
                  }
                  
                  const player: Player = {
                    id: newPlayerId,
                    name,
                    avatar,
                    ws,
                    lastPing: Date.now(),
                    score: existingScore,
                  };
                  room.players.set(newPlayerId, player);
                  currentRoom = roomCode;
                  
                  if (room.sequenceRound) {
                    room.sequenceRound.sessionScores.set(newPlayerId, existingScore);
                  }

                  ws.send(JSON.stringify({ 
                    type: "sequence:joined", 
                    playerId: newPlayerId,
                    score: existingScore,
                  }));

                  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                    room.hostWs.send(JSON.stringify({
                      type: "sequence:player:joined",
                      playerName: name,
                      playerAvatar: avatar,
                      playerId: newPlayerId,
                      score: existingScore,
                    }));
                  }
                } catch (err) {
                  console.error("Failed to join sequence room:", err);
                  ws.send(JSON.stringify({ type: "error", message: "Failed to join room" }));
                }
              })();
            } else {
              ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
            }
            break;
          }

          case "sequence:host:startQuestion": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && message.question && message.correctOrder) {
                if (room.sequenceRound?.revealTimer) {
                  clearTimeout(room.sequenceRound.revealTimer);
                }
                if (room.sequenceRound?.answeringTimer) {
                  clearTimeout(room.sequenceRound.answeringTimer);
                }
                
                const questionIndex = message.questionIndex || 1;
                const totalQuestions = message.totalQuestions || 1;
                const existingScores = room.sequenceRound?.sessionScores || new Map<string, number>();
                
                const broadcastReveal = () => {
                  if (!room.sequenceRound || room.sequenceRound.revealed) return;
                  room.sequenceRound.revealed = true;
                  room.sequenceRound.gameState = "result";
                  
                  const subs = Array.from(room.sequenceRound.submissions.values());
                  const correctOrder = room.sequenceRound.correctOrder;
                  
                  const scoredSubs = subs.map(sub => ({
                    ...sub,
                    isCorrect: JSON.stringify(sub.sequence) === JSON.stringify(correctOrder),
                  }));
                  
                  const correctSubs = scoredSubs.filter(s => s.isCorrect).sort((a, b) => a.timeMs - b.timeMs);
                  const rankings = correctSubs.map((sub, idx) => ({
                    playerId: sub.playerId,
                    playerName: sub.playerName,
                    playerAvatar: sub.playerAvatar,
                    rank: idx + 1,
                    timeMs: sub.timeMs,
                  }));
                  
                  // Award 10 points to fastest correct player
                  let winner: { playerId: string; playerName: string; playerAvatar: string; timeMs: number } | null = null;
                  if (rankings.length > 0) {
                    const fastest = rankings[0];
                    winner = { playerId: fastest.playerId, playerName: fastest.playerName, playerAvatar: fastest.playerAvatar, timeMs: fastest.timeMs };
                    const currentScore = room.sequenceRound.sessionScores.get(fastest.playerId) || 0;
                    const newScore = currentScore + 10;
                    room.sequenceRound.sessionScores.set(fastest.playerId, newScore);
                    
                    // Persist to database
                    if (room.sessionId > 0) {
                      storage.updatePlayerScore(room.sessionId, fastest.playerId, 10).catch(err => {
                        console.error("Failed to persist sequence score:", err);
                      });
                    }
                    
                    // Update in-memory player score too
                    const playerObj = room.players.get(fastest.playerId);
                    if (playerObj) {
                      playerObj.score = newScore;
                    }
                  }
                  
                  // Build leaderboard from session scores
                  const leaderboard = Array.from(room.sequenceRound.sessionScores.entries())
                    .map(([pid, score]) => {
                      const player = room.players.get(pid);
                      return { playerId: pid, playerName: player?.name || "Unknown", playerAvatar: player?.avatar || "cat", score };
                    })
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3);
                  
                  room.players.forEach((player) => {
                    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                      const playerRanking = rankings.find(r => r.playerId === player.id);
                      const playerScore = room.sequenceRound?.sessionScores.get(player.id) || 0;
                      player.ws.send(JSON.stringify({
                        type: "sequence:reveal",
                        correctOrder,
                        rank: playerRanking?.rank || null,
                        isWinner: winner?.playerId === player.id,
                        yourScore: playerScore,
                      }));
                    }
                  });
                  
                  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                    room.hostWs.send(JSON.stringify({
                      type: "sequence:reveal:complete",
                      correctOrder,
                      rankings,
                      submissions: scoredSubs,
                      winner,
                      leaderboard,
                      currentQuestionIndex: room.sequenceRound.currentQuestionIndex,
                      totalQuestions: room.sequenceRound.totalQuestions,
                    }));
                  }
                };
                
                // Animation phase: 4 seconds for drama reveal
                const animationDuration = 4000;
                const answeringDuration = 15500;
                const now = Date.now();
                
                room.sequenceRound = {
                  questionId: message.question.id,
                  question: message.question,
                  correctOrder: message.correctOrder,
                  startTime: now + animationDuration,
                  endTime: now + animationDuration + answeringDuration,
                  revealTimer: null,
                  answeringTimer: null,
                  submissions: new Map(),
                  revealed: false,
                  gameState: "animatedReveal",
                  currentQuestionIndex: questionIndex,
                  totalQuestions: totalQuestions,
                  sessionScores: existingScores,
                };
                
                // Notify all players of animated reveal stage
                room.players.forEach((player) => {
                  if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({
                      type: "sequence:animatedReveal",
                      questionIndex,
                      totalQuestions,
                    }));
                  }
                });
                
                // Notify host
                if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                  room.hostWs.send(JSON.stringify({
                    type: "sequence:animatedReveal:started",
                    question: message.question,
                    questionIndex,
                    totalQuestions,
                  }));
                }
                
                // After animation, start answering phase
                room.sequenceRound.answeringTimer = setTimeout(() => {
                  if (!room.sequenceRound) return;
                  room.sequenceRound.gameState = "answering";
                  const endTime = Date.now() + answeringDuration;
                  room.sequenceRound.startTime = Date.now();
                  room.sequenceRound.endTime = endTime;
                  
                  // Notify players to start answering with haptic
                  room.players.forEach((player) => {
                    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                      player.ws.send(JSON.stringify({
                        type: "sequence:question:start",
                        question: message.question,
                        endTime,
                        triggerHaptic: true,
                      }));
                    }
                  });
                  
                  // Notify host
                  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                    room.hostWs.send(JSON.stringify({
                      type: "sequence:answering:started",
                      endTime,
                    }));
                  }
                  
                  // Set timer for auto-reveal
                  room.sequenceRound!.revealTimer = setTimeout(broadcastReveal, answeringDuration);
                }, animationDuration);
              }
            }
            break;
          }

          case "sequence:player:submit": {
            if (playerId && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.sequenceRound && !room.sequenceRound.revealed) {
                const now = Date.now();
                if (now > room.sequenceRound.endTime) {
                  ws.send(JSON.stringify({ type: "sequence:submission:late" }));
                  break;
                }
                
                const player = room.players.get(playerId);
                if (player && !room.sequenceRound.submissions.has(playerId)) {
                  const timeMs = now - room.sequenceRound.startTime;
                  const submission: SequenceSubmission = {
                    playerId,
                    playerName: player.name,
                    playerAvatar: player.avatar,
                    sequence: message.sequence,
                    timeMs,
                  };
                  room.sequenceRound.submissions.set(playerId, submission);
                  
                  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                    room.hostWs.send(JSON.stringify({
                      type: "sequence:submission",
                      submission,
                      totalSubmissions: room.sequenceRound.submissions.size,
                    }));
                  }
                  
                  ws.send(JSON.stringify({ type: "sequence:submission:accepted" }));
                }
              }
            }
            break;
          }

          case "sequence:host:reveal": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.sequenceRound && !room.sequenceRound.revealed) {
                if (room.sequenceRound.revealTimer) {
                  clearTimeout(room.sequenceRound.revealTimer);
                  room.sequenceRound.revealTimer = null;
                }
                if (room.sequenceRound.answeringTimer) {
                  clearTimeout(room.sequenceRound.answeringTimer);
                  room.sequenceRound.answeringTimer = null;
                }
                
                room.sequenceRound.revealed = true;
                room.sequenceRound.gameState = "result";
                
                const subs = Array.from(room.sequenceRound.submissions.values());
                const correctOrder = room.sequenceRound.correctOrder;
                
                const scoredSubs = subs.map(sub => ({
                  ...sub,
                  isCorrect: JSON.stringify(sub.sequence) === JSON.stringify(correctOrder),
                }));
                
                const correctSubs = scoredSubs.filter(s => s.isCorrect).sort((a, b) => a.timeMs - b.timeMs);
                const rankings = correctSubs.map((sub, idx) => ({
                  playerId: sub.playerId,
                  playerName: sub.playerName,
                  playerAvatar: sub.playerAvatar,
                  rank: idx + 1,
                  timeMs: sub.timeMs,
                }));
                
                // Award 10 points to fastest correct player
                let winner: { playerId: string; playerName: string; playerAvatar: string; timeMs: number } | null = null;
                if (rankings.length > 0) {
                  const fastest = rankings[0];
                  winner = { playerId: fastest.playerId, playerName: fastest.playerName, playerAvatar: fastest.playerAvatar, timeMs: fastest.timeMs };
                  const currentScore = room.sequenceRound.sessionScores.get(fastest.playerId) || 0;
                  room.sequenceRound.sessionScores.set(fastest.playerId, currentScore + 10);
                }
                
                // Build leaderboard from session scores
                const leaderboard = Array.from(room.sequenceRound.sessionScores.entries())
                  .map(([pid, score]) => {
                    const player = room.players.get(pid);
                    return { playerId: pid, playerName: player?.name || "Unknown", playerAvatar: player?.avatar || "cat", score };
                  })
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3);
                
                room.players.forEach((player) => {
                  if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    const playerRanking = rankings.find(r => r.playerId === player.id);
                    const playerScore = room.sequenceRound?.sessionScores.get(player.id) || 0;
                    player.ws.send(JSON.stringify({
                      type: "sequence:reveal",
                      correctOrder,
                      rank: playerRanking?.rank || null,
                      isWinner: winner?.playerId === player.id,
                      yourScore: playerScore,
                    }));
                  }
                });
                
                if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                  room.hostWs.send(JSON.stringify({
                    type: "sequence:reveal:complete",
                    correctOrder,
                    rankings,
                    submissions: scoredSubs,
                    winner,
                    leaderboard,
                    currentQuestionIndex: room.sequenceRound.currentQuestionIndex,
                    totalQuestions: room.sequenceRound.totalQuestions,
                  }));
                }
              }
            }
            break;
          }

          case "sequence:host:forceEnd": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.sequenceRound && !room.sequenceRound.revealed) {
                // Force end the timer and trigger reveal
                ws.send(JSON.stringify({ type: "sequence:forceEnd:ack" }));
                // This will be handled by the host:reveal handler
              }
            }
            break;
          }

          case "sequence:host:showLeaderboard": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.sequenceRound) {
                room.sequenceRound.gameState = "leaderboard";
                
                const leaderboard = Array.from(room.sequenceRound.sessionScores.entries())
                  .map(([pid, score]) => {
                    const player = room.players.get(pid);
                    return { playerId: pid, playerName: player?.name || "Unknown", playerAvatar: player?.avatar || "cat", score };
                  })
                  .sort((a, b) => b.score - a.score);
                
                room.players.forEach((player) => {
                  if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    const playerScore = room.sequenceRound?.sessionScores.get(player.id) || 0;
                    player.ws.send(JSON.stringify({
                      type: "sequence:leaderboard",
                      leaderboard,
                      yourScore: playerScore,
                    }));
                  }
                });
                
                if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                  room.hostWs.send(JSON.stringify({
                    type: "sequence:leaderboard",
                    leaderboard,
                  }));
                }
              }
            }
            break;
          }

          case "sequence:host:endGame": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.sequenceRound) {
                room.sequenceRound.gameState = "gameComplete";
                
                const leaderboard = Array.from(room.sequenceRound.sessionScores.entries())
                  .map(([pid, score]) => {
                    const player = room.players.get(pid);
                    return { playerId: pid, playerName: player?.name || "Unknown", playerAvatar: player?.avatar || "cat", score };
                  })
                  .sort((a, b) => b.score - a.score);
                
                const globalWinner = leaderboard[0] || null;
                
                room.players.forEach((player) => {
                  if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({
                      type: "sequence:gameComplete",
                      leaderboard,
                      globalWinner,
                      yourScore: room.sequenceRound?.sessionScores.get(player.id) || 0,
                    }));
                  }
                });
                
                if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                  room.hostWs.send(JSON.stringify({
                    type: "sequence:gameComplete",
                    leaderboard,
                    globalWinner,
                  }));
                }
              }
            }
            break;
          }

          case "sequence:host:reset": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                if (room.sequenceRound?.revealTimer) {
                  clearTimeout(room.sequenceRound.revealTimer);
                }
                if (room.sequenceRound?.answeringTimer) {
                  clearTimeout(room.sequenceRound.answeringTimer);
                }
                // Preserve session scores for the next question
                const existingScores = room.sequenceRound?.sessionScores || new Map<string, number>();
                room.sequenceRound = null;
                
                // Create a minimal state to preserve scores
                room.sequenceRound = {
                  questionId: 0,
                  question: null,
                  correctOrder: [],
                  startTime: 0,
                  endTime: 0,
                  revealTimer: null,
                  answeringTimer: null,
                  submissions: new Map(),
                  revealed: false,
                  gameState: "lobby",
                  currentQuestionIndex: 0,
                  totalQuestions: 0,
                  sessionScores: existingScores,
                };
                
                room.players.forEach((player) => {
                  if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ type: "sequence:reset" }));
                  }
                });
              }
            }
            break;
          }

          case "sequence:host:forceEnd": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.sequenceRound && !room.sequenceRound.revealed) {
                if (room.sequenceRound.revealTimer) {
                  clearTimeout(room.sequenceRound.revealTimer);
                  room.sequenceRound.revealTimer = null;
                }
                if (room.sequenceRound.answeringTimer) {
                  clearTimeout(room.sequenceRound.answeringTimer);
                  room.sequenceRound.answeringTimer = null;
                }
                // Trigger reveal
                room.sequenceRound.revealed = true;
                room.sequenceRound.gameState = "result";
                
                const subs = Array.from(room.sequenceRound.submissions.values());
                const correctOrder = room.sequenceRound.correctOrder;
                
                const scoredSubs = subs.map(sub => ({
                  ...sub,
                  isCorrect: JSON.stringify(sub.sequence) === JSON.stringify(correctOrder),
                }));
                
                const correctSubs = scoredSubs.filter(s => s.isCorrect).sort((a, b) => a.timeMs - b.timeMs);
                
                let winner: { playerId: string; playerName: string; playerAvatar: string; timeMs: number } | null = null;
                if (correctSubs.length > 0) {
                  const fastest = correctSubs[0];
                  winner = { playerId: fastest.playerId, playerName: fastest.playerName, playerAvatar: fastest.playerAvatar, timeMs: fastest.timeMs };
                  const currentScore = room.sequenceRound.sessionScores.get(fastest.playerId) || 0;
                  room.sequenceRound.sessionScores.set(fastest.playerId, currentScore + 10);
                }
                
                const leaderboard = Array.from(room.sequenceRound.sessionScores.entries())
                  .map(([pid, score]) => {
                    const player = room.players.get(pid);
                    return { playerId: pid, playerName: player?.name || "Unknown", playerAvatar: player?.avatar || "cat", score };
                  })
                  .sort((a, b) => b.score - a.score);
                
                room.players.forEach((player) => {
                  if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    const playerSub = scoredSubs.find(s => s.playerId === player.id);
                    const playerRank = correctSubs.findIndex(s => s.playerId === player.id) + 1;
                    const playerScore = room.sequenceRound?.sessionScores.get(player.id) || 0;
                    player.ws.send(JSON.stringify({
                      type: "sequence:reveal",
                      correctOrder,
                      isCorrect: playerSub?.isCorrect || false,
                      rank: playerRank > 0 ? playerRank : undefined,
                      winner,
                      leaderboard,
                      myScore: playerScore,
                    }));
                  }
                });
                
                room.hostWs?.send(JSON.stringify({
                  type: "sequence:reveal:complete",
                  submissions: scoredSubs,
                  winner,
                  leaderboard,
                  currentQuestionIndex: room.sequenceRound.currentQuestionIndex,
                  totalQuestions: room.sequenceRound.totalQuestions,
                }));
              }
            }
            break;
          }

          case "sequence:host:resetScores": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                if (room.sequenceRound) {
                  room.sequenceRound.sessionScores = new Map();
                } else {
                  room.sequenceRound = {
                    questionId: 0,
                    question: null,
                    correctOrder: [],
                    startTime: 0,
                    endTime: 0,
                    revealTimer: null,
                    answeringTimer: null,
                    submissions: new Map(),
                    revealed: false,
                    gameState: "lobby",
                    currentQuestionIndex: 0,
                    totalQuestions: 0,
                    sessionScores: new Map(),
                  };
                }
                
                room.players.forEach((player) => {
                  if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ type: "sequence:scoresReset" }));
                  }
                });
                
                if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                  room.hostWs.send(JSON.stringify({ type: "sequence:scoresReset" }));
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

    ws.on("error", (err) => {
      console.error("[WebSocket] Connection error:", err.message);
    });

    ws.on("close", () => {
      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          if (isHost) {
            room.hostWs = null;
          } else if (playerId) {
            const player = room.players.get(playerId);
            if (player) {
              storage.updatePlayerConnection(room.sessionId, playerId, false).catch(err => {
                console.error("[WebSocket] Failed to update player connection:", err.message);
              });
              room.players.delete(playerId);
            }
            
            if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
              try {
                room.hostWs.send(JSON.stringify({
                  type: "player:left",
                  playerId,
                  playerName: player?.name,
                  remainingPlayers: Array.from(room.players.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    avatar: p.avatar,
                  })),
                }));
              } catch (sendErr) {
                console.error("[WebSocket] Failed to notify host of player leave:", sendErr);
              }
            }
          }

          if (!room.hostWs && room.players.size === 0) {
            rooms.delete(currentRoom);
          }
        }
      }
    });
  });

  wss.on("error", (err) => {
    console.error("[WebSocket Server] Error:", err.message);
  });

  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomCode) => {
      room.players.forEach((player, playerId) => {
        if (now - player.lastPing > PING_TIMEOUT) {
          console.log(`[GameRoom] Removing stale player ${player.name} from room ${roomCode}`);
          if (player.ws && player.ws.readyState === WebSocket.OPEN) {
            player.ws.close();
          }
          const playerName = player.name;
          room.players.delete(playerId);
          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(JSON.stringify({
              type: "player:left",
              playerId,
              playerName,
              remainingPlayers: Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar,
              })),
            }));
          }
        }
      });

      if (room.hostWs && now - room.hostLastPing > PING_TIMEOUT) {
        console.log(`[GameRoom] Host timed out for room ${roomCode}`);
        if (room.hostWs.readyState === WebSocket.OPEN) {
          room.hostWs.close();
        }
        room.hostWs = null;
      }

      if (!room.hostWs && room.players.size === 0) {
        console.log(`[GameRoom] Deleting empty room ${roomCode}`);
        rooms.delete(roomCode);
      }
    });
  }, PING_INTERVAL);

  return wss;
}

export function getRoomInfo(code: string) {
  const room = rooms.get(code);
  if (!room) return null;
  return {
    code: room.code,
    sessionId: room.sessionId,
    playerCount: room.players.size,
    players: Array.from(room.players.values()).map(p => ({ 
      id: p.id, 
      name: p.name, 
      score: p.score,
      isConnected: p.ws && p.ws.readyState === WebSocket.OPEN,
    })),
    currentBoardId: room.currentBoardId,
    currentMode: room.currentMode,
    buzzerLocked: room.buzzerLocked,
  };
}

export async function getOrRestoreSession(code: string) {
  const room = rooms.get(code.toUpperCase());
  if (room) {
    return {
      sessionId: room.sessionId,
      code: room.code,
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        isConnected: p.ws && p.ws.readyState === WebSocket.OPEN,
      })),
      currentBoardId: room.currentBoardId,
      currentMode: room.currentMode,
      buzzerLocked: room.buzzerLocked,
    };
  }
  
  const session = await storage.getSessionWithPlayers(code.toUpperCase());
  if (session && session.state !== 'ended') {
    const completedQuestions = await storage.getCompletedQuestions(session.id);
    return {
      sessionId: session.id,
      code: session.code,
      players: session.players.map(p => ({
        id: p.playerId,
        name: p.name,
        score: p.score,
        isConnected: false,
      })),
      currentBoardId: session.currentBoardId,
      currentMode: session.currentMode,
      buzzerLocked: session.buzzerLocked,
      completedQuestions,
    };
  }
  
  return null;
}
