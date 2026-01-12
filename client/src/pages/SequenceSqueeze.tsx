import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, ListOrdered, Play, Pause, Users, QrCode, Timer, 
  Trophy, Plus, Trash2, Edit, Check, X, Loader2, Clock, Zap,
  ChevronDown, ChevronUp, Sparkles, Crown, RefreshCw
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { SequenceQuestion, SequenceSession, SequenceSubmission } from "@shared/schema";

interface PlayerSubmission {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  sequence: string[];
  timeMs: number;
  isCorrect?: boolean;
}

export default function SequenceSqueeze() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<"setup" | "waiting" | "playing" | "revealing" | "results">("setup");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<SequenceQuestion | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [submissions, setSubmissions] = useState<PlayerSubmission[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<SequenceQuestion | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<SequenceQuestion[]>({
    queryKey: ["/api/sequence-squeeze/questions"],
    enabled: isAuthenticated,
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: Omit<SequenceQuestion, "id" | "createdAt">) => {
      return apiRequest("POST", "/api/sequence-squeeze/questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
      setShowCreateDialog(false);
      toast({ title: "Question created!" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/sequence-squeeze/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequence-squeeze/questions"] });
      toast({ title: "Question deleted" });
    },
  });

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "sequence:host:create" }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case "sequence:room:created":
          setRoomCode(data.code);
          setGameState("waiting");
          break;
        case "sequence:player:joined":
          toast({ title: `${data.playerName} joined!` });
          break;
        case "sequence:submission":
          setSubmissions(prev => [...prev, data.submission]);
          break;
      }
    };

    socket.onclose = () => {
      setRoomCode(null);
      setGameState("setup");
    };

    setWs(socket);
  }, [toast]);

  const startQuestion = (question: SequenceQuestion) => {
    setCurrentQuestion(question);
    setSubmissions([]);
    setTimerSeconds(15);
    setGameState("playing");

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: "sequence:host:startQuestion", 
        question: {
          id: question.id,
          question: question.question,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          hint: question.hint,
        }
      }));
    }
  };

  const revealAnswer = () => {
    setGameState("revealing");

    if (ws && ws.readyState === WebSocket.OPEN && currentQuestion) {
      ws.send(JSON.stringify({ 
        type: "sequence:host:reveal", 
        correctOrder: currentQuestion.correctOrder 
      }));
    }

    const scoredSubmissions = submissions.map(sub => ({
      ...sub,
      isCorrect: JSON.stringify(sub.sequence) === JSON.stringify(currentQuestion?.correctOrder),
    }));
    setSubmissions(scoredSubmissions);
  };

  const showResults = () => {
    setGameState("results");
  };

  const resetGame = () => {
    setCurrentQuestion(null);
    setSubmissions([]);
    setGameState("waiting");
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "playing" && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            revealAnswer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, timerSeconds]);

  useEffect(() => {
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const joinUrl = `${window.location.origin}/play/${roomCode}?game=sequence`;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <ListOrdered className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Sequence Squeeze</h1>
              <p className="text-xs text-muted-foreground">Put it in order, fast!</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {roomCode && (
              <>
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-mono">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="text-foreground font-bold">{roomCode}</span>
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => setShowQR(true)} data-testid="button-qr">
                  <QrCode className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {gameState === "setup" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Question Library</h2>
                <p className="text-muted-foreground">Create and manage your sequence questions</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-question">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
                <Button 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  onClick={connectWebSocket}
                  data-testid="button-start-game"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Game
                </Button>
              </div>
            </div>

            {isLoadingQuestions ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : questions.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <ListOrdered className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
                <p className="text-muted-foreground mb-4">Create your first sequence question to get started</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Question
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <Card key={q.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-teal-600">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground mb-2">{q.question}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary">A: {q.optionA}</Badge>
                          <Badge variant="secondary">B: {q.optionB}</Badge>
                          <Badge variant="secondary">C: {q.optionC}</Badge>
                          <Badge variant="secondary">D: {q.optionD}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Correct order: {(q.correctOrder as string[]).join(" → ")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteQuestionMutation.mutate(q.id)}
                          data-testid={`button-delete-${q.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {gameState === "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-teal-500/30">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Waiting for Players</h2>
            <p className="text-muted-foreground mb-6">
              Share the QR code or room code to let players join
            </p>

            <div className="inline-flex flex-col items-center gap-4 p-6 bg-card rounded-2xl border">
              <QRCodeSVG value={joinUrl} size={200} />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Room Code:</span>
                <span className="text-3xl font-mono font-bold text-foreground">{roomCode}</span>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <h3 className="font-semibold">Select a question to start:</h3>
              <div className="grid gap-2 max-w-md mx-auto">
                {questions.map((q, idx) => (
                  <Button
                    key={q.id}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => startQuestion(q)}
                    data-testid={`button-start-${q.id}`}
                  >
                    <span className="w-6 h-6 rounded bg-teal-500/20 flex items-center justify-center text-xs font-bold text-teal-600 mr-3">
                      {idx + 1}
                    </span>
                    <span className="truncate">{q.question}</span>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {gameState === "playing" && currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="gap-1">
                <Users className="w-4 h-4" />
                {submissions.length} submitted
              </Badge>
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-orange-500" />
                <span className={`text-2xl font-mono font-bold ${timerSeconds <= 5 ? 'text-red-500' : 'text-foreground'}`}>
                  {timerSeconds}s
                </span>
              </div>
            </div>

            <Card className="p-8 text-center bg-gradient-to-br from-card to-muted/50">
              <h2 className="text-3xl font-bold mb-8">{currentQuestion.question}</h2>
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {["A", "B", "C", "D"].map((letter) => {
                  const option = currentQuestion[`option${letter}` as keyof SequenceQuestion] as string;
                  return (
                    <div
                      key={letter}
                      className="p-6 bg-card rounded-xl border-2 border-border"
                    >
                      <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                        {letter}
                      </div>
                      <p className="text-lg font-medium">{option}</p>
                    </div>
                  );
                })}
              </div>
              {currentQuestion.hint && (
                <p className="mt-6 text-muted-foreground italic">Hint: {currentQuestion.hint}</p>
              )}
            </Card>

            <div className="flex justify-center">
              <Button size="lg" onClick={revealAnswer} data-testid="button-reveal">
                <Zap className="w-5 h-5 mr-2" />
                Reveal Answer Now
              </Button>
            </div>
          </motion.div>
        )}

        {gameState === "revealing" && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Correct Order</h2>
              <div className="flex justify-center gap-3 py-4">
                {(currentQuestion.correctOrder as string[]).map((letter, idx) => {
                  const option = currentQuestion[`option${letter}` as keyof SequenceQuestion] as string;
                  return (
                    <motion.div
                      key={letter}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.3 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                        {letter}
                      </div>
                      <p className="mt-2 text-sm font-medium max-w-24 truncate">{option}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Results
              </h3>
              {submissions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No submissions received</p>
              ) : (
                <div className="space-y-2">
                  {submissions
                    .sort((a, b) => {
                      if (a.isCorrect && !b.isCorrect) return -1;
                      if (!a.isCorrect && b.isCorrect) return 1;
                      return a.timeMs - b.timeMs;
                    })
                    .map((sub, idx) => (
                      <div
                        key={sub.playerId}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          sub.isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {idx === 0 && sub.isCorrect && (
                            <Crown className="w-5 h-5 text-amber-500" />
                          )}
                          <span className="font-medium">{sub.playerName}</span>
                          {sub.isCorrect && (
                            <Badge className="bg-emerald-500">Correct!</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {(sub.timeMs / 1000).toFixed(2)}s
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </Card>

            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={resetGame} data-testid="button-next">
                <RefreshCw className="w-4 h-4 mr-2" />
                Next Question
              </Button>
            </div>
          </motion.div>
        )}
      </main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Question</DialogTitle>
            <DialogDescription>
              Add a new sequence question for players to solve
            </DialogDescription>
          </DialogHeader>
          <CreateQuestionForm
            onSubmit={(data) => createQuestionMutation.mutate(data)}
            isLoading={createQuestionMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join the Game</DialogTitle>
            <DialogDescription>Scan this QR code or use the room code</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <QRCodeSVG value={joinUrl} size={256} />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Room Code</p>
              <p className="text-4xl font-mono font-bold">{roomCode}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateQuestionForm({ onSubmit, isLoading }: {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOrder, setCorrectOrder] = useState<string[]>([]);
  const [hint, setHint] = useState("");

  const handleLetterClick = (letter: string) => {
    if (correctOrder.includes(letter)) {
      setCorrectOrder(correctOrder.filter(l => l !== letter));
    } else if (correctOrder.length < 4) {
      setCorrectOrder([...correctOrder, letter]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (correctOrder.length !== 4) return;
    
    onSubmit({
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOrder,
      hint: hint || null,
      isActive: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Question</label>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Put these years in order from earliest to latest:"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["A", "B", "C", "D"].map((letter) => (
          <div key={letter}>
            <label className="text-sm font-medium mb-1.5 block">Option {letter}</label>
            <Input
              value={letter === "A" ? optionA : letter === "B" ? optionB : letter === "C" ? optionC : optionD}
              onChange={(e) => {
                if (letter === "A") setOptionA(e.target.value);
                else if (letter === "B") setOptionB(e.target.value);
                else if (letter === "C") setOptionC(e.target.value);
                else setOptionD(e.target.value);
              }}
              placeholder={`Option ${letter}`}
              required
            />
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Correct Order (tap in order)</label>
        <div className="flex gap-2 mb-2">
          {["A", "B", "C", "D"].map((letter) => (
            <Button
              key={letter}
              type="button"
              variant={correctOrder.includes(letter) ? "default" : "outline"}
              className="w-10 h-10"
              onClick={() => handleLetterClick(letter)}
            >
              {letter}
            </Button>
          ))}
        </div>
        {correctOrder.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Order: {correctOrder.join(" → ")}
            {correctOrder.length < 4 && " (tap more)"}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Hint (optional)</label>
        <Input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="A helpful hint for players"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading || correctOrder.length !== 4}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Question"}
      </Button>
    </form>
  );
}
