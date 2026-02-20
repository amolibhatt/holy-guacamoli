import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ListOrdered, Check, X, RotateCcw, Undo2, Trophy, Lock, Pause } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { PLAYER_AVATARS, type AvatarId } from "@shared/schema";
import { Logo } from "@/components/Logo";
import { soundManager } from "@/lib/sounds";
import { InstallPrompt } from "@/components/InstallPrompt";
import {
  FullScreenFlash,
  GameJoinForm,
  GamePlayerHeader,
  GamePlayerInfoBar,
  GameConnectionBanner,
  GameCompleteScreen,
  GameLeaderboardView,
  GameWaitingScreen,
  getGameSession,
  saveGameSession,
  clearGameSession,
  type ConnectionStatus,
  type LeaderboardEntry,
} from "@/components/game";

type GamePhase = "waiting" | "animatedReveal" | "playing" | "submitted" | "revealing" | "results" | "leaderboard" | "gameComplete";

interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  hint?: string;
}

const SESSION_KEY = "sequence-session";

function getSession() {
  const session = getGameSession(SESSION_KEY);
  if (session) return session;
  return getGameSession("buzzer-session");
}

export default function SequencePlayer() {
  const params = useParams<{ code?: string }>();
  const { toast } = useToast();
  const savedSession = getSession();
  
  const [roomCode, setRoomCode] = useState(params.code || savedSession?.roomCode || "");
  const [playerName, setPlayerName] = useState(savedSession?.playerName || "");
  const { profile } = usePlayerProfile(playerName);
  const [playerId, setPlayerId] = useState<string | null>(savedSession?.playerId || null);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(savedSession?.avatar || "cat");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<GamePhase>("waiting");
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<string[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [correctOrder, setCorrectOrder] = useState<string[] | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(1);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [winner, setWinner] = useState<LeaderboardEntry | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [showWrongFlash, setShowWrongFlash] = useState(false);
  const [showSubmitFlash, setShowSubmitFlash] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  
  const hasCodeFromUrl = !!params.code;
  
  const wsRef = useRef<WebSocket | null>(null);
  const selectedSequenceRef = useRef<string[]>([]);
  const playerIdRef = useRef<string | null>(playerId);
  const reconnectTokenRef = useRef<string | null>(savedSession?.reconnectToken || null);
  const joinedRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevScoreRef = useRef(0);

  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);
  useEffect(() => { joinedRef.current = joined; }, [joined]);

  useEffect(() => {
    const unsub = soundManager.subscribe(() => setSoundEnabled(soundManager.isEnabled()));
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (myScore !== prevScoreRef.current && joined) {
      const delta = myScore - prevScoreRef.current;
      if (delta > 0) {
        toast({ title: `+${delta} points!`, duration: 2000 });
      } else if (delta < 0) {
        toast({ title: `${delta} points`, variant: "destructive", duration: 2000 });
      }
    }
    prevScoreRef.current = myScore;
  }, [myScore, toast, joined]);

  const clearAllTimers = useCallback(() => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    setReconnectCountdown(null);
  }, []);

  const connect = useCallback((isReconnect = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setStatus(isReconnect ? "reconnecting" : "connecting");
    clearAllTimers();
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0;
      setReconnectCountdown(null);
      ws.send(JSON.stringify({
        type: "sequence:player:join",
        code: roomCode.toUpperCase(),
        name: playerName,
        avatar: selectedAvatar,
        playerId: playerIdRef.current || undefined,
        reconnectToken: reconnectTokenRef.current || undefined,
        profileId: profile?.profile?.id,
      }));

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 10000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "pong":
          break;

        case "sequence:joined":
          joinedRef.current = true;
          setJoined(true);
          setPlayerId(data.playerId);
          playerIdRef.current = data.playerId;
          if (data.reconnectToken) reconnectTokenRef.current = data.reconnectToken;
          saveGameSession(SESSION_KEY, roomCode.toUpperCase(), playerName, data.playerId, selectedAvatar, data.reconnectToken || reconnectTokenRef.current || undefined);
          if (data.score !== undefined) {
            prevScoreRef.current = data.score;
            setMyScore(data.score);
          }
          setPhase("waiting");
          break;
          
        case "sequence:animatedReveal":
          setCurrentQuestion(data.question);
          setSelectedSequence([]);
          selectedSequenceRef.current = [];
          setPhase("animatedReveal");
          setIsCorrect(null);
          setCorrectOrder(null);
          setRank(null);
          if (data.questionIndex) setCurrentQuestionIndex(data.questionIndex);
          if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
          soundManager.play('whoosh', 0.4);
          try { navigator.vibrate?.([100, 50, 100]); } catch {}
          break;
          
        case "sequence:question:start":
          setCurrentQuestion(data.question);
          setSelectedSequence([]);
          selectedSequenceRef.current = [];
          setQuestionStartTime(Date.now());
          setPhase("playing");
          setIsCorrect(null);
          setCorrectOrder(null);
          setRank(null);
          setGamePaused(false);
          if (data.questionIndex) setCurrentQuestionIndex(data.questionIndex);
          if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
          soundManager.play('swoosh', 0.4);
          try { navigator.vibrate?.(100); } catch {}
          break;
          
        case "sequence:reveal": {
          setCorrectOrder(data.correctOrder);
          setPhase("revealing");
          setQuestionStartTime(null);
          const isAnswerCorrect = data.rank != null;
          setIsCorrect(isAnswerCorrect);
          if (data.rank) setRank(data.rank);
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.myScore !== undefined) setMyScore(data.myScore);
          if (data.winner) setWinner(data.winner);
          if (isAnswerCorrect && data.rank === 1) {
            setShowCorrectFlash(true);
            setTimeout(() => setShowCorrectFlash(false), 700);
            soundManager.play('fanfare', 0.6);
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
            try { navigator.vibrate?.([100, 50, 100, 50, 200]); } catch {}
          } else if (isAnswerCorrect) {
            setShowCorrectFlash(true);
            setTimeout(() => setShowCorrectFlash(false), 700);
            soundManager.play('chime', 0.5);
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          } else {
            setShowWrongFlash(true);
            setTimeout(() => setShowWrongFlash(false), 700);
            soundManager.play('buzz', 0.3);
            try { navigator.vibrate?.([50, 30, 50]); } catch {}
          }
          break;
        }
          
        case "sequence:results":
          setPhase("results");
          if (data.rank !== undefined) setRank(data.rank);
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.myScore !== undefined) setMyScore(data.myScore);
          break;
        
        case "sequence:leaderboard":
          setPhase("leaderboard");
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.myScore !== undefined) setMyScore(data.myScore);
          soundManager.play('drumroll', 0.3);
          break;
          
        case "sequence:gameComplete":
          setPhase("gameComplete");
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.winner) setWinner(data.winner);
          if (data.myScore !== undefined) setMyScore(data.myScore);
          if (data.leaderboard?.[0]?.playerId === playerIdRef.current) {
            soundManager.play('victory', 0.6);
            confetti({ particleCount: 300, spread: 180, origin: { y: 0.4 } });
            try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch {}
          } else {
            soundManager.play('applause', 0.4);
          }
          break;

        case "sequence:pointsAdjusted":
          if (data.newScore !== undefined) setMyScore(data.newScore);
          break;

        case "sequence:phaseSync":
          if (data.questionIndex) setCurrentQuestionIndex(data.questionIndex);
          if (data.totalQuestions) setTotalQuestions(data.totalQuestions);
          if (data.phase === 'playing' && data.question) {
            setCurrentQuestion(data.question);
            setSelectedSequence([]);
            selectedSequenceRef.current = [];
            setQuestionStartTime(Date.now());
            setPhase("playing");
            setIsCorrect(null);
            setCorrectOrder(null);
            setRank(null);
          } else if (data.phase === 'animatedReveal' && data.question) {
            setCurrentQuestion(data.question);
            setSelectedSequence([]);
            selectedSequenceRef.current = [];
            setPhase("animatedReveal");
            setIsCorrect(null);
            setCorrectOrder(null);
            setRank(null);
          } else if (data.phase === 'revealing') {
            if (data.correctOrder) setCorrectOrder(data.correctOrder);
            setIsCorrect(data.rank != null);
            if (data.rank !== undefined) setRank(data.rank);
            if (data.leaderboard) setLeaderboard(data.leaderboard);
            if (data.myScore !== undefined) setMyScore(data.myScore);
            setPhase("revealing");
          } else if (data.phase === 'leaderboard' && data.leaderboard) {
            setLeaderboard(data.leaderboard);
            if (data.myScore !== undefined) setMyScore(data.myScore);
            setPhase("leaderboard");
          } else if (data.phase === 'gameComplete' && data.leaderboard) {
            setLeaderboard(data.leaderboard);
            if (data.winner) setWinner(data.winner);
            if (data.myScore !== undefined) setMyScore(data.myScore);
            setPhase("gameComplete");
          }
          break;

        case "sequence:paused":
          setGamePaused(true);
          toast({ title: "Game paused", description: "Host has paused the game" });
          break;

        case "sequence:resumed":
          setGamePaused(false);
          toast({ title: "Game resumed!" });
          break;

        case "host:disconnected":
          toast({ title: "Host disconnected", description: "Waiting for host to reconnect...", variant: "destructive" });
          break;

        case "host:reconnected":
          toast({ title: "Host reconnected", description: "Game continues!" });
          break;
          
        case "sequence:scoresReset":
          prevScoreRef.current = 0;
          setMyScore(0);
          setLeaderboard([]);
          setPhase("waiting");
          setCurrentQuestion(null);
          setSelectedSequence([]);
          selectedSequenceRef.current = [];
          setCorrectOrder(null);
          setIsCorrect(null);
          setRank(null);
          setWinner(null);
          setCurrentQuestionIndex(1);
          setTotalQuestions(1);
          setQuestionStartTime(null);
          setGamePaused(false);
          break;
          
        case "sequence:reset":
          setPhase("waiting");
          setCurrentQuestion(null);
          setSelectedSequence([]);
          selectedSequenceRef.current = [];
          setCorrectOrder(null);
          setIsCorrect(null);
          setRank(null);
          setWinner(null);
          setQuestionStartTime(null);
          setGamePaused(false);
          break;
          
        case "kicked":
          clearGameSession(SESSION_KEY);
          clearAllTimers();
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          setPhase("waiting");
          toast({
            title: "Removed from game",
            description: "The host removed you from the game.",
            variant: "destructive",
          });
          break;

        case "room:closed":
          clearGameSession(SESSION_KEY);
          clearAllTimers();
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          setPhase("waiting");
          toast({
            title: "Game ended",
            description: data.reason || "The game room has been closed.",
            variant: "destructive",
          });
          break;

        case "error":
          if (data.message === "Room not found") {
            shouldReconnectRef.current = false;
            clearGameSession(SESSION_KEY);
            clearAllTimers();
            setJoined(false);
            joinedRef.current = false;
            setStatus("disconnected");
            setPhase("waiting");
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
            clearGameSession(SESSION_KEY);
            clearAllTimers();
            reconnectTokenRef.current = null;
            playerIdRef.current = null;
            setPlayerId(null);
            setJoined(false);
            joinedRef.current = false;
            setStatus("disconnected");
            setPhase("waiting");
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
              description: data.message || "Please check your connection.",
              variant: "destructive",
            });
          }
          break;
      }
    };

    ws.onclose = () => {
      if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }

      if (!joinedRef.current || !shouldReconnectRef.current) {
        setStatus("disconnected");
        return;
      }

      const attempts = reconnectAttemptsRef.current;
      if (attempts >= 5) {
        setStatus("disconnected");
        toast({ title: "Connection lost", description: "Could not reconnect. Try joining again.", variant: "destructive" });
        return;
      }

      setStatus("reconnecting");
      const delay = Math.min(2000 * Math.pow(1.5, attempts), 15000);
      reconnectAttemptsRef.current = attempts + 1;

      let remaining = Math.ceil(delay / 1000);
      setReconnectCountdown(remaining);
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
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
  }, [roomCode, playerName, selectedAvatar, toast, clearAllTimers]);

  const handleLetterTap = (letter: string) => {
    if (phase !== "playing") return;
    if (status !== "connected") return;
    if (gamePaused) return;
    if (selectedSequence.length >= 4) return;
    if (selectedSequence.includes(letter)) return;
    
    const newSequence = [...selectedSequence, letter];
    setSelectedSequence(newSequence);
    selectedSequenceRef.current = newSequence;
    
    soundManager.play('click', 0.3);
    try { navigator.vibrate?.(30); } catch {}
    
    if (newSequence.length === 4) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const timeMs = questionStartTime ? Date.now() - questionStartTime : 0;
        wsRef.current.send(JSON.stringify({
          type: "sequence:player:submit",
          sequence: newSequence,
          timeMs,
        }));
        setPhase("submitted");
        setShowSubmitFlash(true);
        setTimeout(() => setShowSubmitFlash(false), 500);
        soundManager.play('pop', 0.4);
        try { navigator.vibrate?.(50); } catch {}
      } else {
        toast({ title: "Connection lost", description: "Your answer couldn't be sent. Try reconnecting.", variant: "destructive" });
      }
    }
  };

  const undoLastTap = () => {
    if (selectedSequence.length === 0) return;
    const newSequence = selectedSequence.slice(0, -1);
    setSelectedSequence(newSequence);
    selectedSequenceRef.current = newSequence;
    soundManager.play('whoosh', 0.2);
    try { navigator.vibrate?.(20); } catch {}
  };

  const resetSelection = () => {
    setSelectedSequence([]);
    selectedSequenceRef.current = [];
    soundManager.play('whoosh', 0.2);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !playerName.trim()) return;
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;
    connect();
  };

  const handleLeaveGame = () => {
    shouldReconnectRef.current = false;
    joinedRef.current = false;
    clearAllTimers();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearGameSession(SESSION_KEY);
    setJoined(false);
    setPlayerId(null);
    playerIdRef.current = null;
    setStatus("disconnected");
    setPhase("waiting");
    setMyScore(0);
    prevScoreRef.current = 0;
    setLeaderboard([]);
    setCurrentQuestion(null);
    setSelectedSequence([]);
    selectedSequenceRef.current = [];
    setCorrectOrder(null);
    setIsCorrect(null);
    setRank(null);
    setWinner(null);
    setShowLeaderboard(false);
    setCurrentQuestionIndex(1);
    setTotalQuestions(1);
    setQuestionStartTime(null);
    setGamePaused(false);
    reconnectAttemptsRef.current = 0;
  };

  const handleManualReconnect = () => {
    clearAllTimers();
    reconnectAttemptsRef.current = 0;
    shouldReconnectRef.current = true;
    connect(true);
  };

  const toggleSound = () => {
    soundManager.toggle();
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
      if (wsRef.current) wsRef.current.close();
    };
  }, [clearAllTimers]);

  useEffect(() => {
    if (hasCodeFromUrl && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [hasCodeFromUrl]);

  if (!joined) {
    return (
      <GameJoinForm
        icon={<ListOrdered className="w-10 h-10 text-white shrink-0" aria-hidden="true" />}
        title="Sort Circuit"
        subtitle="Arrange fast. Win first."
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
    <div className="min-h-screen gradient-game flex flex-col" data-testid="page-sequence-player" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <FullScreenFlash show={showCorrectFlash} color="bg-primary/60" />
      <FullScreenFlash show={showWrongFlash} color="bg-destructive/60" />
      <FullScreenFlash show={showSubmitFlash} color="bg-primary/30" />

      <div className="w-full flex justify-center pt-3 pb-1">
        <Logo size="compact" />
      </div>
      <InstallPrompt />
      <GamePlayerHeader
        status={status}
        roomCode={roomCode}
        score={myScore}
        onLeave={handleLeaveGame}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
      />
      <GamePlayerInfoBar
        playerName={playerName}
        avatar={selectedAvatar}
        leaderboard={leaderboard}
        playerId={playerId}
        showLeaderboard={showLeaderboard}
        onToggleLeaderboard={() => setShowLeaderboard(!showLeaderboard)}
      />
      <GameConnectionBanner
        status={status}
        joined={joined}
        reconnectCountdown={reconnectCountdown}
        reconnectAttempts={reconnectAttemptsRef.current}
        onReconnect={handleManualReconnect}
      />

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {phase === "waiting" && (
          <GameWaitingScreen
            title="Waiting for host..."
            subtitle="Get ready to arrange the sequence!"
          />
        )}

        {phase === "animatedReveal" && currentQuestion && (
          <div 
            className="fixed inset-0 z-[100]"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gradient-game pb-safe"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="mb-8"
              >
                <Lock className="w-20 h-20 text-white/80 shrink-0" aria-hidden="true" />
              </motion.div>
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl font-black text-white text-center mb-4"
              >
                QUESTION {currentQuestionIndex}/{totalQuestions}
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl text-white/90 font-semibold text-center px-4 max-w-md"
              >
                {currentQuestion.question}
              </motion.p>
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mt-8 text-lg text-white/70"
              >
                Get ready to tap...
              </motion.p>
            </motion.div>
          </div>
        )}

        {(phase === "playing" || phase === "submitted") && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-4 relative"
          >
            {gamePaused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-30 bg-black/70 rounded-xl flex items-center justify-center backdrop-blur-sm"
              >
                <div className="text-center text-white">
                  <Pause className="w-10 h-10 mx-auto mb-2 text-primary shrink-0" />
                  <p className="text-lg font-bold">Game Paused</p>
                  <p className="text-sm text-white/60">Waiting for host to resume...</p>
                </div>
              </motion.div>
            )}
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" data-testid="badge-question-progress">
                Q{currentQuestionIndex}/{totalQuestions}
              </Badge>
              <Badge variant="secondary" className={`${phase === "submitted" ? "bg-primary/30 text-primary border-primary/50" : ""}`} data-testid="badge-status">
                {phase === "submitted" ? "LOCKED IN" : gamePaused ? "PAUSED" : "Tap 1-2-3-4"}
              </Badge>
            </div>

            <Card className="p-4">
              <h3 className="text-lg font-semibold text-foreground text-center mb-4">
                {currentQuestion.question}
              </h3>
              {currentQuestion.hint && (
                <p className="text-sm text-muted-foreground text-center italic">{currentQuestion.hint}</p>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-3">
              {["A", "B", "C", "D"].map((letter) => {
                const option = currentQuestion[`option${letter}` as keyof Question] as string;
                const isSelected = selectedSequence.includes(letter);
                const position = selectedSequence.indexOf(letter);
                const circledNumbers = ["①", "②", "③", "④"];
                
                return (
                  <motion.button
                    key={letter}
                    onClick={() => handleLetterTap(letter)}
                    disabled={phase === "submitted" || isSelected}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-4 rounded-xl transition-all min-h-[100px] ${
                      isSelected
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/60'
                        : 'bg-card/80 text-foreground hover-elevate'
                    } ${phase === "submitted" ? 'opacity-60' : ''}`}
                    data-testid={`button-option-${letter}`}
                  >
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background text-primary flex items-center justify-center text-xl font-bold shadow-lg">
                        {circledNumbers[position]}
                      </div>
                    )}
                    <div className="text-3xl font-black mb-1">{letter}</div>
                    <div className="text-sm opacity-90 line-clamp-2">{option}</div>
                  </motion.button>
                );
              })}
            </div>

            {selectedSequence.length > 0 && selectedSequence.length < 4 && phase === "playing" && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={undoLastTap}
                  data-testid="button-undo-last"
                >
                  <Undo2 className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                  Undo Last
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={resetSelection}
                  data-testid="button-reset-selection"
                >
                  <RotateCcw className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                  Reset All
                </Button>
              </div>
            )}

            {selectedSequence.length > 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Your sequence:</p>
                <div className="flex justify-center gap-2">
                  {selectedSequence.map((letter, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold"
                    >
                      {letter}
                    </motion.div>
                  ))}
                  {[...Array(4 - selectedSequence.length)].map((_, idx) => (
                    <div key={`empty-${idx}`} className="w-10 h-10 rounded-lg border-2 border-dashed border-muted-foreground/30" />
                  ))}
                </div>
              </div>
            )}

            {phase === "submitted" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-12 h-12 mx-auto mb-2 bg-primary/20 rounded-full flex items-center justify-center"
                >
                  <Check className="w-6 h-6 text-primary shrink-0" />
                </motion.div>
                <p className="text-primary text-sm font-medium">Locked in! Waiting for others...</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === "revealing" && correctOrder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                isCorrect ? 'bg-primary' : 'bg-destructive'
              }`}
              data-testid={`icon-result-${isCorrect ? 'correct' : 'wrong'}`}
            >
              {isCorrect ? (
                <Check className="w-12 h-12 text-white shrink-0" aria-hidden="true" />
              ) : (
                <X className="w-12 h-12 text-white shrink-0" aria-hidden="true" />
              )}
            </motion.div>
            <h2 className={`text-3xl font-bold mb-4 ${isCorrect ? 'text-primary' : 'text-destructive'}`}>
              {isCorrect ? "SYSTEM STABLE" : "CIRCUIT BLOWN"}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Correct order:</p>
              <div className="flex justify-center gap-2">
                {correctOrder.map((letter, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.2 }}
                    className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold"
                  >
                    {letter}
                  </motion.div>
                ))}
              </div>
            </div>

            {rank && rank <= 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30" data-testid="badge-rank">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span className="font-bold text-amber-400">
                    {rank === 1 ? "1st Place!" : rank === 2 ? "2nd Place!" : "3rd Place!"}
                  </span>
                </div>
              </motion.div>
            )}

            {selectedSequence.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your answer:</p>
                <div className="flex justify-center gap-2">
                  {selectedSequence.map((letter, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                        letter === correctOrder[idx] ? 'bg-primary/50 text-primary' : 'bg-destructive/50 text-destructive'
                      }`}
                    >
                      {letter}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground mt-6">Waiting for host to continue...</p>
          </motion.div>
        )}

        {phase === "results" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            {rank === 1 && (
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mb-4"
              >
                <Trophy className="w-16 h-16 text-amber-400 mx-auto shrink-0" aria-hidden="true" />
              </motion.div>
            )}
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {rank === 1 ? "You won!" : rank ? `You finished #${rank}` : "Round complete!"}
            </h2>
            <p className="text-muted-foreground">Waiting for next question...</p>
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
        )}
        
        {phase === "leaderboard" && (
          <GameLeaderboardView
            leaderboard={leaderboard}
            playerId={playerId}
            subtitle="Waiting for next round..."
          />
        )}
        
        {phase === "gameComplete" && (
          <GameCompleteScreen
            leaderboard={leaderboard}
            playerId={playerId}
            myScore={myScore}
            subtitle="show"
          />
        )}
      </main>
    </div>
  );
}
