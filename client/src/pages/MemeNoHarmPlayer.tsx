import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, Wifi, WifiOff, Trophy, Crown, Search, Loader2, Star, TrendingUp } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";
import { PLAYER_AVATARS, type AvatarId } from "@shared/schema";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
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

function saveSession(roomCode: string, playerName: string, playerId: string, avatar: string) {
  try {
    localStorage.setItem("meme-session", JSON.stringify({ roomCode, playerName, playerId, avatar }));
  } catch {}
}

export default function MemeNoHarmPlayer() {
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

  const wsRef = useRef<WebSocket | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      ws.send(JSON.stringify({
        type: "meme:player:join",
        code: roomCode.toUpperCase(),
        name: playerName,
        avatar: selectedAvatar,
        playerId: playerId || undefined,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[MemePlayer] Received:', data.type, data);

      switch (data.type) {
        case "meme:joined":
          setJoined(true);
          setPlayerId(data.playerId);
          saveSession(roomCode.toUpperCase(), playerName, data.playerId, selectedAvatar);
          if (data.score !== undefined) setMyScore(data.score);
          setPhase("waiting");
          break;

        case "meme:round:start":
          setPrompt(data.prompt);
          setRound(data.round);
          setTotalRounds(data.totalRounds);
          setSelectedGif(null);
          setSearchQuery("");
          setSearchResults([]);
          setPhase("searching");
          fetchTrending();
          break;

        case "meme:voting:start":
          setVotingSubmissions(data.submissions);
          setPrompt(data.prompt);
          setPhase("voting");
          break;

        case "meme:reveal":
          setMyScore(data.myScore);
          setLeaderboard(data.leaderboard);
          setRoundWinnerId(data.roundWinnerId);
          setPhase("reveal");
          if (data.roundWinnerId === playerId) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }
          break;

        case "meme:sittingOut":
          toast({ title: "You're sitting out this round", description: "The host has benched you for now." });
          setPhase("waiting");
          break;

        case "meme:unsittingOut":
          toast({ title: "You're back in!", description: "The host has brought you back into the game." });
          if (data.phase === 'voting' && data.submissions) {
            setVotingSubmissions(data.submissions);
            setPrompt(data.prompt || '');
            setPhase("voting");
          } else if (data.prompt && data.round > 0) {
            setPrompt(data.prompt);
            setRound(data.round);
            setTotalRounds(data.totalRounds);
            setSelectedGif(null);
            setSearchQuery("");
            setSearchResults([]);
            setPhase("searching");
            fetchTrending();
          }
          break;

        case "meme:gameComplete":
          setMyScore(data.myScore);
          setLeaderboard(data.leaderboard);
          setWinner(data.winner);
          setPhase("gameComplete");
          if (data.winner?.playerId === playerId) {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
          }
          break;

        case "host:disconnected":
          toast({ title: "Host disconnected", description: "Waiting for reconnection...", variant: "destructive" });
          break;

        case "error":
          toast({ title: "Error", description: data.message, variant: "destructive" });
          break;
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      setTimeout(() => {
        if (joined) connect();
      }, 3000);
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [roomCode, playerName, selectedAvatar, playerId, joined, fetchTrending, toast]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const submitGif = () => {
    if (!selectedGif || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: "meme:player:submit",
      gifUrl: selectedGif.fullUrl,
      gifTitle: selectedGif.title,
    }));
    setPhase("submitted");
  };

  const submitVote = (votedForId: string) => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: "meme:player:vote",
      votedForId,
    }));
    setPhase("voted");
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !playerName.trim()) return;
    connect();
  };

  const gifsToShow = searchQuery.trim() ? searchResults : trendingGifs;

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-join">
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-6">
              <Smile className="w-12 h-12 text-green-400 mx-auto mb-2" />
              <h1 className="text-2xl font-bold text-white">Meme No Harm</h1>
              <p className="text-green-200/60 text-sm">Search GIFs. Submit. Vote. Win.</p>
            </div>

            <Card className="bg-white/10 border-white/20">
              <CardContent className="pt-6">
                <form onSubmit={handleJoin} className="space-y-4">
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

                  <div>
                    <label className="text-sm font-medium text-green-200 mb-1.5 block">Your Name</label>
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
                    <label className="text-sm font-medium text-green-200 mb-1.5 block">Pick Your Avatar</label>
                    <div className="grid grid-cols-6 gap-2">
                      {PLAYER_AVATARS.slice(0, 12).map((avatar) => (
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
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col p-4" data-testid="page-memenoharm-complete">
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center mb-6">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-3" />
            <h2 className="text-3xl font-bold text-white mb-1">Game Over!</h2>
            <p className="text-green-200/60">You finished #{myRank} with {myScore} points</p>
          </motion.div>

          <Card className="bg-white/10 border-white/20 w-full">
            <CardContent className="pt-4">
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.playerId}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      entry.playerId === playerId ? 'bg-green-500/20 text-green-300' :
                      i === 0 ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-white/5 text-white/70'
                    }`}
                    data-testid={`player-result-${entry.playerId}`}
                  >
                    <span className="flex items-center gap-2">
                      {i === 0 && <Crown className="w-4 h-4 text-yellow-400" />}
                      <span className="font-bold mr-1">#{i + 1}</span>
                      {entry.playerName}
                    </span>
                    <span className="font-bold">{entry.score}</span>
                  </div>
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
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col p-4" data-testid="page-memenoharm-player-reveal">
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
            {roundWinnerId === playerId ? (
              <>
                <Star className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-yellow-300">You won this round!</h2>
              </>
            ) : (
              <h2 className="text-xl font-bold text-white">Round Results</h2>
            )}
          </motion.div>

          <Card className="bg-white/10 border-white/20 w-full mb-4">
            <CardContent className="pt-4 text-center">
              <p className="text-green-400 text-2xl font-bold">{myScore} pts</p>
              <p className="text-white/40 text-sm">Rank #{myRank}</p>
            </CardContent>
          </Card>

          <p className="text-white/40 text-sm text-center">Waiting for host to start next round...</p>
        </div>
      </div>
    );
  }

  if (phase === "voted") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col p-4" data-testid="page-memenoharm-voted">
        <div className="flex-1 flex items-center justify-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-green-400" />
            </div>
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
        <div className="p-4 text-center">
          <h2 className="text-lg font-bold text-white mb-1">Vote for the Best GIF!</h2>
          <p className="text-green-200/60 text-sm">"{prompt}"</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
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
        </div>
      </div>
    );
  }

  if (phase === "submitted") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col p-4" data-testid="page-memenoharm-submitted">
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smile className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">GIF Submitted!</h2>
            <p className="text-white/50 mb-4">Waiting for other players...</p>
            {selectedGif && (
              <div className="w-48 h-48 mx-auto rounded-lg overflow-hidden">
                <img src={selectedGif.previewUrl} alt={selectedGif.title} className="w-full h-full object-cover" />
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === "searching") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-searching">
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
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col p-4" data-testid="page-memenoharm-waiting">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {status === "connected" ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className="text-sm text-white/40">{playerName}</span>
        </div>
        <span className="text-sm text-green-400 font-bold">{myScore} pts</span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Smile className="w-12 h-12 text-green-400/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">You're In!</h2>
          <p className="text-white/50">Waiting for the host to start the round...</p>
        </motion.div>
      </div>
    </div>
  );
}
