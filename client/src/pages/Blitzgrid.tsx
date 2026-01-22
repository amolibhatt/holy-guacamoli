import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { useScore } from "@/components/ScoreContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Pencil, Check, X, Grid3X3, 
  ChevronRight, ArrowLeft, Play, Loader2,
  AlertCircle, CheckCircle2, Eye, RotateCcw, QrCode, Users, Minus, Zap, Lock, Trophy, ChevronLeft, UserPlus
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Player {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  connected: boolean;
}
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import type { Board, Category, Question } from "@shared/schema";

interface GridWithStats extends Board {
  categoryCount: number;
  questionCount: number;
  isActive: boolean;
}

interface CategoryWithQuestions extends Category {
  questionCount: number;
  questions: Question[];
}

const POINT_TIERS = [10, 20, 30, 40, 50];

export default function Blitzgrid() {
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  
  // View state
  const [selectedGridId, setSelectedGridId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [playMode, setPlayMode] = useState(false);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Multiplayer state
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [buzzerLocked, setBuzzerLocked] = useState(true);
  const [buzzQueue, setBuzzQueue] = useState<Array<{ playerId: string; name: string; position: number; time: number }>>([]);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Form state
  const [showNewGridForm, setShowNewGridForm] = useState(false);
  const [newGridName, setNewGridName] = useState("");
  const [editingGridId, setEditingGridId] = useState<number | null>(null);
  const [editGridName, setEditGridName] = useState("");
  const [deleteGridId, setDeleteGridId] = useState<number | null>(null);
  
  // Question form state (keyed by "categoryId-points")
  const [questionForms, setQuestionForms] = useState<Record<string, { 
    question: string; 
    correctAnswer: string; 
    options: string[];
  }>>({});
  
  // New category form state
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Fetch all grids for current user
  const { data: grids = [], isLoading: loadingGrids } = useQuery<GridWithStats[]>({
    queryKey: ['/api/blitzgrid/grids'],
    enabled: isAuthenticated,
  });

  // Fetch categories for selected grid
  const { data: gridCategories = [], isLoading: loadingCategories } = useQuery<CategoryWithQuestions[]>({
    queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'],
    enabled: !!selectedGridId,
  });


  // Create grid mutation
  const createGridMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('POST', '/api/blitzgrid/grids', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewGridName("");
      setShowNewGridForm(false);
      toast({ title: "Grid created" });
    },
    onError: () => {
      toast({ title: "Couldn't create grid", variant: "destructive" });
    },
  });

  // Update grid mutation
  const updateGridMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest('PATCH', `/api/blitzgrid/grids/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setEditingGridId(null);
      toast({ title: "Grid updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update grid", variant: "destructive" });
    },
  });

  // Delete grid mutation
  const deleteGridMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/blitzgrid/grids/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setDeleteGridId(null);
      if (selectedGridId === deleteGridId) {
        setSelectedGridId(null);
      }
      toast({ title: "Grid deleted" });
    },
    onError: () => {
      toast({ title: "Couldn't delete grid", variant: "destructive" });
    },
  });

  // Add category to grid mutation
  const addCategoryMutation = useMutation({
    mutationFn: async ({ gridId, categoryId }: { gridId: number; categoryId: number }) => {
      return apiRequest('POST', `/api/blitzgrid/grids/${gridId}/categories`, { categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Category added" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't add category", variant: "destructive" });
    },
  });

  // Remove category from grid mutation
  const removeCategoryMutation = useMutation({
    mutationFn: async ({ gridId, categoryId }: { gridId: number; categoryId: number }) => {
      return apiRequest('DELETE', `/api/blitzgrid/grids/${gridId}/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Category removed" });
    },
    onError: () => {
      toast({ title: "Couldn't remove category", variant: "destructive" });
    },
  });

  // Create new category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async ({ gridId, name }: { gridId: number; name: string }) => {
      return apiRequest('POST', `/api/blitzgrid/grids/${gridId}/categories/create`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewCategoryName("");
      setShowNewCategoryForm(false);
      toast({ title: "Category created" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't create category", variant: "destructive" });
    },
  });

  // Save question mutation
  const saveQuestionMutation = useMutation({
    mutationFn: async ({ categoryId, points, question, correctAnswer, options }: { 
      categoryId: number; 
      points: number; 
      question: string; 
      correctAnswer: string;
      options: string[];
    }) => {
      return apiRequest('POST', `/api/blitzgrid/categories/${categoryId}/questions`, { 
        points, question, correctAnswer, options 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setQuestionForms(prev => {
        const newForms = { ...prev };
        delete newForms[variables.points];
        return newForms;
      });
      toast({ title: "Question saved" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't save question", variant: "destructive" });
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return apiRequest('DELETE', `/api/blitzgrid/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Question deleted" });
    },
    onError: () => {
      toast({ title: "Couldn't delete question", variant: "destructive" });
    },
  });

  // WebSocket connection for multiplayer
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: 'host:create' }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'room:created':
            setRoomCode(data.code);
            break;
          case 'room:joined':
            setRoomCode(data.code);
            if (data.players) {
              setPlayers(data.players);
            }
            break;
          case 'player:joined':
          case 'player:reconnected':
            if (data.players) {
              setPlayers(data.players);
            }
            break;
          case 'player:left':
          case 'player:disconnected':
            setPlayers(prev => prev.filter(p => p.id !== data.playerId));
            break;
          case 'score:updated':
            setPlayers(prev => prev.map(p => 
              p.id === data.playerId ? { ...p, score: data.score } : p
            ));
            break;
          case 'buzzer:locked':
            setBuzzerLocked(true);
            break;
          case 'buzzer:unlocked':
            setBuzzerLocked(false);
            setBuzzQueue([]);
            break;
          case 'buzz:received':
            // Collect all buzzes - don't auto-lock
            setBuzzQueue(prev => [...prev, {
              playerId: data.playerId,
              name: data.name,
              position: data.position,
              time: data.time
            }]);
            break;
          case 'buzzer:reset':
            setBuzzQueue([]);
            break;
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    };
    
    ws.onclose = () => {
      setWsConnected(false);
    };
    
    ws.onerror = () => {
      setWsConnected(false);
    };
  }, []);
  
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
    setRoomCode(null);
    setPlayers([]);
  }, []);
  
  const updatePlayerScore = useCallback((playerId: string, delta: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'score:update',
        playerId,
        delta
      }));
    }
  }, []);
  
  const unlockBuzzer = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:unlock' }));
      setBuzzerLocked(false);
      setBuzzQueue([]);
    }
  }, []);
  
  const lockBuzzer = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:lock' }));
      setBuzzerLocked(true);
    }
  }, []);
  
  const resetBuzzers = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:reset' }));
      setBuzzQueue([]);
    }
  }, []);
  
  // Auto-connect when entering play mode
  useEffect(() => {
    if (playMode) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }
    return () => {
      disconnectWebSocket();
    };
  }, [playMode, connectWebSocket, disconnectWebSocket]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader showAdminButton adminHref="/admin/games" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  // Grid detail view with inline categories and questions
  if (selectedGridId) {
    const grid = grids.find(g => g.id === selectedGridId);
    
    // GAMEPLAY MODE
    if (playMode && grid?.isActive) {
      const handleCellClick = (categoryId: number, points: number, question: Question) => {
        const cellKey = `${categoryId}-${points}`;
        if (!revealedCells.has(cellKey)) {
          setActiveQuestion(question);
          setShowAnswer(false);
          // Auto-unlock buzzers when opening a question
          unlockBuzzer();
        }
      };
      
      const handleRevealAnswer = () => {
        setShowAnswer(true);
        if (activeQuestion) {
          const cat = gridCategories.find(c => c.questions?.some(q => q.id === activeQuestion.id));
          if (cat) {
            const cellKey = `${cat.id}-${activeQuestion.points}`;
            setRevealedCells(prev => {
              const newSet = new Set(Array.from(prev));
              newSet.add(cellKey);
              return newSet;
            });
          }
        }
      };
      
      const handleCloseQuestion = () => {
        setActiveQuestion(null);
        setShowAnswer(false);
      };
      
      const resetGame = () => {
        setRevealedCells(new Set());
        toast({ title: "Game reset! All questions available again." });
      };
      
      const joinUrl = roomCode 
        ? `${window.location.origin}/play?code=${roomCode}` 
        : `${window.location.origin}/play`;
      
      return (
        <div className="h-screen overflow-hidden flex flex-col bg-zinc-950" data-testid="page-blitzgrid-play">
          {/* Minimal Header */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800"
          >
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => { setPlayMode(false); setSelectedGridId(null); }}
              className="text-white/60 hover:text-white hover:bg-white/10 h-9 w-9"
              data-testid="button-exit-play"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-white tracking-tight">{grid.name}</h1>
              {roomCode && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                  <Badge className="bg-emerald-400 text-black font-mono font-bold px-3 py-1">{roomCode}</Badge>
                </motion.div>
              )}
              {players.length > 0 && (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                  <Users className="w-3.5 h-3.5 mr-1.5" />{players.length}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowQRCode(true)} className="bg-emerald-400 hover:bg-emerald-300 text-black font-medium h-9" data-testid="button-show-qr">
                <QrCode className="w-4 h-4 mr-1.5" /> Join
              </Button>
              <Button size="icon" variant="ghost" onClick={resetGame} className="text-white/50 hover:text-white hover:bg-white/10 h-9 w-9" data-testid="button-reset-game">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
          
          {/* Game Grid */}
          <div className="flex-1 p-3 md:p-5 overflow-hidden relative">
            {/* Subtle pitch markings - very faint */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-500 -translate-x-1/2" />
              <div className="absolute left-1/2 top-1/2 w-24 h-24 md:w-40 md:h-40 border border-emerald-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full flex flex-col gap-3 relative z-10"
            >
              {/* Category Headers */}
              <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: `repeat(${gridCategories.length}, 1fr)` }}>
                {gridCategories.map((category, idx) => (
                  <motion.div 
                    key={category.id}
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.08, type: "spring", stiffness: 120 }}
                    className="bg-zinc-900 py-3 md:py-4 px-2 rounded-lg text-center border border-zinc-800"
                  >
                    <span className="text-white font-bold text-xs md:text-sm uppercase tracking-wider">
                      {category.name}
                    </span>
                  </motion.div>
                ))}
              </div>
              
              {/* Point Grid */}
              <div className="flex-1 grid gap-2 md:gap-3" style={{ gridTemplateColumns: `repeat(${gridCategories.length}, 1fr)`, gridTemplateRows: 'repeat(5, 1fr)' }}>
                {POINT_TIERS.map((points, rowIdx) => (
                  gridCategories.map((category, colIdx) => {
                    const question = category.questions?.find(q => q.points === points);
                    const cellKey = `${category.id}-${points}`;
                    const isRevealed = revealedCells.has(cellKey);
                    const delay = 0.3 + (rowIdx * gridCategories.length + colIdx) * 0.03;
                    
                    return (
                      <motion.button
                        key={cellKey}
                        initial={{ opacity: 0, rotateX: -15, y: 20 }}
                        animate={{ opacity: 1, rotateX: 0, y: 0 }}
                        transition={{ delay, type: "spring", stiffness: 150, damping: 15 }}
                        className={`
                          rounded-lg font-black text-2xl md:text-4xl flex items-center justify-center transition-all duration-200 relative overflow-hidden
                          ${isRevealed 
                            ? 'bg-zinc-900/50 text-zinc-800 cursor-default border border-zinc-800' 
                            : 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white cursor-pointer border border-emerald-400/30'
                          }
                        `}
                        style={!isRevealed ? { 
                          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)' 
                        } : {}}
                        onClick={() => question && !isRevealed && handleCellClick(category.id, points, question)}
                        disabled={isRevealed || !question}
                        whileHover={!isRevealed ? { scale: 1.04, y: -4, boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)' } : {}}
                        whileTap={!isRevealed ? { scale: 0.96 } : {}}
                        data-testid={`cell-${category.id}-${points}`}
                      >
                        {!isRevealed && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: delay + 0.1, type: "spring", stiffness: 200 }}
                            className="drop-shadow-md"
                          >
                            {points}
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Bottom Scoreboard Bar */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="bg-white/5 backdrop-blur-md border-t border-white/10 px-4 py-3"
          >
            {players.length > 0 ? (
              <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
                {[...players].sort((a, b) => b.score - a.score).map((player, idx) => (
                  <motion.div
                    key={player.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                    className="flex items-center gap-3 bg-white/5 rounded-full pl-1 pr-4 py-1 border border-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' : idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' : idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' : 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-black'}`}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium text-sm">{player.name}</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-lg">{player.score}</span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-emerald-400 hover:bg-emerald-500/20"
                        onClick={() => {
                          if (wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({ type: 'update_score', playerId: player.id, delta: 10 }));
                          }
                        }}
                        data-testid={`button-add-score-${player.id}`}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-red-400 hover:bg-red-500/20"
                        onClick={() => {
                          if (wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({ type: 'update_score', playerId: player.id, delta: -10 }));
                          }
                        }}
                        data-testid={`button-sub-score-${player.id}`}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                <Users className="w-4 h-4" />
                <span>No players yet - share the room code to invite players</span>
              </div>
            )}
          </motion.div>
          
          {/* QR Code Modal */}
          <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-center text-2xl">Join the Game</DialogTitle>
                <DialogDescription className="text-center">
                  Scan with your phone to join
                </DialogDescription>
              </DialogHeader>
              
              {roomCode && (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground mb-1">Room Code</p>
                  <p className="text-4xl font-bold tracking-widest text-primary">{roomCode}</p>
                </div>
              )}
              
              <div className="flex justify-center py-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={joinUrl} size={180} />
                </div>
              </div>
              
              <p className="text-center text-xs text-muted-foreground break-all">{joinUrl}</p>
              
              {players.length > 0 && (
                <div className="border-t pt-3 mt-2">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    {players.length} player{players.length !== 1 ? 's' : ''} joined
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {players.map(p => (
                      <Badge key={p.id} variant="secondary">{p.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Question Modal */}
          <Dialog open={!!activeQuestion} onOpenChange={(open) => !open && handleCloseQuestion()}>
            <DialogContent className="max-w-2xl bg-slate-800 text-white border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-amber-400 text-2xl text-center">
                  {activeQuestion?.points} Points
                </DialogTitle>
              </DialogHeader>
              
              {/* Question */}
              <div className="py-4">
                <p className="text-xl md:text-2xl text-center font-medium">
                  {activeQuestion?.question}
                </p>
              </div>
              
              {/* Buzzer Status + Skip Option */}
              {players.length > 0 && !showAnswer && buzzQueue.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900/50 border border-emerald-600 rounded-full">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-300 text-sm font-medium">Buzzers Active - Waiting for players</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRevealAnswer}
                    className="text-slate-400 hover:text-white"
                    data-testid="button-skip-reveal"
                  >
                    <Eye className="w-4 h-4 mr-2" /> No one buzzing? Reveal Answer
                  </Button>
                </div>
              )}
              
              {/* Buzz Queue - players who buzzed in order */}
              {buzzQueue.length > 0 && !showAnswer && (
                <div className="bg-indigo-900/50 border border-indigo-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm text-indigo-300 font-medium">Buzz Order</span>
                  </div>
                  <div className="space-y-2">
                    {buzzQueue.map((buzz, index) => {
                      const player = players.find(p => p.id === buzz.playerId);
                      return (
                        <div 
                          key={buzz.playerId}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                            index === 0 ? 'bg-amber-600/30 border border-amber-500' : 'bg-slate-600/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold ${index === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                              #{index + 1}
                            </span>
                            <span className="font-medium text-white">{buzz.name}</span>
                            <span className="text-xs text-slate-400">({player?.score || 0} pts)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-500 text-white h-8"
                              onClick={() => {
                                updatePlayerScore(buzz.playerId, -(activeQuestion?.points || 0));
                                handleRevealAnswer();
                              }}
                              data-testid={`button-wrong-${buzz.playerId}`}
                            >
                              <X className="w-3 h-3 mr-1" /> Wrong
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white h-8"
                              onClick={() => {
                                updatePlayerScore(buzz.playerId, activeQuestion?.points || 0);
                                handleRevealAnswer();
                              }}
                              data-testid={`button-correct-${buzz.playerId}`}
                            >
                              <Check className="w-3 h-3 mr-1" /> Correct
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* No players yet prompt */}
              {players.length === 0 && !showAnswer && (
                <div className="text-center py-4 text-slate-400">
                  <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No players have joined yet</p>
                  <p className="text-xs mt-1">Click "Join" to show QR code</p>
                </div>
              )}
              
              {/* Waiting for buzzes */}
              {players.length > 0 && !buzzerLocked && buzzQueue.length === 0 && !showAnswer && (
                <div className="text-center py-6">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="inline-block"
                  >
                    <Zap className="w-12 h-12 text-amber-400 mx-auto" />
                  </motion.div>
                  <p className="text-amber-300 mt-2 font-medium">Waiting for buzzes...</p>
                  <p className="text-slate-400 text-sm">{players.length} player{players.length !== 1 ? 's' : ''} ready</p>
                </div>
              )}
              
              {/* Answer Revealed */}
              <AnimatePresence>
                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-4 text-center"
                  >
                    <p className="text-sm text-emerald-400 mb-1">Answer</p>
                    <p className="text-xl font-bold text-emerald-100">
                      {activeQuestion?.correctAnswer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* All Players for Manual Scoring (after answer revealed) */}
              {showAnswer && players.length > 0 && (
                <div className="bg-slate-700/50 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">Manage Points</span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {players.map(player => (
                      <div 
                        key={player.id}
                        className="flex items-center justify-between bg-slate-600/50 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{player.name}</span>
                          <span className="text-sm text-slate-400">({player.score} pts)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                            onClick={() => updatePlayerScore(player.id, -(activeQuestion?.points || 0))}
                            data-testid={`button-deduct-${player.id}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30"
                            onClick={() => updatePlayerScore(player.id, activeQuestion?.points || 0)}
                            data-testid={`button-award-${player.id}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex gap-2 sm:justify-center mt-4">
                {!showAnswer ? (
                  <Button 
                    onClick={() => {
                      lockBuzzer();
                      handleRevealAnswer();
                    }}
                    className="bg-amber-500 text-slate-900 hover:bg-amber-400"
                    data-testid="button-reveal-answer"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Show Answer
                  </Button>
                ) : (
                  <Button 
                    onClick={handleCloseQuestion}
                    variant="outline"
                    className="border-slate-600 text-white hover:bg-slate-700"
                    data-testid="button-close-question"
                  >
                    Continue
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    }
    
    // Helper to render question form for a category
    const renderQuestionSlot = (category: CategoryWithQuestions, points: number) => {
      const existingQuestion = category.questions?.find(q => q.points === points);
      const formKey = `${category.id}-${points}`;
      const formData = questionForms[formKey];
      const isEditing = !!formData;
      
      if (existingQuestion && !isEditing) {
        return (
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-xs text-muted-foreground mr-2">{points}pts:</span>
              <span className="truncate">{existingQuestion.question}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button 
                size="icon" 
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setQuestionForms(prev => ({
                  ...prev,
                  [formKey]: {
                    question: existingQuestion.question,
                    correctAnswer: existingQuestion.correctAnswer,
                    options: existingQuestion.options || [],
                  }
                }))}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost"
                className="h-6 w-6"
                onClick={() => deleteQuestionMutation.mutate(existingQuestion.id)}
                disabled={deleteQuestionMutation.isPending}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          </div>
        );
      }
      
      return (
        <div className="space-y-2 p-2 border border-dashed rounded">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs shrink-0">{points}pts</Badge>
            <Input
              placeholder="Question..."
              className="h-8 text-sm"
              value={formData?.question || ''}
              onChange={(e) => setQuestionForms(prev => ({
                ...prev,
                [formKey]: { ...prev[formKey] || { question: '', correctAnswer: '', options: [] }, question: e.target.value }
              }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Answer..."
              className="h-8 text-sm"
              value={formData?.correctAnswer || ''}
              onChange={(e) => setQuestionForms(prev => ({
                ...prev,
                [formKey]: { ...prev[formKey] || { question: '', correctAnswer: '', options: [] }, correctAnswer: e.target.value }
              }))}
            />
            <Button
              size="sm"
              className="h-8 shrink-0"
              onClick={() => {
                if (formData?.question && formData?.correctAnswer) {
                  saveQuestionMutation.mutate({
                    categoryId: category.id,
                    points,
                    question: formData.question,
                    correctAnswer: formData.correctAnswer,
                    options: formData.options || [],
                  });
                  setQuestionForms(prev => {
                    const newForms = { ...prev };
                    delete newForms[formKey];
                    return newForms;
                  });
                }
              }}
              disabled={!formData?.question || !formData?.correctAnswer || saveQuestionMutation.isPending}
            >
              {saveQuestionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      );
    };
    
    return (
      <div className="min-h-screen bg-background" data-testid="page-blitzgrid-grid">
        <AppHeader showAdminButton adminHref="/admin/games" />
        <div className="container mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedGridId(null)}
            className="mb-4"
            data-testid="button-back-to-grids"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Grids
          </Button>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">{grid?.name || 'Grid'}</h1>
              <p className="text-muted-foreground text-sm">
                {gridCategories.length}/5 categories · {grid?.questionCount || 0}/25 questions
              </p>
            </div>
            <div className="flex items-center gap-2">
              {grid?.isActive ? (
                <Badge className="bg-green-500/20 text-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Ready to Play
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600">
                  <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
                </Badge>
              )}
              {grid?.isActive && (
                <Button 
                  size="sm" 
                  data-testid="button-play-grid"
                  onClick={() => {
                    setPlayMode(true);
                    setRevealedCells(new Set());
                    setActiveQuestion(null);
                    setShowAnswer(false);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" /> Play
                </Button>
              )}
            </div>
          </div>

          {/* New Category Form */}
          {gridCategories.length < 5 && (
            <Card className="mb-4">
              <CardContent className="py-3">
                {showNewCategoryForm ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCategoryName.trim()) {
                          createCategoryMutation.mutate({ gridId: selectedGridId, name: newCategoryName.trim() });
                        }
                        if (e.key === 'Escape') {
                          setShowNewCategoryForm(false);
                          setNewCategoryName("");
                        }
                      }}
                      data-testid="input-category-name"
                    />
                    <Button
                      onClick={() => createCategoryMutation.mutate({ gridId: selectedGridId, name: newCategoryName.trim() })}
                      disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                      data-testid="button-create-category"
                    >
                      {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowNewCategoryForm(false); setNewCategoryName(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowNewCategoryForm(true)}
                    data-testid="button-new-category"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Category ({gridCategories.length}/5)
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Categories with inline questions */}
          {loadingCategories ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : gridCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-medium mb-2">No categories yet</h3>
                <p className="text-muted-foreground text-sm">Add your first category above to start building your grid</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {gridCategories.map(category => {
                const isExpanded = selectedCategoryId === category.id;
                
                return (
                  <Card key={category.id} className={isExpanded ? 'ring-2 ring-primary/20' : ''}>
                    <CardHeader 
                      className="cursor-pointer py-3"
                      onClick={() => setSelectedCategoryId(isExpanded ? null : category.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          <div>
                            <CardTitle className="text-base">{category.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {category.questionCount}/5 questions
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {category.questionCount >= 5 ? (
                            <Badge className="bg-green-500/20 text-green-600 text-xs">Complete</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 text-xs">
                              {5 - category.questionCount} needed
                            </Badge>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCategoryMutation.mutate({ gridId: selectedGridId, categoryId: category.id });
                            }}
                            disabled={removeCategoryMutation.isPending}
                            data-testid={`button-remove-category-${category.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-0 space-y-2">
                            {POINT_TIERS.map(points => (
                              <div key={points}>
                                {renderQuestionSlot(category, points)}
                              </div>
                            ))}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main grid list view
  return (
    <div className="min-h-screen bg-background" data-testid="page-blitzgrid">
      <AppHeader showAdminButton adminHref="/admin/games" />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Grid3X3 className="w-6 h-6 text-purple-500" />
              Blitzgrid
            </h1>
            <p className="text-muted-foreground text-sm">{grids.length} grids</p>
          </div>
          <Button onClick={() => setShowNewGridForm(true)} data-testid="button-new-grid">
            <Plus className="w-4 h-4 mr-2" /> New Grid
          </Button>
        </div>

        <AnimatePresence>
          {showNewGridForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Grid name..."
                      value={newGridName}
                      onChange={(e) => setNewGridName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newGridName.trim()) {
                          createGridMutation.mutate(newGridName.trim());
                        }
                        if (e.key === 'Escape') setShowNewGridForm(false);
                      }}
                      data-testid="input-grid-name"
                    />
                    <Button
                      onClick={() => createGridMutation.mutate(newGridName.trim())}
                      disabled={!newGridName.trim() || createGridMutation.isPending}
                      data-testid="button-create-grid"
                    >
                      {createGridMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowNewGridForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {loadingGrids ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : grids.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium mb-2">No grids yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first Blitzgrid</p>
              <Button onClick={() => setShowNewGridForm(true)} data-testid="button-create-first-grid">
                <Plus className="w-4 h-4 mr-2" /> Create Grid
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grids.map(grid => (
              <Card
                key={grid.id}
                className={`hover-elevate transition-all ${grid.isActive ? 'cursor-pointer' : 'opacity-60'}`}
                onClick={() => {
                  if (grid.isActive) {
                    setSelectedGridId(grid.id);
                    setPlayMode(true);
                    setRevealedCells(new Set());
                    setActiveQuestion(null);
                    setShowAnswer(false);
                  } else {
                    toast({ title: "Grid not ready", description: "This grid needs 5 categories with 5 questions each." });
                  }
                }}
                data-testid={`card-grid-${grid.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 min-w-0 mb-3">
                    <Grid3X3 className="w-5 h-5 text-purple-500 shrink-0" />
                    <h3 className="font-semibold truncate">{grid.name}</h3>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {grid.categoryCount}/5 categories · {grid.questionCount}/25 questions
                    </p>
                    {grid.isActive ? (
                      <Badge className="bg-green-500/20 text-green-600 text-xs shrink-0">
                        <Play className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Incomplete
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteGridId !== null} onOpenChange={(open) => !open && setDeleteGridId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this grid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the grid and unlink all categories. Categories and questions will still exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGridId && deleteGridMutation.mutate(deleteGridId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
