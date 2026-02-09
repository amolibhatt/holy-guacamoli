import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, Wifi, WifiOff, Trophy, Crown, Search, Loader2, Star, TrendingUp, Volume2, VolumeX, Users, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { soundManager } from "@/lib/sounds";
import { PLAYER_AVATARS, type AvatarId } from "@shared/schema";
import { Logo } from "@/components/Logo";
import { InstallPrompt } from "@/components/InstallPrompt";

function FullScreenFlash({ show, color }: { show: boolean; color: string }) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!show || prefersReducedMotion) return null;
  return (
    <motion.div
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`fixed inset-0 z-50 pointer-events-none ${color}`}
    />
  );
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error" | "reconnecting";
type GamePhase = "waiting" | "searching" | "submitted" | "voting" | "voted" | "reveal" | "gameComplete";

interface GiphyGif {
  id: string;
  title: string;
  previewUrl: string;
  fullUrl: string;
}

interface VotingSubmission {
  id: string;
  gifUrl: string;
  gifTitle: string;
}

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
}

function getSession() {
  try {
    const data = localStorage.getItem("meme-session");
    if (data) return JSON.parse(data);
    return null;
  } catch { return null; }
}

function saveSession(roomCode: string, playerName: string, playerId: string, avatar: string, reconnectToken?: string) {
  try {
    localStorage.setItem("meme-session", JSON.stringify({ roomCode, playerName, playerId, avatar, reconnectToken }));
  } catch {}
}

function clearSession() {
  try { localStorage.removeItem("meme-session"); } catch {}
}

export default function MemeNoHarmPlayer() {
  const params = useParams<{ code?: string }>();
  const { toast } = useToast();
  const savedSession = getSession();

  const hasCodeFromUrl = !!params.code;
  const [roomCode, setRoomCode] = useState(params.code || savedSession?.roomCode || "");
  const [playerName, setPlayerName] = useState(savedSession?.playerName || "");
  const { profile } = usePlayerProfile(playerName);
  const [playerId, setPlayerId] = useState<string | null>(savedSession?.playerId || null);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(savedSession?.avatar || "cat");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [joined, setJoined] = useState(false);
  const joinedRef = useRef(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [phase, setPhase] = useState<GamePhase>("waiting");

  const [prompt, setPrompt] = useState("");
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GiphyGif[]>([]);
  const [trendingGifs, setTrendingGifs] = useState<GiphyGif[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedGif, setSelectedGif] = useState<GiphyGif | null>(null);
  const [votingSubmissions, setVotingSubmissions] = useState<VotingSubmission[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [winner, setWinner] = useState<LeaderboardEntry | null>(null);
  const [roundWinnerId, setRoundWinnerId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showWinFlash, setShowWinFlash] = useState(false);
  const [showSubmitFlash, setShowSubmitFlash] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  const prevScoreRef = useRef(0);

  const wsRef = useRef<WebSocket | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerIdRef = useRef<string | null>(playerId);
  const reconnectTokenRef = useRef<string | null>(savedSession?.reconnectToken || null);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch("/api/giphy/trending?limit=12");
      if (res.ok) {
        const data = await res.json();
        setTrendingGifs(data.results || []);
      }
    } catch {}
  }, []);

  const searchGiphy = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/giphy/search?q=${encodeURIComponent(query)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch {}
    setIsSearching(false);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchGiphy(value);
    }, 400);
  };

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
        type: "meme:player:join",
        code: roomCode.toUpperCase(),
        name: playerName,
        avatar: selectedAvatar,
        playerId: playerIdRef.current || undefined,
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
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "meme:joined":
          setJoined(true);
          joinedRef.current = true;
          setPlayerId(data.playerId);
          playerIdRef.current = data.playerId;
          if (data.reconnectToken) reconnectTokenRef.current = data.reconnectToken;
          saveSession(roomCode.toUpperCase(), playerName, data.playerId, selectedAvatar, data.reconnectToken || reconnectTokenRef.current || undefined);
          if (data.score !== undefined) {
            setMyScore(data.score);
            prevScoreRef.current = data.score;
          }
          setPhase("waiting");
          break;

        case "meme:round:start":
          setPrompt(data.prompt);
          setRound(data.round);
          setTotalRounds(data.totalRounds);
          setSelectedGif(null);
          setSearchQuery("");
          setSearchResults([]);
          submittedRef.current = false;
          votedRef.current = false;
          setPhase("searching");
          fetchTrending();
          soundManager.play('whoosh', 0.4);
          try { navigator.vibrate?.(50); } catch {}
          break;

        case "meme:voting:start":
          setVotingSubmissions(data.submissions);
          setPrompt(data.prompt);
          votedRef.current = false;
          setPhase("voting");
          soundManager.play('chime', 0.4);
          try { navigator.vibrate?.(40); } catch {}
          break;

        case "meme:reveal": {
          const prevScore = prevScoreRef.current;
          const newScore = data.myScore;
          setMyScore(newScore);
          prevScoreRef.current = newScore;
          setLeaderboard(data.leaderboard);
          setRoundWinnerId(data.roundWinnerId);
          setPhase("reveal");
          if (newScore > prevScore) {
            const diff = newScore - prevScore;
            toast({ title: `+${diff} points!`, description: "Great round!", duration: 2000 });
          }
          if (data.roundWinnerId === playerIdRef.current) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#FFD700', '#FFA500', '#FF6B6B', '#9B59B6', '#3498DB'] });
            soundManager.play('fanfare', 0.6);
            try { navigator.vibrate?.([100, 50, 100, 50, 200]); } catch {}
            setShowWinFlash(true);
            setTimeout(() => setShowWinFlash(false), 500);
          } else {
            soundManager.play('reveal', 0.4);
          }
          break;
        }

        case "meme:sittingOut":
          toast({ title: "You're sitting out this round", description: "The host has benched you for now." });
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
          }
          setPhase("waiting");
          break;

        case "meme:unsittingOut":
          toast({ title: "You're back in!", description: "The host has brought you back into the game." });
          soundManager.play('pop', 0.4);
          if (data.phase === 'reveal' && data.results) {
            setMyScore(data.myScore);
            prevScoreRef.current = data.myScore;
            setLeaderboard(data.leaderboard);
            setRoundWinnerId(data.roundWinnerId);
            setPhase("reveal");
            if (data.roundWinnerId === playerIdRef.current) {
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
          } else if (data.phase === 'gameComplete' && data.leaderboard) {
            setMyScore(data.myScore);
            prevScoreRef.current = data.myScore;
            setLeaderboard(data.leaderboard);
            setWinner(data.winner);
            setPhase("gameComplete");
            if (data.winner?.playerId === playerIdRef.current) {
              confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
            }
          } else if (data.phase === 'voting' && data.submissions) {
            setVotingSubmissions(data.submissions);
            setPrompt(data.prompt || '');
            votedRef.current = false;
            setPhase("voting");
          } else if (data.prompt && data.round > 0) {
            setPrompt(data.prompt);
            setRound(data.round);
            setTotalRounds(data.totalRounds);
            setSelectedGif(null);
            setSearchQuery("");
            setSearchResults([]);
            submittedRef.current = false;
            votedRef.current = false;
            setPhase("searching");
            fetchTrending();
          }
          break;

        case "meme:gameComplete": {
          const prevScoreGC = prevScoreRef.current;
          const newScoreGC = data.myScore;
          setMyScore(newScoreGC);
          prevScoreRef.current = newScoreGC;
          setLeaderboard(data.leaderboard);
          setWinner(data.winner);
          setPhase("gameComplete");
          if (newScoreGC > prevScoreGC) {
            const diff = newScoreGC - prevScoreGC;
            toast({ title: `+${diff} points!`, description: "Final round scored!", duration: 2000 });
          }
          if (data.winner?.playerId === playerIdRef.current) {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#FFD700', '#FFA500', '#FF6B6B', '#9B59B6', '#3498DB'] });
            soundManager.play('victory', 0.6);
            try { navigator.vibrate?.([100, 50, 100, 50, 200]); } catch {}
          } else {
            soundManager.play('applause', 0.4);
          }
          break;
        }

        case "meme:phaseSync":
          if (data.phase === 'submitted') {
            submittedRef.current = true;
            setPhase("submitted");
          } else if (data.phase === 'voted') {
            votedRef.current = true;
            setPhase("voted");
          }
          break;

        case "pong":
          break;

        case "host:disconnected":
          toast({ title: "Host disconnected", description: "Waiting for host to reconnect...", variant: "destructive" });
          break;

        case "host:reconnected":
          toast({ title: "Host reconnected", description: "Game continues!" });
          break;

        case "kicked":
          clearSession();
          if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
          if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = null; }
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          setPhase("waiting");
          setReconnectCountdown(null);
          toast({
            title: "Removed from game",
            description: "The host removed you from the game.",
            variant: "destructive",
          });
          break;

        case "room:closed":
          clearSession();
          if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
          if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = null; }
          setJoined(false);
          joinedRef.current = false;
          shouldReconnectRef.current = false;
          setStatus("disconnected");
          setPhase("waiting");
          setReconnectCountdown(null);
          toast({
            title: "Game ended",
            description: data.reason || "The game room has been closed.",
            variant: "destructive",
          });
          break;

        case "error":
          if (data.message === "Room not found") {
            shouldReconnectRef.current = false;
            clearSession();
            if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
            if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
            if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
            if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = null; }
            setJoined(false);
            joinedRef.current = false;
            setStatus("disconnected");
            setPhase("waiting");
            setReconnectCountdown(null);
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
            clearSession();
            if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
            if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
            if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
            if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = null; }
            reconnectTokenRef.current = null;
            playerIdRef.current = null;
            setPlayerId(null);
            setJoined(false);
            joinedRef.current = false;
            setStatus("disconnected");
            setPhase("waiting");
            setReconnectCountdown(null);
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
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

      if (!joinedRef.current || !shouldReconnectRef.current) {
        setStatus("disconnected");
        return;
      }

      const attempts = reconnectAttemptsRef.current;
      if (attempts >= 5) {
        setStatus("disconnected");
        return;
      }

      setStatus("reconnecting");
      reconnectAttemptsRef.current = attempts + 1;
      setReconnectAttempts(attempts + 1);

      const delay = Math.min(2000 * Math.pow(1.5, attempts), 15000);
      const seconds = Math.ceil(delay / 1000);
      setReconnectCountdown(seconds);

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      let remaining = seconds;
      countdownIntervalRef.current = setInterval(() => {
        remaining--;
        setReconnectCountdown(remaining);
        if (remaining <= 0 && countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }, 1000);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect(true);
      }, delay);
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [roomCode, playerName, selectedAvatar, fetchTrending, toast]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = soundManager.subscribe(() => {
      setSoundEnabled(soundManager.isEnabled());
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (hasCodeFromUrl && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [hasCodeFromUrl]);

  const submittedRef = useRef(false);
  const votedRef = useRef(false);

  const submitGif = () => {
    if (!selectedGif || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || submittedRef.current) return;
    submittedRef.current = true;
    wsRef.current.send(JSON.stringify({
      type: "meme:player:submit",
      gifUrl: selectedGif.fullUrl,
      gifTitle: selectedGif.title,
    }));
    setPhase("submitted");
    soundManager.play('pop', 0.4);
    try { navigator.vibrate?.(30); } catch {}
    setShowSubmitFlash(true);
    setTimeout(() => setShowSubmitFlash(false), 400);
  };

  const submitVote = (votedForId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || votedRef.current) return;
    votedRef.current = true;
    wsRef.current.send(JSON.stringify({
      type: "meme:player:vote",
      votedForId,
    }));
    setPhase("voted");
    soundManager.play('click', 0.3);
    try { navigator.vibrate?.(30); } catch {}
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
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (searchTimeoutRef.current) { clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = null; }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearSession();
    setJoined(false);
    setPlayerId(null);
    playerIdRef.current = null;
    setStatus("disconnected");
    setPhase("waiting");
    setMyScore(0);
    prevScoreRef.current = 0;
    setLeaderboard([]);
    setWinner(null);
    setPrompt("");
    setRound(0);
    setTotalRounds(0);
    setSearchQuery("");
    setSearchResults([]);
    setTrendingGifs([]);
    setSelectedGif(null);
    setVotingSubmissions([]);
    setRoundWinnerId(null);
    setShowLeaderboard(false);
    setReconnectAttempts(0);
    reconnectAttemptsRef.current = 0;
    setReconnectCountdown(null);
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

  const handleToggleSound = () => {
    soundManager.toggle();
  };

  const gifsToShow = searchQuery.trim() ? searchResults : trendingGifs;

  const renderGameHeader = () => (
    <>
      <InstallPrompt />
      <FullScreenFlash show={showWinFlash} color="bg-emerald-400/60" />
      <FullScreenFlash show={showSubmitFlash} color="bg-green-400/40" />

      <header className="px-4 py-3 flex items-center justify-between gap-2 bg-green-950/80 backdrop-blur-xl border-b border-green-500/20 shadow-lg" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          {status === "connected" && <Wifi className="w-4 h-4 text-emerald-400 shrink-0" data-testid="status-connected" />}
          {status === "connecting" && <RefreshCw className="w-4 h-4 animate-spin text-green-400 shrink-0" data-testid="status-connecting" />}
          {status === "reconnecting" && <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" data-testid="status-reconnecting" />}
          {(status === "disconnected" || status === "error") && <WifiOff className="w-4 h-4 text-rose-400 shrink-0" data-testid="status-disconnected" />}
          <span className="font-mono font-bold text-lg text-white" data-testid="display-room-code">{roomCode}</span>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            key={myScore}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="px-4 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full"
          >
            <span className="text-2xl font-black text-green-400" data-testid="text-player-score">{myScore}</span>
            <span className="text-xs text-green-200/50 ml-1">pts</span>
          </motion.div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleSound}
            className="text-white/60"
            data-testid="button-toggle-sound"
            aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleLeaveGame} className="text-xs text-white/40" data-testid="button-leave-game">
            Leave
          </Button>
        </div>
      </header>

      <div className="px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-500/10 flex items-center justify-between gap-2">
        <span className="text-lg font-bold text-white truncate min-w-0 flex-1" title={playerName}>{playerName}</span>
        {leaderboard.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="gap-1 text-xs text-green-200/60 flex-shrink-0"
            data-testid="button-toggle-leaderboard"
          >
            <Users className="w-4 h-4" />
            Scores
            {showLeaderboard ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showLeaderboard && leaderboard.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-green-950/50 border-b border-green-500/10 space-y-2">
              <p className="text-xs text-green-200/40 font-medium uppercase tracking-wide">Leaderboard</p>
              {[...leaderboard].sort((a, b) => b.score - a.score).map((entry, idx) => (
                <div
                  key={entry.playerId}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    entry.playerId === playerId ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5'
                  }`}
                  data-testid={`leaderboard-player-${entry.playerId}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/50'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-lg flex-shrink-0">
                      {PLAYER_AVATARS.find(a => a.id === entry.playerAvatar)?.emoji || PLAYER_AVATARS[0].emoji}
                    </span>
                    <span className={`font-medium truncate min-w-0 flex-1 ${entry.playerId === playerId ? 'text-green-300' : 'text-white/70'}`} title={entry.playerName}>
                      {entry.playerName}
                      {entry.playerId === playerId && <span className="text-xs ml-1">(you)</span>}
                    </span>
                  </div>
                  <span className="font-bold text-white flex-shrink-0">{entry.score}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {status === "reconnecting" && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 text-center text-sm text-white">
          <RefreshCw className="w-4 h-4 inline-block mr-2 animate-spin" />
          Reconnecting in {reconnectCountdown ?? '...'}s... (Attempt {reconnectAttempts}/5)
        </div>
      )}

      {status === "disconnected" && joined && (
        <div className="bg-rose-500/20 border-b border-rose-500/30 px-4 py-3 text-center">
          <p className="text-sm text-white mb-2">
            {reconnectAttempts >= 5
              ? "Couldn't reconnect - tap below to try again"
              : "Disconnected from game"}
          </p>
          <Button
            size="sm"
            onClick={handleManualReconnect}
            className="gap-2"
            data-testid="button-reconnect"
          >
            <RefreshCw className="w-4 h-4" />
            Reconnect
          </Button>
        </div>
      )}
    </>
  );

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-join">
        <div className="w-full flex justify-center pt-3 pb-1">
          <Logo size="compact" />
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-6">
              <Smile className="w-12 h-12 text-green-400 mx-auto mb-2" />
              <h1 className="text-2xl font-bold text-white">
                {hasCodeFromUrl ? "You're Invited!" : "Meme No Harm"}
              </h1>
              <p className="text-green-200/60 text-sm">
                {hasCodeFromUrl ? "Just enter your name to join" : "Search GIFs. Submit. Vote. Win."}
              </p>
            </div>

            <Card className="bg-white/10 border-white/20">
              <CardContent className="pt-6">
                <form onSubmit={handleJoin} className="space-y-4">
                  {hasCodeFromUrl ? (
                    <div className="text-center py-3 px-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-xs text-green-200/60 uppercase tracking-wide mb-1">Room Code</p>
                      <p className="text-3xl font-mono font-bold text-green-400 tracking-widest" data-testid="display-room-code">{roomCode}</p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-green-200 mb-1.5 block">Room Code</label>
                      <Input
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="Enter room code"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center text-2xl tracking-widest font-mono"
                        maxLength={4}
                        required
                        data-testid="input-room-code"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-green-200 mb-1.5 block">Your Name</label>
                    <Input
                      ref={nameInputRef}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter your name"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      maxLength={20}
                      required
                      data-testid="input-player-name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-green-200 mb-1.5 block">Pick Your Avatar</label>
                    <div className="grid grid-cols-6 gap-2">
                      {PLAYER_AVATARS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setSelectedAvatar(avatar.id)}
                          className={`p-2 rounded-lg text-2xl transition-all ${
                            selectedAvatar === avatar.id
                              ? "bg-green-500/30 ring-2 ring-green-400"
                              : "bg-white/5"
                          }`}
                          data-testid={`button-avatar-${avatar.id}`}
                          aria-label={`Select ${avatar.label} avatar`}
                        >
                          {avatar.emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={status === "connecting"}
                    data-testid="button-join-game"
                  >
                    {status === "connecting" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Join Game"
                    )}
                  </Button>
                </form>
                <div className="flex justify-center mt-4">
                  {status === "connected" ? (
                    <div className="flex items-center gap-1.5 text-sm text-green-300">
                      <Wifi className="w-3.5 h-3.5" />
                      <span>Connected</span>
                    </div>
                  ) : status === "error" ? (
                    <div className="flex items-center gap-1.5 text-sm text-red-400">
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Connection error</span>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === "gameComplete") {
    const myRank = leaderboard.findIndex(e => e.playerId === playerId) + 1;
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-complete">
        <div className="w-full flex justify-center pt-3 pb-1">
          <Logo size="compact" />
        </div>
        {renderGameHeader()}
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full p-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center mb-6">
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-3" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-1">Game Over!</h2>
            <p className="text-green-200/60">You finished #{myRank} with {myScore} points</p>
          </motion.div>

          <Card className="bg-white/10 border-white/20 w-full">
            <CardContent className="pt-4">
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <motion.div
                    key={entry.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      entry.playerId === playerId ? 'bg-green-500/20 text-green-300' :
                      i === 0 ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-white/5 text-white/70'
                    }`}
                    data-testid={`player-result-${entry.playerId}`}
                  >
                    <span className="flex items-center gap-2">
                      {i === 0 && <Crown className="w-4 h-4 text-yellow-400" />}
                      <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/50'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-lg flex-shrink-0">
                        {PLAYER_AVATARS.find(a => a.id === entry.playerAvatar)?.emoji || PLAYER_AVATARS[0].emoji}
                      </span>
                      <span className="truncate min-w-0 flex-1">{entry.playerName}</span>
                    </span>
                    <span className="font-bold">{entry.score}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "reveal") {
    const myRank = leaderboard.findIndex(e => e.playerId === playerId) + 1;
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-player-reveal">
        <div className="w-full flex justify-center pt-3 pb-1">
          <Logo size="compact" />
        </div>
        {renderGameHeader()}
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full p-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
            {roundWinnerId === playerId ? (
              <>
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  <Star className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
                </motion.div>
                <h2 className="text-2xl font-bold text-yellow-300">You won this round!</h2>
              </>
            ) : (
              <h2 className="text-xl font-bold text-white">Round Results</h2>
            )}
          </motion.div>

          <Card className="bg-white/10 border-white/20 w-full mb-4">
            <CardContent className="pt-4 text-center">
              <motion.p
                key={myScore}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-green-400 text-3xl font-black"
              >
                {myScore} pts
              </motion.p>
              <p className="text-white/40 text-sm">Rank #{myRank}</p>
            </CardContent>
          </Card>

          <motion.div
            className="flex items-center gap-2 text-white/40"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
          </motion.div>
          <p className="text-white/40 text-sm text-center mt-2">Waiting for host to start next round...</p>
        </div>
      </div>
    );
  }

  if (phase === "voted") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-voted">
        <div className="w-full flex justify-center pt-3 pb-1">
          <Logo size="compact" />
        </div>
        {renderGameHeader()}
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Star className="w-10 h-10 text-green-400" />
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">Vote Cast!</h2>
            <p className="text-white/50">Waiting for everyone to vote...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === "voting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-player-voting">
        <div className="w-full flex justify-center pt-3 pb-1">
          <Logo size="compact" />
        </div>
        {renderGameHeader()}
        <div className="p-4 text-center">
          <h2 className="text-lg font-bold text-white mb-1">Vote for the Best GIF!</h2>
          <p className="text-green-200/60 text-sm">"{prompt}"</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {votingSubmissions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <Star className="w-10 h-10 text-green-400/40 mx-auto mb-3" />
                <p className="text-white/50 text-sm">No other GIFs to vote on this round.</p>
                <p className="text-white/30 text-xs mt-1">Waiting for results...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-w-sm mx-auto">
              {votingSubmissions.map((sub) => (
                <motion.button
                  key={sub.id}
                  onClick={() => submitVote(sub.id)}
                  whileTap={{ scale: 0.97 }}
                  className="w-full rounded-xl overflow-hidden bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
                  data-testid={`button-vote-${sub.id}`}
                >
                  <div className="aspect-video">
                    <img src={sub.gifUrl} alt={sub.gifTitle} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "submitted") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-submitted">
        <div className="w-full flex justify-center pt-3 pb-1">
          <Logo size="compact" />
        </div>
        {renderGameHeader()}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Smile className="w-10 h-10 text-green-400" />
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">GIF Submitted!</h2>
            <p className="text-white/50 mb-4">Waiting for other players...</p>
            {selectedGif && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-48 h-48 mx-auto rounded-xl overflow-hidden border-2 border-green-500/30 shadow-lg"
              >
                <img src={selectedGif.previewUrl} alt={selectedGif.title} className="w-full h-full object-cover" />
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === "searching") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-searching">
        <div className="w-full flex justify-center pt-3 pb-1">
          <Logo size="compact" />
        </div>
        {renderGameHeader()}
        <div className="p-4 text-center sticky top-0 z-10 bg-green-900/90 backdrop-blur-sm">
          <p className="text-green-400 text-xs font-medium">Round {round} of {totalRounds}</p>
          <h2 className="text-lg font-bold text-white mb-2">"{prompt}"</h2>

          <div className="relative max-w-sm mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search GIPHY..."
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              autoFocus
              data-testid="input-gif-search"
            />
          </div>

          {!searchQuery.trim() && trendingGifs.length > 0 && (
            <div className="flex items-center justify-center gap-1 mt-2 text-white/30 text-xs">
              <TrendingUp className="w-3 h-3" />
              <span>Trending</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-20">
          {isSearching && (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-400 mx-auto" />
            </div>
          )}

          {!isSearching && gifsToShow.length === 0 && searchQuery.trim() && (
            <div className="text-center py-8 text-white/40">
              No GIFs found. Try a different search!
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {gifsToShow.map((gif) => (
              <motion.button
                key={gif.id}
                onClick={() => setSelectedGif(gif)}
                whileTap={{ scale: 0.95 }}
                className={`rounded-lg overflow-hidden border-2 transition-all ${
                  selectedGif?.id === gif.id
                    ? 'border-green-400 ring-2 ring-green-400/50'
                    : 'border-transparent'
                }`}
                data-testid={`button-gif-${gif.id}`}
              >
                <div className="aspect-square">
                  <img
                    src={gif.previewUrl}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {selectedGif && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="fixed bottom-0 left-0 right-0 p-4 bg-green-900/95 backdrop-blur-sm border-t border-white/10"
            >
              <div className="flex items-center gap-3 max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={selectedGif.previewUrl} alt={selectedGif.title} className="w-full h-full object-cover" />
                </div>
                <Button
                  onClick={submitGif}
                  size="lg"
                  className="flex-1 gap-2"
                  data-testid="button-submit-gif"
                >
                  <Smile className="w-4 h-4" />
                  Submit This GIF
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-waiting">
      <div className="w-full flex justify-center pt-3 pb-1">
        <Logo size="compact" />
      </div>
      {renderGameHeader()}

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Smile className="w-16 h-16 text-green-400/50 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-xl font-bold text-white mb-2">You're In!</h2>
          <p className="text-white/50">Waiting for the host to start the round...</p>
          <motion.div
            className="flex justify-center gap-2 mt-4"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
