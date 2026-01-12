import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ListOrdered, Wifi, WifiOff, Trophy, Timer, Check, X, RotateCcw, Sparkles, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { PLAYER_AVATARS, type AvatarId } from "@shared/schema";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
type GamePhase = "waiting" | "playing" | "submitted" | "revealing" | "results";

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
    const data = localStorage.getItem("sequence-session");
    return data ? JSON.parse(data) : null;
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
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [correctOrder, setCorrectOrder] = useState<string[] | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  
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
          setPhase("waiting");
          break;
          
        case "sequence:question:start":
          setCurrentQuestion(data.question);
          setSelectedSequence([]);
          selectedSequenceRef.current = [];
          setTimeRemaining(15);
          setEndTime(data.endTime || Date.now() + 15000);
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
          setTimeRemaining(0);
          setEndTime(null);
          const currentSeq = selectedSequenceRef.current;
          const correct = JSON.stringify(currentSeq) === JSON.stringify(data.correctOrder);
          setIsCorrect(correct);
          if (data.rank) setRank(data.rank);
          if (correct && data.rank === 1) {
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
          } else if (correct) {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          }
          break;
          
        case "sequence:results":
          setPhase("results");
          if (data.rank !== undefined) setRank(data.rank);
          break;
          
        case "sequence:reset":
          setPhase("waiting");
          setCurrentQuestion(null);
          setSelectedSequence([]);
          selectedSequenceRef.current = [];
          setCorrectOrder(null);
          setIsCorrect(null);
          setRank(null);
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
    if (phase !== "playing" || selectedSequence.length >= 4) return;
    if (selectedSequence.includes(letter)) return;
    
    const newSequence = [...selectedSequence, letter];
    setSelectedSequence(newSequence);
    selectedSequenceRef.current = newSequence;
    
    try { navigator.vibrate?.(30); } catch {}
    
    if (newSequence.length === 4 && wsRef.current?.readyState === WebSocket.OPEN) {
      const timeMs = endTime ? Math.max(0, 15500 - (endTime - Date.now())) : 15000;
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
    if (phase === "playing" && endTime) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeRemaining(remaining);
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 200) as unknown as NodeJS.Timeout;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current as unknown as NodeJS.Timeout);
        timerRef.current = null;
      }
    };
  }, [phase, endTime]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-900 to-cyan-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-xl">
              <ListOrdered className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Sequence Squeeze</h1>
            <p className="text-teal-200">Put it in order, fast!</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-teal-200 mb-1.5 block">Room Code</label>
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                required
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
                  >
                    <span className="text-2xl">{avatar.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500"
              disabled={status === "connecting"}
            >
              {status === "connecting" ? "Joining..." : "Join Game"}
            </Button>
          </form>

          <div className="flex justify-center mt-4">
            {status === "connected" ? (
              <Badge className="bg-emerald-500 gap-1"><Wifi className="w-3 h-3" />Connected</Badge>
            ) : status === "error" ? (
              <Badge variant="destructive" className="gap-1"><WifiOff className="w-3 h-3" />Error</Badge>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-900 to-cyan-950 flex flex-col">
      <header className="p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
            <span className="text-lg">{PLAYER_AVATARS.find(a => a.id === selectedAvatar)?.emoji || "?"}</span>
          </div>
          <span className="text-white font-medium">{playerName}</span>
        </div>
        {status === "connected" ? (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1">
            <Wifi className="w-3 h-3" />Online
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1"><WifiOff className="w-3 h-3" />Offline</Badge>
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
                <Sparkles className="w-12 h-12 text-teal-400" />
              </motion.div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Waiting for host...</h2>
            <p className="text-teal-200">Get ready to put things in order!</p>
          </motion.div>
        )}

        {(phase === "playing" || phase === "submitted") && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-white/10 text-white">
                {phase === "submitted" ? "Submitted!" : "Tap in order"}
              </Badge>
              <div className="flex items-center gap-2">
                <Timer className={`w-5 h-5 ${timeRemaining <= 5 ? 'text-red-400' : 'text-teal-300'}`} />
                <span className={`text-2xl font-mono font-bold ${timeRemaining <= 5 ? 'text-red-400' : 'text-white'}`}>
                  {timeRemaining}s
                </span>
              </div>
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
                
                return (
                  <motion.button
                    key={letter}
                    onClick={() => handleLetterTap(letter)}
                    disabled={phase === "submitted" || isSelected}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-4 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-teal-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    } ${phase === "submitted" ? 'opacity-50' : ''}`}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-teal-600 flex items-center justify-center text-sm font-bold">
                        {position + 1}
                      </div>
                    )}
                    <div className="text-2xl font-bold mb-1">{letter}</div>
                    <div className="text-sm opacity-80 truncate">{option}</div>
                  </motion.button>
                );
              })}
            </div>

            {selectedSequence.length > 0 && selectedSequence.length < 4 && phase === "playing" && (
              <Button 
                variant="outline" 
                className="w-full border-white/20 text-white hover:bg-white/10"
                onClick={resetSelection}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Selection
              </Button>
            )}

            {selectedSequence.length > 0 && (
              <div className="text-center">
                <p className="text-sm text-teal-200 mb-2">Your order:</p>
                <div className="flex justify-center gap-2">
                  {selectedSequence.map((letter, idx) => (
                    <div key={idx} className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold">
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
              isCorrect ? 'bg-emerald-500' : 'bg-red-500'
            }`}>
              {isCorrect ? (
                <Check className="w-12 h-12 text-white" />
              ) : (
                <X className="w-12 h-12 text-white" />
              )}
            </div>
            <h2 className={`text-3xl font-bold mb-4 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
              {isCorrect ? "Correct!" : "Not quite!"}
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
                    className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-bold"
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
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30">
                  <Trophy className="w-5 h-5 text-amber-400" />
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
                <Trophy className="w-16 h-16 text-amber-400 mx-auto" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-white mb-2">
              {rank === 1 ? "You won!" : rank ? `You finished #${rank}` : "Round complete!"}
            </h2>
            <p className="text-teal-200">Waiting for next question...</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
