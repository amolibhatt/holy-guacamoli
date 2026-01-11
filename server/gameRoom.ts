import { WebSocket, WebSocketServer } from "ws";
import type { Server } from "http";
import { randomUUID } from "crypto";

interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  lastPing: number;
}

interface LiarSubmission {
  playerId: string;
  playerName: string;
  answer: string;
  isReal: boolean;
}

interface LiarVote {
  playerId: string;
  votedFor: string; // submission index
}

interface LiarRoundState {
  phase: 'idle' | 'submission' | 'voting' | 'results';
  clue: string;
  truth: string;
  promptId: number | null;
  submissions: LiarSubmission[];
  votes: LiarVote[];
  timerEnd: number | null;
}

interface GameRoom {
  code: string;
  hostWs: WebSocket | null;
  hostLastPing: number;
  players: Map<string, Player>;
  buzzerQueue: string[];
  buzzerLocked: boolean;
  currentQuestion: number | null;
  gameMode: 'buzzer' | 'liar';
  liarState: LiarRoundState;
}

const rooms = new Map<string, GameRoom>();
const PING_INTERVAL = 10000; // 10 seconds
const PING_TIMEOUT = 30000; // 30 seconds without pong = dead

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
            const gameMode = message.gameMode || 'buzzer';
            const room: GameRoom = {
              code,
              hostWs: ws,
              hostLastPing: Date.now(),
              players: new Map(),
              buzzerQueue: [],
              buzzerLocked: true,
              currentQuestion: null,
              gameMode,
              liarState: {
                phase: 'idle',
                clue: '',
                truth: '',
                promptId: null,
                submissions: [],
                votes: [],
                timerEnd: null,
              },
            };
            rooms.set(code, room);
            currentRoom = code;
            isHost = true;
            ws.send(JSON.stringify({ type: "room:created", code, gameMode }));
            break;
          }

          case "host:join": {
            const room = rooms.get(message.code);
            if (room) {
              room.hostWs = ws;
              room.hostLastPing = Date.now();
              currentRoom = message.code;
              isHost = true;
              ws.send(JSON.stringify({ 
                type: "room:joined", 
                code: message.code,
                players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name })),
                buzzerLocked: room.buzzerLocked,
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
              const newPlayerId: string = message.playerId || randomUUID();
              playerId = newPlayerId;
              const existingPlayer = room.players.get(newPlayerId);
              const isReconnect = !!existingPlayer;
              const player: Player = {
                id: newPlayerId,
                name: existingPlayer?.name || name,
                ws,
                lastPing: Date.now(),
              };
              room.players.set(newPlayerId, player);
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

          // === LIAR'S LOBBY MESSAGES ===
          case "liar:start-submission": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.gameMode === 'liar') {
                const { clue, truth, promptId, timerSeconds } = message;
                room.liarState = {
                  phase: 'submission',
                  clue,
                  truth,
                  promptId: promptId || null,
                  submissions: [],
                  votes: [],
                  timerEnd: timerSeconds ? Date.now() + timerSeconds * 1000 : null,
                };
                room.players.forEach((player) => {
                  if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({
                      type: "liar:submission-phase",
                      clue,
                      timerEnd: room.liarState.timerEnd,
                    }));
                  }
                });
                ws.send(JSON.stringify({ type: "liar:submission-started" }));
              }
            }
            break;
          }

          case "liar:submit": {
            if (playerId && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.liarState.phase === 'submission') {
                const player = room.players.get(playerId);
                const existingIdx = room.liarState.submissions.findIndex(s => s.playerId === playerId);
                if (existingIdx >= 0) {
                  room.liarState.submissions[existingIdx].answer = message.answer;
                } else {
                  room.liarState.submissions.push({
                    playerId,
                    playerName: player?.name || 'Unknown',
                    answer: message.answer,
                    isReal: false,
                  });
                }
                ws.send(JSON.stringify({ type: "liar:submit-confirmed" }));
                if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                  room.hostWs.send(JSON.stringify({
                    type: "liar:submission-received",
                    playerId,
                    playerName: player?.name,
                    submissionCount: room.liarState.submissions.length,
                    totalPlayers: room.players.size,
                  }));
                }
              }
            }
            break;
          }

          case "liar:start-voting": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.liarState.phase === 'submission') {
                const { timerSeconds } = message;
                room.liarState.submissions.push({
                  playerId: 'truth',
                  playerName: 'The Truth',
                  answer: room.liarState.truth,
                  isReal: true,
                });
                for (let i = room.liarState.submissions.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [room.liarState.submissions[i], room.liarState.submissions[j]] = 
                    [room.liarState.submissions[j], room.liarState.submissions[i]];
                }
                room.liarState.phase = 'voting';
                room.liarState.votes = [];
                room.liarState.timerEnd = timerSeconds ? Date.now() + timerSeconds * 1000 : null;
                const votingOptions = room.liarState.submissions.map((s, idx) => ({
                  index: idx,
                  answer: s.answer,
                }));
                room.players.forEach((player) => {
                  if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({
                      type: "liar:voting-phase",
                      clue: room.liarState.clue,
                      options: votingOptions,
                      timerEnd: room.liarState.timerEnd,
                      mySubmissionIndex: room.liarState.submissions.findIndex(s => s.playerId === player.id),
                    }));
                  }
                });
                ws.send(JSON.stringify({ 
                  type: "liar:voting-started",
                  options: votingOptions,
                }));
              }
            }
            break;
          }

          case "liar:vote": {
            if (playerId && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.liarState.phase === 'voting') {
                const existingIdx = room.liarState.votes.findIndex(v => v.playerId === playerId);
                if (existingIdx >= 0) {
                  room.liarState.votes[existingIdx].votedFor = String(message.optionIndex);
                } else {
                  room.liarState.votes.push({
                    playerId,
                    votedFor: String(message.optionIndex),
                  });
                }
                ws.send(JSON.stringify({ type: "liar:vote-confirmed" }));
                if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
                  room.hostWs.send(JSON.stringify({
                    type: "liar:vote-received",
                    playerId,
                    voteCount: room.liarState.votes.length,
                    totalPlayers: room.players.size,
                  }));
                }
              }
            }
            break;
          }

          case "liar:reveal": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room && room.liarState.phase === 'voting') {
                room.liarState.phase = 'results';
                const results = room.liarState.submissions.map((sub, idx) => {
                  const votesForThis = room.liarState.votes.filter(v => v.votedFor === String(idx));
                  return {
                    index: idx,
                    answer: sub.answer,
                    playerId: sub.playerId,
                    playerName: sub.playerName,
                    isReal: sub.isReal,
                    voterIds: votesForThis.map(v => v.playerId),
                    voterNames: votesForThis.map(v => room.players.get(v.playerId)?.name || 'Unknown'),
                    voteCount: votesForThis.length,
                  };
                });
                const truthResult = results.find(r => r.isReal);
                const fooledEveryone = results.filter(r => 
                  !r.isReal && r.voteCount > 0 && 
                  r.voteCount === room.liarState.votes.length
                );
                room.players.forEach((player) => {
                  if (player.ws.readyState === WebSocket.OPEN) {
                    const myVote = room.liarState.votes.find(v => v.playerId === player.id);
                    const votedCorrectly = myVote && truthResult && myVote.votedFor === String(truthResult.index);
                    player.ws.send(JSON.stringify({
                      type: "liar:results",
                      results,
                      votedCorrectly,
                    }));
                  }
                });
                ws.send(JSON.stringify({
                  type: "liar:results",
                  results,
                  fooledEveryone: fooledEveryone.map(r => ({ playerId: r.playerId, playerName: r.playerName })),
                }));
              }
            }
            break;
          }

          case "liar:reset": {
            if (isHost && currentRoom) {
              const room = rooms.get(currentRoom);
              if (room) {
                room.liarState = {
                  phase: 'idle',
                  clue: '',
                  truth: '',
                  promptId: null,
                  submissions: [],
                  votes: [],
                  timerEnd: null,
                };
                room.players.forEach((player) => {
                  if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ type: "liar:reset" }));
                  }
                });
                ws.send(JSON.stringify({ type: "liar:reset" }));
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

  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomCode) => {
      room.players.forEach((player, playerId) => {
        if (now - player.lastPing > PING_TIMEOUT) {
          console.log(`[GameRoom] Removing stale player ${player.name} from room ${roomCode}`);
          if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.close();
          }
          room.players.delete(playerId);
          if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
            room.hostWs.send(JSON.stringify({
              type: "player:left",
              playerId,
              playerName: player.name,
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
    playerCount: room.players.size,
    players: Array.from(room.players.values()).map(p => ({ id: p.id, name: p.name })),
  };
}
