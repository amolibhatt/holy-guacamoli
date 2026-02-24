import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { GameRulesSheet } from "@/components/GameRules";
import { Logo } from "@/components/Logo";
import { useScore } from "@/components/ScoreContext";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import confetti from "canvas-confetti";
import { playWhoosh, playRevealFlip, playPointsAwarded, playCelebration, playWrongBuzz, playDrumroll, playFanfare, playApplause, playReaction, playSwoosh, playTimesUp, soundManager } from "@/lib/sounds";
import { 
  Plus, Trash2, Pencil, Check, X, Grid3X3, 
  ChevronRight, ArrowLeft, Play, Loader2,
  AlertCircle, CheckCircle2, Eye, RotateCcw, QrCode, Users, User, Minus, Lock, Trophy, ChevronLeft, UserPlus, Power, Crown, Medal,
  Volume2, VolumeX, MoreVertical, Copy, Link2, Share2, Download, Image, Loader2 as LoaderIcon, Clock,
  Hand, Flame, Laugh, CircleDot, ThumbsUp, Sparkles, Heart, Timer, Zap, Shuffle, Star, HelpCircle, MessageCircle
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
import { getBoardColorConfig, getBoardColorName, BOARD_COLORS, neonColorConfig, type BoardColor } from "@/lib/boardColors";

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

function AnimatedScore({ target, duration = 1.5, className, style, "data-testid": testId }: { 
  target: number; duration?: number; className?: string; style?: React.CSSProperties; "data-testid"?: string 
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <span className={className} style={style} data-testid={testId}>{display} pts</span>;
}

export default function Blitzgrid() {
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Access check
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  
  // View state
  const [showRules, setShowRules] = useState(false);
  const [selectedGridId, setSelectedGridId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [playMode, setPlayMode] = useState(false);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [shuffledCategories, setShuffledCategories] = useState<CategoryWithQuestions[] | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  
  // Persist played shuffle category IDs in sessionStorage
  const SHUFFLE_STORAGE_KEY = 'blitzgrid_played_shuffle_categories';
  const [playedShuffleCategoryIds, setPlayedShuffleCategoryIds] = useState<number[]>(() => {
    try {
      const stored = sessionStorage.getItem(SHUFFLE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  // Sync to sessionStorage when played IDs change
  useEffect(() => {
    try {
      sessionStorage.setItem(SHUFFLE_STORAGE_KEY, JSON.stringify(playedShuffleCategoryIds));
    } catch {
      // Ignore storage errors
    }
  }, [playedShuffleCategoryIds]);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scoredPlayers, setScoredPlayers] = useState<Record<string, 'correct' | 'wrong'>>({});
  const [showQRCode, setShowQRCode] = useState(false);
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const [showShuffleGridPicker, setShowShuffleGridPicker] = useState(false);
  const [selectedShuffleGridIds, setSelectedShuffleGridIds] = useState<Set<number>>(new Set());
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [managingPlayerId, setManagingPlayerId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  
  // Category reveal state - reveals categories one by one before gameplay
  const [revealedCategoryCount, setRevealedCategoryCount] = useState(0);
  const [categoryRevealMode, setCategoryRevealMode] = useState(true);
  
  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Play escalating timer tick - frequency and urgency increase as time runs out
  const playTimerSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;
      
      const playBeep = (startTime: number, frequency: number, duration: number, volume: number = 0.3) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const t = timeLeft;
      if (t === 3) {
        playBeep(now, 523, 0.12, 0.25);
      } else if (t === 2) {
        playBeep(now, 659, 0.1, 0.35);
        playBeep(now + 0.15, 659, 0.1, 0.3);
      } else if (t === 1) {
        playBeep(now, 784, 0.08, 0.4);
        playBeep(now + 0.12, 784, 0.08, 0.35);
        playBeep(now + 0.24, 880, 0.08, 0.4);
      }
      
      setTimeout(() => { audioContext.close().catch(() => {}); }, 800);
    } catch (e) {
      // Ignore audio errors
    }
  }, [timeLeft]);
  
  // Timer countdown effect
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      if (timeLeft <= 3) {
        playTimerSound();
      }
      timerIntervalRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timerActive && timeLeft === 0) {
      playTimesUp();
      setTimerActive(false);
      setTimerExpired(true);
      setTimeout(() => setTimerExpired(false), 4000);
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
    setTimerExpired(false);
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
  const scoreAnimationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [reactions, setReactions] = useState<Array<{ id: string; type: string; playerId?: string; timestamp: number }>>([]);
  const reactionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const gameOverTimers = useRef<NodeJS.Timeout[]>([]);
  const confettiTimers = useRef<NodeJS.Timeout[]>([]);
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

  // Memoize eligible grids for shuffle (grids where all categories have 5 questions each)
  const eligibleShuffleGrids = grids.filter(g => {
    const catCount = g.categoryCount || 0;
    const qCount = g.questionCount || 0;
    // All categories must be complete (5 questions each)
    return catCount > 0 && qCount === catCount * 5;
  });
  const eligibleShuffleGridIds = new Set(eligibleShuffleGrids.map(g => g.id));

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
      await apiRequest('DELETE', `/api/blitzgrid/grids/${id}`);
      return id;
    },
    onSuccess: (deletedId: number) => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setDeleteGridId(null);
      if (selectedGridId === deletedId) {
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
        delete newForms[`${variables.categoryId}-${variables.points}`];
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
            // Clear selection/popover if left player was selected
            setSelectedPlayerId(prev => prev === data.playerId ? null : prev);
            setManagingPlayerId(prev => prev === data.playerId ? null : prev);
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
              const timeout = setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reactionId));
                reactionTimeouts.current.delete(reactionId);
              }, 2500);
              reactionTimeouts.current.set(reactionId, timeout);
            }
            break;
          case 'player:disconnected':
            setPlayers(prev => prev.map(p => 
              p.id === data.playerId ? { ...p, connected: false } : p
            ));
            setBuzzQueue(prev => prev.filter(b => b.playerId !== data.playerId));
            // Clear selection/popover if disconnected player was selected
            setSelectedPlayerId(prev => prev === data.playerId ? null : prev);
            setManagingPlayerId(prev => prev === data.playerId ? null : prev);
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
            // Collect all buzzes - don't auto-lock, prevent duplicate buzzes from same player
            setBuzzQueue(prev => {
              if (prev.some(b => b.playerId === data.playerId)) {
                return prev; // Player already buzzed
              }
              return [...prev, {
                playerId: data.playerId,
                name: data.playerName,
                position: data.position,
                time: data.timestamp
              }];
            });
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
      
      // Track game stats only for actual gameplay scoring (not manual popover adjustments or undo operations)
      if (trackForUndo && categoryId !== undefined) {
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
      // Clear any previous timeout for this player
      const prevTimeout = scoreAnimationTimeouts.current.get(playerId);
      if (prevTimeout) {
        clearTimeout(prevTimeout);
      }
      // Set new timeout and track it
      const timeoutId = setTimeout(() => {
        setScoreAnimations(prev => {
          const current = prev.get(playerId);
          if (current && current.timestamp === animTimestamp) {
            const next = new Map(prev);
            next.delete(playerId);
            return next;
          }
          return prev;
        });
        scoreAnimationTimeouts.current.delete(playerId);
      }, 1500);
      scoreAnimationTimeouts.current.set(playerId, timeoutId);
      
      if (points > 0) {
        playPointsAwarded(points);
        playSwoosh();
        if (points >= 40) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#facc15', '#f472b6', '#8b5cf6']
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

  const kickPlayer = useCallback((playerId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'host:kickPlayer',
        playerId,
      }));
    }
    setSelectedPlayerId(null);
  }, []);

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
  
  const unlockBuzzer = useCallback((newQuestion = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:unlock', newQuestion }));
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
    // Reset judging and selection state
    setIsJudging(false);
    setSelectedPlayerId(null);
    // Reset timer state
    setTimerActive(false);
    setTimeLeft(10);
    // Reset game over state
    setShowGameOver(false);
    setGameOverPhase(0);
    // Reset shuffle selection state for next session
    setHasShuffleGridSelection(false);
    setSelectedShuffleGridIds(new Set());
    setOriginalShuffleGridIds(new Set());
    setPlayedShuffleCategoryIds([]);
    // Clear sessionStorage to prevent resurrection of played IDs
    try {
      sessionStorage.removeItem(SHUFFLE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    toast({ title: "Session ended", description: "All players have been disconnected." });
  }, [clearStoredSession, disconnectWebSocket, toast]);
  
  // Track if user has made a grid selection this session
  const [hasShuffleGridSelection, setHasShuffleGridSelection] = useState(false);
  // Track original selection when dialog opens (to restore on cancel)
  const [originalShuffleGridIds, setOriginalShuffleGridIds] = useState<Set<number>>(new Set());
  
  // Open grid picker for shuffle play
  const openShuffleGridPicker = useCallback(() => {
    // Pre-select all eligible grids if no prior selection
    if (!hasShuffleGridSelection) {
      setSelectedShuffleGridIds(new Set(eligibleShuffleGridIds));
      setOriginalShuffleGridIds(new Set(eligibleShuffleGridIds));
    } else {
      // Save current selection to restore if user cancels
      setOriginalShuffleGridIds(new Set(selectedShuffleGridIds));
    }
    setShowShuffleGridPicker(true);
  }, [eligibleShuffleGridIds, hasShuffleGridSelection, selectedShuffleGridIds]);
  
  // Execute shuffle with selected grids
  const executeShufflePlay = useCallback(async (gridIds: number[]) => {
    // Prevent double-clicks/race conditions
    if (isShuffling) return;
    setIsShuffling(true);
    // Update original to match current selection before closing (so onOpenChange restore is a no-op)
    setOriginalShuffleGridIds(new Set(selectedShuffleGridIds));
    setShowShuffleGridPicker(false);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (playedShuffleCategoryIds.length > 0) {
        params.set('exclude', playedShuffleCategoryIds.join(','));
      }
      if (gridIds.length > 0) {
        params.set('gridIds', gridIds.join(','));
      }
      const queryString = params.toString();
      const response = await fetch(`/api/boards/shuffle-play${queryString ? '?' + queryString : ''}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      // Check for server error responses (handle 400s with proper messages)
      if (!response.ok) {
        if (data.exhausted) {
          throw new Error("You've played all available categories! Reset to play again.");
        }
        throw new Error(data.message || "Failed to get shuffle data");
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
        // Close any open question modal and reset answer state
        setActiveQuestion(null);
        setShowAnswer(false);
        // Reset timer state
        setTimerActive(false);
        setTimeLeft(10);
        // Reset buzzer state
        setBuzzQueue([]);
        setBuzzerLocked(true);
        setIsJudging(false);
        setLastScoreChange(null);
        // Reset game stats for new game
        setGameStats({
          playerStats: new Map(),
          totalQuestions: 0,
          startTime: Date.now(),
          mvpMoments: []
        });
        // Mark selection as complete only after successful shuffle
        setHasShuffleGridSelection(true);
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
  }, [toast, playedShuffleCategoryIds, isShuffling, selectedShuffleGridIds]);
  
  // Wrapper for shuffle button - opens grid picker first time, then reuses selection
  const handleShufflePlay = useCallback(() => {
    if (hasShuffleGridSelection && selectedShuffleGridIds.size > 0) {
      // Reuse existing selection - skip the picker
      executeShufflePlay(Array.from(selectedShuffleGridIds));
    } else {
      // First time - show the picker
      openShuffleGridPicker();
    }
  }, [hasShuffleGridSelection, selectedShuffleGridIds, executeShufflePlay, openShuffleGridPicker]);
  
  // Fire celebratory confetti with fireworks
  const fireConfetti = useCallback(() => {
    // Clear any existing confetti timers
    confettiTimers.current.forEach(clearTimeout);
    confettiTimers.current = [];
    
    const defaults = { startVelocity: 30, spread: 360, ticks: 80, zIndex: 100 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    
    playFanfare();
    
    // Initial burst from sides
    confetti({ ...defaults, particleCount: 80, origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.2, 0.4) }, colors: ['#22c55e', '#16a34a', '#FFD700', '#FFA500'] });
    confetti({ ...defaults, particleCount: 80, origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.2, 0.4) }, colors: ['#22c55e', '#16a34a', '#FFD700', '#FFA500'] });
    
    // Firework burst pattern - center explosion
    confettiTimers.current.push(setTimeout(() => {
      confetti({ particleCount: 150, spread: 70, origin: { x: 0.5, y: 0.35 }, colors: ['#FFD700', '#FFFFFF', '#22c55e', '#4ADEBC', '#f472b6', '#8b5cf6'] });
    }, 200));
    
    // Star shapes
    confettiTimers.current.push(setTimeout(() => {
      confetti({ particleCount: 60, spread: 100, origin: { x: 0.5, y: 0.5 }, shapes: ['star'], colors: ['#FFD700', '#FFA500', '#FFFFFF'], scalar: 1.8 });
    }, 400));
    
    // Side fireworks
    confettiTimers.current.push(setTimeout(() => {
      confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#8b5cf6', '#a855f7', '#c084fc'] });
      confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ec4899', '#f472b6', '#fb7185'] });
    }, 600));
    
    // Final golden shower
    confettiTimers.current.push(setTimeout(() => {
      playApplause();
      confetti({ particleCount: 200, spread: 180, origin: { x: 0.5, y: 0.1 }, startVelocity: 45, colors: ['#FFD700', '#FFA500', '#FFEC8B', '#FFFFFF'], gravity: 0.8 });
    }, 900));
    
    // Extra stars burst
    confettiTimers.current.push(setTimeout(() => {
      confetti({ particleCount: 80, spread: 360, origin: { x: 0.5, y: 0.4 }, shapes: ['star'], colors: ['#FFD700', '#FFFFFF'], scalar: 2, ticks: 100 });
    }, 1200));
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
    
    // Send player stats to server for persistence
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const winnerId = sortedPlayers[0]?.id;
      const playerStatsArray = players.map(player => {
        const stats = gameStats.playerStats.get(player.id);
        return {
          playerId: player.id,
          correctAnswers: stats?.correctAnswers || 0,
          wrongAnswers: stats?.wrongAnswers || 0,
          totalPoints: player.score,
          bestStreak: stats?.bestStreak || 0,
          won: player.id === winnerId,
        };
      });
      
      wsRef.current.send(JSON.stringify({
        type: 'host:endGame',
        gameSlug: 'blitzgrid',
        playerStats: playerStatsArray,
      }));
    }
    
    setShowGameOver(true);
    setGameOverPhase(0);
    
    // Animate phases: 0 → show 4th+ → 3rd → 2nd → drumroll → winner
    const phases = sortedPlayers.length >= 4 ? [500, 2000, 3500, 5000, 6500] : 
                   sortedPlayers.length === 3 ? [500, 2000, 3500, 5000] :
                   sortedPlayers.length === 2 ? [500, 2000, 3500] :
                   [500, 2000];
    
    // Phase indices: for 4+ players: [0=rest, 1=3rd, 2=2nd, 3=drumroll, 4=winner]
    // for 3 players: [0=3rd, 1=2nd, 2=drumroll, 3=winner]
    // for 2 players: [0=2nd, 1=drumroll, 2=winner]
    const thirdPlacePhaseIdx = sortedPlayers.length >= 4 ? 1 : sortedPlayers.length === 3 ? 0 : -1;
    const secondPlacePhaseIdx = sortedPlayers.length >= 4 ? 2 : sortedPlayers.length === 3 ? 1 : 0;

    phases.forEach((delay, i) => {
      const timer = setTimeout(() => {
        setGameOverPhase(i + 1);
        if (i === thirdPlacePhaseIdx && sortedPlayers.length >= 3) {
          confetti({ particleCount: 40, spread: 55, origin: { x: 0.72, y: 0.55 }, colors: ['#fb923c', '#f97316', '#ea580c', '#fdba74'], scalar: 0.8, ticks: 80 });
        }
        if (i === secondPlacePhaseIdx && sortedPlayers.length >= 2) {
          confetti({ particleCount: 50, spread: 55, origin: { x: 0.28, y: 0.45 }, colors: ['#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'], scalar: 0.8, ticks: 80 });
        }
        if (i === phases.length - 2) {
          playDrumroll();
        }
        if (i === phases.length - 1) {
          fireConfetti();
        }
      }, delay);
      gameOverTimers.current.push(timer);
    });
  }, [players, endSession, fireConfetti, gameStats]);
  
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
    setLastScoreChange(null);
    // Reset timer state
    setTimerActive(false);
    setTimeLeft(10);
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
      // Clear confetti timers on unmount
      confettiTimers.current.forEach(clearTimeout);
      confettiTimers.current = [];
      // Clear reaction timeouts on unmount
      reactionTimeouts.current.forEach(clearTimeout);
      reactionTimeouts.current.clear();
      // Clear score animation timeouts on unmount
      scoreAnimationTimeouts.current.forEach(clearTimeout);
      scoreAnimationTimeouts.current.clear();
    };
  }, [playMode, gridPickerMode, connectWebSocket, disconnectWebSocket]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader minimal backHref="/" title="BlitzGrid" />
        <main className="max-w-6xl mx-auto px-4 py-6 w-full">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </main>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  // Access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to host games. Admin access is required.
          </p>
          <a href="/" className="text-primary hover:underline">Back to Home</a>
        </div>
      </div>
    );
  }

  // Grid detail view with inline categories and questions (or shuffle mode)
  if (selectedGridId || shuffleMode) {
    const grid = selectedGridId ? grids.find(g => g.id === selectedGridId) : null;
    const effectiveColor = grid?.colorCode?.startsWith('#') ? null : grid?.colorCode;
    // Use violet theme for shuffle mode (must be a valid BoardColor)
    const shuffleColor = 'violet' as BoardColor;
    // Use grid ID for stable color assignment (not position which can change)
    const colorConfig = getBoardColorConfig(shuffleMode ? shuffleColor : (effectiveColor || BOARD_COLORS[grid?.id ? grid.id % BOARD_COLORS.length : 0]));
    
    // GAMEPLAY MODE (normal grid or shuffle mode)
    if (playMode && (grid?.isActive || shuffleMode)) {
      // Show loading state if categories haven't loaded yet (non-shuffle mode only)
      if (!shuffleMode && loadingCategories) {
        return (
          <div className="h-screen flex items-center justify-center arcade-bg" data-testid="page-blitzgrid-loading">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-white/70">Loading game...</p>
            </div>
          </div>
        );
      }
      
      const handleCellClick = (categoryId: number, points: number, question: Question) => {
        const cellKey = `${categoryId}-${points}`;
        if (!revealedCells.has(cellKey)) {
          setActiveQuestion(question);
          setShowAnswer(false);
          setScoredPlayers({});
          unlockBuzzer(true);
        }
      };
      
      const handleRevealAnswer = () => {
        setShowAnswer(true);
        // Lock buzzers when answer is revealed to prevent late buzzes
        lockBuzzer();
        // Stop the timer and clear any TIME'S UP overlay
        setTimerActive(false);
        setTimerExpired(false);
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
        setScoredPlayers({});
        setTimerActive(false);
        setTimeLeft(10);
        setTimerExpired(false);
        // Only send lock message if buzzer isn't already locked
        if (!buzzerLocked) {
          lockBuzzer();
        }
        setIsJudging(false);
        setLastScoreChange(null);
        
        // Auto-detect game completion: all questions revealed
        const totalCells = playCategories.length * 5;
        if (totalCells > 0 && revealedCells.size >= totalCells && players.length > 0 && !showGameOver) {
          setTimeout(() => startGameOverReveal(), 600);
        }
      };
      
      const resetGame = () => {
        // Close any open question modal first
        setActiveQuestion(null);
        setShowAnswer(false);
        setTimerActive(false);
        setTimeLeft(10);
        // Reset buzzer state
        setBuzzQueue([]);
        setBuzzerLocked(true);
        setIsJudging(false);
        setLastScoreChange(null);
        // Reset revealed state
        setRevealedCells(new Set());
        setRevealedCategoryCount(0);
        setCategoryRevealMode(true);
        toast({ title: "Fresh start!", description: "All questions unlocked. Round 2, fight!" });
      };
      
      // Reveal next category (uses functional update to prevent race conditions from rapid clicks)
      const revealNextCategory = () => {
        setRevealedCategoryCount(prev => {
          // Guard inside functional update to prevent exceeding category count on rapid clicks
          if (prev >= playCategories.length) return prev;
          const newCount = prev + 1;
          playRevealFlip();
          // Check if all categories revealed
          if (newCount >= playCategories.length) {
            setCategoryRevealMode(false);
            playWhoosh();
          }
          return newCount;
        });
      };
      
      // Skip reveal mode and show all
      const skipReveal = () => {
        setRevealedCategoryCount(playCategories.length);
        setCategoryRevealMode(false);
      };
      
      const joinUrl = roomCode 
        ? `${window.location.origin}/play/${roomCode}` 
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
      // Use grid ID for stable color (same logic as GridCard), or shuffle color for shuffle mode
      const effectiveGridColor = grid?.colorCode?.startsWith('#') ? null : grid?.colorCode;
      const colorName = shuffleMode 
        ? shuffleColor
        : (effectiveGridColor as BoardColor || BOARD_COLORS[grid?.id ? grid.id % BOARD_COLORS.length : 0]);
      
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
          className="h-screen overflow-hidden flex flex-col relative touch-manipulation arcade-bg" 
          data-testid="page-blitzgrid-play"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {/* Scanline pattern for retro feel */}
          <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)'
          }} />
          {/* Subtle neon corner gradients */}
          <div className="absolute inset-0 pointer-events-none z-[1]">
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/5 blur-3xl" />
          </div>
          
          {/* Floating neon orbs - retro arcade feel */}
          <div className="absolute inset-0 pointer-events-none z-[2] overflow-hidden">
            {/* Top-left neon orb */}
            <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
            {/* Bottom-right neon orb */}
            <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br from-secondary/20 to-transparent blur-2xl" />
            {/* Floating dots */}
            <motion.div 
              className="absolute top-1/4 right-[15%] w-2 h-2 rounded-full bg-primary/30"
              animate={{ y: [0, -10, 0], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute top-1/3 left-[10%] w-1.5 h-1.5 rounded-full bg-primary/30"
              animate={{ y: [0, -8, 0], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            <motion.div 
              className="absolute bottom-1/4 right-[20%] w-1 h-1 rounded-full bg-secondary/40"
              animate={{ y: [0, -6, 0], opacity: [0.4, 0.8, 0.4] }}
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
                className="fixed inset-0 z-50 flex items-center justify-center arcade-bg"
              >
                {/* Neon gradient overlay */}
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-primary/10 blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-secondary/10 blur-3xl" />
                </div>
                <div ref={scoresPanelRef} className="text-center p-4 md:p-8 max-w-4xl w-full mx-4 relative">
                  {/* Title */}
                  <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                  >
                    <h2 
                      className="text-3xl md:text-4xl font-black text-white mb-2 uppercase tracking-wide"
                      style={{ textShadow: '0 0 20px hsl(var(--primary) / 0.5)' }}
                    >Final Scores</h2>
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                      <span className="text-white/60" data-testid="game-over-subtitle">Who takes the crown?</span>
                      <Sparkles className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
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
                            <div 
                              className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg border-2 arcade-surface"
                              style={{ borderColor: 'rgba(148, 163, 184, 0.6)', boxShadow: '0 0 15px rgba(148, 163, 184, 0.3)' }}
                            >
                              {PLAYER_AVATARS.find(a => a.id === runnerUp.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                            </div>
                          </motion.div>
                          {/* Podium with name plate - Silver/cyan theme */}
                          <div 
                            className="w-24 md:w-32 h-28 md:h-36 arcade-surface rounded-t-lg flex flex-col items-center justify-between pt-2 pb-3 border-t-2 relative overflow-hidden"
                            style={{ borderColor: 'rgba(148, 163, 184, 0.6)', boxShadow: '0 0 20px rgba(148, 163, 184, 0.2)' }}
                          >
                            {/* Silver sparkle particles */}
                            {[...Array(6)].map((_, i) => (
                              <motion.div
                                key={`silver-${i}`}
                                className="absolute rounded-full bg-slate-300"
                                style={{ width: 3 + Math.random() * 3, height: 3 + Math.random() * 3, left: `${15 + Math.random() * 70}%` }}
                                initial={{ opacity: 0, y: 0 }}
                                animate={{ opacity: [0, 0.9, 0], y: [-10, -30 - Math.random() * 40], scale: [0.5, 1.2, 0] }}
                                transition={{ duration: 1.5 + Math.random(), delay: 0.5 + i * 0.25, repeat: Infinity, repeatDelay: 2 + Math.random() * 2 }}
                              />
                            ))}
                            {/* Name plate */}
                            <div className="bg-white/10 px-2 py-0.5 rounded border border-white/20 min-w-0 max-w-full relative z-10">
                              <div className="text-white font-bold text-xs md:text-sm truncate max-w-[80px] md:max-w-[110px]" data-testid="text-2nd-place-name" title={runnerUp.name}>
                                {runnerUp.name}
                              </div>
                            </div>
                            <AnimatedScore
                              target={runnerUp.score}
                              duration={1.2}
                              className="text-2xl md:text-3xl font-black text-slate-300 block"
                              style={{ textShadow: '0 0 10px rgba(148, 163, 184, 0.5)' }}
                              data-testid="text-2nd-place-score"
                            />
                            <div className="flex items-center">
                              <Medal className="w-6 h-6 text-slate-400 mr-1 shrink-0" aria-hidden="true" />
                              <span className="text-3xl md:text-4xl font-black text-slate-400" data-testid="text-2nd-place-rank">2</span>
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
                            <Crown className="w-10 h-10 md:w-12 md:h-12 text-yellow-400 mx-auto drop-shadow-lg shrink-0" aria-hidden="true" />
                          </motion.div>
                          
                          {/* Player floating above podium */}
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="relative mb-1">
                            <motion.div
                              className="absolute inset-0 rounded-full border-4 border-yellow-400"
                              animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <div 
                              className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-5xl shadow-2xl border-2 relative z-10 arcade-surface"
                              style={{ borderColor: 'rgba(250, 204, 21, 0.8)', boxShadow: '0 0 30px rgba(250, 204, 21, 0.4)' }}
                            >
                              {PLAYER_AVATARS.find(a => a.id === winner.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                            </div>
                          </motion.div>
                          
                          {/* Grand Podium with name plate - Gold neon theme */}
                          <div 
                            className="w-28 md:w-40 h-44 md:h-56 arcade-surface rounded-t-lg flex flex-col items-center justify-between pt-2 pb-4 border-t-2"
                            style={{ borderColor: 'rgba(250, 204, 21, 0.8)', boxShadow: '0 0 40px rgba(250, 204, 21, 0.3)' }}
                          >
                            {/* Name plate */}
                            <div className="bg-yellow-500/20 px-3 py-1 rounded border border-yellow-400/50 min-w-0 max-w-full">
                              <div className="text-yellow-300 font-black text-sm md:text-base truncate max-w-[90px] md:max-w-[130px]" data-testid="text-winner-name" title={winner.name}>
                                {winner.name}
                              </div>
                            </div>
                            <motion.div 
                              className="text-3xl md:text-4xl font-black text-yellow-300"
                              style={{ textShadow: '0 0 15px rgba(250, 204, 21, 0.6)' }}
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                              data-testid="text-winner-score"
                            >
                              <AnimatedScore target={winner.score} duration={1.8} />
                            </motion.div>
                            <div className="flex flex-col items-center">
                              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-400 mb-1 shrink-0" aria-hidden="true" />
                              <span className="text-5xl md:text-6xl font-black text-yellow-400" data-testid="text-winner-rank">1</span>
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
                            <div 
                              className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-3xl shadow-lg border-2 arcade-surface"
                              style={{ borderColor: 'rgba(251, 146, 60, 0.6)', boxShadow: '0 0 15px rgba(251, 146, 60, 0.3)' }}
                            >
                              {PLAYER_AVATARS.find(a => a.id === thirdPlace.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                            </div>
                          </motion.div>
                          {/* Podium with name plate - Bronze/orange neon theme */}
                          <div 
                            className="w-20 md:w-28 h-20 md:h-24 arcade-surface rounded-t-lg flex flex-col items-center justify-between pt-1 pb-2 border-t-2 relative overflow-hidden"
                            style={{ borderColor: 'rgba(251, 146, 60, 0.6)', boxShadow: '0 0 20px rgba(251, 146, 60, 0.2)' }}
                          >
                            {/* Bronze sparkle particles */}
                            {[...Array(5)].map((_, i) => (
                              <motion.div
                                key={`bronze-${i}`}
                                className="absolute rounded-full bg-orange-400"
                                style={{ width: 2.5 + Math.random() * 2.5, height: 2.5 + Math.random() * 2.5, left: `${15 + Math.random() * 70}%` }}
                                initial={{ opacity: 0, y: 0 }}
                                animate={{ opacity: [0, 0.8, 0], y: [-5, -20 - Math.random() * 30], scale: [0.5, 1.1, 0] }}
                                transition={{ duration: 1.3 + Math.random(), delay: 0.5 + i * 0.2, repeat: Infinity, repeatDelay: 2.5 + Math.random() * 2 }}
                              />
                            ))}
                            {/* Name plate */}
                            <div className="bg-white/10 px-2 py-0.5 rounded border border-white/20 min-w-0 max-w-full relative z-10">
                              <div className="text-white font-bold text-xs truncate max-w-[70px] md:max-w-[100px]" data-testid="text-3rd-place-name" title={thirdPlace.name}>
                                {thirdPlace.name}
                              </div>
                            </div>
                            <AnimatedScore
                              target={thirdPlace.score}
                              duration={1.0}
                              className="text-lg md:text-xl font-black text-orange-300 block"
                              style={{ textShadow: '0 0 10px rgba(251, 146, 60, 0.5)' }}
                              data-testid="text-3rd-place-score"
                            />
                            <span className="text-2xl md:text-3xl font-black text-orange-400" data-testid="text-3rd-place-rank">3</span>
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
                              <Sparkles className="w-10 h-10 md:w-14 md:h-14 text-yellow-400 shrink-0" aria-hidden="true" />
                              <Trophy className="w-12 h-12 md:w-16 md:h-16 text-yellow-400 shrink-0" aria-hidden="true" />
                              <Sparkles className="w-10 h-10 md:w-14 md:h-14 text-yellow-400 shrink-0" aria-hidden="true" />
                            </div>
                            <motion.p 
                              className="text-white text-xl md:text-2xl font-bold mt-2"
                              style={{ textShadow: '0 0 10px rgba(250, 204, 21, 0.5)' }}
                              animate={{ opacity: [1, 0.5, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                              data-testid="drumroll-text"
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
                        <div key={p.id} className="bg-white/5 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10 flex items-center gap-2 max-w-[220px]" data-testid={`rest-player-${p.id}`}>
                          <span className="text-white/40 font-medium shrink-0" data-testid={`rest-player-rank-${p.id}`}>#{i + 4}</span>
                          <span className="text-lg shrink-0">{PLAYER_AVATARS.find(a => a.id === p.avatar)?.emoji || PLAYER_AVATARS[0].emoji}</span>
                          <span className="text-white font-medium truncate min-w-0 flex-1" title={p.name} data-testid={`rest-player-name-${p.id}`}>{p.name}</span>
                          <span className="text-white/40 shrink-0" data-testid={`rest-player-score-${p.id}`}>{p.score} pts</span>
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
                            className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/10 shadow-lg"
                          >
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                              <Zap className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                              <span data-testid="game-stats-title">Game Stats</span>
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
                                    className="bg-white/5 rounded-xl p-3 border border-white/10"
                                    data-testid={`game-stats-player-${player.id}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0 ${
                                        idx === 0 ? 'border-2 border-yellow-400/60' : 
                                        idx === 1 ? 'border-2 border-slate-400/60' : 
                                        idx === 2 ? 'border-2 border-orange-400/60' : 
                                        'border border-white/20'
                                      }`} style={{ backgroundColor: 'var(--arcade-surface)' }}>
                                        {PLAYER_AVATARS.find(a => a.id === player.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white text-sm truncate" title={player.name}>{player.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-white/40">
                                          <span>{player.score} pts</span>
                                          {stats && (
                                            <>
                                              <span>·</span>
                                              <span>{accuracy}% accuracy</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      {idx < 3 && (
                                        <Badge variant="secondary" className={`text-xs shrink-0 ${
                                          idx === 0 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50' : 
                                          idx === 1 ? 'bg-slate-500/20 text-slate-300 border-slate-400/50' : 
                                          'bg-orange-500/20 text-orange-300 border-orange-400/50'
                                        } border`}>
                                          #{idx + 1}
                                        </Badge>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
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
                            <Zap className="w-5 h-5 text-yellow-500 shrink-0" aria-hidden="true" />
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
                            <Share2 className="w-5 h-5 shrink-0" aria-hidden="true" />
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
                            <Grid3X3 className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
                            Next Grid
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={closeGameOver}
                            className="font-bold"
                            data-testid="button-end-session-gameover"
                          >
                            <Power className="w-5 h-5 mr-2 shrink-0" aria-hidden="true" />
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
          
          {/* Header - Matching AppHeader style */}
          <motion.header 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50"
          >
            <div className="px-4 py-3 flex items-center justify-between gap-4 max-w-6xl mx-auto w-full">
            {/* Left: Back + Logo + Grid Name */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => { 
                  if (players.length > 0) {
                    setShowEndSessionDialog(true);
                  } else {
                    setActiveQuestion(null);
                    setShowAnswer(false);
                    setRevealedCells(new Set());
                    setRevealedCategoryCount(0);
                    setCategoryRevealMode(true);
                    endSession();
                  }
                }}
                className="text-muted-foreground"
                data-testid="button-exit-play"
              >
                <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
              </Button>
              <Link href="/">
                <Logo size="md" />
              </Link>
              <span className="font-semibold text-muted-foreground hidden sm:inline">
                | {shuffleMode ? "Shuffle Play" : grid?.name}
              </span>
            </div>
            
            {/* Right: Room Code + Invite + Settings */}
            <div className="flex items-center gap-2">
              {roomCode && (() => {
                const gridNeonColor = neonColorConfig[colorName];
                return (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: "spring", delay: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <Badge 
                      className="font-mono font-bold px-3 py-1.5 border"
                      style={{
                        background: `${gridNeonColor.border}15`,
                        borderColor: `${gridNeonColor.border}60`,
                        color: gridNeonColor.text,
                      }}
                    >
                      {roomCode}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setShowQRCode(true)} 
                      style={{ color: gridNeonColor.icon }}
                      data-testid="button-show-qr"
                    >
                      <QrCode className="w-4 h-4 shrink-0" aria-hidden="true" />
                    </Button>
                  </motion.div>
                );
              })()}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-white/60" data-testid="button-game-menu">
                    <MoreVertical className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => {
                    const newVal = soundManager.toggle();
                    setSoundEnabled(newVal);
                  }} data-testid="menu-toggle-sound">
                    {soundEnabled ? <Volume2 className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" /> : <VolumeX className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />}
                    {soundEnabled ? 'Sound On' : 'Sound Off'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={resetGame} data-testid="menu-reset-questions">
                    <RotateCcw className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                    Reset Questions
                  </DropdownMenuItem>
                  {shuffleMode && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => {
                          handleShufflePlay();
                        }}
                        data-testid="button-reshuffle"
                      >
                        <Shuffle className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                        Reshuffle Categories
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openShuffleGridPicker()}
                        data-testid="button-change-grids"
                      >
                        <Grid3X3 className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                        Change Grid Selection
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setShowEndSessionDialog(true)}
                    className="text-destructive focus:text-destructive"
                    data-testid="menu-end-session"
                  >
                    <Power className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                    End Session
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            </div>
          </motion.header>
            
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
                  <AlertDialogCancel data-testid="button-cancel-end-session">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setShowEndSessionDialog(false); startGameOverReveal(); }} className="bg-destructive text-destructive-foreground" data-testid="button-confirm-end-session">
                    End Session
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          
          {/* Join Notification */}
          <AnimatePresence>
            {lastJoinedPlayer && (
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-50"
              >
                <div 
                  className="px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border"
                  style={{
                    background: 'hsl(var(--primary) / 0.1)',
                    borderColor: 'hsl(var(--primary) / 0.4)',
                    color: 'hsl(var(--primary))',
                  }}
                >
                  <span className="text-lg shrink-0">{PLAYER_AVATARS.find(a => a.id === lastJoinedPlayer.avatar)?.emoji || PLAYER_AVATARS[0].emoji}</span>
                  <span className="font-medium truncate min-w-0 max-w-[150px]" title={`${lastJoinedPlayer.name} joined!`}>{lastJoinedPlayer.name} joined!</span>
                  <UserPlus className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
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
                  fire: 'text-orange-500',
                  laugh: 'text-yellow-400',
                  wow: 'text-secondary',
                  thumbsup: 'text-primary',
                }[reaction.type] || 'text-secondary';
                
                return (
                  <motion.div
                    key={reaction.id}
                    initial={{ opacity: 1, y: 0, scale: 0.5, x: Math.random() * 40 - 20 }}
                    animate={{ opacity: 0, y: -120, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="absolute bottom-0 right-0"
                  >
                    <ReactionIcon className={`w-10 h-10 shrink-0 ${reactionColor}`} aria-hidden="true" />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          {/* Game Grid */}
          <div 
            className="flex-1 p-3 md:p-5 overflow-hidden relative"
            onClick={() => categoryRevealMode && !activeQuestion && revealNextCategory()}
          >
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
              {/* Category Headers - All use the grid's neon color */}
              <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: `repeat(${playCategories.length}, 1fr)` }}>
                {playCategories.map((category, idx) => {
                  const isRevealed = idx < revealedCategoryCount;
                  const catNeonColor = neonColorConfig[colorName];
                  return (
                    <motion.div 
                      key={category.id} 
                      initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
                      animate={{ 
                        scale: isRevealed ? 1 : 0.8,
                        opacity: isRevealed ? 1 : 0,
                        rotateY: isRevealed ? 0 : -90,
                      }}
                      transition={{ 
                        duration: 0.5, 
                        ease: "easeOut",
                        type: "spring",
                        stiffness: 100
                      }}
                      style={{ 
                        perspective: 1000, 
                        transformStyle: 'preserve-3d',
                        background: isRevealed ? 'var(--arcade-surface)' : 'transparent',
                        border: isRevealed ? `1px solid ${catNeonColor.border}40` : '1px solid transparent',
                      }}
                      className="py-3 md:py-4 px-3 rounded-xl text-center relative overflow-hidden"
                    >
                      <span 
                        className="font-bold text-xs md:text-sm uppercase tracking-wider block relative z-10 truncate"
                        style={{ color: catNeonColor.text }}
                        title={category.name}
                      >
                        {category.name}
                      </span>
                      {category.description && (
                        <span className="text-[10px] md:text-xs block mt-0.5 font-normal text-white/40 relative z-10">
                          {category.description}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Point Grid - All tiles use the grid's neon color */}
              <div className="flex-1 grid gap-2 md:gap-3" style={{ gridTemplateColumns: `repeat(${playCategories.length}, 1fr)`, gridTemplateRows: 'repeat(5, 1fr)' }}>
                {POINT_TIERS.map((points, rowIdx) => (
                  playCategories.map((category, colIdx) => {
                    const question = category.questions?.find(q => q.points === points);
                    const cellKey = `${category.id}-${points}`;
                    const isCellAnswered = revealedCells.has(cellKey);
                    const isCategoryRevealed = colIdx < revealedCategoryCount;
                    const isClickable = isCategoryRevealed && !isCellAnswered && question && !categoryRevealMode;
                    const tileNeonColor = neonColorConfig[colorName];
                    
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
                        style={{ 
                          perspective: 1000, 
                          transformStyle: 'preserve-3d',
                          background: isCategoryRevealed ? 'var(--arcade-surface)' : 'transparent',
                          border: isCategoryRevealed ? `1px solid ${isCellAnswered ? 'var(--arcade-border)' : `${tileNeonColor.border}50`}` : '1px solid transparent',
                          color: isCellAnswered ? 'var(--arcade-border-dim)' : tileNeonColor.text,
                          ['--glow-color' as string]: tileNeonColor.glow,
                        }}
                        className={`
                          w-full h-full rounded-xl font-black text-2xl md:text-4xl flex items-center justify-center relative overflow-hidden transition-all duration-200
                          ${isCellAnswered ? 'opacity-40 cursor-default' : isCategoryRevealed ? 'cursor-pointer' : 'cursor-default'}
                          ${isClickable ? 'hover:scale-105 hover:-translate-y-1 hover:shadow-[0_0_20px_var(--glow-color),0_0_40px_var(--glow-color)]' : ''}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isClickable && question) {
                            handleCellClick(category.id, points, question);
                          }
                        }}
                        whileTap={isClickable ? { scale: 0.96 } : {}}
                        data-testid={`cell-${category.id}-${points}`}
                      >
                        {isCellAnswered ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="flex items-center justify-center relative z-10"
                          >
                            <Check className="w-8 h-8 md:w-12 md:h-12 opacity-50 shrink-0" style={{ color: tileNeonColor.icon }} strokeWidth={3} aria-hidden="true" />
                          </motion.div>
                        ) : (
                          <span className="relative z-10">
                            {points}
                          </span>
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
                  className="px-6 py-3 rounded-full flex items-center gap-3 shadow-lg border"
                  style={{
                    background: neonColorConfig[colorName].glow.replace('0.4', '0.1'),
                    borderColor: neonColorConfig[colorName].border,
                    boxShadow: `0 0 30px ${neonColorConfig[colorName].glow}`,
                  }}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-sm md:text-base font-medium" style={{ color: neonColorConfig[colorName].text }}>
                    Click to reveal ({revealedCategoryCount}/{playCategories.length})
                  </span>
                  <span className="hidden md:inline text-[10px] text-white/30 font-mono px-1.5 py-0.5 rounded border border-white/10 bg-white/5">
                    Space / Enter
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-white/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      skipReveal();
                    }}
                    data-testid="button-skip-reveal"
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
            <div className="h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div 
                className="h-full bg-gradient-to-r from-primary via-primary to-secondary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${playCategories.length > 0 ? (revealedCells.size / (playCategories.length * 5)) * 100 : 0}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ boxShadow: '0 0 10px rgba(232, 121, 249, 0.5)' }}
              />
            </div>
          </motion.div>
          
          {/* Bottom Scoreboard Bar - Dark neon style */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="backdrop-blur-md border-t border-white/10 px-4 py-2.5 relative z-10 overflow-hidden"
            style={{ backgroundColor: 'rgba(10, 10, 15, 0.95)' }}
          >
            {/* Subtle neon gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 via-transparent to-primary/5 pointer-events-none" />
            {players.length > 0 ? (
              <LayoutGroup>
                <div className="flex items-center justify-center gap-3 md:gap-5 flex-wrap">
                  {[...players].sort((a, b) => b.score - a.score).map((player, idx) => {
                    const avatarEmoji = PLAYER_AVATARS.find(a => a.id === player.avatar)?.emoji || PLAYER_AVATARS[0].emoji;
                    const scoreAnim = scoreAnimations.get(player.id);
                    return (
                      <Popover key={player.id} open={managingPlayerId === player.id} onOpenChange={(open) => setManagingPlayerId(open ? player.id : null)}>
                        <PopoverTrigger asChild>
                          <motion.button
                            layoutId={`player-score-${player.id}`}
                            layout
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ 
                              layout: { type: "spring", stiffness: 400, damping: 30 },
                              opacity: { delay: 0.4 + idx * 0.05 }
                            }}
                            className={`relative flex items-center gap-2 rounded-full py-1 pl-1 pr-3 cursor-pointer transition-colors ${
                              !player.connected ? 'opacity-50' : ''
                            } ${managingPlayerId === player.id ? 'bg-white/10 ring-1 ring-primary/40' : 'hover:bg-white/5'}`}
                            data-testid={`player-card-${player.id}`}
                          >
                            <AnimatePresence>
                              {scoreAnim && (
                                <motion.div
                                  initial={{ opacity: 1, y: 0, scale: 1 }}
                                  animate={{ opacity: 0, y: -30, scale: 1.3 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className={`absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-sm whitespace-nowrap ${
                                    scoreAnim.delta > 0 ? 'text-primary' : 'text-destructive'
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
                                  idx === 0 ? 'bg-gradient-to-br from-yellow-200 to-yellow-400 border-yellow-300' : 
                                  idx === 1 ? 'bg-gradient-to-br from-slate-100 to-slate-300 border-slate-200' : 
                                  idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 border-orange-400' : 
                                  'bg-gradient-to-br from-slate-100 via-slate-150 to-slate-200 border-slate-200'
                                }`}
                              >
                                {avatarEmoji}
                              </motion.div>
                              {idx < 3 && (
                                <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                                  idx === 0 ? 'bg-yellow-400 text-yellow-900' : 
                                  idx === 1 ? 'bg-slate-300 text-slate-700' : 
                                  'bg-orange-400 text-orange-900'
                                }`}>
                                  {idx + 1}
                                </div>
                              )}
                              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${player.connected ? 'bg-primary' : 'bg-destructive'}`} style={{ borderColor: 'var(--arcade-bg)' }} />
                            </div>
                            <div className="flex flex-col leading-tight min-w-0">
                              <span className="text-white/80 font-medium text-xs truncate max-w-[60px]" title={player.name}>{player.name}</span>
                              <motion.span 
                                key={player.score}
                                initial={{ scale: 1.3, color: scoreAnim?.delta && scoreAnim.delta > 0 ? 'hsl(var(--primary))' : scoreAnim?.delta && scoreAnim.delta < 0 ? 'hsl(var(--destructive))' : 'rgba(255,255,255,0.9)' }}
                                animate={{ scale: 1, color: 'rgba(255,255,255,0.9)' }}
                                transition={{ duration: 0.3 }}
                                className="font-bold text-sm"
                              >
                                {player.score}
                              </motion.span>
                            </div>
                          </motion.button>
                        </PopoverTrigger>
                        <PopoverContent 
                          side="top" 
                          align="center" 
                          className="w-48 p-3"
                          data-testid={`popover-manage-${player.id}`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                              <span className="text-base">{avatarEmoji}</span>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate">{player.name}</p>
                                <p className="text-xs text-muted-foreground">{player.score} pts</p>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Quick adjust</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      updatePlayerScore(player.id, -10);
                                      toast({ title: `−10 pts`, description: player.name, duration: 1500 });
                                    }}
                                    data-testid={`popover-sub-10-${player.id}`}
                                  >
                                    <Minus className="w-3 h-3" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      updatePlayerScore(player.id, 10);
                                      toast({ title: `+10 pts`, description: player.name, duration: 1500 });
                                    }}
                                    data-testid={`popover-add-10-${player.id}`}
                                  >
                                    <Plus className="w-3 h-3" aria-hidden="true" />
                                  </Button>
                                </div>
                              </div>
                              <form className="flex items-center gap-1" onSubmit={(e) => {
                                e.preventDefault();
                                const input = e.currentTarget.querySelector('input');
                                const val = parseInt(input?.value || '0', 10);
                                if (val !== 0 && !isNaN(val)) {
                                  updatePlayerScore(player.id, val);
                                  toast({ title: `${val > 0 ? '+' : ''}${val} pts`, description: player.name, duration: 1500 });
                                  if (input) input.value = '';
                                }
                              }}>
                                <input
                                  type="number"
                                  placeholder="±pts"
                                  className="h-7 w-16 text-xs text-center rounded border border-border bg-background px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  data-testid={`popover-custom-score-${player.id}`}
                                />
                                <Button size="sm" variant="outline" type="submit" className="h-7 px-2 text-xs" data-testid={`popover-apply-score-${player.id}`}>
                                  Set
                                </Button>
                              </form>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full justify-start text-destructive h-8 text-xs gap-2"
                              onClick={() => {
                                if (window.confirm(`Remove ${player.name} from the game? They won't be able to rejoin.`)) {
                                  kickPlayer(player.id);
                                  setManagingPlayerId(null);
                                  toast({ title: `Removed ${player.name}`, variant: "destructive", duration: 2000 });
                                }
                              }}
                              data-testid={`popover-kick-${player.id}`}
                            >
                              <X className="w-3.5 h-3.5" aria-hidden="true" />
                              Remove from game
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
              </LayoutGroup>
            ) : (
              <div className="flex items-center justify-center gap-2 text-white/40 text-sm py-1">
                <QrCode className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span data-testid="no-players-hint">Tap QR to invite players</span>
              </div>
            )}
          </motion.div>
          
          {/* QR Code Modal */}
          <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
            <DialogContent className="max-w-sm" style={{ borderColor: `${neonColorConfig[colorName].border}40` }}>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl">Join the Game</DialogTitle>
                <DialogDescription className="text-center">
                  Scan with your phone to join
                </DialogDescription>
              </DialogHeader>
              
              {roomCode && (
                <div className="text-center py-2">
                  <p className="text-sm text-white/60 mb-1">Room Code</p>
                  <p className="text-4xl font-bold tracking-widest" style={{ color: neonColorConfig[colorName].text }}>{roomCode}</p>
                </div>
              )}
              
              <div className="flex justify-center py-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={joinUrl} size={180} />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={async () => {
                    try {
                      if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(joinUrl);
                      } else {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = joinUrl;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-9999px';
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                      }
                      toast({ title: "Link copied!", description: "Share this link with players" });
                    } catch {
                      toast({ title: "Couldn't copy", description: "Please copy the link manually", variant: "destructive" });
                    }
                  }}
                  data-testid="button-copy-join-link"
                >
                  <Link2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 text-primary"
                  disabled={!roomCode}
                  onClick={() => {
                    if (!roomCode) return;
                    const message = `Join my game!\n\nRoom Code: ${roomCode}\n${joinUrl}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  data-testid="button-share-whatsapp"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  WhatsApp
                </Button>
              </div>
              
              {players.length > 0 && (
                <div className="border-t border-white/10 pt-3 mt-2">
                  <p className="text-sm text-white/60 text-center mb-2">
                    {players.length} player{players.length !== 1 ? 's' : ''} joined
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {players.map(p => (
                      <Badge key={p.id} variant="secondary" className="bg-white/10 text-white border border-white/20 max-w-[120px]">
                        <span className="truncate" title={p.name}>{p.name}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Share Results Modal */}
          <Dialog open={showShareModal} onOpenChange={(open) => {
            setShowShareModal(open);
            if (!open) {
              // Clear the data URL when closing (data URLs don't need revokeObjectURL)
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
              <div className="flex justify-center py-4">
                <div 
                  ref={shareCardRef}
                  className="w-[300px] rounded-2xl overflow-hidden shadow-2xl relative"
                  style={{ 
                    background: 'var(--arcade-bg)',
                    aspectRatio: '4/5'
                  }}
                >
                  {/* Neon glow effects */}
                  <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-primary/20 blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-secondary/20 blur-3xl" />
                  
                  <div className="w-full h-full flex flex-col p-6 relative z-10">
                    {/* Header */}
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50" style={{ background: 'rgba(217, 70, 239, 0.15)' }} data-testid="share-card-header">
                        <Grid3X3 className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                        <span className="text-primary font-black text-lg tracking-wide">BLITZGRID</span>
                      </div>
                    </div>
                    
                    {/* Podium visualization for top 3 */}
                    {(() => {
                      const sorted = [...players].sort((a, b) => b.score - a.score);
                      const top3 = sorted.slice(0, 3);
                      const others = sorted.slice(3, 5);
                      
                      if (top3.length === 0) return null;
                      
                      return (
                        <div className="flex-1 flex flex-col justify-center">
                          {/* Podium */}
                          <div className="flex items-end justify-center gap-1 mb-4" style={{ height: '140px' }}>
                            {/* 2nd Place */}
                            {top3[1] && (
                              <div className="flex flex-col items-center w-[80px] min-w-0" data-testid="share-card-2nd-place">
                                <div className="text-2xl mb-1 shrink-0">{PLAYER_AVATARS.find(a => a.id === top3[1].avatar)?.emoji || <User className="w-6 h-6 shrink-0" aria-hidden="true" />}</div>
                                <div className="text-xs font-bold text-white truncate w-full text-center mb-1" title={top3[1].name} data-testid="share-card-2nd-name">{top3[1].name}</div>
                                <div className="w-full h-[70px] rounded-t-lg flex flex-col items-center justify-center border-t-2" style={{ background: 'var(--arcade-surface)', borderColor: 'rgba(148, 163, 184, 0.6)', boxShadow: '0 0 15px rgba(148, 163, 184, 0.3)' }}>
                                  <span className="text-2xl font-black text-slate-300" data-testid="share-card-2nd-rank">2</span>
                                  <span className="text-xs font-bold text-slate-400" data-testid="share-card-2nd-score">{top3[1].score} pts</span>
                                </div>
                              </div>
                            )}
                            
                            {/* 1st Place */}
                            {top3[0] && (
                              <div className="flex flex-col items-center w-[90px] min-w-0" data-testid="share-card-1st-place">
                                <Crown className="w-6 h-6 text-yellow-400 mb-0.5 shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(250, 204, 21, 0.6))' }} aria-hidden="true" />
                                <div className="text-3xl mb-1 shrink-0">{PLAYER_AVATARS.find(a => a.id === top3[0].avatar)?.emoji || <User className="w-8 h-8 shrink-0" aria-hidden="true" />}</div>
                                <div className="text-sm font-bold text-yellow-300 truncate w-full text-center mb-1" title={top3[0].name} data-testid="share-card-1st-name">{top3[0].name}</div>
                                <div className="w-full h-[90px] rounded-t-lg flex flex-col items-center justify-center border-t-2" style={{ background: 'var(--arcade-surface)', borderColor: 'rgba(250, 204, 21, 0.8)', boxShadow: '0 0 25px rgba(250, 204, 21, 0.4)' }}>
                                  <Trophy className="w-5 h-5 text-yellow-400 mb-0.5 shrink-0" aria-hidden="true" />
                                  <span className="text-3xl font-black text-yellow-300" data-testid="share-card-1st-rank">1</span>
                                  <span className="text-sm font-bold text-yellow-400" data-testid="share-card-1st-score">{top3[0].score} pts</span>
                                </div>
                              </div>
                            )}
                            
                            {/* 3rd Place */}
                            {top3[2] && (
                              <div className="flex flex-col items-center w-[80px] min-w-0" data-testid="share-card-3rd-place">
                                <div className="text-2xl mb-1 shrink-0">{PLAYER_AVATARS.find(a => a.id === top3[2].avatar)?.emoji || <User className="w-6 h-6 shrink-0" aria-hidden="true" />}</div>
                                <div className="text-xs font-bold text-white truncate w-full text-center mb-1" title={top3[2].name} data-testid="share-card-3rd-name">{top3[2].name}</div>
                                <div className="w-full h-[55px] rounded-t-lg flex flex-col items-center justify-center border-t-2" style={{ background: 'var(--arcade-surface)', borderColor: 'rgba(251, 146, 60, 0.6)', boxShadow: '0 0 15px rgba(251, 146, 60, 0.3)' }}>
                                  <span className="text-2xl font-black text-orange-300" data-testid="share-card-3rd-rank">3</span>
                                  <span className="text-xs font-bold text-orange-400" data-testid="share-card-3rd-score">{top3[2].score} pts</span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Others (4th, 5th) */}
                          {others.length > 0 && (
                            <div className="flex justify-center gap-2 mt-2" data-testid="share-card-others">
                              {others.map((p, i) => (
                                <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-white/20 max-w-[140px]" style={{ background: 'rgba(255,255,255,0.05)' }} data-testid={`share-card-other-${p.id}`}>
                                  <span className="font-bold text-white/50 shrink-0">#{i + 4}</span>
                                  <span className="text-white font-medium truncate min-w-0 flex-1" title={p.name}>{p.name}</span>
                                  <span className="text-white/60 font-bold shrink-0">{p.score}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Footer */}
                    <div className="text-center mt-auto pt-4">
                      <p className="text-white/40 text-xs mb-1">
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-white/60 font-bold text-sm flex items-center justify-center gap-1" data-testid="share-card-footer">
                        <span>made with</span>
                        <Heart className="w-3.5 h-3.5 text-primary fill-primary shrink-0" aria-hidden="true" />
                        <span>by</span>
                        <span className="text-primary font-black">Amoli</span>
                      </p>
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
                    {isGeneratingImage ? <LoaderIcon className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" /> : <Image className="w-4 h-4 shrink-0" aria-hidden="true" />}
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
                        const shareText = `BlitzGrid Results - ${scoreText} - Play at Holy GuacAmoli!`;
                        
                        try {
                          const response = await fetch(shareImageUrl);
                          const blob = await response.blob();
                          
                          if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'blitzgrid-results.png', { type: 'image/png' })] })) {
                            const file = new File([blob], 'blitzgrid-results.png', { type: 'image/png' });
                            await navigator.share({
                              title: 'BlitzGrid Results',
                              text: shareText,
                              files: [file],
                            });
                          } else if (navigator.share) {
                            await navigator.share({ title: 'BlitzGrid Results', text: shareText });
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
                      <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
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
                        <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
                        Copy
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => {
                          const link = document.createElement('a');
                          const gridName = shuffleMode ? 'shuffle' : (grid?.name?.replace(/\s+/g, '-').toLowerCase() || 'results');
                          link.download = `blitzgrid-${gridName}-${Date.now()}.png`;
                          link.href = shareImageUrl;
                          link.click();
                          toast({ title: "Downloaded!", description: "Image saved to your device" });
                        }}
                        data-testid="button-download-image"
                      >
                        <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                        Download
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Question Modal - Clean hierarchy design */}
          <Dialog open={!!activeQuestion} onOpenChange={(open) => !open && handleCloseQuestion()}>
            <DialogContent 
              className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden arcade-surface backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl"
            >
              <AnimatePresence>
                {timerExpired && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: [0, 0.7, 0.4, 0.5, 0.3, 0],
                      }}
                      transition={{ duration: 4, times: [0, 0.04, 0.12, 0.3, 0.65, 1] }}
                      className="absolute inset-0 bg-red-600/40"
                    />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: [0, 1, 0.7, 1, 0.5, 0],
                        boxShadow: [
                          'none',
                          '0 0 100px 40px rgba(239, 68, 68, 0.9), 0 0 150px 70px rgba(239, 68, 68, 0.5)',
                          '0 0 50px 20px rgba(239, 68, 68, 0.5)',
                          '0 0 100px 40px rgba(239, 68, 68, 0.7)',
                          '0 0 30px 10px rgba(239, 68, 68, 0.3)',
                          'none',
                        ],
                      }}
                      transition={{ duration: 4, times: [0, 0.08, 0.3, 0.5, 0.75, 1] }}
                      className="absolute inset-0 rounded-2xl"
                    />

                    {[...Array(12)].map((_, i) => {
                      const angle = (i / 12) * 360;
                      const rad = (angle * Math.PI) / 180;
                      const dist = 120 + Math.random() * 80;
                      return (
                        <motion.div
                          key={`ember-${i}`}
                          initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                          animate={{
                            opacity: [1, 0.8, 0],
                            scale: [0.5, 1.2, 0],
                            x: Math.cos(rad) * dist,
                            y: Math.sin(rad) * dist,
                          }}
                          transition={{ duration: 1.5 + Math.random() * 0.5, delay: 0.05 + i * 0.03, ease: "easeOut" }}
                          className="absolute z-20"
                          style={{
                            width: 4 + Math.random() * 6,
                            height: 4 + Math.random() * 6,
                            borderRadius: '50%',
                            background: i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#ef4444' : '#fbbf24',
                            boxShadow: `0 0 ${6 + Math.random() * 8}px ${i % 3 === 0 ? '#f97316' : '#ef4444'}`,
                          }}
                        />
                      );
                    })}

                    <motion.div
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ 
                        scale: [0, 1.5, 1.1, 1.15, 1.0, 0],
                        rotate: [-15, 5, -3, 2, 0, 0],
                      }}
                      transition={{ duration: 4, times: [0, 0.08, 0.16, 0.28, 0.7, 1], ease: "easeOut" }}
                      className="relative z-10 flex flex-col items-center"
                    >
                      <motion.div
                        animate={{ 
                          x: [0, -6, 5, -4, 3, -2, 0],
                          y: [0, 3, -4, 2, -3, 1, 0],
                        }}
                        transition={{ duration: 0.5, repeat: 3, repeatDelay: 0.3 }}
                      >
                        <motion.div
                          animate={{ scale: [1, 1.4, 1], rotate: [0, -15, 15, -10, 10, 0] }}
                          transition={{ duration: 0.5, repeat: 4, repeatDelay: 0.15 }}
                        >
                          <Timer className="w-20 h-20 md:w-24 md:h-24 text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.9)] mb-3" />
                        </motion.div>
                      </motion.div>
                      <motion.h2 
                        className="text-5xl md:text-7xl font-black text-white uppercase tracking-widest"
                        style={{ 
                          textShadow: '0 0 40px rgba(239, 68, 68, 1), 0 0 80px rgba(239, 68, 68, 0.6), 0 0 120px rgba(239, 68, 68, 0.3), 0 4px 8px rgba(0,0,0,0.6)',
                        }}
                        animate={{
                          x: [0, -4, 3, -2, 0],
                          y: [0, 2, -2, 1, 0],
                        }}
                        transition={{ duration: 0.3, repeat: 4, repeatDelay: 0.2 }}
                      >
                        TIME'S UP!
                      </motion.h2>
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: '90%', opacity: [0, 1, 0.7] }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                        className="h-1.5 bg-gradient-to-r from-transparent via-red-500 to-transparent rounded-full mt-4"
                        style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.6)' }}
                      />
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: [0, 0.8, 0.6], y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                        className="text-red-300/80 text-sm md:text-base font-semibold mt-3 uppercase tracking-wider"
                        style={{ textShadow: '0 0 10px rgba(239, 68, 68, 0.5)' }}
                      >
                        <span className="flex items-center gap-1.5 justify-center"><Timer className="w-4 h-4 shrink-0" aria-hidden="true" /> No more time!</span>
                      </motion.p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              {(() => {
                // Use the grid's single color for consistency
                const category = playCategories.find(c => c.id === activeQuestion?.categoryId);
                const questionText = activeQuestion?.question || '';
                const questionLength = questionText.length;
                const neonColor = neonColorConfig[colorName];
                // Auto-size text based on question length
                const textSizeClass = questionLength < 50 ? 'text-2xl md:text-3xl' : 
                                      questionLength < 100 ? 'text-xl md:text-2xl' : 
                                      questionLength < 200 ? 'text-lg md:text-xl' : 'text-base md:text-lg';
                
                return (
                  <>
                    {/* Header: Category + Points + Timer */}
                    <DialogHeader className="pb-4 pr-10">
                      <div className="flex items-start justify-between gap-3">
                        {/* Category info - left side */}
                        <div className="flex-1 min-w-0">
                          <DialogTitle className="text-white text-lg font-semibold truncate" title={category?.name || 'Question'} data-testid="question-category-name">
                            {category?.name || 'Question'}
                          </DialogTitle>
                          <DialogDescription className="sr-only">
                            {activeQuestion?.points} point question from {category?.name || 'category'}
                          </DialogDescription>
                          <div className="flex items-center gap-2 mt-0.5">
                            {playCategories.length > 0 && (
                              <span className="text-white/40 text-xs font-medium" data-testid="question-counter">
                                {revealedCells.size + (showAnswer ? 0 : 1)}/{playCategories.length * 5}
                              </span>
                            )}
                            {category?.description && (
                              <span className="text-white/20">·</span>
                            )}
                            {category?.description && (
                              <span className="text-white/40 text-xs line-clamp-1 min-w-0 flex-1" title={category.description} data-testid="question-category-description">{category.description}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Timer + Points - right side */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Timer */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (timerActive) {
                                setTimerActive(false);
                                setTimeLeft(10);
                              } else {
                                setTimeLeft(10);
                                setTimerExpired(false);
                                setTimerActive(true);
                              }
                            }}
                            className={`gap-1.5 h-9 px-3 rounded-lg ${timerExpired ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : timerActive ? 'bg-white/15 text-white' : 'text-white/40 border border-white/20'}`}
                            data-testid="button-timer"
                          >
                            <Timer className="w-4 h-4 shrink-0" aria-hidden="true" />
                            {timerActive ? (
                              <span className={`font-mono font-bold text-base min-w-[2ch] shrink-0 ${timeLeft <= 3 ? 'text-red-400' : ''}`} data-testid="timer-value">{timeLeft}</span>
                            ) : timerExpired ? (
                              <span className="font-mono font-bold text-base text-red-400 shrink-0" data-testid="timer-value">0</span>
                            ) : (
                              <span className="text-sm shrink-0">10s</span>
                            )}
                          </Button>
                          
                          {/* Points badge */}
                          <div 
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0"
                            style={{ 
                              backgroundColor: `${neonColor.border}25`,
                              border: `2px solid ${neonColor.border}60`,
                            }}
                            data-testid="question-points-badge"
                          >
                            <span className="text-xl font-black shrink-0" style={{ color: neonColor.text }} data-testid="question-points-value">
                              {activeQuestion?.points}
                            </span>
                            <span className="text-xs text-white/50 uppercase shrink-0">pts</span>
                          </div>
                        </div>
                      </div>
                    </DialogHeader>
                    
                    {/* Question - THE HERO */}
                    <div className="py-8 px-2">
                      <div className={`${textSizeClass} text-center font-semibold text-white leading-relaxed`} data-testid="question-text">
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
                <div className="flex flex-col items-center gap-3 px-5 pb-4" data-testid="question-media-section">
                  {activeQuestion?.imageUrl && (
                    <img 
                      src={activeQuestion.imageUrl} 
                      alt="Question image"
                      className="max-w-full max-h-48 md:max-h-64 rounded-lg object-contain shadow-lg"
                      data-testid="question-image"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  {activeQuestion?.videoUrl && (
                    <video 
                      src={activeQuestion.videoUrl}
                      controls
                      className="max-w-full max-h-48 md:max-h-64 rounded-lg shadow-lg"
                      data-testid="question-video"
                      aria-label="Question video"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  {activeQuestion?.audioUrl && (
                    <audio 
                      src={activeQuestion.audioUrl}
                      controls
                      className="w-full max-w-sm"
                      data-testid="question-audio"
                      aria-label="Question audio"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
              )}
              
              {/* Buzzer Status - inline, compact */}
              {players.length > 0 && !showAnswer && buzzQueue.length === 0 && (
                <div className="mx-5 mb-4 flex items-center justify-center gap-3 py-2 px-4 bg-white/5 border border-white/10 rounded-full" data-testid="buzzer-status-waiting">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0 bg-secondary animate-pulse" data-testid="buzzer-waiting-dot" />
                    <span className="text-white/50 text-sm" data-testid="waiting-players-count">
                      {players.length} player{players.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Buzz Queue - players who buzzed */}
              {buzzQueue.length > 0 && !showAnswer && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mx-5 mb-4 bg-orange-500/10 border border-orange-400/40 rounded-xl p-3"
                  data-testid="buzz-queue-section"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                    <span className="text-sm text-orange-300 font-semibold" data-testid="buzz-queue-title">Buzzed</span>
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-400/40 text-xs ml-auto">
                      {activeQuestion?.points || 0} pts at stake
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {buzzQueue.map((buzz, index) => {
                      const player = players.find(p => p.id === buzz.playerId);
                      return (
                        <div 
                          key={buzz.playerId}
                          className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 ${
                            index === 0 ? 'bg-orange-500/20 border border-orange-400/60' : 'bg-white/5 border border-white/10'
                          }`}
                          data-testid={`buzz-queue-item-${buzz.playerId}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`text-sm font-bold shrink-0 ${index === 0 ? 'text-orange-400' : 'text-white/40'}`} data-testid={`buzz-position-${buzz.playerId}`}>
                              #{index + 1}
                            </span>
                            <span className={`font-medium truncate min-w-0 flex-1 ${index === 0 ? 'text-white' : 'text-white/60'}`} title={buzz.name} data-testid={`buzz-name-${buzz.playerId}`}>{buzz.name}</span>
                            <span className="text-xs text-white/40 shrink-0" data-testid={`buzz-score-${buzz.playerId}`}>({player?.score || 0})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {index === 0 ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs gap-1 px-2.5"
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
                                    } else {
                                      setBuzzQueue([]);
                                      unlockBuzzer();
                                    }
                                    setTimeout(() => setIsJudging(false), 300);
                                  }}
                                  data-testid={`button-wrong-${buzz.playerId}`}
                                >
                                  <X className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  Wrong (−{activeQuestion?.points || 0})
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-primary text-white text-xs gap-1 px-2.5"
                                  disabled={isJudging}
                                  onClick={() => {
                                    setIsJudging(true);
                                    lockBuzzer();
                                    const pts = activeQuestion?.points || 0;
                                    updatePlayerScore(buzz.playerId, pts, true, activeQuestion?.categoryId);
                                    sendFeedback(buzz.playerId, true, pts);
                                    setBuzzQueue([]);
                                    setTimeout(() => setIsJudging(false), 300);
                                  }}
                                  data-testid={`button-correct-${buzz.playerId}`}
                                >
                                  <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  Correct (+{activeQuestion?.points || 0})
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-orange-400/70" data-testid={`buzz-queue-next-${buzz.playerId}`}>next</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              
              {/* No players yet - subtle hint */}
              {players.length === 0 && !showAnswer && (
                <div className="mx-5 mb-4 flex items-center justify-center gap-2 py-2 text-white/30" data-testid="no-players-message">
                  <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <p className="text-xs" data-testid="no-players-text">No players connected</p>
                </div>
              )}
              
              {/* Answer Revealed */}
              <AnimatePresence>
                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mx-5 mb-4 rounded-xl p-4 text-center border"
                    style={{ 
                      backgroundColor: `${neonColorConfig[colorName].border}15`,
                      borderColor: `${neonColorConfig[colorName].border}50`,
                    }}
                    data-testid="answer-section"
                  >
                    <p 
                      className="text-xs font-medium uppercase tracking-wider mb-2 text-white/50"
                      data-testid="answer-label"
                    >
                      Answer
                    </p>
                    <div 
                      className="text-xl font-bold prose prose-lg max-w-none [&>p]:m-0 prose-invert"
                      style={{ color: neonColorConfig[colorName].text }}
                      data-testid="answer-text"
                    >
                      <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>
                        {activeQuestion?.correctAnswer || ''}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Answer Media */}
                    {(activeQuestion?.answerImageUrl || activeQuestion?.answerAudioUrl || activeQuestion?.answerVideoUrl) && (
                      <div className="flex flex-col items-center gap-3 mt-4" data-testid="answer-media-section">
                        {activeQuestion?.answerImageUrl && (
                          <img 
                            src={activeQuestion.answerImageUrl} 
                            alt="Answer image"
                            className="max-w-full max-h-48 md:max-h-64 rounded-lg object-contain shadow-lg"
                            data-testid="answer-image"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        {activeQuestion?.answerVideoUrl && (
                          <video 
                            src={activeQuestion.answerVideoUrl}
                            controls
                            autoPlay
                            className="max-w-full max-h-48 md:max-h-64 rounded-lg shadow-lg"
                            data-testid="answer-video"
                            aria-label="Answer video"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        {activeQuestion?.answerAudioUrl && (
                          <audio 
                            src={activeQuestion.answerAudioUrl}
                            controls
                            autoPlay
                            className="w-full max-w-sm"
                            data-testid="answer-audio"
                            aria-label="Answer audio"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Manual Scoring Panel (after answer revealed) */}
              {showAnswer && players.length > 0 && (
                <div className="mx-5 mb-4 bg-white/[0.03] border border-white/10 rounded-xl p-3" data-testid="manual-scoring-section">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span className="text-sm text-white/70 font-semibold">Award Points</span>
                    <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30 text-xs font-bold ml-auto">
                      {activeQuestion?.points || 0} pts
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {[...players].sort((a, b) => (b.connected ? 1 : 0) - (a.connected ? 1 : 0)).map(player => {
                      const pts = activeQuestion?.points || 0;
                      const avatarEmoji = PLAYER_AVATARS.find(a => a.id === player.avatar)?.emoji || PLAYER_AVATARS[0].emoji;
                      const alreadyScored = scoredPlayers[player.id];
                      return (
                        <div 
                          key={player.id}
                          className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${!player.connected ? 'opacity-40' : ''} ${alreadyScored ? 'bg-white/[0.02]' : 'hover:bg-white/5'}`}
                          data-testid={`player-scoring-row-${player.id}`}
                        >
                          <span className="text-lg shrink-0">{avatarEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-white/80 font-medium truncate block" title={player.name}>{player.name}</span>
                          </div>
                          {alreadyScored ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${alreadyScored === 'correct' ? 'text-emerald-400 bg-emerald-500/15' : 'text-red-400 bg-red-500/15'}`}>
                              {alreadyScored === 'correct' ? <><Check className="w-3 h-3 shrink-0" aria-hidden="true" /> +{pts}</> : <><X className="w-3 h-3 shrink-0" aria-hidden="true" /> −{pts}</>}
                            </span>
                          ) : (
                            <>
                              <span className="text-xs text-white/40 shrink-0 w-10 text-right">{player.score}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  updatePlayerScore(player.id, -pts, true, activeQuestion?.categoryId);
                                  sendFeedback(player.id, false, -pts);
                                  setScoredPlayers(prev => ({ ...prev, [player.id]: 'wrong' }));
                                  toast({ title: `−${pts} pts`, description: player.name, duration: 1500 });
                                }}
                                data-testid={`button-deduct-${player.id}`}
                              >
                                <X className="w-3 h-3 shrink-0" aria-hidden="true" />
                                Wrong
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs gap-1 bg-primary hover:bg-primary/90"
                                onClick={() => {
                                  updatePlayerScore(player.id, pts, true, activeQuestion?.categoryId);
                                  sendFeedback(player.id, true, pts);
                                  setScoredPlayers(prev => ({ ...prev, [player.id]: 'correct' }));
                                  toast({ title: `+${pts} pts`, description: player.name, duration: 1500 });
                                }}
                                data-testid={`button-award-${player.id}`}
                              >
                                <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
                                Correct
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Footer Actions */}
              <DialogFooter className="flex !justify-center gap-3 pt-4 mt-4 border-t border-white/10 sm:!justify-center">
                {lastScoreChange && (
                  <Button 
                    onClick={undoLastScore}
                    variant="ghost"
                    size="sm"
                    className="text-white/50"
                    data-testid="button-undo-score"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5 shrink-0" aria-hidden="true" /> Undo
                  </Button>
                )}
                {!showAnswer ? (
                  <Button 
                    onClick={handleRevealAnswer}
                    size="lg"
                    className="text-white font-semibold px-8"
                    style={{ 
                      backgroundColor: neonColorConfig[colorName].border,
                    }}
                    data-testid="button-reveal-answer"
                  >
                    <Eye className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" /> Show Answer
                  </Button>
                ) : (
                  <Button 
                    onClick={handleCloseQuestion}
                    size="lg"
                    className="text-white font-semibold px-8"
                    style={{ 
                      backgroundColor: neonColorConfig[colorName].border,
                    }}
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
          <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded text-sm">
            <div className="flex-1 min-w-0 flex items-center">
              <span className="font-medium text-xs text-muted-foreground mr-2 shrink-0">{points}pts:</span>
              <span className="truncate min-w-0 flex-1" title={existingQuestion.question}>{existingQuestion.question}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => setQuestionForms(prev => ({
                  ...prev,
                  [formKey]: {
                    question: existingQuestion.question,
                    correctAnswer: existingQuestion.correctAnswer,
                    options: existingQuestion.options || [],
                  }
                }))}
                data-testid={`button-edit-question-${existingQuestion.id}`}
              >
                <Pencil className="w-4 h-4 shrink-0" aria-hidden="true" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => deleteQuestionMutation.mutate(existingQuestion.id)}
                disabled={deleteQuestionMutation.isPending}
                data-testid={`button-delete-question-${existingQuestion.id}`}
              >
                <Trash2 className="w-4 h-4 text-destructive shrink-0" aria-hidden="true" />
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
              data-testid={`button-save-question-${category.id}-${points}`}
            >
              {saveQuestionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin shrink-0" aria-hidden="true" /> : <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
            </Button>
          </div>
        </div>
      );
    };
    
    return (
      <div className="min-h-screen flex flex-col bg-background" data-testid="page-blitzgrid-grid">
        <AppHeader minimal backHref="/" title={grid?.name || 'BlitzGrid'} />
        <main className="flex-1 flex flex-col max-w-6xl mx-auto px-4 py-6 w-full">
          <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
            <div>
              <p className="text-muted-foreground text-sm">
                {gridCategories.length}/5 categories · {grid?.questionCount || 0}/25 questions
              </p>
            </div>
            <div className="flex items-center gap-2">
              {grid?.isActive ? (
                <Badge variant="secondary" className="bg-primary/20 text-primary dark:text-primary">
                  <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" /> Ready
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" /> Incomplete
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
                  <Play className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" /> Play
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
                        {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" /> : "Create"}
                      </Button>
                      <Button variant="ghost" onClick={() => { setShowNewCategoryForm(false); setNewCategoryName(""); setNewCategoryDescription(""); }} data-testid="button-cancel-new-category">
                        <X className="w-4 h-4 shrink-0" aria-hidden="true" />
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
                    <Plus className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" /> Add Category ({gridCategories.length}/5)
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
                  <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4 shrink-0" aria-hidden="true" />
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
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <ChevronRight className={`w-4 h-4 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base truncate" title={category.name}>{category.name}</CardTitle>
                              <CardDescription className="text-xs">
                                {category.questionCount}/5 questions
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {category.questionCount >= 5 ? (
                              <Badge variant="secondary" className="bg-primary/20 text-primary dark:text-primary text-xs">Complete</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                                {5 - category.questionCount} needed
                              </Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (selectedGridId) removeCategoryMutation.mutate({ gridId: selectedGridId, categoryId: category.id });
                              }}
                              disabled={removeCategoryMutation.isPending}
                              data-testid={`button-remove-category-${category.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive shrink-0" aria-hidden="true" />
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
        </main>
      </div>
    );
  }

  // Grid picker mode - choosing next grid while room stays open
  if (gridPickerMode) {
    const startNextGrid = (gridId: number, gridName: string) => {
      setSelectedGridId(gridId);
      setPlayMode(true);
      setGridPickerMode(false);
      setShuffleMode(false); // Ensure shuffle mode is reset when picking a specific grid
      setRevealedCells(new Set());
      setRevealedCategoryCount(0);
      setCategoryRevealMode(true);
      // Reset timer state
      setTimerActive(false);
      setTimeLeft(10);
      // Reset buzzer state
      setBuzzQueue([]);
      setBuzzerLocked(true);
      setIsJudging(false);
      setLastScoreChange(null);
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
        <div className="max-w-6xl mx-auto px-4 py-6 w-full">
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
                  <Users className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span className="font-bold text-primary" data-testid="text-picker-player-count">{players.length}</span>
                  <span className="text-muted-foreground text-sm">player{players.length !== 1 ? 's' : ''} waiting</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={endSessionFromPicker} data-testid="button-end-session-picker">
                <Power className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" /> End Session
              </Button>
            </div>
          </motion.div>

          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Grid3X3 className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
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
                <AlertCircle className="w-12 h-12 text-yellow-500/50 mx-auto mb-4 shrink-0" aria-hidden="true" />
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
                // Use grid's stored color, or fallback to stable color based on grid ID (not position)
                const effectiveColor = grid.colorCode?.startsWith('#') ? null : grid.colorCode;
                const colorConfig = getBoardColorConfig(effectiveColor || BOARD_COLORS[grid.id % BOARD_COLORS.length]);
                return (
                  <Card
                    key={grid.id}
                    className={`hover-elevate cursor-pointer transition-all border bg-gradient-to-br ${colorConfig.card}`}
                    onClick={() => startNextGrid(grid.id, grid.name)}
                    data-testid={`card-picker-grid-${grid.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 min-w-0 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorConfig.bg}`}>
                          <Grid3X3 className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
                        </div>
                        <h3 className={`font-semibold truncate min-w-0 flex-1 ${colorConfig.cardTitle}`} data-testid={`text-picker-grid-name-${grid.id}`} title={grid.name}>{grid.name}</h3>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm ${colorConfig.cardSub}`} data-testid={`text-picker-grid-stats-${grid.id}`}>
                          {grid.categoryCount} categories · {grid.questionCount} questions
                        </p>
                        <Badge variant="secondary" className="text-xs shrink-0" data-testid={`badge-picker-grid-play-${grid.id}`}>
                          <Play className="w-3 h-3 mr-1 shrink-0" aria-hidden="true" /> Play
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

  // Grid card component - retro gaming design with varied neon colors
  const GridCard = ({ grid, index }: { grid: typeof activeGrids[0], index: number }) => {
    const [isHovered, setIsHovered] = useState(false);
    // Use grid's stored color, or fallback to stable color based on grid ID (not position)
    const effectiveColor = grid.colorCode?.startsWith('#') ? null : grid.colorCode;
    const colorKey = effectiveColor as BoardColor || BOARD_COLORS[grid.id % BOARD_COLORS.length];
    const neonColor = neonColorConfig[colorKey];
    
    return (
      <motion.button
        key={grid.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          setSelectedGridId(grid.id);
          setPlayMode(true);
          setShuffleMode(false); // Ensure shuffle mode is reset when playing a specific grid
          setRevealedCells(new Set());
          setRevealedCategoryCount(0);
          setCategoryRevealMode(true);
          // Reset timer state
          setTimerActive(false);
          setTimeLeft(10);
          // Reset buzzer state
          setBuzzQueue([]);
          setBuzzerLocked(true);
          setIsJudging(false);
          setLastScoreChange(null);
          setActiveQuestion(null);
          setGameStats({
            playerStats: new Map(),
            totalQuestions: 0,
            startTime: Date.now(),
            mvpMoments: []
          });
          setShowAnswer(false);
        }}
        className="group text-left p-5 rounded-xl arcade-surface transition-all duration-200"
        style={{
          border: `1px solid ${isHovered ? neonColor.border : 'var(--arcade-border)'}`,
          boxShadow: isHovered 
            ? `0 0 25px ${neonColor.glow}, 0 0 40px ${neonColor.shadowColor}, inset 0 0 0 1px ${neonColor.border}` 
            : `0 0 8px ${neonColor.glow}`,
        }}
        data-testid={`card-grid-${grid.id}`}
      >
        <div className="flex items-center gap-3">
          {/* Icon with color-matched glow */}
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              border: `2px solid ${neonColor.border}`,
              boxShadow: isHovered ? `0 0 15px ${neonColor.shadowColor}` : `0 0 8px ${neonColor.glow}`,
            }}
          >
            <Grid3X3 className="w-6 h-6 shrink-0" style={{ color: neonColor.icon }} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 
              className="font-black truncate uppercase tracking-wide transition-colors duration-200 text-base"
              style={{ 
                fontFamily: "'Archivo Black', 'Impact', sans-serif",
                color: isHovered ? neonColor.text : 'var(--arcade-text)',
                textShadow: isHovered ? `0 0 12px ${neonColor.shadowColor}` : 'none',
              }}
              title={grid.name}
            >
              {grid.name}
            </h3>
            {grid.description && grid.description !== "BlitzGrid" && (
              <p className="text-xs text-white/40 mt-1 truncate" title={grid.description}>
                {grid.description}
              </p>
            )}
          </div>
        </div>
      </motion.button>
    );
  };

  // Main grid list view
  return (
    <div className="min-h-screen arcade-bg flex flex-col relative" data-testid="page-blitzgrid">
      {/* Scanline background pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute w-full h-full opacity-[0.03]"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.5) 2px,
              rgba(255, 255, 255, 0.5) 4px
            )`,
          }}
        />
        {/* Subtle color gradients - magenta for Blitzgrid */}
        <div 
          className="absolute w-full h-full"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232, 121, 249, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 100% 100%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)
            `,
          }}
        />
      </div>
      
      <AppHeader minimal backHref="/" title="BlitzGrid" />
      
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 relative z-10 w-full">
        {loadingGrids ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl arcade-surface border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : activeGrids.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div 
              className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-5"
              style={{ border: '2px solid var(--arcade-border)' }}
            >
              <Grid3X3 className="w-10 h-10 text-white/30 shrink-0" aria-hidden="true" />
            </div>
            <h3 
              className="text-2xl font-black mb-3 text-white uppercase tracking-wide"
              style={{ 
                fontFamily: "'Archivo Black', 'Impact', sans-serif",
                textShadow: '0 0 10px rgba(232, 121, 249, 0.3)',
              }}
            >
              No Grids Yet
            </h3>
            <p className="text-white/50 max-w-sm mx-auto mb-6">
              Time to build your first trivia battleground
            </p>
            <Link href="/admin/games">
              <Button
                className="bg-gradient-to-r from-primary to-primary text-white font-bold uppercase tracking-wide"
                data-testid="button-create-first-grid"
              >
                <Grid3X3 className="w-4 h-4 mr-2 shrink-0" aria-hidden="true" />
                Create Your First Grid
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Shuffle Play Hero - Full Width Bar */}
              {(() => {
                // Calculate total available categories from eligible grids only
                const totalAvailableCategories = eligibleShuffleGrids.reduce((sum, g) => sum + (g.categoryCount || 0), 0);
                const playedCount = playedShuffleCategoryIds.length;
                const remainingCount = Math.max(0, totalAvailableCategories - playedCount);
                
                return (
                  <div className="space-y-2">
                    <motion.button
                      onClick={handleShufflePlay}
                      disabled={isShuffling || remainingCount < 5}
                      className="w-full flex items-center justify-between gap-4 p-5 rounded-xl text-left relative overflow-hidden group hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.12) 0%, rgba(6, 182, 212, 0.06) 100%)',
                        border: '1px solid rgba(34, 211, 238, 0.4)',
                      }}
                      data-testid="button-shuffle-play"
                    >
                      {/* Animated background pulse */}
                      <motion.div 
                        className="absolute inset-0 rounded-xl"
                        animate={{
                          boxShadow: [
                            'inset 0 0 20px rgba(34, 211, 238, 0.1), 0 0 20px rgba(34, 211, 238, 0.15)',
                            'inset 0 0 30px rgba(34, 211, 238, 0.2), 0 0 40px rgba(34, 211, 238, 0.25)',
                            'inset 0 0 20px rgba(34, 211, 238, 0.1), 0 0 20px rgba(34, 211, 238, 0.15)',
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      {/* Scanning light effect */}
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-secondary/20 to-transparent"
                        animate={{
                          x: ['-100%', '200%'],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                          repeatDelay: 1,
                        }}
                      />
                      
                      <div className="relative flex items-center gap-4">
                        <motion.div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                          }}
                          animate={{
                            boxShadow: [
                              '0 0 15px rgba(34, 211, 238, 0.5)',
                              '0 0 30px rgba(34, 211, 238, 0.8)',
                              '0 0 15px rgba(34, 211, 238, 0.5)',
                            ],
                            scale: [1, 1.05, 1],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          {isShuffling ? (
                            <Loader2 className="w-6 h-6 text-black animate-spin shrink-0" aria-hidden="true" />
                          ) : (
                            <Shuffle className="w-6 h-6 text-black shrink-0" aria-hidden="true" />
                          )}
                        </motion.div>
                        <div>
                          <h3 
                            className="font-black uppercase tracking-wide text-lg text-secondary transition-colors"
                            style={{ 
                              fontFamily: "'Archivo Black', 'Impact', sans-serif",
                              textShadow: '0 0 15px rgba(34, 211, 238, 0.5)',
                            }}
                          >
                            I'm Feeling Lucky
                          </h3>
                          <p className="text-white/40 text-sm">
                            Random mix from all your grids
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative text-right">
                        {totalAvailableCategories > 0 ? (
                          <span className="text-white/40 text-sm" data-testid="text-shuffle-stats">
                            {playedCount} of {totalAvailableCategories} played
                          </span>
                        ) : (
                          <span className="text-secondary/60 text-sm">
                            Try your luck
                          </span>
                        )}
                      </div>
                    </motion.button>
                    
                    {/* Reset button - separate from shuffle button */}
                    {playedCount > 0 && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPlayedShuffleCategoryIds([]);
                            try {
                              sessionStorage.removeItem(SHUFFLE_STORAGE_KEY);
                            } catch {
                              // Ignore storage errors
                            }
                            toast({ title: "Reset", description: "All categories available again" });
                          }}
                          className="text-secondary hover:text-secondary text-xs"
                          data-testid="button-shuffle-reset"
                        >
                          <RotateCcw className="w-3 h-3 mr-1.5 shrink-0" aria-hidden="true" />
                          Reset played categories
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>

            {/* My Grids Section */}
            {myGrids.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* Section header */}
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest whitespace-nowrap">My Grids</h2>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
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
                {/* Section header */}
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest whitespace-nowrap flex flex-wrap items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    Starter Packs
                  </h2>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {starterPacks.map((grid, index) => (
                    <GridCard key={grid.id} grid={grid} index={index} />
                  ))}
                </div>
              </motion.section>
            )}
          </div>
        )}
      </main>
      
      {/* Floating Help Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-20 right-4 z-40 rounded-full shadow-lg bg-background/80 backdrop-blur-sm"
        onClick={() => setShowRules(true)}
        title="How to Play"
        data-testid="button-rules-blitzgrid"
      >
        <HelpCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
      </Button>
      
      <GameRulesSheet 
        gameSlug="blitzgrid" 
        open={showRules} 
        onOpenChange={setShowRules} 
      />
      
      {/* Shuffle Grid Picker Dialog - outside conditional blocks so it's always accessible */}
      <Dialog open={showShuffleGridPicker} onOpenChange={(open) => {
        if (!open) {
          // Restore original selection when dialog is closed without confirming
          setSelectedShuffleGridIds(originalShuffleGridIds);
        }
        setShowShuffleGridPicker(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-title-shuffle">
              <Shuffle className="w-5 h-5 text-secondary" />
              Select Grids to Shuffle
            </DialogTitle>
            <DialogDescription data-testid="dialog-description-shuffle">
              Pick which grids to include. Categories will be randomly mixed from your selection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[300px] overflow-y-auto py-2">
            {eligibleShuffleGrids.map(grid => {
              const isSelected = selectedShuffleGridIds.has(grid.id) && eligibleShuffleGridIds.has(grid.id);
              return (
                <label 
                  key={grid.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedShuffleGridIds);
                      if (checked) {
                        newSet.add(grid.id);
                      } else {
                        newSet.delete(grid.id);
                      }
                      setSelectedShuffleGridIds(newSet);
                    }}
                    data-testid={`checkbox-grid-${grid.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid={`text-grid-name-${grid.id}`}>{grid.name}</p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-grid-categories-${grid.id}`}>
                      {grid.categoryCount || 0} categories
                    </p>
                  </div>
                </label>
              );
            })}
            {eligibleShuffleGrids.length === 0 && (
              <p className="text-center text-muted-foreground py-4" data-testid="text-no-grids">
                No grids with categories available
              </p>
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const selectedEligibleCount = Array.from(selectedShuffleGridIds).filter(id => eligibleShuffleGridIds.has(id)).length;
                const allSelected = selectedEligibleCount === eligibleShuffleGridIds.size;
                setSelectedShuffleGridIds(allSelected ? new Set() : new Set(eligibleShuffleGridIds));
              }}
              data-testid="button-toggle-all-grids"
            >
              {(() => {
                const selectedEligibleCount = Array.from(selectedShuffleGridIds).filter(id => eligibleShuffleGridIds.has(id)).length;
                return selectedEligibleCount === eligibleShuffleGridIds.size ? 'Deselect All' : 'Select All';
              })()}
            </Button>
            <Button
              onClick={() => {
                const validIds = Array.from(selectedShuffleGridIds).filter(id => eligibleShuffleGridIds.has(id));
                executeShufflePlay(validIds);
              }}
              disabled={Array.from(selectedShuffleGridIds).filter(id => eligibleShuffleGridIds.has(id)).length === 0 || isShuffling}
              className="gap-2"
              data-testid="button-start-shuffle"
            >
              {isShuffling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shuffle className="w-4 h-4" />
              )}
              {(() => {
                const count = Array.from(selectedShuffleGridIds).filter(id => eligibleShuffleGridIds.has(id)).length;
                return `Shuffle (${count} grid${count !== 1 ? 's' : ''})`;
              })()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <AppFooter />
    </div>
  );
}
