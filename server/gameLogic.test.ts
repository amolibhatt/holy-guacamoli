import { describe, it, expect } from "vitest";
import {
  createEmptyRoomState,
  createEmptyGameStats,
  addPlayerToRoom,
  removePlayerFromRoom,
  disconnectPlayer,
  unlockBuzzer,
  lockBuzzer,
  addBuzz,
  passPlayer,
  validateScoreUpdate,
  applyScoreUpdate,
  getLeaderboard,
  resetForNextGrid,
  endGame,
  checkGameCompletion,
  updateGameStats,
  type PlayerState,
  type RoomState,
} from "./gameLogic";

function makePlayer(id: string, name: string, score = 0): PlayerState {
  return { id, name, avatar: "cat", score, isConnected: true };
}

function roomWithPlayers(...players: PlayerState[]): RoomState {
  let room = createEmptyRoomState();
  for (const p of players) {
    room = addPlayerToRoom(room, p);
  }
  return room;
}

describe("Room State Management", () => {
  it("creates an empty room with defaults", () => {
    const room = createEmptyRoomState();
    expect(room.buzzerLocked).toBe(true);
    expect(room.buzzQueue).toEqual([]);
    expect(room.passedPlayers.size).toBe(0);
    expect(room.gameEnded).toBe(false);
    expect(room.players.size).toBe(0);
  });

  it("adds a player to the room", () => {
    const room = addPlayerToRoom(createEmptyRoomState(), makePlayer("p1", "Alice"));
    expect(room.players.size).toBe(1);
    expect(room.players.get("p1")?.name).toBe("Alice");
  });

  it("removes a player and clears them from buzz queue", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice"), makePlayer("p2", "Bob"));
    room = unlockBuzzer(room, true);
    const result = addBuzz(room, "p1", "Alice");
    room = result!.room;
    const result2 = addBuzz(room, "p2", "Bob");
    room = result2!.room;
    expect(room.buzzQueue).toHaveLength(2);

    room = removePlayerFromRoom(room, "p1");
    expect(room.players.size).toBe(1);
    expect(room.buzzQueue).toHaveLength(1);
    expect(room.buzzQueue[0].playerId).toBe("p2");
  });

  it("disconnects a player and removes from buzz queue", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice"));
    room = unlockBuzzer(room, true);
    const result = addBuzz(room, "p1", "Alice");
    room = result!.room;

    room = disconnectPlayer(room, "p1");
    expect(room.players.get("p1")?.isConnected).toBe(false);
    expect(room.buzzQueue).toHaveLength(0);
  });
});

describe("Buzzer Lock/Unlock", () => {
  it("unlocking clears buzz queue and resets passedPlayers on new question", () => {
    let room = createEmptyRoomState();
    room = { ...room, passedPlayers: new Set(["p1", "p2"]), buzzQueue: [{ playerId: "p3", playerName: "Charlie", position: 1, timestamp: 0 }] };

    room = unlockBuzzer(room, true);
    expect(room.buzzerLocked).toBe(false);
    expect(room.buzzQueue).toEqual([]);
    expect(room.passedPlayers.size).toBe(0);
  });

  it("unlocking preserves passedPlayers when NOT a new question", () => {
    let room = createEmptyRoomState();
    room = { ...room, passedPlayers: new Set(["p1"]) };

    room = unlockBuzzer(room, false);
    expect(room.buzzerLocked).toBe(false);
    expect(room.passedPlayers.has("p1")).toBe(true);
  });

  it("locking clears buzz queue", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice"));
    room = unlockBuzzer(room, true);
    const result = addBuzz(room, "p1", "Alice");
    room = result!.room;

    room = lockBuzzer(room);
    expect(room.buzzerLocked).toBe(true);
    expect(room.buzzQueue).toEqual([]);
  });
});

describe("Buzz Queue Management", () => {
  it("adds a buzz with correct position", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice"), makePlayer("p2", "Bob"));
    room = unlockBuzzer(room, true);

    const r1 = addBuzz(room, "p1", "Alice");
    expect(r1).not.toBeNull();
    expect(r1!.position).toBe(1);
    room = r1!.room;

    const r2 = addBuzz(room, "p2", "Bob");
    expect(r2!.position).toBe(2);
  });

  it("prevents duplicate buzzes from same player", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice"));
    room = unlockBuzzer(room, true);
    const r1 = addBuzz(room, "p1", "Alice");
    room = r1!.room;

    const r2 = addBuzz(room, "p1", "Alice");
    expect(r2).toBeNull();
  });

  it("prevents buzz when buzzer is locked", () => {
    const room = roomWithPlayers(makePlayer("p1", "Alice"));
    const result = addBuzz(room, "p1", "Alice");
    expect(result).toBeNull();
  });

  it("prevents buzz from passed players", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice"), makePlayer("p2", "Bob"));
    room = unlockBuzzer(room, true);
    const r1 = addBuzz(room, "p1", "Alice");
    room = r1!.room;

    room = passPlayer(room, "p1");
    expect(room.passedPlayers.has("p1")).toBe(true);
    expect(room.buzzQueue).toHaveLength(0);

    room = unlockBuzzer(room, false);
    const r2 = addBuzz(room, "p1", "Alice");
    expect(r2).toBeNull();
  });

  it("passedPlayers persists across unlock (same question) but clears on new question", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice"));
    room = unlockBuzzer(room, true);
    room = passPlayer(room, "p1");

    room = unlockBuzzer(room, false);
    expect(room.passedPlayers.has("p1")).toBe(true);

    room = unlockBuzzer(room, true);
    expect(room.passedPlayers.has("p1")).toBe(false);
  });
});

describe("Score Updates", () => {
  it("validates score update boundaries", () => {
    expect(validateScoreUpdate(50)).toBe(true);
    expect(validateScoreUpdate(-50)).toBe(true);
    expect(validateScoreUpdate(0)).toBe(true);
    expect(validateScoreUpdate(10001)).toBe(false);
    expect(validateScoreUpdate(-10001)).toBe(false);
    expect(validateScoreUpdate(NaN)).toBe(false);
    expect(validateScoreUpdate(Infinity)).toBe(false);
  });

  it("applies score update correctly", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice", 100));
    room = applyScoreUpdate(room, "p1", 50);
    expect(room.players.get("p1")?.score).toBe(150);
  });

  it("handles negative score updates", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice", 30));
    room = applyScoreUpdate(room, "p1", -50);
    expect(room.players.get("p1")?.score).toBe(-20);
  });

  it("rejects invalid score updates", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice", 100));
    room = applyScoreUpdate(room, "p1", 10001);
    expect(room.players.get("p1")?.score).toBe(100);
  });

  it("ignores updates for non-existent players", () => {
    const room = roomWithPlayers(makePlayer("p1", "Alice"));
    const updated = applyScoreUpdate(room, "p999", 50);
    expect(updated.players.size).toBe(1);
  });
});

describe("Leaderboard", () => {
  it("sorts players by score descending", () => {
    const room = roomWithPlayers(
      makePlayer("p1", "Alice", 30),
      makePlayer("p2", "Bob", 50),
      makePlayer("p3", "Charlie", 10),
    );
    const lb = getLeaderboard(room);
    expect(lb[0].playerName).toBe("Bob");
    expect(lb[1].playerName).toBe("Alice");
    expect(lb[2].playerName).toBe("Charlie");
  });

  it("handles tied scores", () => {
    const room = roomWithPlayers(
      makePlayer("p1", "Alice", 50),
      makePlayer("p2", "Bob", 50),
    );
    const lb = getLeaderboard(room);
    expect(lb).toHaveLength(2);
    expect(lb[0].score).toBe(50);
    expect(lb[1].score).toBe(50);
  });

  it("handles zero and negative scores", () => {
    const room = roomWithPlayers(
      makePlayer("p1", "Alice", -10),
      makePlayer("p2", "Bob", 0),
    );
    const lb = getLeaderboard(room);
    expect(lb[0].playerName).toBe("Bob");
    expect(lb[1].playerName).toBe("Alice");
  });

  it("returns empty array for room with no players", () => {
    const room = createEmptyRoomState();
    expect(getLeaderboard(room)).toEqual([]);
  });
});

describe("Game End / Next Grid (Bug Fix: gameEnded reset)", () => {
  it("endGame sets gameEnded flag", () => {
    const room = roomWithPlayers(makePlayer("p1", "Alice"));
    const ended = endGame(room);
    expect(ended).not.toBeNull();
    expect(ended!.gameEnded).toBe(true);
  });

  it("endGame returns null if already ended (idempotency guard)", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice"));
    room = endGame(room)!;
    const second = endGame(room);
    expect(second).toBeNull();
  });

  it("resetForNextGrid clears gameEnded flag", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice", 100));
    room = endGame(room)!;
    expect(room.gameEnded).toBe(true);

    room = resetForNextGrid(room);
    expect(room.gameEnded).toBe(false);
    expect(room.buzzQueue).toEqual([]);
    expect(room.passedPlayers.size).toBe(0);
    expect(room.completedQuestions.size).toBe(0);
  });

  it("resetForNextGrid preserves players and scores", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice", 100), makePlayer("p2", "Bob", 200));
    room = endGame(room)!;
    room = resetForNextGrid(room);

    expect(room.players.size).toBe(2);
    expect(room.players.get("p1")?.score).toBe(100);
    expect(room.players.get("p2")?.score).toBe(200);
  });

  it("endGame works again after resetForNextGrid", () => {
    let room = roomWithPlayers(makePlayer("p1", "Alice"));
    room = endGame(room)!;
    room = resetForNextGrid(room);
    const ended = endGame(room);
    expect(ended).not.toBeNull();
    expect(ended!.gameEnded).toBe(true);
  });
});

describe("Game Completion Detection", () => {
  it("detects completion when all cells revealed", () => {
    expect(checkGameCompletion(25, 25, 3)).toBe(true);
  });

  it("not complete when cells remain", () => {
    expect(checkGameCompletion(24, 25, 3)).toBe(false);
  });

  it("not complete with zero total cells", () => {
    expect(checkGameCompletion(0, 0, 3)).toBe(false);
  });

  it("not complete with zero players", () => {
    expect(checkGameCompletion(25, 25, 0)).toBe(false);
  });
});

describe("Game Stats Tracking (Bug Fix: popover adjustments not tracked)", () => {
  it("tracks stats when categoryId is provided", () => {
    let stats = createEmptyGameStats();
    stats = updateGameStats(stats, "p1", "Alice", 10, 42, true);
    const playerStat = stats.playerStats.get("p1");
    expect(playerStat).toBeDefined();
    expect(playerStat!.correctAnswers).toBe(1);
    expect(playerStat!.totalPoints).toBe(10);
  });

  it("does NOT track stats when categoryId is undefined (popover adjustment)", () => {
    let stats = createEmptyGameStats();
    stats = updateGameStats(stats, "p1", "Alice", 10, undefined, true);
    expect(stats.playerStats.size).toBe(0);
    expect(stats.totalQuestions).toBe(0);
  });

  it("does NOT track stats when trackForGameplay is false (undo)", () => {
    let stats = createEmptyGameStats();
    stats = updateGameStats(stats, "p1", "Alice", -10, 42, false);
    expect(stats.playerStats.size).toBe(0);
  });

  it("tracks wrong answers correctly", () => {
    let stats = createEmptyGameStats();
    stats = updateGameStats(stats, "p1", "Alice", -20, 42, true);
    const playerStat = stats.playerStats.get("p1");
    expect(playerStat!.correctAnswers).toBe(0);
    expect(playerStat!.wrongAnswers).toBe(1);
    expect(playerStat!.totalPoints).toBe(-20);
  });

  it("tracks streaks correctly", () => {
    let stats = createEmptyGameStats();
    stats = updateGameStats(stats, "p1", "Alice", 10, 1, true);
    stats = updateGameStats(stats, "p1", "Alice", 20, 1, true);
    stats = updateGameStats(stats, "p1", "Alice", 30, 1, true);

    const playerStat = stats.playerStats.get("p1");
    expect(playerStat!.currentStreak).toBe(3);
    expect(playerStat!.bestStreak).toBe(3);
  });

  it("resets current streak on wrong answer", () => {
    let stats = createEmptyGameStats();
    stats = updateGameStats(stats, "p1", "Alice", 10, 1, true);
    stats = updateGameStats(stats, "p1", "Alice", 20, 1, true);
    stats = updateGameStats(stats, "p1", "Alice", -10, 2, true);

    const playerStat = stats.playerStats.get("p1");
    expect(playerStat!.currentStreak).toBe(0);
    expect(playerStat!.bestStreak).toBe(2);
  });

  it("generates MVP moment at 3-streak", () => {
    let stats = createEmptyGameStats();
    stats = updateGameStats(stats, "p1", "Alice", 10, 1, true);
    stats = updateGameStats(stats, "p1", "Alice", 20, 1, true);
    expect(stats.mvpMoments).toHaveLength(0);
    stats = updateGameStats(stats, "p1", "Alice", 30, 1, true);
    expect(stats.mvpMoments).toHaveLength(1);
    expect(stats.mvpMoments[0].type).toBe("streak");
  });

  it("tracks points by category", () => {
    let stats = createEmptyGameStats();
    stats = updateGameStats(stats, "p1", "Alice", 10, 42, true);
    stats = updateGameStats(stats, "p1", "Alice", 20, 42, true);
    stats = updateGameStats(stats, "p1", "Alice", 30, 99, true);

    const playerStat = stats.playerStats.get("p1");
    expect(playerStat!.pointsByCategory[42]).toBe(30);
    expect(playerStat!.pointsByCategory[99]).toBe(30);
  });

  it("tracks total questions correctly (only on actual score changes)", () => {
    let stats = createEmptyGameStats();
    stats = updateGameStats(stats, "p1", "Alice", 10, 1, true);
    stats = updateGameStats(stats, "p1", "Alice", -20, 1, true);
    stats = updateGameStats(stats, "p1", "Alice", 30, 1, true);
    expect(stats.totalQuestions).toBe(3);
  });
});
