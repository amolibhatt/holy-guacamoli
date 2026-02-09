import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { ListOrdered, Wifi, WifiOff, Trophy, Timer, Check, X, RotateCcw, Sparkles, RefreshCw, Crown, Star, Medal, Lock } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { PLAYER_AVATARS, type AvatarId } from "@shared/schema";
import { Logo } from "@/components/Logo";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
type GamePhase = "waiting" | "animatedReveal" | "playing" | "submitted" | "revealing" | "results" | "leaderboard" | "gameComplete";

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
}

interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  hint?: string;
}

function getSession() {
  try {
    const sequenceData = localStorage.getItem("sequence-session");
    if (sequenceData) return JSON.parse(sequenceData);
    const buzzerData = localStorage.getItem("buzzer-session");
    if (buzzerData) return JSON.parse(buzzerData);
    return null;
  } catch { return null; }
}

function saveSession(roomCode: string, playerName: string, playerId: string, avatar: string) {
  try {
    localStorage.setItem("sequence-session", JSON.stringify({ roomCode, playerName, playerId, avatar }));
  } catch {}
}

function clearSession() {
  try { localStorage.removeItem("sequence-session"); } catch {}
}

export default function SequencePlayer() {
  const params = useParams<{ code?: string }>();
  const { toast } = useToast();
  const savedSession = getSession();
  
  const [roomCode, setRoomCode] = useState(params.code || savedSession?.roomCode || "");
  const [playerName, setPlayerName] = useState(savedSession?.playerName || "");
  const [playerId, setPlayerId] = useState<string | null>(savedSession?.playerId || null);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(savedSession?.avatar || "cat");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
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
  
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedSequenceRef = useRef<string[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      ws.send(JSON.stringify({
        type: "sequence:player:join",
        code: roomCode.toUpperCase(),
        name: playerName,
        avatar: selectedAvatar,
        playerId: playerId || undefined,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "sequence:joined":
          setJoined(true);
          setPlayerId(data.playerId);
          saveSession(roomCode.toUpperCase(), playerName, data.playerId, selectedAvatar);
          if (data.score !== undefined) setMyScore(data.score);
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
          try { navigator.vibrate?.(100); } catch {}
          break;
          
        case "sequence:reveal":
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          setCorrectOrder(data.correctOrder);
          setPhase("revealing");
          setQuestionStartTime(null);
          const currentSeq = selectedSequenceRef.current;
          const correct = JSON.stringify(currentSeq) === JSON.stringify(data.correctOrder);
          setIsCorrect(correct);
          if (data.rank) setRank(data.rank);
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.yourScore !== undefined) setMyScore(data.yourScore);
          if (data.myScore !== undefined) setMyScore(data.myScore);
          if (data.winner) setWinner(data.winner);
          if (correct && data.rank === 1) {
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
            try { navigator.vibrate?.([100, 50, 100, 50, 200]); } catch {}
          } else if (correct) {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          }
          break;
          
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
          break;
          
        case "sequence:gameComplete":
          setPhase("gameComplete");
          if (data.leaderboard) setLeaderboard(data.leaderboard);
          if (data.winner) setWinner(data.winner);
          if (data.myScore !== undefined) setMyScore(data.myScore);
          if (data.leaderboard?.[0]?.playerId === playerId) {
            confetti({ particleCount: 300, spread: 180, origin: { y: 0.4 } });
            try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch {}
          }
          break;
          
        case "sequence:scoresReset":
          setMyScore(0);
          setLeaderboard([]);
          setPhase("waiting");
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
          break;
          
        case "error":
          setStatus("error");
          toast({
            title: "Connection issue",
            description: data.message || "Please check your connection.",
            variant: "destructive",
          });
          break;
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [roomCode, playerName, selectedAvatar, playerId, toast]);

  const handleLetterTap = (letter: string) => {
    if (phase !== "playing") return;
    if (selectedSequence.length >= 4) return;
    if (selectedSequence.includes(letter)) return;
    
    const newSequence = [...selectedSequence, letter];
    setSelectedSequence(newSequence);
    selectedSequenceRef.current = newSequence;
    
    try { navigator.vibrate?.(30); } catch {}
    
    if (newSequence.length === 4 && wsRef.current?.readyState === WebSocket.OPEN) {
      const timeMs = questionStartTime ? Date.now() - questionStartTime : 0;
      wsRef.current.send(JSON.stringify({
        type: "sequence:player:submit",
        sequence: newSequence,
        timeMs,
      }));
      setPhase("submitted");
    }
  };

  const resetSelection = () => {
    setSelectedSequence([]);
    selectedSequenceRef.current = [];
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !playerName.trim()) return;
    connect();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current as unknown as NodeJS.Timeout);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  if (!joined) {
    return (
      <div className="min-h-screen bg-teal-900 flex flex-col items-center justify-center p-6">
        <div className="w-full flex justify-center pb-4">
          <Logo size="compact" />
        </div>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-teal-500 flex items-center justify-center shadow-xl">
              <ListOrdered className="w-10 h-10 text-white shrink-0" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-game-title">Sort Circuit</h1>
            <p className="text-teal-200" data-testid="text-game-tagline">Arrange fast. Win first.</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4" data-testid="form-join">
            <div>
              <label className="text-sm font-medium text-teal-200 mb-1.5 block">Room Code</label>
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                required
                data-testid="input-room-code"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-teal-200 mb-1.5 block">Your Name</label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                maxLength={30}
                required
                data-testid="input-player-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-teal-200 mb-1.5 block">Pick Your Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {PLAYER_AVATARS.slice(0, 12).map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`p-2 rounded-lg transition-all ${
                      selectedAvatar === avatar.id
                        ? 'bg-teal-500 ring-2 ring-white scale-110'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    data-testid={`button-avatar-${avatar.id}`}
                  >
                    <span className="text-2xl">{avatar.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg bg-teal-500 text-white"
              disabled={status === "connecting"}
              data-testid="button-join-game"
            >
              {status === "connecting" ? "Joining..." : "Join Game"}
            </Button>
          </form>

          <div className="flex justify-center mt-4">
            {status === "connected" ? (
              <Badge className="bg-teal-500 gap-1" data-testid="badge-connected"><Wifi className="w-3 h-3 shrink-0" aria-hidden="true" />Connected</Badge>
            ) : status === "error" ? (
              <Badge variant="destructive" className="gap-1" data-testid="badge-error"><WifiOff className="w-3 h-3 shrink-0" aria-hidden="true" />Error</Badge>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-900 flex flex-col" data-testid="page-sequence-player">
      <div className="w-full flex justify-center pt-3 pb-1">
        <Logo size="compact" />
      </div>
      <header className="p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
            <span className="text-lg">{PLAYER_AVATARS.find(a => a.id === selectedAvatar)?.emoji || "?"}</span>
          </div>
          <span className="text-white font-medium truncate" data-testid="text-player-name" title={playerName}>{playerName}</span>
        </div>
        {status === "connected" ? (
          <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 gap-1 shrink-0" data-testid="badge-online">
            <Wifi className="w-3 h-3 shrink-0" aria-hidden="true" />Online
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1 shrink-0" data-testid="badge-offline"><WifiOff className="w-3 h-3 shrink-0" aria-hidden="true" />Offline</Badge>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {phase === "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-teal-500/20 flex items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="w-12 h-12 text-teal-400 shrink-0" aria-hidden="true" />
              </motion.div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-waiting">Waiting for host...</h2>
            <p className="text-teal-200">Get ready to arrange the sequence!</p>
            {myScore > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full" data-testid="badge-score">
                <Star className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                <span className="text-white font-bold">{myScore} pts</span>
              </div>
            )}
          </motion.div>
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-teal-700 pb-safe"
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
            className="w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="bg-white/10 text-white gap-1" data-testid="badge-question-progress">
                Q{currentQuestionIndex}/{totalQuestions}
              </Badge>
              <Badge variant="secondary" className={`${phase === "submitted" ? "bg-cyan-500/30 text-cyan-300 border-cyan-400/50" : "bg-white/10 text-white"}`} data-testid="badge-status">
                {phase === "submitted" ? "LOCKED IN" : "Tap 1-2-3-4"}
              </Badge>
            </div>

            <Card className="p-4 bg-white/10 border-white/20">
              <h3 className="text-lg font-semibold text-white text-center mb-4">
                {currentQuestion.question}
              </h3>
              {currentQuestion.hint && (
                <p className="text-sm text-teal-200 text-center italic">{currentQuestion.hint}</p>
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
                        ? 'bg-cyan-500 text-white ring-2 ring-cyan-300'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    } ${phase === "submitted" ? 'opacity-60' : ''}`}
                    data-testid={`button-option-${letter}`}
                  >
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-cyan-600 flex items-center justify-center text-xl font-bold shadow-lg">
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
              <Button 
                variant="outline" 
                className="w-full border-white/20 text-white"
                onClick={resetSelection}
                data-testid="button-reset-selection"
              >
                <RotateCcw className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                Reset Selection
              </Button>
            )}

            {selectedSequence.length > 0 && (
              <div className="text-center">
                <p className="text-sm text-teal-200 mb-2">Your sequence:</p>
                <div className="flex justify-center gap-2">
                  {selectedSequence.map((letter, idx) => (
                    <div key={idx} className="w-10 h-10 rounded-lg bg-cyan-500 flex items-center justify-center text-white font-bold">
                      {letter}
                    </div>
                  ))}
                  {[...Array(4 - selectedSequence.length)].map((_, idx) => (
                    <div key={`empty-${idx}`} className="w-10 h-10 rounded-lg border-2 border-dashed border-white/30" />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {phase === "revealing" && correctOrder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
              isCorrect ? 'bg-cyan-500' : 'bg-red-600'
            }`} data-testid={`icon-result-${isCorrect ? 'correct' : 'wrong'}`}>
              {isCorrect ? (
                <Check className="w-12 h-12 text-white shrink-0" aria-hidden="true" />
              ) : (
                <X className="w-12 h-12 text-white shrink-0" aria-hidden="true" />
              )}
            </div>
            <h2 className={`text-3xl font-bold mb-4 ${isCorrect ? 'text-cyan-400' : 'text-red-400'}`}>
              {isCorrect ? "SYSTEM STABLE" : "CIRCUIT BLOWN"}
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-teal-200 mb-2">Correct order:</p>
              <div className="flex justify-center gap-2">
                {correctOrder.map((letter, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.2 }}
                    className="w-12 h-12 rounded-lg bg-teal-500 flex items-center justify-center text-white text-xl font-bold"
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
                <p className="text-sm text-teal-200/70 mb-2">Your answer:</p>
                <div className="flex justify-center gap-2">
                  {selectedSequence.map((letter, idx) => (
                    <div
                      key={idx}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                        letter === correctOrder[idx] ? 'bg-emerald-500/50 text-emerald-300' : 'bg-red-500/50 text-red-300'
                      }`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-teal-200/50 mt-6">Waiting for host to continue...</p>
          </motion.div>
        )}

        {phase === "results" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            {rank === 1 && (
              <div className="mb-4">
                <Trophy className="w-16 h-16 text-amber-400 mx-auto shrink-0" aria-hidden="true" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-white mb-2">
              {rank === 1 ? "You won!" : rank ? `You finished #${rank}` : "Round complete!"}
            </h2>
            <p className="text-teal-200">Waiting for next question...</p>
          </motion.div>
        )}
        
        {phase === "leaderboard" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center w-full max-w-sm"
          >
            <Trophy className="w-16 h-16 mx-auto text-amber-400 mb-4 shrink-0" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-white mb-6" data-testid="text-leaderboard-title">Leaderboard</h2>
            <div className="space-y-2 mb-6">
              {leaderboard.map((entry, idx) => {
                const isMe = entry.playerId === playerId;
                return (
                  <motion.div
                    key={entry.playerId}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isMe ? 'bg-teal-500/30 border-2 border-teal-400' :
                      idx === 0 ? 'bg-amber-500/20' :
                      idx === 1 ? 'bg-slate-400/20' :
                      idx === 2 ? 'bg-orange-600/20' :
                      'bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl font-black text-white/80 shrink-0">{idx + 1}</span>
                      {idx === 0 && <Crown className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />}
                      {idx === 1 && <Medal className="w-5 h-5 text-slate-300 shrink-0" aria-hidden="true" />}
                      {idx === 2 && <Medal className="w-5 h-5 text-orange-400 shrink-0" aria-hidden="true" />}
                      <span className="font-semibold text-white truncate" title={entry.playerName}>{entry.playerName}</span>
                      {isMe && <Badge className="bg-teal-500 text-xs shrink-0" data-testid="badge-you">You</Badge>}
                    </div>
                    <span className="font-bold text-white">{entry.score} pts</span>
                  </motion.div>
                );
              })}
            </div>
            <p className="text-teal-200/60 text-sm">Waiting for next round...</p>
          </motion.div>
        )}
        
        {phase === "gameComplete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center w-full max-w-sm"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Trophy className="w-24 h-24 mx-auto text-amber-400 mb-4 shrink-0" aria-hidden="true" />
            </motion.div>
            <h1 className="text-4xl font-black text-white mb-2" data-testid="text-game-over">GAME OVER!</h1>
            
            {leaderboard[0] && (
              <div className="mb-6">
                <h2 className="text-xl text-amber-400 font-bold">WINNER</h2>
                <p className="text-3xl font-black text-white">{leaderboard[0].playerName}</p>
                <p className="text-teal-200">{leaderboard[0].score} points</p>
              </div>
            )}

            {leaderboard[0]?.playerId === playerId && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mb-6 inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
              >
                <span className="text-xl font-black text-white">YOU WON!</span>
              </motion.div>
            )}

            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-semibold text-teal-200">Final Standings</h3>
              {leaderboard.slice(0, 5).map((entry, idx) => {
                const isMe = entry.playerId === playerId;
                return (
                  <div
                    key={entry.playerId}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isMe ? 'bg-teal-500/30 border border-teal-400' : 'bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white/70">{idx + 1}.</span>
                      <span className="text-white">{entry.playerName}</span>
                    </div>
                    <span className="font-bold text-white">{entry.score}</span>
                  </div>
                );
              })}
            </div>
            
            <p className="text-teal-200/50 text-sm">Thanks for playing!</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
