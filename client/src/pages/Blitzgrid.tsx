import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";
import { useScore } from "@/components/ScoreContext";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import confetti from "canvas-confetti";
import { playWhoosh, playRevealFlip, playPointsAwarded, playCelebration, playWrongBuzz, playDrumroll, playFanfare, playApplause, playReaction, playSwoosh, soundManager } from "@/lib/sounds";
import { 
  Plus, Trash2, Pencil, Check, X, Grid3X3, 
  ChevronRight, ArrowLeft, Play, Loader2,
  AlertCircle, CheckCircle2, Eye, RotateCcw, QrCode, Users, Minus, Lock, Trophy, ChevronLeft, UserPlus, Power, Crown, Medal,
  Volume2, VolumeX, MoreVertical, Settings, Copy, Link2, Share2, Download, Image, Loader2 as LoaderIcon, Clock,
  Hand, Flame, Laugh, CircleDot, ThumbsUp, Sparkles, Heart, Timer, Zap, Shuffle
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";

interface Player {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  connected: boolean;
}

interface PlayerGameStats {
  correctAnswers: number;
  wrongAnswers: number;
  totalPoints: number;
  pointsByCategory: Record<number, number>;
  currentStreak: number;
  bestStreak: number;
  biggestGain: number;
  lastAnswerTime?: number;
}

interface GameStats {
  playerStats: Map<string, PlayerGameStats>;
  totalQuestions: number;
  startTime: number;
  endTime?: number;
  mvpMoments: Array<{
    type: 'comeback' | 'streak' | 'sweep' | 'clutch';
    playerId: string;
    description: string;
    value: number;
  }>;
}
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import type { Board, Category, Question } from "@shared/schema";
import { PLAYER_AVATARS } from "@shared/schema";
import { getBoardColorConfig, BOARD_COLORS } from "@/lib/boardColors";

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
  const [shuffleMode, setShuffleMode] = useState(false);
  const [shuffledCategories, setShuffledCategories] = useState<CategoryWithQuestions[] | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [playedShuffleCategoryIds, setPlayedShuffleCategoryIds] = useState<number[]>([]);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  
  // Category reveal state - reveals categories one by one before gameplay
  const [revealedCategoryCount, setRevealedCategoryCount] = useState(0);
  const [categoryRevealMode, setCategoryRevealMode] = useState(true);
  
  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Play timer sound using Web Audio API
  const playTimerSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a sequence of beeps for a "time's up" sound
      const playBeep = (startTime: number, frequency: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      // Three ascending beeps
      playBeep(now, 440, 0.15);
      playBeep(now + 0.2, 554, 0.15);
      playBeep(now + 0.4, 659, 0.3);
    } catch (e) {
      console.log('Could not play timer sound');
    }
  }, []);
  
  // Timer countdown effect
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerIntervalRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timerActive && timeLeft === 0) {
      playTimerSound();
      setTimerActive(false);
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearTimeout(timerIntervalRef.current);
      }
    };
  }, [timerActive, timeLeft, playTimerSound]);
  
  // Reset timer when question changes
  useEffect(() => {
    setTimerActive(false);
    setTimeLeft(10);
  }, [activeQuestion?.id]);
  
  // Multiplayer state
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [buzzerLocked, setBuzzerLocked] = useState(true);
  const [buzzQueue, setBuzzQueue] = useState<Array<{ playerId: string; name: string; position: number; time: number }>>([]);
  const [isJudging, setIsJudging] = useState(false);
  const [lastJoinedPlayer, setLastJoinedPlayer] = useState<{ name: string; avatar?: string } | null>(null);
  const [lastScoreChange, setLastScoreChange] = useState<{ playerId: string; playerName: string; points: number } | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverPhase, setGameOverPhase] = useState(0);
  const [gameStats, setGameStats] = useState<GameStats>({
    playerStats: new Map(),
    totalQuestions: 0,
    startTime: Date.now(),
    mvpMoments: []
  });
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [gridPickerMode, setGridPickerMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [scoreAnimations, setScoreAnimations] = useState<Map<string, { delta: number; timestamp: number }>>(new Map());
  const [reactions, setReactions] = useState<Array<{ id: string; type: string; playerId?: string; timestamp: number }>>([]);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const previousScoresRef = useRef<Map<string, number>>(new Map());
  const gameOverTimers = useRef<NodeJS.Timeout[]>([]);
  const joinNotificationTimer = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scoresPanelRef = useRef<HTMLDivElement | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnect = useRef(true);
  
  // Persist room session in localStorage
  const getStoredSession = useCallback(() => {
    try {
      const data = localStorage.getItem('blitzgrid-host-session');
      if (data) {
        const parsed = JSON.parse(data);
        // Check if session is less than 4 hours old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 4 * 60 * 60 * 1000) {
          return parsed;
        }
        localStorage.removeItem('blitzgrid-host-session');
      }
    } catch {}
    return null;
  }, []);
  
  const storeSession = useCallback((code: string, sessionId?: number) => {
    try {
      localStorage.setItem('blitzgrid-host-session', JSON.stringify({
        code,
        sessionId,
        timestamp: Date.now(),
      }));
    } catch {}
  }, []);
  
  const clearStoredSession = useCallback(() => {
    try {
      localStorage.removeItem('blitzgrid-host-session');
    } catch {}
  }, []);
  
  // Form state
  const [showNewGridForm, setShowNewGridForm] = useState(false);
  const [newGridName, setNewGridName] = useState("");
  const [newGridTheme, setNewGridTheme] = useState("birthday");
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
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

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

  // Use shuffled categories when in shuffle mode, otherwise use grid categories
  const playCategories = shuffleMode ? (shuffledCategories || []) : gridCategories;

  // Create grid mutation
  const createGridMutation = useMutation({
    mutationFn: async ({ name, theme }: { name: string; theme: string }) => {
      return apiRequest('POST', '/api/blitzgrid/grids', { name, theme });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewGridName("");
      setNewGridTheme("aurora");
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
    mutationFn: async ({ gridId, name, description }: { gridId: number; name: string; description?: string }) => {
      return apiRequest('POST', `/api/blitzgrid/grids/${gridId}/categories/create`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewCategoryName("");
      setNewCategoryDescription("");
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

  // WebSocket connection for multiplayer with auto-reconnect
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Clear any pending reconnect
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setWsConnected(true);
      reconnectAttempts.current = 0;
      
      // Check if we have a stored session to rejoin
      const storedSession = getStoredSession();
      if (storedSession?.code) {
        ws.send(JSON.stringify({ type: 'host:join', code: storedSession.code }));
      } else {
        ws.send(JSON.stringify({ type: 'host:create' }));
      }
      
      // Start ping interval to keep connection alive
      if (pingInterval.current) clearInterval(pingInterval.current);
      pingInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000); // Ping every 25 seconds
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'room:created':
            setRoomCode(data.code);
            storeSession(data.code, data.sessionId);
            break;
          case 'room:joined':
            setRoomCode(data.code);
            storeSession(data.code, data.sessionId);
            if (data.players) {
              setPlayers(data.players.map((p: any) => ({ 
                ...p, 
                connected: p.connected ?? p.isConnected ?? true 
              })));
            }
            if (data.buzzerLocked !== undefined) {
              setBuzzerLocked(data.buzzerLocked);
            }
            if (data.buzzQueue) {
              setBuzzQueue(data.buzzQueue.map((b: any) => ({
                playerId: b.playerId,
                name: b.playerName,
                position: b.position,
                time: b.timestamp,
              })));
            }
            break;
          case 'room:notFound':
            // Stored session is stale, create new room
            clearStoredSession();
            ws.send(JSON.stringify({ type: 'host:create' }));
            break;
          case 'room:closed':
            clearStoredSession();
            setRoomCode(null);
            setPlayers([]);
            break;
          case 'player:joined':
            if (data.player) {
              setPlayers(prev => {
                const exists = prev.some(p => p.id === data.player.id);
                if (exists) {
                  return prev.map(p => p.id === data.player.id ? { ...data.player, connected: true } : p);
                }
                return [...prev, { ...data.player, connected: true }];
              });
              // Show join notification (clear any existing timer first)
              if (joinNotificationTimer.current) {
                clearTimeout(joinNotificationTimer.current);
              }
              setLastJoinedPlayer({ name: data.player.name, avatar: data.player.avatar });
              joinNotificationTimer.current = setTimeout(() => setLastJoinedPlayer(null), 3000);
            }
            break;
          case 'player:reconnected':
            if (data.player) {
              setPlayers(prev => prev.map(p => 
                p.id === data.player.id ? { ...data.player, connected: true } : p
              ));
            }
            break;
          case 'player:left':
            setPlayers(prev => prev.filter(p => p.id !== data.playerId));
            setBuzzQueue(prev => prev.filter(b => b.playerId !== data.playerId));
            break;
          case 'player:reaction':
            if (data.reactionType && data.playerName) {
              const reactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              setReactions(prev => [...prev, { 
                id: reactionId, 
                type: data.reactionType, 
                playerId: data.playerId,
                timestamp: Date.now() 
              }]);
              playReaction();
              setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reactionId));
              }, 2500);
            }
            break;
          case 'player:disconnected':
            setPlayers(prev => prev.map(p => 
              p.id === data.playerId ? { ...p, connected: false } : p
            ));
            setBuzzQueue(prev => prev.filter(b => b.playerId !== data.playerId));
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
          case 'player:buzzed':
            // Collect all buzzes - don't auto-lock
            setBuzzQueue(prev => [...prev, {
              playerId: data.playerId,
              name: data.playerName,
              position: data.position,
              time: data.timestamp
            }]);
            break;
          case 'buzzer:reset':
            setBuzzQueue([]);
            break;
          case 'pong':
            // Heartbeat response received
            break;
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    };
    
    ws.onclose = () => {
      setWsConnected(false);
      setIsJudging(false);
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
        pingInterval.current = null;
      }
      
      // Auto-reconnect with exponential backoff if we should reconnect
      if (shouldReconnect.current && reconnectAttempts.current < 10) {
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      }
    };
    
    ws.onerror = () => {
      setWsConnected(false);
      setIsJudging(false);
    };
  }, [getStoredSession, storeSession, clearStoredSession]);
  
  const disconnectWebSocket = useCallback((clearSession = false) => {
    shouldReconnect.current = false;
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
    
    if (clearSession) {
      clearStoredSession();
      setRoomCode(null);
      setPlayers([]);
    }
  }, [clearStoredSession]);
  
  const updatePlayerScore = useCallback((playerId: string, points: number, trackForUndo = true, categoryId?: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'host:updateScore',
        playerId,
        points
      }));
      if (trackForUndo) {
        const player = players.find(p => p.id === playerId);
        setLastScoreChange({ playerId, playerName: player?.name || 'Player', points });
      }
      
      // Track game stats (only for actual gameplay, not undo operations)
      if (trackForUndo) {
        setGameStats(prev => {
          const newPlayerStats = new Map(prev.playerStats);
          const existing = newPlayerStats.get(playerId) || {
            correctAnswers: 0,
            wrongAnswers: 0,
            totalPoints: 0,
            pointsByCategory: {},
            currentStreak: 0,
            bestStreak: 0,
            biggestGain: 0
          };
          
          const isCorrect = points > 0;
          const updated: PlayerGameStats = {
            ...existing,
            correctAnswers: existing.correctAnswers + (isCorrect ? 1 : 0),
            wrongAnswers: existing.wrongAnswers + (!isCorrect && points < 0 ? 1 : 0),
            totalPoints: existing.totalPoints + points,
            currentStreak: isCorrect ? existing.currentStreak + 1 : 0,
            bestStreak: isCorrect ? Math.max(existing.bestStreak, existing.currentStreak + 1) : existing.bestStreak,
            biggestGain: isCorrect ? Math.max(existing.biggestGain, points) : existing.biggestGain,
            lastAnswerTime: Date.now()
          };
          
          if (categoryId && isCorrect) {
            updated.pointsByCategory = {
              ...existing.pointsByCategory,
              [categoryId]: (existing.pointsByCategory[categoryId] || 0) + points
            };
          }
          
          newPlayerStats.set(playerId, updated);
          
          // Track MVP moments
          const newMvpMoments = [...prev.mvpMoments];
          
          // Streak achievement (3+ correct in a row)
          if (updated.currentStreak === 3) {
            const player = players.find(p => p.id === playerId);
            newMvpMoments.push({
              type: 'streak',
              playerId,
              description: `${player?.name || 'Player'} is on fire! 3 in a row`,
              value: 3
            });
          } else if (updated.currentStreak === 5) {
            const player = players.find(p => p.id === playerId);
            newMvpMoments.push({
              type: 'streak',
              playerId,
              description: `${player?.name || 'Player'} is unstoppable! 5 in a row`,
              value: 5
            });
          }
          
          // High-value answer achievement (50 points)
          if (isCorrect && points >= 50) {
            const player = players.find(p => p.id === playerId);
            newMvpMoments.push({
              type: 'clutch',
              playerId,
              description: `${player?.name || 'Player'} nailed the 50-pointer!`,
              value: points
            });
          }
          
          // Perfect category sweep (got all 5 questions in a category)
          if (categoryId && isCorrect) {
            const catPoints = (existing.pointsByCategory[categoryId] || 0) + points;
            // Max points per category = 10+20+30+40+50 = 150
            if (catPoints === 150) {
              const player = players.find(p => p.id === playerId);
              const cat = playCategories.find(c => c.id === categoryId);
              newMvpMoments.push({
                type: 'sweep',
                playerId,
                description: `${player?.name || 'Player'} swept ${cat?.name || 'a category'}!`,
                value: 150
              });
            }
          }
          
          return {
            ...prev,
            playerStats: newPlayerStats,
            totalQuestions: prev.totalQuestions + (isCorrect || points < 0 ? 1 : 0),
            mvpMoments: newMvpMoments
          };
        });
      }
      
      const animTimestamp = Date.now();
      setScoreAnimations(prev => {
        const next = new Map(prev);
        next.set(playerId, { delta: points, timestamp: animTimestamp });
        return next;
      });
      setTimeout(() => {
        setScoreAnimations(prev => {
          const current = prev.get(playerId);
          if (current && current.timestamp === animTimestamp) {
            const next = new Map(prev);
            next.delete(playerId);
            return next;
          }
          return prev;
        });
      }, 1500);
      
      if (points > 0) {
        playPointsAwarded(points);
        playSwoosh();
        if (points >= 40) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#fbbf24', '#f472b6', '#8b5cf6']
          });
        }
      } else if (points < 0) {
        playWrongBuzz();
      }
    }
  }, [players]);

  const undoLastScore = useCallback(() => {
    if (lastScoreChange) {
      updatePlayerScore(lastScoreChange.playerId, -lastScoreChange.points, false);
      toast({
        title: "Undo successful",
        description: `Reversed ${lastScoreChange.points > 0 ? '+' : ''}${lastScoreChange.points} for ${lastScoreChange.playerName}`,
      });
      setLastScoreChange(null);
    }
  }, [lastScoreChange, updatePlayerScore, toast]);

  const sendFeedback = useCallback((playerId: string, correct: boolean, points: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'host:feedback',
        playerId,
        correct,
        points
      }));
    }
  }, []);

  const lockBuzzer = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:lock' }));
    }
    setBuzzerLocked(true);
    setBuzzQueue([]);
  }, []);
  
  const unlockBuzzer = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:unlock' }));
      setBuzzerLocked(false);
      setBuzzQueue([]);
      setIsJudging(false);
    }
  }, []);
  
  const resetBuzzers = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:reset' }));
      setBuzzQueue([]);
    }
  }, []);
  
  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:closeRoom' }));
    }
    disconnectWebSocket(true);
    clearStoredSession();
    setRoomCode(null);
    setPlayers([]);
    setBuzzQueue([]);
    setBuzzerLocked(true);
    setPlayMode(false);
    setShuffleMode(false);
    setShuffledCategories(null);
    setSelectedGridId(null);
    setLastScoreChange(null);
    toast({ title: "Session ended", description: "All players have been disconnected." });
  }, [clearStoredSession, disconnectWebSocket, toast]);
  
  // Shuffle Play - randomly select 5 categories from all grids
  const handleShufflePlay = useCallback(async () => {
    setIsShuffling(true);
    try {
      // Always exclude all previously played categories (including current shuffle set)
      // This ensures reshuffle always gives fresh categories
      const excludeParam = playedShuffleCategoryIds.length > 0 
        ? `?exclude=${playedShuffleCategoryIds.join(',')}` 
        : '';
      const response = await apiRequest('GET', `/api/boards/shuffle-play${excludeParam}`);
      const data = await response.json();
      
      // Check for server error responses
      if (data.exhausted) {
        throw new Error("You've played all available categories! Reset to play again.");
      }
      if (data.message && !data.categories) {
        throw new Error(data.message);
      }
      
      // Validate response has exactly 5 categories, each with 5 questions covering all point tiers
      const requiredPoints = [10, 20, 30, 40, 50];
      const isValid = data.categories && 
        data.categories.length === 5 && 
        data.categories.every((cat: any) => 
          cat.questions?.length === 5 &&
          requiredPoints.every(pt => cat.questions.some((q: any) => q.points === pt))
        );
      
      if (isValid) {
        // Map the response to CategoryWithQuestions format
        const mappedCategories: CategoryWithQuestions[] = data.categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          imageUrl: cat.imageUrl,
          questionCount: cat.questions.length,
          questions: cat.questions,
        }));
        
        // Add new categories to played list (server already excluded these from previous plays)
        const newPlayedIds = mappedCategories.map(c => c.id);
        setPlayedShuffleCategoryIds(prev => {
          // Use Set to prevent any duplicate IDs
          const uniqueIds = new Set([...prev, ...newPlayedIds]);
          return Array.from(uniqueIds);
        });
        
        setShuffledCategories(mappedCategories);
        setShuffleMode(true);
        setPlayMode(true);
        setCategoryRevealMode(true);
        setRevealedCategoryCount(0);
        setRevealedCells(new Set());
        // Reset game stats for new game
        setGameStats({
          playerStats: new Map(),
          totalQuestions: 0,
          startTime: Date.now(),
          mvpMoments: []
        });
        toast({
          title: "Shuffle Play!",
          description: "5 random categories mixed from your grids",
        });
      } else {
        throw new Error("Not enough complete categories to shuffle");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Need at least 5 complete categories across your grids";
      toast({
        title: "Can't shuffle yet",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsShuffling(false);
    }
  }, [toast, playedShuffleCategoryIds]);
  
  // Fire celebratory confetti with fireworks
  const fireConfetti = useCallback(() => {
    const defaults = { startVelocity: 30, spread: 360, ticks: 80, zIndex: 100 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    
    playFanfare();
    
    // Initial burst from sides
    confetti({ ...defaults, particleCount: 80, origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.2, 0.4) }, colors: ['#22c55e', '#16a34a', '#FFD700', '#FFA500'] });
    confetti({ ...defaults, particleCount: 80, origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.2, 0.4) }, colors: ['#22c55e', '#16a34a', '#FFD700', '#FFA500'] });
    
    // Firework burst pattern - center explosion
    setTimeout(() => {
      confetti({ particleCount: 150, spread: 70, origin: { x: 0.5, y: 0.35 }, colors: ['#FFD700', '#FFFFFF', '#22c55e', '#4ADEBC', '#f472b6', '#8b5cf6'] });
    }, 200);
    
    // Star shapes
    setTimeout(() => {
      confetti({ particleCount: 60, spread: 100, origin: { x: 0.5, y: 0.5 }, shapes: ['star'], colors: ['#FFD700', '#FFA500', '#FFFFFF'], scalar: 1.8 });
    }, 400);
    
    // Side fireworks
    setTimeout(() => {
      confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#8b5cf6', '#a855f7', '#c084fc'] });
      confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ec4899', '#f472b6', '#fb7185'] });
    }, 600);
    
    // Final golden shower
    setTimeout(() => {
      playApplause();
      confetti({ particleCount: 200, spread: 180, origin: { x: 0.5, y: 0.1 }, startVelocity: 45, colors: ['#FFD700', '#FFA500', '#FFEC8B', '#FFFFFF'], gravity: 0.8 });
    }, 900);
    
    // Extra stars burst
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 360, origin: { x: 0.5, y: 0.4 }, shapes: ['star'], colors: ['#FFD700', '#FFFFFF'], scalar: 2, ticks: 100 });
    }, 1200);
  }, []);
  
  // Start the game over reveal animation
  const startGameOverReveal = useCallback(() => {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    if (sortedPlayers.length === 0) {
      endSession();
      return;
    }
    
    // Clear any existing timers
    gameOverTimers.current.forEach(clearTimeout);
    gameOverTimers.current = [];
    
    setShowGameOver(true);
    setGameOverPhase(0);
    
    // Animate phases: 0 → show 4th+ → 3rd → 2nd → drumroll → winner
    const phases = sortedPlayers.length >= 4 ? [500, 2000, 3500, 5000, 6500] : 
                   sortedPlayers.length === 3 ? [500, 2000, 3500, 5000] :
                   sortedPlayers.length === 2 ? [500, 2000, 3500] :
                   [500, 2000];
    
    phases.forEach((delay, i) => {
      const timer = setTimeout(() => {
        setGameOverPhase(i + 1);
        if (i === phases.length - 2) {
          playDrumroll();
        }
        if (i === phases.length - 1) {
          fireConfetti();
        }
      }, delay);
      gameOverTimers.current.push(timer);
    });
  }, [players, endSession, fireConfetti]);
  
  // Close game over and actually end session
  const closeGameOver = useCallback(() => {
    // Clear reveal timers
    gameOverTimers.current.forEach(clearTimeout);
    gameOverTimers.current = [];
    setShowGameOver(false);
    setGameOverPhase(0);
    setShowDetailedStats(false);
    // Reset game stats
    setGameStats({
      playerStats: new Map(),
      totalQuestions: 0,
      startTime: Date.now(),
      mvpMoments: []
    });
    endSession();
  }, [endSession]);
  
  // Continue to next grid - keep room/players/scores, just reset grid state
  const continueToNextGrid = useCallback(() => {
    // Clear reveal timers
    gameOverTimers.current.forEach(clearTimeout);
    gameOverTimers.current = [];
    setShowGameOver(false);
    setGameOverPhase(0);
    setShowDetailedStats(false);
    
    // Reset grid-specific state but keep room/players/scores
    setActiveQuestion(null);
    setShowAnswer(false);
    setRevealedCells(new Set());
    setBuzzQueue([]);
    setBuzzerLocked(true);
    setIsJudging(false);
    setSelectedGridId(null);
    setPlayMode(false);
    setShuffleMode(false);
    setShuffledCategories(null);
    
    // Reset game stats for next grid (keep cumulative scores on players)
    setGameStats({
      playerStats: new Map(),
      totalQuestions: 0,
      startTime: Date.now(),
      mvpMoments: []
    });
    
    // Enter grid picker mode - room stays open
    setGridPickerMode(true);
    
    // Notify players that host is picking next grid
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:pickingNextGrid' }));
    }
  }, []);
  
  // Auto-connect when entering play mode or grid picker mode (keep room alive)
  useEffect(() => {
    if (playMode || gridPickerMode) {
      shouldReconnect.current = true;
      connectWebSocket();
    } else {
      // Only disconnect when completely leaving both modes
      disconnectWebSocket(false);
    }
    return () => {
      // Don't clear session on unmount - allow reconnection on refresh
      disconnectWebSocket(false);
      if (joinNotificationTimer.current) {
        clearTimeout(joinNotificationTimer.current);
      }
      // Clear game over timers on unmount
      gameOverTimers.current.forEach(clearTimeout);
      gameOverTimers.current = [];
    };
  }, [playMode, gridPickerMode, connectWebSocket, disconnectWebSocket]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Blitzgrid" backHref="/" showAdminButton adminHref="/admin/games" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  // Grid detail view with inline categories and questions (or shuffle mode)
  if (selectedGridId || shuffleMode) {
    const grid = selectedGridId ? grids.find(g => g.id === selectedGridId) : null;
    const gridIndex = selectedGridId ? grids.filter(g => g.isActive).findIndex(g => g.id === selectedGridId) : -1;
    const effectiveColor = grid?.colorCode?.startsWith('#') ? null : grid?.colorCode;
    // Use fuchsia/violet theme for shuffle mode
    const shuffleColor = 'fuchsia';
    const colorConfig = getBoardColorConfig(shuffleMode ? shuffleColor : (effectiveColor || BOARD_COLORS[gridIndex >= 0 ? gridIndex % BOARD_COLORS.length : 0]));
    
    // GAMEPLAY MODE (normal grid or shuffle mode)
    if (playMode && (grid?.isActive || shuffleMode)) {
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
          const cat = playCategories.find(c => c.questions?.some(q => q.id === activeQuestion.id));
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
        lockBuzzer();
        setIsJudging(false);
        setLastScoreChange(null);
      };
      
      const resetGame = () => {
        setRevealedCells(new Set());
        setRevealedCategoryCount(0);
        setCategoryRevealMode(true);
        toast({ title: "Game reset! All questions available again." });
      };
      
      // Reveal next category
      const revealNextCategory = () => {
        if (revealedCategoryCount < playCategories.length) {
          playRevealFlip();
          setRevealedCategoryCount(prev => prev + 1);
          // Check if all categories revealed
          if (revealedCategoryCount + 1 >= playCategories.length) {
            setCategoryRevealMode(false);
            playWhoosh();
          }
        }
      };
      
      // Skip reveal mode and show all
      const skipReveal = () => {
        setRevealedCategoryCount(playCategories.length);
        setCategoryRevealMode(false);
      };
      
      const joinUrl = roomCode 
        ? `${window.location.origin}/play?code=${roomCode}` 
        : `${window.location.origin}/play`;
      
      // Sort players for podium display
      const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
      const winner = sortedPlayers[0];
      const runnerUp = sortedPlayers[1];
      const thirdPlace = sortedPlayers[2];
      const restOfPlayers = sortedPlayers.slice(3);
      
      // Phase thresholds based on player count
      const winnerPhase = sortedPlayers.length >= 4 ? 5 : sortedPlayers.length === 3 ? 4 : sortedPlayers.length === 2 ? 3 : 2;
      const secondPhase = sortedPlayers.length >= 4 ? 4 : sortedPlayers.length === 3 ? 3 : 2;
      const thirdPhase = sortedPlayers.length >= 4 ? 3 : 2;
      const restPhase = 2;
      
      // Use same background as grid selection page for unified look
      const effectiveColorName = grid?.colorCode?.startsWith('#') ? null : grid?.colorCode;
      const colorName = effectiveColorName || BOARD_COLORS[gridIndex >= 0 ? gridIndex % BOARD_COLORS.length : 0];
      
      // Keyboard handler for reveal mode
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (categoryRevealMode && !activeQuestion && (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight')) {
          e.preventDefault();
          revealNextCategory();
        } else if (categoryRevealMode && e.key === 'Escape') {
          e.preventDefault();
          skipReveal();
        }
      };
      
      return (
        <div 
          className="h-screen overflow-hidden flex flex-col relative touch-manipulation bg-background" 
          data-testid="page-blitzgrid-play"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onClick={() => categoryRevealMode && !activeQuestion && revealNextCategory()}
        >
          {/* Subtle gradient overlay matching grid selection page style */}
          <div 
            className="absolute inset-0 pointer-events-none z-[1] bg-gradient-to-br from-slate-50/30 via-slate-50/20 to-slate-100/30" 
          />
          
          {/* Floating decorative elements - Designer touch */}
          <div className="absolute inset-0 pointer-events-none z-[2] overflow-hidden">
            {/* Top-left semicircle accent */}
            <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-br from-slate-200/40 to-slate-100/20 blur-xl" />
            {/* Bottom-right semicircle accent */}
            <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br from-slate-200/40 to-slate-100/20 blur-xl" />
            {/* Floating dots */}
            <motion.div 
              className="absolute top-1/4 right-[15%] w-2 h-2 rounded-full bg-slate-300/50"
              animate={{ y: [0, -10, 0], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute top-1/3 left-[10%] w-1.5 h-1.5 rounded-full bg-slate-300/50"
              animate={{ y: [0, -8, 0], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            <motion.div 
              className="absolute bottom-1/4 right-[20%] w-1 h-1 rounded-full bg-slate-400/60"
              animate={{ y: [0, -6, 0], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
          </div>
          
          
          {/* Game Over Reveal Overlay */}
          <AnimatePresence>
            {showGameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-background"
              >
                {/* Subtle gradient overlay matching game page */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-slate-50/20 to-slate-100/30" />
                <div ref={scoresPanelRef} className="text-center p-4 md:p-8 max-w-4xl w-full mx-4 relative">
                  {/* Title */}
                  <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                  >
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Final Scores</h2>
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span className="text-muted-foreground">Who takes the crown?</span>
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                  </motion.div>

                  {/* 3D Podium */}
                  <div className="relative flex items-end justify-center gap-2 md:gap-4 mb-8 h-[320px] md:h-[380px]">
                    {/* 2nd Place - Left */}
                    <AnimatePresence>
                      {gameOverPhase >= secondPhase && runnerUp && (
                        <motion.div
                          initial={{ y: 100, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 100, damping: 15 }}
                          className="flex flex-col items-center"
                        >
                          {/* Player floating above podium */}
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="mb-1">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg border-4 border-slate-200 bg-gradient-to-br from-slate-300 to-slate-400">
                              {PLAYER_AVATARS.find(a => a.id === runnerUp.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                            </div>
                          </motion.div>
                          {/* Podium with name plate - Silver theme */}
                          <div className="w-24 md:w-32 h-28 md:h-36 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 rounded-t-lg flex flex-col items-center justify-between shadow-xl border-t-4 border-slate-100 pt-2 pb-3">
                            {/* Name plate */}
                            <div className="bg-white px-2 py-0.5 rounded shadow-sm">
                              <div className="text-slate-700 font-bold text-xs md:text-sm truncate max-w-[80px] md:max-w-[110px]" data-testid="text-2nd-place-name">
                                {runnerUp.name}
                              </div>
                            </div>
                            <div className="text-2xl md:text-3xl font-black text-slate-700 drop-shadow" data-testid="text-2nd-place-score">
                              {runnerUp.score} pts
                            </div>
                            <div className="flex items-center">
                              <Medal className="w-6 h-6 text-slate-600 mr-1" />
                              <span className="text-3xl md:text-4xl font-black text-slate-600">2</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 1st Place - Center (elevated) */}
                    <AnimatePresence>
                      {gameOverPhase >= winnerPhase && winner && (
                        <motion.div
                          initial={{ y: 150, opacity: 0, scale: 0.5 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 80, damping: 12 }}
                          className="flex flex-col items-center relative z-10"
                        >
                          {/* Winner Spotlight Glow */}
                          <motion.div
                            className="absolute -inset-8 rounded-full"
                            animate={{ boxShadow: ["0 0 40px 10px rgba(255, 215, 0, 0.3)", "0 0 60px 20px rgba(255, 215, 0, 0.5)", "0 0 40px 10px rgba(255, 215, 0, 0.3)"] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                          
                          {/* Crown */}
                          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                            <Crown className="w-10 h-10 md:w-12 md:h-12 text-yellow-400 mx-auto drop-shadow-lg" />
                          </motion.div>
                          
                          {/* Player floating above podium */}
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="relative mb-1">
                            <motion.div
                              className="absolute inset-0 rounded-full border-4 border-yellow-400"
                              animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <div className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-5xl shadow-2xl border-4 border-yellow-400 relative z-10 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400">
                              {PLAYER_AVATARS.find(a => a.id === winner.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                            </div>
                          </motion.div>
                          
                          {/* Grand Podium with name plate */}
                          <div className="w-28 md:w-40 h-44 md:h-56 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-700 rounded-t-lg flex flex-col items-center justify-between shadow-2xl border-t-4 border-yellow-300 pt-2 pb-4">
                            {/* Name plate */}
                            <div className="bg-white px-3 py-1 rounded shadow-md">
                              <div className="text-yellow-900 font-black text-sm md:text-base truncate max-w-[90px] md:max-w-[130px]" data-testid="text-winner-name">
                                {winner.name}
                              </div>
                            </div>
                            <motion.div 
                              className="text-3xl md:text-4xl font-black text-yellow-900 drop-shadow"
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                              data-testid="text-winner-score"
                            >
                              {winner.score} pts
                            </motion.div>
                            <div className="flex flex-col items-center">
                              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-900 mb-1" />
                              <span className="text-5xl md:text-6xl font-black text-yellow-900">1</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 3rd Place - Right */}
                    <AnimatePresence>
                      {gameOverPhase >= thirdPhase && thirdPlace && (
                        <motion.div
                          initial={{ y: 100, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 100, damping: 15 }}
                          className="flex flex-col items-center"
                        >
                          {/* Player floating above podium */}
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="mb-1">
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-3xl shadow-lg border-4 border-amber-300 bg-gradient-to-br from-amber-400 to-amber-500">
                              {PLAYER_AVATARS.find(a => a.id === thirdPlace.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                            </div>
                          </motion.div>
                          {/* Podium with name plate - Bronze theme */}
                          <div className="w-20 md:w-28 h-20 md:h-24 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 rounded-t-lg flex flex-col items-center justify-between shadow-xl border-t-4 border-amber-200 pt-1 pb-2">
                            {/* Name plate */}
                            <div className="bg-white px-2 py-0.5 rounded shadow-sm">
                              <div className="text-amber-800 font-bold text-xs truncate max-w-[70px] md:max-w-[100px]" data-testid="text-3rd-place-name">
                                {thirdPlace.name}
                              </div>
                            </div>
                            <div className="text-lg md:text-xl font-black text-amber-800 drop-shadow" data-testid="text-3rd-place-score">
                              {thirdPlace.score} pts
                            </div>
                            <span className="text-2xl md:text-3xl font-black text-amber-700">3</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Drumroll Phase */}
                    <AnimatePresence>
                      {gameOverPhase === winnerPhase - 1 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        >
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3, repeat: Infinity }} className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Sparkles className="w-10 h-10 md:w-14 md:h-14 text-amber-400" />
                              <Trophy className="w-12 h-12 md:w-16 md:h-16 text-amber-400" />
                              <Sparkles className="w-10 h-10 md:w-14 md:h-14 text-amber-400" />
                            </div>
                            <motion.p 
                              className="text-foreground text-xl md:text-2xl font-bold mt-2"
                              animate={{ opacity: [1, 0.5, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            >
                              And the winner is...
                            </motion.p>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Other players (4th place and beyond) */}
                  {gameOverPhase >= restPhase && restOfPlayers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap justify-center gap-2 mb-6"
                    >
                      {restOfPlayers.map((p, i) => (
                        <div key={p.id} className="bg-card/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200/60 flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">#{i + 4}</span>
                          <span className="text-lg">{PLAYER_AVATARS.find(a => a.id === p.avatar)?.emoji || PLAYER_AVATARS[0].emoji}</span>
                          <span className="text-foreground font-medium">{p.name}</span>
                          <span className="text-muted-foreground">{p.score} pts</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                  
                  {/* Detailed Stats Panel */}
                  {gameOverPhase >= winnerPhase && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: showDetailedStats ? 'auto' : 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <AnimatePresence>
                        {showDetailedStats && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-card/90 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-slate-200/60 shadow-lg"
                          >
                            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                              <Zap className="w-5 h-5 text-amber-500" />
                              Game Stats
                            </h3>
                            
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {[...players].sort((a, b) => b.score - a.score).map((player, idx) => {
                                const stats = gameStats.playerStats.get(player.id);
                                const accuracy = stats && stats.correctAnswers + stats.wrongAnswers > 0 
                                  ? Math.round((stats.correctAnswers / (stats.correctAnswers + stats.wrongAnswers)) * 100) 
                                  : 0;
                                
                                return (
                                  <motion.div
                                    key={player.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/60"
                                  >
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shadow ${
                                        idx === 0 ? 'bg-gradient-to-br from-amber-200 to-amber-400 border-2 border-amber-300' : 
                                        idx === 1 ? 'bg-gradient-to-br from-slate-100 to-slate-300 border-2 border-slate-200' : 
                                        idx === 2 ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-500' : 
                                        'bg-slate-100 border border-slate-200'
                                      }`}>
                                        {PLAYER_AVATARS.find(a => a.id === player.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-foreground text-sm truncate">{player.name}</p>
                                        <p className="text-xs text-muted-foreground">{player.score} points</p>
                                      </div>
                                      {idx < 3 && (
                                        <Badge variant="secondary" className={`text-xs ${
                                          idx === 0 ? 'bg-amber-100 text-amber-700' : 
                                          idx === 1 ? 'bg-slate-100 text-slate-700' : 
                                          'bg-orange-100 text-orange-700'
                                        }`}>
                                          #{idx + 1}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {stats ? (
                                      <div className="space-y-2">
                                        {/* Accuracy bar */}
                                        <div className="space-y-1">
                                          <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Accuracy</span>
                                            <span className="font-medium text-foreground">{accuracy}%</span>
                                          </div>
                                          <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden">
                                            <motion.div 
                                              initial={{ width: 0 }}
                                              animate={{ width: `${accuracy}%` }}
                                              transition={{ duration: 0.8, delay: idx * 0.1 }}
                                              className={`h-full rounded-full ${
                                                accuracy >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                                                accuracy >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                                'bg-gradient-to-r from-rose-400 to-rose-500'
                                              }`}
                                            />
                                          </div>
                                        </div>
                                        
                                        {/* Stats row */}
                                        <div className="flex justify-between text-xs">
                                          <div className="flex items-center gap-1">
                                            <Check className="w-3 h-3 text-emerald-500" />
                                            <span className="text-muted-foreground">{stats.correctAnswers} correct</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <X className="w-3 h-3 text-rose-500" />
                                            <span className="text-muted-foreground">{stats.wrongAnswers} wrong</span>
                                          </div>
                                        </div>
                                        
                                        {/* Best streak */}
                                        {stats.bestStreak >= 2 && (
                                          <div className="flex items-center gap-1 text-xs">
                                            <Flame className="w-3 h-3 text-orange-500" />
                                            <span className="text-muted-foreground">Best streak: {stats.bestStreak} in a row</span>
                                          </div>
                                        )}
                                        
                                        {/* Biggest gain */}
                                        {stats.biggestGain > 0 && (
                                          <div className="flex items-center gap-1 text-xs">
                                            <Zap className="w-3 h-3 text-amber-500" />
                                            <span className="text-muted-foreground">Best answer: +{stats.biggestGain} pts</span>
                                          </div>
                                        )}
                                        
                                        {/* Category breakdown */}
                                        {Object.keys(stats.pointsByCategory).length > 0 && (
                                          <div className="pt-2 mt-2 border-t border-slate-200/60">
                                            <p className="text-xs text-muted-foreground mb-1">Points by category:</p>
                                            <div className="flex flex-wrap gap-1">
                                              {Object.entries(stats.pointsByCategory).map(([catId, pts]) => {
                                                const cat = playCategories.find(c => c.id === Number(catId));
                                                return cat ? (
                                                  <Badge key={catId} variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                                    {cat.name.substring(0, 12)}{cat.name.length > 12 ? '...' : ''}: +{pts}
                                                  </Badge>
                                                ) : null;
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">No stats recorded</p>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                            
                            {/* MVP Moments */}
                            {gameStats.mvpMoments.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-200/60">
                                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-amber-500" />
                                  Highlight Moments
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {gameStats.mvpMoments.map((moment, i) => (
                                    <Badge key={i} variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                                      {moment.description}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <AnimatePresence>
                    {gameOverPhase >= winnerPhase && (
                      <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="flex flex-col gap-4 items-center"
                      >
                        {/* Stats and Share buttons */}
                        <div className="flex flex-row gap-3 flex-wrap justify-center">
                          <Button
                            size="lg"
                            variant="outline"
                            className="font-bold gap-2 border-slate-300"
                            data-testid="button-view-stats"
                            onClick={() => setShowDetailedStats(!showDetailedStats)}
                          >
                            <Zap className="w-5 h-5 text-amber-500" />
                            {showDetailedStats ? 'Hide Stats' : 'View Stats'}
                          </Button>
                          <Button
                            size="lg"
                            variant="secondary"
                            className="font-bold gap-2"
                            data-testid="button-share-results"
                            onClick={() => {
                              setShowShareModal(true);
                              setShareImageUrl(null);
                            }}
                          >
                            <Share2 className="w-5 h-5" />
                            Share Results
                          </Button>
                        </div>
                        
                        <div className="flex flex-row gap-3 flex-wrap justify-center">
                          <Button
                            size="lg"
                            onClick={continueToNextGrid}
                            className="font-bold shadow-lg"
                            data-testid="button-next-grid"
                          >
                            <Grid3X3 className="w-5 h-5 mr-2" />
                            Next Grid
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={closeGameOver}
                            className="font-bold"
                            data-testid="button-end-session"
                          >
                            <Power className="w-5 h-5 mr-2" />
                            End Session
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Header - Polished designer style */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-md border-b border-slate-200/60 relative z-10 overflow-hidden"
          >
            {/* Subtle header gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 via-transparent to-slate-50/50 pointer-events-none" />
            {/* Left: Back + Logo + Grid Name */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => { setPlayMode(false); setShuffleMode(false); setShuffledCategories(null); setSelectedGridId(null); }}
                className="text-muted-foreground"
                data-testid="button-exit-play"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Logo size="md" />
              <div className="hidden sm:block">
                <h1 className="text-sm font-medium text-foreground tracking-tight">
                  {shuffleMode ? "Shuffle Play" : grid?.name}
                </h1>
              </div>
            </div>
            
            {/* Right: Room Code + Invite + Settings */}
            <div className="flex items-center gap-2">
              {roomCode && (
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ type: "spring", delay: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <Badge className="bg-slate-100 text-slate-700 border-0 font-mono font-bold px-3 py-1.5">
                    {roomCode}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowQRCode(true)} 
                    className="border-slate-300 text-slate-600"
                    data-testid="button-show-qr"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-muted-foreground" data-testid="button-game-menu">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => {
                    const newVal = soundManager.toggle();
                    setSoundEnabled(newVal);
                  }}>
                    {soundEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                    {soundEnabled ? 'Sound On' : 'Sound Off'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={resetGame}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Questions
                  </DropdownMenuItem>
                  {shuffleMode && (
                    <DropdownMenuItem 
                      onClick={() => {
                        handleShufflePlay();
                      }}
                      data-testid="button-reshuffle"
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Reshuffle Categories
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setShowEndSessionDialog(true)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    End Session
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* End Session Dialog */}
            <AlertDialog open={showEndSessionDialog} onOpenChange={setShowEndSessionDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End this game session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will disconnect all {players.length} player{players.length !== 1 ? 's' : ''} and close the room. 
                    Players will need to rejoin with a new room code to play again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setShowEndSessionDialog(false); startGameOverReveal(); }} className="bg-red-600">
                    End Session
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </motion.div>
          
          {/* Join Notification */}
          <AnimatePresence>
            {lastJoinedPlayer && (
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-50"
              >
                <div className="bg-card/90 backdrop-blur-sm border border-slate-200/60 text-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <span className="text-lg">{PLAYER_AVATARS.find(a => a.id === lastJoinedPlayer.avatar)?.emoji || PLAYER_AVATARS[0].emoji}</span>
                  <span className="font-medium">{lastJoinedPlayer.name} joined!</span>
                  <UserPlus className="w-4 h-4 text-slate-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Player Reactions Overlay */}
          <div className="absolute bottom-24 right-4 z-40 pointer-events-none">
            <AnimatePresence>
              {reactions.map((reaction) => {
                const ReactionIcon = {
                  clap: Hand,
                  fire: Flame,
                  laugh: Laugh,
                  wow: CircleDot,
                  thumbsup: ThumbsUp,
                }[reaction.type] || Heart;
                
                const reactionColor = {
                  clap: 'text-amber-400',
                  fire: 'text-amber-500',
                  laugh: 'text-yellow-400',
                  wow: 'text-violet-400',
                  thumbsup: 'text-teal-400',
                }[reaction.type] || 'text-violet-400';
                
                return (
                  <motion.div
                    key={reaction.id}
                    initial={{ opacity: 1, y: 0, scale: 0.5, x: Math.random() * 40 - 20 }}
                    animate={{ opacity: 0, y: -120, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="absolute bottom-0 right-0"
                  >
                    <ReactionIcon className={`w-10 h-10 ${reactionColor}`} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          {/* Game Grid */}
          <div className="flex-1 p-3 md:p-5 overflow-hidden relative">
            {/* Grid only shows after first reveal */}
            <AnimatePresence>
              {revealedCategoryCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full flex flex-col gap-3 relative z-10"
            >
              {/* Category Headers - Only revealed categories visible */}
              <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: `repeat(${playCategories.length}, 1fr)` }}>
                {playCategories.map((category, idx) => {
                  const isRevealed = idx < revealedCategoryCount;
                  const colColor = getBoardColorConfig(BOARD_COLORS[idx] || 'rose');
                  return (
                    <motion.div 
                      key={category.id} 
                      initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
                      animate={{ 
                        scale: isRevealed ? 1 : 0.8,
                        opacity: isRevealed ? 1 : 0,
                        rotateY: isRevealed ? 0 : -90,
                        boxShadow: isRevealed ? '0 4px 20px rgba(244,114,182,0.15)' : 'none'
                      }}
                      transition={{ 
                        duration: 0.5, 
                        ease: "easeOut",
                        type: "spring",
                        stiffness: 100
                      }}
                      style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
                      className={`py-3 md:py-4 px-3 rounded-xl text-center border relative overflow-hidden ${
                        isRevealed 
                          ? `${colColor.light} backdrop-blur-sm ${colColor.lightBorder} shadow-sm` 
                          : 'bg-transparent border-transparent'
                      }`}
                    >
                      {/* Subtle gradient overlay for depth */}
                      {isRevealed && (
                        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent rounded-xl pointer-events-none" />
                      )}
                      <span className={`font-bold text-xs md:text-sm uppercase tracking-wider block ${colColor.lightText} relative z-10`}>
                        {category.name}
                      </span>
                      {category.description && (
                        <span className="text-[10px] md:text-xs block mt-0.5 font-normal text-muted-foreground relative z-10">
                          {category.description}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Point Grid - Only revealed categories visible */}
              <div className="flex-1 grid gap-2 md:gap-3" style={{ gridTemplateColumns: `repeat(${playCategories.length}, 1fr)`, gridTemplateRows: 'repeat(5, 1fr)' }}>
                {POINT_TIERS.map((points, rowIdx) => (
                  playCategories.map((category, colIdx) => {
                    const question = category.questions?.find(q => q.points === points);
                    const cellKey = `${category.id}-${points}`;
                    const isCellAnswered = revealedCells.has(cellKey);
                    const isCategoryRevealed = colIdx < revealedCategoryCount;
                    const isClickable = isCategoryRevealed && !isCellAnswered && question && !categoryRevealMode;
                    const cellColor = getBoardColorConfig(BOARD_COLORS[colIdx] || 'rose');
                    
                    return (
                      <motion.button
                        key={cellKey}
                        initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                        animate={{ 
                          opacity: isCategoryRevealed ? 1 : 0,
                          scale: isCategoryRevealed ? 1 : 0.8,
                          rotateY: isCategoryRevealed ? 0 : -90
                        }}
                        transition={{ 
                          duration: 0.4, 
                          delay: isCategoryRevealed ? rowIdx * 0.05 : 0,
                          type: "spring",
                          stiffness: 120
                        }}
                        style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
                        className={`
                          w-full h-full rounded-xl font-black text-2xl md:text-4xl flex items-center justify-center transition-all duration-300 relative overflow-hidden border group
                          ${isCellAnswered 
                            ? `${cellColor.light} opacity-50 backdrop-blur-sm cursor-default ${cellColor.lightBorder}` 
                            : isCategoryRevealed
                              ? `${cellColor.light} backdrop-blur-sm ${cellColor.lightBorder} ${cellColor.lightText} cursor-pointer shadow-lg hover:shadow-xl`
                              : 'bg-transparent cursor-default border-transparent'
                          }
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          isClickable && handleCellClick(category.id, points, question);
                        }}
                        disabled={!isClickable}
                        whileHover={isClickable ? { scale: 1.04, y: -4 } : {}}
                        whileTap={isClickable ? { scale: 0.96 } : {}}
                        data-testid={`cell-${category.id}-${points}`}
                      >
                        {/* Gradient overlay for depth */}
                        {isCategoryRevealed && !isCellAnswered && (
                          <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent rounded-xl pointer-events-none" />
                        )}
                        {/* Shimmer effect on hover */}
                        {isClickable && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                        )}
                        {isCellAnswered ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="flex items-center justify-center relative z-10"
                          >
                            <Check className={`w-8 h-8 md:w-12 md:h-12 ${cellColor.icon} opacity-60`} strokeWidth={3} />
                          </motion.div>
                        ) : (
                          <span className="relative z-10 drop-shadow-sm">{points}</span>
                        )}
                      </motion.button>
                    );
                  })
                ))}
              </div>
            </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Category Reveal Hint */}
          <AnimatePresence>
            {categoryRevealMode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30"
              >
                <motion.div 
                  className="bg-card/90 backdrop-blur-sm px-6 py-3 rounded-full text-foreground flex items-center gap-3 shadow-lg border border-slate-200/60"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-sm md:text-base font-medium">
                    Click to reveal ({revealedCategoryCount}/{playCategories.length})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-slate-300 text-slate-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      skipReveal();
                    }}
                  >
                    Skip
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Progress Bar - Shows questions answered */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-[60px] left-4 right-4 z-20"
          >
            <div className="h-1 bg-slate-200/60 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div 
                className="h-full bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${playCategories.length > 0 ? (revealedCells.size / (playCategories.length * 5)) * 100 : 0}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
          
          {/* Bottom Scoreboard Bar - Polished designer style */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="bg-card/90 backdrop-blur-md border-t border-slate-200/60 px-4 py-2.5 relative z-10 overflow-hidden"
          >
            {/* Subtle footer gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 via-transparent to-slate-50/50 pointer-events-none" />
            {players.length > 0 ? (
              <LayoutGroup>
                <div className="flex items-center justify-center gap-3 md:gap-5 flex-wrap">
                  {[...players].sort((a, b) => b.score - a.score).map((player, idx) => {
                    const avatarEmoji = PLAYER_AVATARS.find(a => a.id === player.avatar)?.emoji || PLAYER_AVATARS[0].emoji;
                    const isSelected = selectedPlayerId === player.id;
                    const scoreAnim = scoreAnimations.get(player.id);
                    return (
                      <motion.div
                        key={player.id}
                        layoutId={`player-score-${player.id}`}
                        layout
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ 
                          layout: { type: "spring", stiffness: 400, damping: 30 },
                          opacity: { delay: 0.4 + idx * 0.05 }
                        }}
                        onClick={() => setSelectedPlayerId(isSelected ? null : player.id)}
                        className={`relative flex items-center gap-2 rounded-full py-1 pl-1 pr-3 cursor-pointer transition-all ${
                          isSelected ? 'bg-slate-100 ring-2 ring-slate-300/50' : 'hover:bg-slate-50/50'
                        } ${!player.connected ? 'opacity-50' : ''}`}
                      >
                        {/* Score change indicator */}
                        <AnimatePresence>
                          {scoreAnim && (
                            <motion.div
                              initial={{ opacity: 1, y: 0, scale: 1 }}
                              animate={{ opacity: 0, y: -30, scale: 1.3 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={`absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-sm whitespace-nowrap ${
                                scoreAnim.delta > 0 ? 'text-emerald-600' : 'text-red-500'
                              }`}
                            >
                              {scoreAnim.delta > 0 ? '+' : ''}{scoreAnim.delta}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <div className="relative">
                          <motion.div 
                            animate={scoreAnim ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.3 }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-md border-2 ${
                              idx === 0 ? 'bg-gradient-to-br from-amber-200 to-amber-400 border-amber-300' : 
                              idx === 1 ? 'bg-gradient-to-br from-slate-100 to-slate-300 border-slate-200' : 
                              idx === 2 ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-500' : 
                              'bg-gradient-to-br from-slate-100 via-slate-150 to-slate-200 border-slate-200'
                            }`}
                          >
                            {avatarEmoji}
                          </motion.div>
                          {/* Rank badge */}
                          {idx < 3 && (
                            <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                              idx === 0 ? 'bg-amber-400 text-amber-900' : 
                              idx === 1 ? 'bg-slate-300 text-slate-700' : 
                              'bg-amber-500 text-amber-900'
                            }`}>
                              {idx + 1}
                            </div>
                          )}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${player.connected ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="text-foreground font-medium text-xs">{player.name}</span>
                          <motion.span 
                            key={player.score}
                            initial={{ scale: 1.3, color: scoreAnim?.delta && scoreAnim.delta > 0 ? '#059669' : scoreAnim?.delta && scoreAnim.delta < 0 ? '#dc2626' : '#475569' }}
                            animate={{ scale: 1, color: '#475569' }}
                            transition={{ duration: 0.3 }}
                            className="text-slate-600 font-bold text-sm"
                          >
                            {player.score}
                          </motion.span>
                        </div>
                        
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div 
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: 'auto', opacity: 1 }}
                              exit={{ width: 0, opacity: 0 }}
                              className="flex gap-1 overflow-hidden ml-1"
                            >
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => { e.stopPropagation(); updatePlayerScore(player.id, -10); }}
                                data-testid={`button-sub-score-${player.id}`}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-teal-500"
                                onClick={(e) => { e.stopPropagation(); updatePlayerScore(player.id, 10); }}
                                data-testid={`button-add-score-${player.id}`}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </LayoutGroup>
            ) : (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-1">
                <Users className="w-4 h-4" />
                <span>Tap room code to invite players</span>
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
              
              <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(joinUrl);
                    toast({ title: "Link copied!", description: "Share this link with players" });
                  }}
                >
                  <Link2 className="w-4 h-4" />
                  Copy Join Link
                </Button>
              
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
          
          {/* Share Results Modal */}
          <Dialog open={showShareModal} onOpenChange={(open) => {
            setShowShareModal(open);
            if (!open && shareImageUrl) {
              URL.revokeObjectURL(shareImageUrl);
              setShareImageUrl(null);
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center text-xl">Share Results</DialogTitle>
                <DialogDescription className="text-center">
                  Share your game results on social media
                </DialogDescription>
              </DialogHeader>
              
              {/* Shareable Card Preview */}
              <div className="flex justify-center py-2">
                <div 
                  ref={shareCardRef}
                  className="w-[320px] rounded-xl overflow-hidden shadow-xl"
                  style={{ 
                    background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 30%, #db2777 70%, #be185d 100%)',
                    aspectRatio: '9/16'
                  }}
                >
                  {/* Overlay for better text visibility */}
                  <div 
                    className="w-full h-full flex flex-col items-center justify-between p-5"
                    style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.5) 100%)' }}
                  >
                    {/* Header with branding */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Grid3X3 className="w-5 h-5 text-white" />
                        <span className="text-white font-bold text-base">Blitzgrid</span>
                      </div>
                      <p className="text-white/80 text-sm font-medium">{grid?.name || 'Game Results'}</p>
                    </div>
                    
                    {/* Scores */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 w-full py-4">
                      <h3 className="text-white font-bold text-xl mb-3">Final Scores</h3>
                      {[...players].sort((a, b) => b.score - a.score).slice(0, 5).map((player, idx) => {
                        return (
                          <div 
                            key={player.id}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg w-full max-w-[260px] ${
                              idx === 0 ? 'bg-amber-400/30 border border-amber-400/50' :
                              idx === 1 ? 'bg-gray-300/30 border border-gray-300/50' :
                              idx === 2 ? 'bg-amber-600/30 border border-amber-600/50' :
                              'bg-white/10'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-gray-300' : idx === 2 ? 'bg-amber-700' : 'bg-white/20'
                            }`}>
                              {idx < 3 ? (
                                <Trophy className={`w-4 h-4 ${idx === 0 ? 'text-amber-800' : idx === 1 ? 'text-gray-600' : 'text-amber-200'}`} />
                              ) : (
                                <span className="text-white text-sm font-bold">{idx + 1}</span>
                              )}
                            </div>
                            <span className="text-white font-medium text-base flex-1 truncate">{player.name}</span>
                            <span className="text-white font-bold text-base">{player.score} pts</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Footer with timestamp and branding */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-white/60 text-xs mb-2">
                        <Clock className="w-3 h-3" />
                        <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <p className="text-white font-bold text-sm">Holy GuacAmoli!</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                {/* Generate Image Button (if not generated yet) */}
                {!shareImageUrl && (
                  <Button
                    className="w-full gap-2"
                    disabled={isGeneratingImage}
                    onClick={async () => {
                      if (!shareCardRef.current) return;
                      setIsGeneratingImage(true);
                      try {
                        const canvas = await html2canvas(shareCardRef.current, {
                          backgroundColor: null,
                          scale: 2,
                        });
                        const dataUrl = canvas.toDataURL('image/png');
                        setShareImageUrl(dataUrl);
                        setIsGeneratingImage(false);
                      } catch (err) {
                        setIsGeneratingImage(false);
                        toast({ title: "Error", description: "Couldn't generate image", variant: "destructive" });
                      }
                    }}
                    data-testid="button-generate-image"
                  >
                    {isGeneratingImage ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                    {isGeneratingImage ? 'Generating...' : 'Generate Image'}
                  </Button>
                )}
                
                {/* Share/Copy/Download Buttons (after image is generated) */}
                {shareImageUrl && (
                  <>
                    <Button
                      className="w-full gap-2"
                      onClick={async () => {
                        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
                        const topPlayers = sortedPlayers.slice(0, 3);
                        const scoreText = topPlayers.map((p, i) => 
                          `#${i + 1} ${p.name}: ${p.score} pts`
                        ).join(' | ');
                        const shareText = `Blitzgrid Results - ${scoreText} - Play at Holy GuacAmoli!`;
                        
                        try {
                          const response = await fetch(shareImageUrl);
                          const blob = await response.blob();
                          
                          if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'blitzgrid-results.png', { type: 'image/png' })] })) {
                            const file = new File([blob], 'blitzgrid-results.png', { type: 'image/png' });
                            await navigator.share({
                              title: 'Blitzgrid Results',
                              text: shareText,
                              files: [file],
                            });
                          } else if (navigator.share) {
                            await navigator.share({ title: 'Blitzgrid Results', text: shareText });
                          } else {
                            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                            window.open(twitterUrl, '_blank');
                          }
                        } catch (err) {
                          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                          window.open(twitterUrl, '_blank');
                        }
                      }}
                      data-testid="button-share-image"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={async () => {
                          try {
                            const response = await fetch(shareImageUrl);
                            const blob = await response.blob();
                            
                            if (navigator.clipboard && window.ClipboardItem) {
                              await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': blob })
                              ]);
                              toast({ title: "Copied!", description: "Image copied to clipboard" });
                            } else {
                              const link = document.createElement('a');
                              link.download = `blitzgrid-results-${Date.now()}.png`;
                              link.href = shareImageUrl;
                              link.click();
                              toast({ title: "Downloaded!", description: "Copy not supported - image saved instead" });
                            }
                          } catch {
                            toast({ title: "Error", description: "Couldn't copy image", variant: "destructive" });
                          }
                        }}
                        data-testid="button-copy-image"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.download = `blitzgrid-${grid?.name?.replace(/\s+/g, '-').toLowerCase() || 'results'}-${Date.now()}.png`;
                          link.href = shareImageUrl;
                          link.click();
                          toast({ title: "Downloaded!", description: "Image saved to your device" });
                        }}
                        data-testid="button-download-image"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Question Modal */}
          <Dialog open={!!activeQuestion} onOpenChange={(open) => !open && handleCloseQuestion()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-200/60 shadow-2xl">
              {(() => {
                // Use the same colors as the grid - from BOARD_COLORS order: rose, violet, amber, teal, sky
                const categoryIndex = playCategories.findIndex(c => c.id === activeQuestion?.categoryId);
                const colorName = BOARD_COLORS[categoryIndex] || 'rose';
                const colorConfig = getBoardColorConfig(colorName);
                const category = playCategories.find(c => c.id === activeQuestion?.categoryId);
                const questionText = activeQuestion?.question || '';
                const questionLength = questionText.length;
                // Auto-size text based on question length
                const textSizeClass = questionLength < 50 ? 'text-2xl md:text-3xl' : 
                                      questionLength < 100 ? 'text-xl md:text-2xl' : 
                                      questionLength < 200 ? 'text-lg md:text-xl' : 'text-base md:text-lg';
                
                return (
                  <>
                    <DialogHeader className="flex flex-row items-center justify-between gap-2">
                      {/* Points badge */}
                      <motion.div 
                        className="relative overflow-hidden px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 shadow-md"
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                      >
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <DialogTitle className="text-amber-900 text-lg font-black relative z-10">
                          {activeQuestion?.points} pts
                        </DialogTitle>
                      </motion.div>
                      
                      {/* Timer button */}
                      <Button
                        variant={timerActive ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (timerActive) {
                            setTimerActive(false);
                            setTimeLeft(10);
                          } else {
                            setTimeLeft(10);
                            setTimerActive(true);
                          }
                        }}
                        className={`gap-1 ${timerActive ? 'animate-pulse' : ''}`}
                        data-testid="button-timer"
                      >
                        <Timer className="w-4 h-4" />
                        {timerActive ? (
                          <span className="font-mono font-bold text-lg min-w-[2ch]">{timeLeft}</span>
                        ) : (
                          <span>10s</span>
                        )}
                      </Button>
                    </DialogHeader>
                    
                    {/* Question box with category info inside */}
                    <div className={`py-4 px-4 my-2 ${colorConfig.light} rounded-lg border ${colorConfig.lightBorder}`}>
                      {/* Category name and description at top of question box */}
                      {category && (
                        <div className="text-center mb-3">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 ${colorConfig.lightBorder} border text-xs mb-1`}>
                            <div className={`w-2 h-2 rounded-full ${colorConfig.bg}`} />
                            <span className={`${colorConfig.accent} font-semibold uppercase tracking-wide`}>
                              {category.name}
                            </span>
                          </div>
                          {category.description && (
                            <p className="text-muted-foreground text-sm italic">
                              {category.description}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Question text */}
                      <div className={`${textSizeClass} text-center font-medium text-foreground leading-relaxed`}>
                        <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>
                          {questionText}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </>
                );
              })()}
              
              {/* Media Display */}
              {(activeQuestion?.imageUrl || activeQuestion?.audioUrl || activeQuestion?.videoUrl) && (
                <div className="flex flex-col items-center gap-3 py-2">
                  {activeQuestion?.imageUrl && (
                    <img 
                      src={activeQuestion.imageUrl} 
                      alt="Question media"
                      className="max-w-full max-h-48 md:max-h-64 rounded-lg object-contain shadow-lg"
                    />
                  )}
                  {activeQuestion?.videoUrl && (
                    <video 
                      src={activeQuestion.videoUrl}
                      controls
                      className="max-w-full max-h-48 md:max-h-64 rounded-lg shadow-lg"
                    />
                  )}
                  {activeQuestion?.audioUrl && (
                    <audio 
                      src={activeQuestion.audioUrl}
                      controls
                      className="w-full max-w-sm"
                    />
                  )}
                </div>
              )}
              
              {/* Buzzer Status + Skip Option - muted waiting state */}
              {players.length > 0 && !showAnswer && buzzQueue.length === 0 && (
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50/80 border border-dashed border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-pulse" />
                    <span className="text-slate-500 text-sm">Waiting for buzzes...</span>
                    <span className="text-slate-400 text-xs">({players.length} ready)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      lockBuzzer();
                      handleRevealAnswer();
                    }}
                    className="text-slate-400 hover:text-slate-600 h-7 text-xs"
                    data-testid="button-skip-reveal"
                  >
                    <Eye className="w-3 h-3 mr-1" /> Skip
                  </Button>
                </div>
              )}
              
              {/* Buzz Queue - players who buzzed - prominent amber glow */}
              {buzzQueue.length > 0 && !showAnswer && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-3 shadow-lg shadow-amber-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                      <Zap className="w-4 h-4 text-amber-500" />
                    </motion.div>
                    <span className="text-sm text-amber-700 font-bold">Someone Buzzed!</span>
                  </div>
                  <div className="space-y-1.5">
                    {buzzQueue.map((buzz, index) => {
                      const player = players.find(p => p.id === buzz.playerId);
                      return (
                        <div 
                          key={buzz.playerId}
                          className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${
                            index === 0 ? 'bg-white border-2 border-amber-400 shadow-sm' : 'bg-amber-50/50 border border-amber-200/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${index === 0 ? 'text-amber-600' : 'text-amber-400'}`}>
                              #{index + 1}
                            </span>
                            <span className={`font-medium ${index === 0 ? 'text-foreground' : 'text-slate-500'}`}>{buzz.name}</span>
                            <span className="text-xs text-muted-foreground">({player?.score || 0})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {index === 0 ? (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-red-500 hover:bg-red-600 text-white h-7 text-xs px-2"
                                  disabled={isJudging}
                                  onClick={() => {
                                    setIsJudging(true);
                                    const pts = activeQuestion?.points || 0;
                                    updatePlayerScore(buzz.playerId, -pts, true, activeQuestion?.categoryId);
                                    sendFeedback(buzz.playerId, false, -pts);
                                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                                      wsRef.current.send(JSON.stringify({ type: 'host:passPlayer', playerId: buzz.playerId }));
                                    }
                                    const remainingQueue = buzzQueue.slice(1);
                                    if (remainingQueue.length > 0) {
                                      setBuzzQueue(remainingQueue.map((b, i) => ({ ...b, position: i + 1 })));
                                      setTimeout(() => setIsJudging(false), 300);
                                    } else {
                                      lockBuzzer();
                                      handleRevealAnswer();
                                    }
                                  }}
                                  data-testid={`button-wrong-${buzz.playerId}`}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-teal-500 hover:bg-teal-600 text-white h-7 text-xs px-2"
                                  disabled={isJudging}
                                  onClick={() => {
                                    setIsJudging(true);
                                    lockBuzzer();
                                    const pts = activeQuestion?.points || 0;
                                    updatePlayerScore(buzz.playerId, pts, true, activeQuestion?.categoryId);
                                    sendFeedback(buzz.playerId, true, pts);
                                    handleRevealAnswer();
                                  }}
                                  data-testid={`button-correct-${buzz.playerId}`}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-amber-400">next</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              
              {/* No players yet prompt - compact */}
              {players.length === 0 && !showAnswer && (
                <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
                  <Users className="w-4 h-4 opacity-50" />
                  <p className="text-sm">No players yet · Click "Join" for QR code</p>
                </div>
              )}
              
              {/* Answer Revealed - dramatic animation */}
              <AnimatePresence>
                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 border-2 border-teal-400 rounded-xl p-4 text-center shadow-lg shadow-teal-100"
                  >
                    {/* Shine effect */}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-12"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    />
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-xs text-teal-600 font-semibold uppercase tracking-wider mb-1"
                    >
                      Answer
                    </motion.p>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-xl font-bold text-teal-800 prose prose-lg max-w-none [&>p]:m-0 relative z-10"
                    >
                      <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>
                        {activeQuestion?.correctAnswer || ''}
                      </ReactMarkdown>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* All Players for Manual Scoring (after answer revealed) */}
              {showAnswer && players.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mt-4 border border-slate-200 dark:border-transparent">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Manage Points</span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {players.map(player => (
                      <div 
                        key={player.id}
                        className="flex items-center justify-between bg-white dark:bg-slate-600/50 rounded-lg px-3 py-2 border border-slate-100 dark:border-transparent"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{player.name}</span>
                          <span className="text-sm text-muted-foreground">({player.score} pts)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500"
                            onClick={() => updatePlayerScore(player.id, -(activeQuestion?.points || 0), true, activeQuestion?.categoryId)}
                            data-testid={`button-deduct-${player.id}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-teal-500"
                            onClick={() => updatePlayerScore(player.id, activeQuestion?.points || 0, true, activeQuestion?.categoryId)}
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
                {lastScoreChange && (
                  <Button 
                    onClick={undoLastScore}
                    variant="outline"
                    className="border-amber-500 text-amber-400"
                    data-testid="button-undo-score"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Undo {lastScoreChange.points > 0 ? '+' : ''}{lastScoreChange.points}
                  </Button>
                )}
                {!showAnswer ? (
                  <Button 
                    onClick={() => {
                      lockBuzzer();
                      handleRevealAnswer();
                    }}
                    className="bg-amber-500 text-slate-900"
                    data-testid="button-reveal-answer"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Show Answer
                  </Button>
                ) : (
                  <Button 
                    onClick={handleCloseQuestion}
                    variant="outline"
                    className="border-slate-300 text-slate-600"
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
      <div className="min-h-screen flex flex-col bg-background" data-testid="page-blitzgrid-grid">
        <AppHeader 
          title="Blitzgrid" 
          subtitle={grid?.name}
          onBack={() => setSelectedGridId(null)}
          showAdminButton 
          adminHref="/admin/games" 
        />
        <div className="flex-1 flex flex-col container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h1 className="text-xl font-bold">{grid?.name || 'Grid'}</h1>
              <p className="text-muted-foreground text-xs">
                {gridCategories.length}/5 categories · {grid?.questionCount || 0}/25 questions
              </p>
            </div>
            <div className="flex items-center gap-2">
              {grid?.isActive ? (
                <Badge variant="secondary" className="text-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
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
                    setRevealedCategoryCount(0);
                    setCategoryRevealMode(true);
                    setActiveQuestion(null);
                    // Reset game stats for new game
                    setGameStats({
                      playerStats: new Map(),
                      totalQuestions: 0,
                      startTime: Date.now(),
                      mvpMoments: []
                    });
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
            <Card className="mb-4 shrink-0">
              <CardContent className="py-3">
                {showNewCategoryForm ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Category name..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowNewCategoryForm(false);
                            setNewCategoryName("");
                            setNewCategoryDescription("");
                          }
                        }}
                        data-testid="input-category-name"
                      />
                      <Button
                        onClick={() => selectedGridId && createCategoryMutation.mutate({ gridId: selectedGridId, name: newCategoryName.trim(), description: newCategoryDescription.trim() })}
                        disabled={!newCategoryName.trim() || createCategoryMutation.isPending || !selectedGridId}
                        data-testid="button-create-category"
                      >
                        {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                      </Button>
                      <Button variant="ghost" onClick={() => { setShowNewCategoryForm(false); setNewCategoryName(""); setNewCategoryDescription(""); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Description (optional)..."
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCategoryName.trim() && selectedGridId) {
                          createCategoryMutation.mutate({ gridId: selectedGridId, name: newCategoryName.trim(), description: newCategoryDescription.trim() });
                        }
                        if (e.key === 'Escape') {
                          setShowNewCategoryForm(false);
                          setNewCategoryName("");
                          setNewCategoryDescription("");
                        }
                      }}
                      data-testid="input-category-description"
                    />
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
          <div className="flex-1">
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
                              <Badge variant="secondary" className="text-green-600 text-xs">Complete</Badge>
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
                                if (selectedGridId) removeCategoryMutation.mutate({ gridId: selectedGridId, categoryId: category.id });
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
      </div>
    );
  }

  // Grid picker mode - choosing next grid while room stays open
  if (gridPickerMode) {
    const startNextGrid = (gridId: number, gridName: string) => {
      setSelectedGridId(gridId);
      setPlayMode(true);
      setGridPickerMode(false);
      setRevealedCells(new Set());
      setRevealedCategoryCount(0);
      setCategoryRevealMode(true);
      // Reset game stats for next grid
      setGameStats({
        playerStats: new Map(),
        totalQuestions: 0,
        startTime: Date.now(),
        mvpMoments: []
      });
      setActiveQuestion(null);
      setShowAnswer(false);
      
      // Notify players that new grid is starting
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'host:startNextGrid', boardId: gridId, gridName }));
      }
    };
    
    const endSessionFromPicker = () => {
      setGridPickerMode(false);
      endSession();
    };
    
    return (
      <div className="min-h-screen bg-background" data-testid="page-blitzgrid-picker">
        <div className="container mx-auto px-4 py-6">
          {/* Session Info Banner */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {roomCode && (
                  <div className="flex items-center gap-2">
                    <Badge className="font-mono font-bold px-3 py-1" data-testid="badge-picker-room-code">{roomCode}</Badge>
                    <span className="text-primary text-sm font-medium" data-testid="text-picker-room-active">Room Active</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary" data-testid="text-picker-player-count">{players.length}</span>
                  <span className="text-muted-foreground text-sm">player{players.length !== 1 ? 's' : ''} waiting</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={endSessionFromPicker} data-testid="button-end-session-picker">
                <Power className="w-4 h-4 mr-2" /> End Session
              </Button>
            </div>
          </motion.div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Grid3X3 className="w-6 h-6 text-violet-500" />
                Choose Next Grid
              </h1>
              <p className="text-muted-foreground text-sm">Select a grid to continue playing</p>
            </div>
          </div>

          {loadingGrids ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : grids.filter(g => g.isActive).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
                <h3 className="font-medium mb-2">No active grids available</h3>
                <p className="text-muted-foreground text-sm mb-4">All grids need to be completed to be playable</p>
                <Button variant="outline" onClick={endSessionFromPicker} data-testid="button-end-no-grids">
                  End Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grids.filter(g => g.isActive).map((grid, idx) => {
                const effectiveColor = grid.colorCode?.startsWith('#') ? null : grid.colorCode;
                const colorConfig = getBoardColorConfig(effectiveColor || BOARD_COLORS[idx % BOARD_COLORS.length]);
                return (
                  <Card
                    key={grid.id}
                    className={`hover-elevate cursor-pointer transition-all border bg-gradient-to-br ${colorConfig.card}`}
                    onClick={() => startNextGrid(grid.id, grid.name)}
                    data-testid={`card-picker-grid-${grid.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 min-w-0 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorConfig.bg}`}>
                          <Grid3X3 className="w-4 h-4 text-white" />
                        </div>
                        <h3 className={`font-semibold truncate ${colorConfig.cardTitle}`} data-testid={`text-picker-grid-name-${grid.id}`}>{grid.name}</h3>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm ${colorConfig.cardSub}`} data-testid={`text-picker-grid-stats-${grid.id}`}>
                          {grid.categoryCount} categories · {grid.questionCount} questions
                        </p>
                        <Badge variant="secondary" className="text-xs shrink-0" data-testid={`badge-picker-grid-play-${grid.id}`}>
                          <Play className="w-3 h-3 mr-1" /> Play
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Filter to only show active grids (ready to play)
  const activeGrids = grids.filter(g => g.isActive);
  
  // Separate starter packs from user-created grids
  const starterPacks = activeGrids.filter(g => g.isStarterPack);
  const myGrids = activeGrids.filter(g => !g.isStarterPack);

  // Grid card component with premium glassmorphism design
  const GridCard = ({ grid, index, colorOffset = 0 }: { grid: typeof activeGrids[0], index: number, colorOffset?: number }) => {
    const effectiveColor = grid.colorCode?.startsWith('#') ? null : grid.colorCode;
    const colorConfig = getBoardColorConfig(effectiveColor || BOARD_COLORS[(index + colorOffset) % BOARD_COLORS.length]);
    
    // Get border and accent colors to match Home page style
    const borderColors: Record<string, string> = {
      rose: 'border-rose-200/60',
      amber: 'border-amber-200/60',
      emerald: 'border-emerald-200/60',
      sky: 'border-sky-200/60',
      violet: 'border-violet-200/60',
      pink: 'border-pink-200/60',
      orange: 'border-orange-200/60',
      teal: 'border-teal-200/60',
      indigo: 'border-indigo-200/60',
      cyan: 'border-cyan-200/60',
    };
    const colorName = (effectiveColor || BOARD_COLORS[(index + colorOffset) % BOARD_COLORS.length]) as string;
    const borderClass = borderColors[colorName] || 'border-pink-200/60';
    
    return (
      <motion.button
        key={grid.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.08 }}
        whileHover={{ y: -6, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setSelectedGridId(grid.id);
          setPlayMode(true);
          setRevealedCells(new Set());
          setRevealedCategoryCount(0);
          setCategoryRevealMode(true);
          setActiveQuestion(null);
          // Reset game stats for new game
          setGameStats({
            playerStats: new Map(),
            totalQuestions: 0,
            startTime: Date.now(),
            mvpMoments: []
          });
          setShowAnswer(false);
        }}
        className={`group text-left p-4 rounded-3xl bg-card/80 backdrop-blur-sm border ${borderClass} transition-all duration-300 relative overflow-hidden`}
        style={{
          boxShadow: `0 4px 20px -4px ${colorConfig.icon.includes('rose') ? '#fda4af' : colorConfig.icon.includes('amber') ? '#fcd34d' : colorConfig.icon.includes('emerald') ? '#6ee7b7' : colorConfig.icon.includes('sky') ? '#7dd3fc' : colorConfig.icon.includes('violet') ? '#c4b5fd' : '#f9a8d4'}20`
        }}
        data-testid={`card-grid-${grid.id}`}
      >
        {/* Subtle gradient overlay */}
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${colorConfig.light} opacity-30`} />
        
        <div className="relative flex items-center gap-3 flex-wrap">
          {/* Gradient icon */}
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorConfig.header} flex items-center justify-center shadow-lg`}>
            <Grid3X3 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{grid.name}</h3>
            <p className="text-xs text-muted-foreground">Ready to play</p>
          </div>
          <ChevronRight className={`w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-all`} />
        </div>
      </motion.button>
    );
  };

  // Main grid list view
  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-blitzgrid">
      <AppHeader title="Blitzgrid" backHref="/" showAdminButton adminHref="/admin/games" />
      
      <div className="flex-1 container mx-auto px-4 py-8">
        {loadingGrids ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : activeGrids.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-5">
              <Grid3X3 className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">No grids ready yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              The host needs to create some grids first. Check back soon!
            </p>
          </motion.div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero section */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-4"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Pick Your <span className="bg-gradient-to-r from-rose-300 via-pink-300 to-fuchsia-300 bg-clip-text text-transparent">Grid</span>
              </h1>
            </motion.div>

            {/* Shuffle Play Card - Matching Home page style */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
              className="group cursor-pointer p-5 rounded-3xl bg-card/80 backdrop-blur-sm border border-pink-200/60 transition-all duration-300 relative overflow-hidden"
              style={{ boxShadow: '0 4px 20px -4px #f9a8d420' }}
              onClick={handleShufflePlay}
              data-testid="card-shuffle-play"
            >
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 opacity-40" />
              
              <div className="relative flex items-center gap-4 flex-wrap">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-300 via-pink-300 to-fuchsia-300 flex items-center justify-center shrink-0 shadow-lg shadow-pink-300/30">
                  {isShuffling ? (
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  ) : (
                    <Shuffle className="w-7 h-7 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-foreground flex flex-wrap items-center gap-2">
                    Shuffle Play
                    <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700 border-0">Mix it up</Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {playedShuffleCategoryIds.length > 0 
                      ? `${playedShuffleCategoryIds.length} categories played this session`
                      : "Play with 5 random categories from all your grids"
                    }
                  </p>
                </div>
                {playedShuffleCategoryIds.length > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-pink-300 text-pink-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayedShuffleCategoryIds([]);
                      toast({ title: "Shuffle session reset", description: "All categories available again!" });
                    }}
                    data-testid="button-reset-shuffle"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-all" />
                )}
              </div>
            </motion.div>

            {/* My Grids Section */}
            {myGrids.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* Section header with gradient divider */}
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">My Grids</h2>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-rose-200 via-pink-200 to-transparent" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {myGrids.map((grid, index) => (
                    <GridCard key={grid.id} grid={grid} index={index} />
                  ))}
                </div>
              </motion.section>
            )}
            
            {/* Starter Packs Section */}
            {starterPacks.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {/* Section header with gradient divider */}
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap flex flex-wrap items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Starter Packs
                  </h2>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-amber-200 via-orange-200 to-transparent" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {starterPacks.map((grid, index) => (
                    <GridCard key={grid.id} grid={grid} index={index} colorOffset={myGrids.length} />
                  ))}
                </div>
              </motion.section>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-6 mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-center">
          <p className="text-sm text-muted-foreground flex flex-wrap items-center justify-center gap-1">
            made with <Heart className="w-4 h-4 text-pink-500 fill-pink-500 inline" /> by <span className="font-semibold bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">Amoli</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
