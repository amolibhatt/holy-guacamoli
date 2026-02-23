import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, XCircle, Trophy, Clock, Star, Sparkles, Lock, Grid3X3, Hand, Flame, Laugh, CircleDot, ThumbsUp, Eye, Check, Crown, Medal } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PLAYER_AVATARS, type AvatarId } from "@shared/schema";
import { Logo } from "@/components/Logo";
import {
  FullScreenFlash,
  GameJoinForm,
  GamePlayerHeader,
  GamePlayerInfoBar,
  GameConnectionBanner,
  getGameSession,
  saveGameSession,
  clearGameSession,
  type ConnectionStatus,
  type LeaderboardEntry,
} from "@/components/game";

function getCodeFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('code') || '';
}

export default function PlayerPage() {
  const params = useParams<{ code?: string }>();
  const [, setLocation] = useLocation();
  const codeFromUrl = params.code || getCodeFromUrl();
  const { toast } = useToast();
  const savedSession = getGameSession("buzzer");
  const [roomCode, setRoomCode] = useState(codeFromUrl || savedSession?.roomCode || "");
  const [playerName, setPlayerName] = useState(savedSession?.playerName || "");
  
  // Get player profile for stat tracking
  const { profile } = usePlayerProfile(playerName);
  const [playerId, setPlayerId] = useState<string | null>(savedSession?.playerId || null);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(savedSession?.avatar || "cat");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [buzzerLocked, setBuzzerLocked] = useState(true);
  const [buzzPosition, setBuzzPosition] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number } | null>(null);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [buzzerBlocked, setBuzzerBlocked] = useState(false); // Blocked after wrong answer
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [showBuzzFlash, setShowBuzzFlash] = useState(false);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [showWrongFlash, setShowWrongFlash] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{ id: string; name: string; avatar?: string; score: number }>>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  const [hostPickingGrid, setHostPickingGrid] = useState(false);
  const [currentGridName, setCurrentGridName] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<"buzzer" | "psyop">("buzzer");
  const [psyopPhase, setPsyopPhase] = useState<"idle" | "submitting" | "voting" | "revealed">("idle");
  const [psyopQuestion, setPsyopQuestion] = useState<{ id: number; factText: string } | null>(null);
  const [psyopOptions, setPsyopOptions] = useState<Array<{ id: string; text: string }>>([]);
  const [psyopSubmitted, setPsyopSubmitted] = useState(false);
  const [psyopVoted, setPsyopVoted] = useState(false);
  const [psyopLieText, setPsyopLieText] = useState("");
  const [psyopCorrectAnswer, setPsyopCorrectAnswer] = useState<string | null>(null);
  const [psyopRevealData, setPsyopRevealData] = useState<{ yourScore: number; foundTruth: boolean; yourLiesBelieved: number } | null>(null);
  const [gameOverData, setGameOverData] = useState<{
    leaderboard: Array<{ playerId: string; playerName: string; playerAvatar: string; score: number }>;
    stats?: { correctAnswers: number; wrongAnswers: number; totalPoints: number; bestStreak: number; won: boolean };
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const joinedRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const playerIdRef = useRef<string | null>(playerId);
  const reconnectTokenRef = useRef<string | null>(savedSession?.reconnectToken || null);

  const connect = useCallback((isReconnect = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setStatus(isReconnect ? "reconnecting" : "connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      setReconnectAttempts(0);
      reconnectAttemptsRef.current = 0;
      ws.send(JSON.stringify({
        type: "player:join",
        code: roomCode.toUpperCase(),
        name: playerName,
        avatar: selectedAvatar,
        playerId: playerIdRef.current || playerId || undefined,
        reconnectToken: reconnectTokenRef.current || undefined,
        profileId: profile?.profile?.id,
      }));
      
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 10000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
        case "joined":
          setJoined(true);
          joinedRef.current = true;
          setPlayerId(data.playerId);
          playerIdRef.current = data.playerId;
          if (data.reconnectToken) reconnectTokenRef.current = data.reconnectToken;
          setBuzzerLocked(data.buzzerLocked);
          setBuzzerBlocked(data.buzzerBlocked || false);
          if (data.score !== undefined) setScore(data.score);
          saveGameSession("buzzer", roomCode.toUpperCase(), playerName, data.playerId, selectedAvatar, data.reconnectToken || reconnectTokenRef.current || undefined);
          break;
        case "score:updated":
          if (data.score !== undefined) {
            setScore((prevScore) => {
              const diff = data.score - prevScore;
              if (diff !== 0) {
                toast({
                  title: diff > 0 ? `+${diff} points!` : `${diff} points`,
                  description: diff > 0 ? "Great job!" : "Keep trying!",
                  duration: 2000,
                });
              }
              return data.score;
            });
          }
          break;
        case "scores:sync":
          const currentPlayerId = playerIdRef.current;
          const myScore = data.players?.find((p: any) => p.id === currentPlayerId)?.score;
          if (myScore !== undefined) setScore(myScore);
          if (data.players) {
            setLeaderboard(data.players.map((p: any) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })));
          }
          break;
        case "error":
          if (data.message === "Room not found") {
            shouldReconnectRef.current = false;
            clearGameSession("buzzer");
            setJoined(false);
            joinedRef.current = false;
            setStatus("disconnected");
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
            toast({
              title: "Game not found",
              description: "Check the room code and try again. The game may have ended.",
              variant: "destructive",
            });
          } else if (data.message === "Invalid reconnect token") {
            shouldReconnectRef.current = false;
            clearGameSession("buzzer");
            reconnectTokenRef.current = null;
            playerIdRef.current = null;
            setPlayerId(null);
            setJoined(false);
            joinedRef.current = false;
            setStatus("disconnected");
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
            toast({
              title: "Session expired",
              description: "Please rejoin the game.",
              variant: "destructive",
            });
          } else {
            setStatus("error");
            toast({
              title: "Connection issue",
              description: data.message || "Please check your connection and try again.",
              variant: "destructive",
            });
          }
          break;
        case "kicked":
          clearGameSession("buzzer");
          if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
          if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          if (feedbackTimerRef.current) { clearTimeout(feedbackTimerRef.current); feedbackTimerRef.current = null; }
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          setReconnectCountdown(null);
          toast({
            title: "Removed from game",
            description: "The host removed you from the game.",
            variant: "destructive",
          });
          break;
        case "game:ended":
          if (data.leaderboard) {
            setGameOverData({
              leaderboard: data.leaderboard,
              stats: data.stats,
            });
            setBuzzerLocked(true);
            setHasBuzzed(false);
            setBuzzPosition(null);
            setFeedback(null);
            setBuzzerBlocked(false);
            if (feedbackTimerRef.current) { clearTimeout(feedbackTimerRef.current); feedbackTimerRef.current = null; }
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }
          break;
        case "room:closed":
          clearGameSession("buzzer");
          if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
          if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          if (feedbackTimerRef.current) { clearTimeout(feedbackTimerRef.current); feedbackTimerRef.current = null; }
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          setHostPickingGrid(false);
          setGameOverData(null);
          setReconnectCountdown(null);
          toast({
            title: "Game ended",
            description: data.reason || "The game room has been closed.",
            variant: "destructive",
          });
          break;
        case "host:pickingNextGrid":
          setHostPickingGrid(true);
          setBuzzerLocked(true);
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          break;
        case "host:startNextGrid":
          setHostPickingGrid(false);
          setGameOverData(null);
          setCurrentGridName(data.gridName || null);
          setBuzzerLocked(true);
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          toast({
            title: "New grid starting!",
            description: data.gridName ? `Now playing: ${data.gridName}` : "Get ready!",
            duration: 3000,
          });
          break;
        case "buzzer:unlocked":
          setGameMode("buzzer");
          setPsyopPhase("idle");
          setPsyopQuestion(null);
          setPsyopOptions([]);
          setPsyopSubmitted(false);
          setPsyopVoted(false);
          setPsyopCorrectAnswer(null);
          setBuzzerLocked(false);
          setHasBuzzed(false);
          setBuzzPosition(null);
          if (feedbackTimerRef.current) { clearTimeout(feedbackTimerRef.current); feedbackTimerRef.current = null; }
          setFeedback(null);
          // Only clear block state on new question
          if (data.newQuestion) {
            setBuzzerBlocked(false);
          }
          try { navigator.vibrate?.(50); } catch {}
          break;
        case "buzzer:locked":
          setBuzzerLocked(true);
          setHasBuzzed(false);
          setBuzzPosition(null);
          break;
        case "buzzer:reset":
          setHasBuzzed(false);
          setBuzzPosition(null);
          if (feedbackTimerRef.current) { clearTimeout(feedbackTimerRef.current); feedbackTimerRef.current = null; }
          setFeedback(null);
          break;
        case "buzzer:blocked":
          // Player answered wrong - blocked from buzzing again on this question
          setHasBuzzed(false);
          setBuzzPosition(null);
          // Don't clear feedback here - let the wrong feedback screen persist
          // until buzzer:unlocked naturally clears it, so the player actually
          // sees the "Wrong, -X points" screen before transitioning to "Already Tried"
          setBuzzerBlocked(true);
          break;
        case "buzz:confirmed":
          setBuzzPosition(data.position);
          setHasBuzzed(true);
          break;
        case "buzz:position_update":
          setBuzzPosition(data.position);
          break;
        case "feedback":
          if (feedbackTimerRef.current) { clearTimeout(feedbackTimerRef.current); feedbackTimerRef.current = null; }
          setFeedback({ correct: data.correct, points: data.points });
          feedbackTimerRef.current = setTimeout(() => { setFeedback(null); feedbackTimerRef.current = null; }, 3000);
          if (data.correct) {
            setShowCorrectFlash(true);
            setTimeout(() => setShowCorrectFlash(false), 500);
            try { navigator.vibrate?.([100, 50, 100, 50, 200]); } catch {}
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!prefersReducedMotion) {
              confetti({
                particleCount: 100,
                spread: 90,
                origin: { y: 0.5 },
                colors: ['#FFD700', '#FFA500', '#FF6B6B', '#9B59B6', '#3498DB'],
              });
            }
          } else {
            setShowWrongFlash(true);
            setTimeout(() => setShowWrongFlash(false), 500);
            try { navigator.vibrate?.([200, 100, 200]); } catch {}
          }
          break;
        case "pong":
          break;
        case "host:disconnected":
          toast({
            title: "Host disconnected",
            description: "Waiting for host to reconnect...",
            variant: "destructive",
          });
          break;
        case "host:reconnected":
          // Host is back
          toast({
            title: "Host reconnected",
            description: "Game continues!",
          });
          break;
        case "room:modeChanged":
          if (data.mode === "sequence") {
            if (data.score !== undefined) setScore(data.score);
            setLocation(`/sortcircuit/${roomCode.toUpperCase()}`);
          }
          break;
        case "psyop:submission:start":
          setGameMode("psyop");
          setBuzzerLocked(true);
          setHasBuzzed(false);
          setBuzzPosition(null);
          setFeedback(null);
          setPsyopPhase("submitting");
          setPsyopQuestion(data.question);
          setPsyopSubmitted(false);
          setPsyopRevealData(null);
          setPsyopCorrectAnswer(null);
          break;
        case "psyop:voting:start":
          setGameMode("psyop");
          setPsyopPhase("voting");
          setPsyopOptions(data.options || []);
          setPsyopVoted(false);
          break;
        case "psyop:revealed": {
          setPsyopPhase("revealed");
          setPsyopCorrectAnswer(data.correctAnswer);
          setPsyopRevealData({
            yourScore: data.yourScore || 0,
            foundTruth: data.foundTruth || false,
            yourLiesBelieved: data.yourLiesBelieved || 0,
          });
          if (data.yourScore && data.yourScore > 0) {
            setScore(prev => prev + data.yourScore);
            const descriptions: string[] = [];
            if (data.yourTruthsSpotted > 0) descriptions.push("You found the truth!");
            if (data.yourLiesBelieved > 0) descriptions.push(`Your lie fooled ${data.yourLiesBelieved} player${data.yourLiesBelieved !== 1 ? 's' : ''}!`);
            toast({
              title: `+${data.yourScore} points!`,
              description: descriptions.join(" ") || "Nice work!",
            });
          } else {
            toast({
              title: "No points this round",
              description: "Better luck next time!",
            });
          }
          break;
        }
        case "psyop:skipped":
          setPsyopPhase("idle");
          setPsyopSubmitted(false);
          setPsyopVoted(false);
          setPsyopLieText("");
          setPsyopQuestion(null);
          setPsyopOptions([]);
          setPsyopCorrectAnswer(null);
          setPsyopRevealData(null);
          break;
        case "psyop:rematch":
          setPsyopPhase("idle");
          setPsyopSubmitted(false);
          setPsyopVoted(false);
          setPsyopLieText("");
          setPsyopQuestion(null);
          setPsyopOptions([]);
          setPsyopCorrectAnswer(null);
          setPsyopRevealData(null);
          setScore(0);
          toast({
            title: "Rematch!",
            description: "New round starting...",
          });
          break;
        case "psyop:ended":
          setGameMode("buzzer");
          setPsyopPhase("idle");
          setPsyopQuestion(null);
          setPsyopOptions([]);
          break;
      }
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
      if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
      if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
      setReconnectCountdown(null);

      if (!joinedRef.current || !shouldReconnectRef.current) {
        setStatus("disconnected");
        return;
      }

      const attempts = reconnectAttemptsRef.current;
      if (attempts >= 5) {
        setStatus("disconnected");
        toast({
          title: "Connection lost",
          description: "Could not reconnect. Try joining again.",
          variant: "destructive",
        });
        return;
      }

      setStatus("reconnecting");
      reconnectAttemptsRef.current = attempts + 1;
      setReconnectAttempts(attempts + 1);

      const delay = Math.min(2000 * Math.pow(1.5, attempts), 15000);
      let remaining = Math.ceil(delay / 1000);
      setReconnectCountdown(remaining);
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          setReconnectCountdown(null);
        } else {
          setReconnectCountdown(remaining);
        }
      }, 1000);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect(true);
      }, delay);
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [roomCode, playerName, playerId, selectedAvatar]);


  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      wsRef.current?.close();
    };
  }, []);


  const handleLeaveGame = () => {
    shouldReconnectRef.current = false;
    joinedRef.current = false;
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearGameSession("buzzer");
    setJoined(false);
    setPlayerId(null);
    playerIdRef.current = null;
    setStatus("disconnected");
    setScore(0);
    setLeaderboard([]);
    setShowLeaderboard(false);
    setBuzzerLocked(true);
    setHasBuzzed(false);
    setBuzzPosition(null);
    setFeedback(null);
    setBuzzerBlocked(false);
    setHostPickingGrid(false);
    setCurrentGridName(null);
    setGameOverData(null);
    setReconnectAttempts(0);
    reconnectAttemptsRef.current = 0;
    setReconnectCountdown(null);
    setGameMode("buzzer");
    setPsyopPhase("idle");
    setPsyopQuestion(null);
    setPsyopOptions([]);
    setPsyopSubmitted(false);
    setPsyopVoted(false);
    setPsyopLieText("");
    setPsyopCorrectAnswer(null);
  };

  const handleManualReconnect = () => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    setReconnectCountdown(null);
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    shouldReconnectRef.current = true;
    connect(true);
  };

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (roomCode.trim() && playerName.trim()) {
      shouldReconnectRef.current = true;
      reconnectAttemptsRef.current = 0;
      connect();
    }
  };

  const handleBuzz = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && !buzzerLocked && !hasBuzzed) {
      wsRef.current.send(JSON.stringify({ type: "player:buzz" }));
      setShowBuzzFlash(true);
      setTimeout(() => setShowBuzzFlash(false), 400);
      try {
        navigator.vibrate?.([50, 30, 100]);
      } catch {}
    }
  };

  const handleReaction = (reactionType: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "player:reaction", reactionType }));
      try {
        navigator.vibrate?.([30]);
      } catch {}
    }
  };

  const nameInputRef = useRef<HTMLInputElement>(null);
  const hasCodeFromUrl = !!codeFromUrl;

  useEffect(() => {
    if (hasCodeFromUrl && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [hasCodeFromUrl]);

  if (!joined) {
    return (
      <GameJoinForm
        icon={<Zap className="w-10 h-10 text-white" />}
        title="Join Game"
        subtitle="Enter the room code to play"
        hasCodeFromUrl={hasCodeFromUrl}
        roomCode={roomCode}
        onRoomCodeChange={setRoomCode}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        selectedAvatar={selectedAvatar}
        onAvatarSelect={setSelectedAvatar}
        onSubmit={handleJoin}
        status={status}
        nameInputRef={nameInputRef}
      />
    );
  }

  return (
    <div className="min-h-screen gradient-game flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="w-full flex justify-center pt-3 pb-1">
        <Logo size="compact" />
      </div>
      <InstallPrompt />
      <FullScreenFlash show={showBuzzFlash} color="bg-amber-400/60" />
      <FullScreenFlash show={showCorrectFlash} color="bg-primary/60" />
      <FullScreenFlash show={showWrongFlash} color="bg-destructive/60" />
      
      <GamePlayerHeader
        status={status}
        roomCode={roomCode}
        score={score}
        onLeave={handleLeaveGame}
      />

      <GamePlayerInfoBar
        playerName={playerName}
        avatar={selectedAvatar}
        leaderboard={leaderboard.map(p => ({ playerId: p.id, playerName: p.name, playerAvatar: p.avatar || "", score: p.score }))}
        playerId={playerId}
        showLeaderboard={showLeaderboard}
        onToggleLeaderboard={() => setShowLeaderboard(!showLeaderboard)}
      />

      <GameConnectionBanner
        status={status}
        joined={joined}
        reconnectCountdown={reconnectCountdown}
        reconnectAttempts={reconnectAttempts}
        onReconnect={handleManualReconnect}
      />

      <main className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {gameMode === "psyop" && psyopPhase === "submitting" && psyopQuestion ? (
            <motion.div
              key="psyop-submit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md space-y-6"
            >
              <Card className="border-secondary/30">
                <div className="p-6 space-y-4">
                  <div className="text-center">
                    <h2 className="text-lg font-bold mb-2">Write a believable lie:</h2>
                    <p className="text-xl leading-relaxed">
                      {psyopQuestion.factText.includes('[REDACTED]') ? (
                        <>
                          {psyopQuestion.factText.split('[REDACTED]')[0]}
                          <span className="px-2 py-1 mx-1 rounded bg-secondary/20 text-secondary font-bold">[REDACTED]</span>
                          {psyopQuestion.factText.split('[REDACTED]')[1]}
                        </>
                      ) : psyopQuestion.factText}
                    </p>
                  </div>

                  {psyopSubmitted ? (
                    <div className="text-center py-8">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Sparkles className="w-16 h-16 mx-auto text-secondary mb-4" />
                      </motion.div>
                      <p className="text-lg font-medium">Lie submitted!</p>
                      <p className="text-muted-foreground text-sm">Waiting for others...</p>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={psyopLieText}
                        onChange={(e) => setPsyopLieText(e.target.value)}
                        placeholder="Enter a believable lie..."
                        className="text-lg"
                        maxLength={200}
                        data-testid="input-psyop-lie"
                      />
                      <Button
                        onClick={() => {
                          if (psyopLieText.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({
                              type: "psyop:submit:lie",
                              lieText: psyopLieText.trim(),
                            }));
                            setPsyopSubmitted(true);
                            setPsyopLieText("");
                          }
                        }}
                        disabled={!psyopLieText.trim()}
                        className="w-full gap-2"
                        data-testid="button-submit-lie"
                      >
                        <Eye className="w-4 h-4" />
                        Submit Lie
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          ) : gameMode === "psyop" && psyopPhase === "voting" && psyopOptions.length > 0 ? (
            <motion.div
              key="psyop-vote"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md space-y-4"
            >
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold">Which is the truth?</h2>
                <p className="text-muted-foreground text-sm">Tap the answer you think is real</p>
              </div>

              {psyopVoted ? (
                <div className="text-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Clock className="w-16 h-16 mx-auto text-secondary mb-4" />
                  </motion.div>
                  <p className="text-lg font-medium">Vote cast!</p>
                  <p className="text-muted-foreground text-sm">Waiting for reveal...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {psyopOptions.map((option, i) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => {
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify({
                            type: "psyop:submit:vote",
                            votedForId: option.id,
                          }));
                          setPsyopVoted(true);
                        }
                      }}
                      className="w-full p-4 border rounded-lg text-left hover-elevate bg-card"
                      data-testid={`button-vote-${option.id}`}
                    >
                      <span className="font-bold mr-2 text-secondary">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {option.text}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : gameMode === "psyop" && psyopPhase === "revealed" && psyopCorrectAnswer ? (
            <motion.div
              key="psyop-revealed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4"
              data-testid="psyop-reveal-screen"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                {psyopRevealData?.foundTruth ? (
                  <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-10 h-10 text-primary" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-3">
                    <XCircle className="w-10 h-10 text-red-400" />
                  </div>
                )}
              </motion.div>

              <div>
                <p className="text-sm font-medium mb-1" data-testid="text-vote-result">
                  {psyopRevealData?.foundTruth ? (
                    <span className="text-primary">You found the truth!</span>
                  ) : (
                    <span className="text-red-400">You got tricked!</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">The truth was</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-correct-answer">
                  {psyopCorrectAnswer}
                </p>
              </div>

              {psyopRevealData && psyopRevealData.yourLiesBelieved > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-2 bg-secondary/10 border border-secondary/20 rounded-md inline-block"
                  data-testid="text-lie-success"
                >
                  <span className="text-sm text-secondary">
                    <Eye className="w-3.5 h-3.5 inline mr-1" />
                    Your lie fooled {psyopRevealData.yourLiesBelieved} player{psyopRevealData.yourLiesBelieved !== 1 ? 's' : ''}!
                  </span>
                </motion.div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                {psyopRevealData && psyopRevealData.yourScore > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="text-center px-4 py-2 bg-primary/10 border border-primary/20 rounded-md"
                    data-testid="text-round-points"
                  >
                    <div className="text-lg font-bold text-primary">+{psyopRevealData.yourScore}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">This Round</div>
                  </motion.div>
                )}
                <div className="text-center px-4 py-2 bg-muted/40 rounded-md" data-testid="text-total-score">
                  <div className="text-lg font-bold">{score}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                </div>
              </div>

              <motion.p
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-sm text-muted-foreground pt-2"
              >
                Waiting for next question...
              </motion.p>
            </motion.div>
          ) : gameOverData ? (
            <motion.div
              key="game-over"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center w-full max-w-sm mx-auto"
            >
              {(() => {
                const myIdx = gameOverData.leaderboard.findIndex(p => p.playerId === playerId);
                const isRanked = myIdx >= 0;
                const myRank = isRanked ? myIdx + 1 : 0;
                const myEntry = isRanked ? gameOverData.leaderboard[myIdx] : null;
                const isWinner = isRanked && myRank === 1;
                const isTop3 = isRanked && myRank >= 1 && myRank <= 3;
                const RankIcon = isWinner ? Crown : myRank === 2 ? Medal : myRank === 3 ? Medal : Star;
                const rankIconColor = isWinner ? 'text-yellow-400' : myRank === 2 ? 'text-slate-300' : myRank === 3 ? 'text-orange-400' : 'text-muted-foreground';
                const stats = gameOverData.stats;
                const accuracy = stats && (stats.correctAnswers + stats.wrongAnswers) > 0
                  ? Math.round((stats.correctAnswers / (stats.correctAnswers + stats.wrongAnswers)) * 100)
                  : null;

                return (
                  <>
                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {isWinner ? (
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          data-testid="rank-icon-winner"
                        >
                          <Trophy className="w-20 h-20 mx-auto text-yellow-400 mb-2" />
                        </motion.div>
                      ) : (
                        <div className="mb-2" data-testid="rank-icon">
                          <RankIcon className={`w-16 h-16 mx-auto ${rankIconColor}`} />
                        </div>
                      )}
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className={`text-3xl font-black mb-1 ${isWinner ? 'text-yellow-400' : isTop3 ? 'text-primary' : 'text-foreground'}`}
                      data-testid="text-player-game-over-title"
                    >
                      {isWinner ? 'You Won!' : isRanked ? `#${myRank} Place` : 'Game Over'}
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-2xl font-bold text-foreground mb-4"
                      data-testid="text-player-final-score"
                    >
                      {myEntry?.score || score} pts
                    </motion.p>

                    {stats && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-3 mb-5"
                        data-testid="player-game-stats"
                      >
                        <div className="text-center px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg" data-testid="stat-correct">
                          <div className="text-lg font-bold text-primary" data-testid="text-correct-count">{stats.correctAnswers}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Correct</div>
                        </div>
                        <div className="text-center px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg" data-testid="stat-wrong">
                          <div className="text-lg font-bold text-destructive" data-testid="text-wrong-count">{stats.wrongAnswers}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Wrong</div>
                        </div>
                        {accuracy !== null && (
                          <div className="text-center px-3 py-2 bg-muted/40 rounded-lg" data-testid="stat-accuracy">
                            <div className="text-lg font-bold" data-testid="text-accuracy">{accuracy}%</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Accuracy</div>
                          </div>
                        )}
                        {stats.bestStreak > 0 && (
                          <div className="text-center px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg" data-testid="stat-streak">
                            <div className="text-lg font-bold text-orange-400 flex items-center justify-center gap-1" data-testid="text-best-streak"><Flame className="w-4 h-4" /> {stats.bestStreak}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Streak</div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-card/60 border border-border/50 rounded-xl p-3 text-left"
                      data-testid="player-final-leaderboard"
                    >
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2 text-center" data-testid="text-final-standings-header">Final Standings</p>
                      <div className="space-y-1.5">
                        {gameOverData.leaderboard.map((entry, idx) => {
                          const isMe = entry.playerId === playerId;
                          const entryAvatar = PLAYER_AVATARS.find(a => a.id === entry.playerAvatar)?.emoji || '?';
                          return (
                            <motion.div
                              key={entry.playerId}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.6 + idx * 0.08 }}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                                isMe ? 'bg-primary/15 border border-primary/30 ring-1 ring-primary/20' :
                                idx === 0 ? 'bg-yellow-500/10' :
                                'bg-muted/20'
                              }`}
                              data-testid={`player-leaderboard-row-${entry.playerId}`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold ${
                                  idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
                                }`} data-testid={`player-leaderboard-rank-${entry.playerId}`}>
                                  {idx + 1}
                                </span>
                                <span className="text-base flex-shrink-0" data-testid={`player-leaderboard-avatar-${entry.playerId}`}>{entryAvatar}</span>
                                <span className={`text-sm font-medium truncate min-w-0 flex-1 ${isMe ? 'text-primary' : 'text-foreground'}`} title={entry.playerName} data-testid={`player-leaderboard-name-${entry.playerId}`}>
                                  {entry.playerName}
                                  {isMe && <span className="text-xs ml-1 text-primary/70">(you)</span>}
                                </span>
                              </div>
                              <span className="font-bold text-sm flex-shrink-0" data-testid={`player-leaderboard-score-${entry.playerId}`}>{entry.score}</span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                );
              })()}
            </motion.div>
          ) : hostPickingGrid ? (
            <motion.div
              key="picking-grid"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/80 via-primary to-secondary flex items-center justify-center mx-auto shadow-2xl mb-6"
              >
                <Grid3X3 className="w-16 h-16 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-picking-grid-title">Getting Next Grid Ready</h2>
              <p className="text-muted-foreground" data-testid="text-picking-grid-subtitle">Host is selecting the next round...</p>
              {currentGridName && (
                <p className="text-sm text-muted-foreground/60 mt-2" data-testid="text-last-grid-name">Last played: {currentGridName}</p>
              )}
              <motion.div
                className="flex justify-center gap-2 mt-4"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="w-2 h-2 rounded-full bg-primary" />
              </motion.div>
            </motion.div>
          ) : feedback ? (
            <motion.div
              key="feedback"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="text-center"
            >
              {feedback.correct ? (
                <>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, repeat: 3 }}
                  >
                    <Trophy className="w-32 h-32 text-yellow-400 mx-auto" />
                  </motion.div>
                  <h2 className="text-4xl font-black text-primary mt-4">Correct!</h2>
                  <p className="text-2xl text-foreground mt-2">+{feedback.points} points</p>
                </>
              ) : (
                <>
                  <XCircle className="w-32 h-32 text-destructive mx-auto" />
                  <h2 className="text-4xl font-black text-destructive mt-4">Wrong</h2>
                  {feedback.points !== 0 && (
                    <p className="text-2xl text-destructive/70 mt-2">−{Math.abs(feedback.points)} points</p>
                  )}
                </>
              )}
            </motion.div>
          ) : buzzPosition !== null ? (
            <motion.div
              key="buzzed"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-center"
            >
              {buzzPosition === 1 ? (
                <>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-48 h-48 rounded-full gradient-gold flex items-center justify-center mx-auto shadow-2xl relative"
                    data-testid="buzzed-first-indicator"
                  >
                    <Star className="absolute -top-2 -right-2 w-10 h-10 text-yellow-300 fill-yellow-300" aria-hidden="true" />
                    <Star className="absolute -top-4 left-4 w-6 h-6 text-yellow-200 fill-yellow-200" aria-hidden="true" />
                    <span className="text-7xl font-black text-white drop-shadow-lg" data-testid="buzz-position-first">#1</span>
                  </motion.div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-black text-primary mt-6"
                    data-testid="buzzed-first-title"
                  >
                    You Buzzed First!
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-muted-foreground mt-2 flex items-center justify-center gap-2"
                    data-testid="buzzed-first-message"
                  >
                    <Sparkles className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                    Get ready to answer!
                  </motion.p>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-40 h-40 rounded-full bg-muted/40 border-4 border-muted-foreground/30 flex items-center justify-center mx-auto"
                    data-testid="buzzed-waiting-indicator"
                  >
                    <span className="text-6xl font-black text-foreground" data-testid="buzz-position-value">#{buzzPosition}</span>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mt-4" data-testid="buzzed-waiting-title">
                    You're #{buzzPosition} in line
                  </h2>
                  <p className="text-muted-foreground mt-2" data-testid="buzzed-waiting-message">Waiting for your turn...</p>
                </>
              )}
            </motion.div>
          ) : buzzerBlocked ? (
            <motion.div
              key="blocked"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center flex flex-col items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <motion.div 
                className="w-48 h-48 rounded-full bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 flex flex-col items-center justify-center mx-auto shadow-2xl border-4 border-slate-500/40 relative"
                style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), inset 0 -4px 12px rgba(0,0,0,0.2)' }}
              >
                <XCircle className="w-20 h-20 text-slate-400/80 drop-shadow-lg" aria-hidden="true" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mt-6" data-testid="buzzer-blocked-title">Already Tried</h2>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-base" data-testid="buzzer-blocked-message">Wait for the next question</p>
            </motion.div>
          ) : buzzerLocked ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center flex flex-col items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <motion.div 
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-72 h-72 rounded-full bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 flex flex-col items-center justify-center mx-auto shadow-2xl border-4 border-slate-400/40 relative"
                style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), inset 0 -4px 12px rgba(0,0,0,0.2)' }}
              >
                <motion.div
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Lock className="w-24 h-24 text-slate-300/80 mb-2 drop-shadow-lg" aria-hidden="true" />
                </motion.div>
                <span className="text-slate-300 text-2xl font-black tracking-wider" data-testid="buzzer-locked-label">LOCKED</span>
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mt-8" data-testid="buzzer-status-title">You're In!</h2>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-base" data-testid="buzzer-status-message">Buzzer unlocks when the host picks a question</p>
            </motion.div>
          ) : (
            <motion.div
              key="buzzer"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center flex flex-col items-center justify-center"
            >
              <motion.button
                whileTap={{ scale: 0.82 }}
                whileHover={{ scale: 1.03 }}
                onClick={handleBuzz}
                className="w-80 h-80 sm:w-72 sm:h-72 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex flex-col items-center justify-center shadow-2xl active:shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-amber-400/50 relative overflow-visible touch-manipulation"
                style={{ 
                  WebkitTapHighlightColor: 'transparent', 
                  minWidth: '280px', 
                  minHeight: '280px',
                  boxShadow: '0 25px 60px -12px rgba(251, 191, 36, 0.5), inset 0 -6px 16px rgba(0,0,0,0.15)'
                }}
                data-testid="button-buzz"
                aria-label="Buzz in - tap to answer"
                role="button"
              >
                {/* Triple pulse ring effect */}
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-4 border-amber-400 -z-10"
                />
                <motion.div
                  animate={{ scale: [1, 1.7, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.25 }}
                  className="absolute inset-0 rounded-full border-4 border-amber-300 -z-20"
                />
                <motion.div
                  animate={{ scale: [1, 1.9, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  className="absolute inset-0 rounded-full border-4 border-amber-200 -z-30"
                />
                {/* Inner glow */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-yellow-300/30 to-transparent" />
                <Zap className="w-32 h-32 text-white drop-shadow-lg mb-1" aria-hidden="true" />
                <span className="text-white text-3xl font-black tracking-wider drop-shadow-md">BUZZ!</span>
              </motion.button>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-amber-600 dark:text-amber-400 font-bold mt-8 text-xl"
                data-testid="buzzer-hint"
              >
                Tap fast to answer first!
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Reaction buttons */}
      <div className="py-3 px-4 flex items-center justify-center gap-2">
        {[
          { type: 'clap', Icon: Hand, label: 'Clap', color: 'text-amber-400' },
          { type: 'fire', Icon: Flame, label: 'Fire', color: 'text-orange-500' },
          { type: 'laugh', Icon: Laugh, label: 'Laugh', color: 'text-yellow-400' },
          { type: 'wow', Icon: CircleDot, label: 'Wow', color: 'text-secondary' },
          { type: 'thumbsup', Icon: ThumbsUp, label: 'Thumbs Up', color: 'text-primary' },
        ].map(r => (
          <motion.button
            key={r.type}
            whileTap={{ scale: 0.8 }}
            onClick={() => handleReaction(r.type)}
            className="w-12 h-12 rounded-full bg-muted/30 hover:bg-muted/50 flex items-center justify-center transition-colors"
            aria-label={r.label}
            data-testid={`button-reaction-${r.type}`}
          >
            <r.Icon className={`w-6 h-6 ${r.color}`} />
          </motion.button>
        ))}
      </div>

      <footer className="p-4 text-center border-t border-border/30 bg-card/40 backdrop-blur" role="status" aria-live="polite" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${hostPickingGrid ? "bg-secondary animate-pulse" : buzzerLocked ? "bg-muted-foreground/50" : "bg-primary animate-pulse"}`} data-testid="footer-status-dot" />
          <span className={`text-sm font-medium ${hostPickingGrid ? "text-secondary font-bold" : buzzerLocked ? "text-muted-foreground" : "text-primary font-bold"}`} data-testid="footer-status-text">
            {hostPickingGrid ? "Host choosing next grid..." : buzzerLocked ? "Waiting for next question..." : "TAP THE BUZZER!"}
          </span>
        </div>
      </footer>
    </div>
  );
}
