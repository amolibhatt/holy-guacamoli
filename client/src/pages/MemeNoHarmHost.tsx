import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Smile, Users, Play, MessageSquare, Trophy, Crown, Ban, Loader2, ChevronRight, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MemePrompt } from "@shared/schema";
import { QRCodeSVG } from "qrcode.react";

type GamePhase = "setup" | "lobby" | "selecting" | "voting" | "reveal" | "results" | "finished";

interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  submitted: boolean;
  voted: boolean;
  sittingOut: boolean;
}

interface MemeResult {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  gifUrl: string;
  gifTitle: string;
  votes: number;
  points: number;
}

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
}

export default function MemeNoHarmHost() {
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentPrompt, setCurrentPrompt] = useState<MemePrompt | null>(null);
  const [shuffledPrompts, setShuffledPrompts] = useState<MemePrompt[]>([]);
  const [results, setResults] = useState<MemeResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roundWinnerId, setRoundWinnerId] = useState<string | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [voteCount, setVoteCount] = useState(0);
  const [votingSubmissions, setVotingSubmissions] = useState<MemeResult[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  const { data: prompts = [], isLoading: promptsLoading } = useQuery<MemePrompt[]>({
    queryKey: ["/api/memenoharm/prompts"],
  });

  const isLoading = promptsLoading || isAuthLoading;
  const isReady = prompts.length >= 3;

  useEffect(() => {
    if (prompts.length > 0 && shuffledPrompts.length === 0) {
      const shuffled = [...prompts].sort(() => Math.random() - 0.5);
      setShuffledPrompts(shuffled);
    }
  }, [prompts, shuffledPrompts.length]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "meme:host:create",
        hostId: user?.id,
        totalRounds,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "meme:room:created":
          setRoomCode(data.code);
          setPhase("lobby");
          break;

        case "meme:player:joined":
          setPlayers(prev => {
            if (data.isReconnect) {
              return prev.map(p => p.id === data.playerId ? { ...p, name: data.playerName } : p);
            }
            if (prev.find(p => p.id === data.playerId)) return prev;
            return [...prev, {
              id: data.playerId,
              name: data.playerName,
              avatar: data.playerAvatar || 'cat',
              score: 0,
              submitted: false,
              voted: false,
              sittingOut: false,
            }];
          });
          break;

        case "meme:submission":
          setSubmissionCount(prev => prev + 1);
          setPlayers(prev => prev.map(p =>
            p.id === data.playerId ? { ...p, submitted: true } : p
          ));
          break;

        case "meme:allSubmitted":
          break;

        case "meme:vote":
          setVoteCount(prev => prev + 1);
          setPlayers(prev => prev.map(p =>
            p.id === data.voterId ? { ...p, voted: true } : p
          ));
          break;

        case "meme:allVoted":
          break;

        case "meme:voting:started":
          setVotingSubmissions(data.submissions.map((s: any) => ({
            playerId: s.id,
            playerName: s.playerName,
            gifUrl: s.gifUrl,
            gifTitle: s.gifTitle,
            votes: 0,
            points: 0,
          })));
          break;

        case "meme:reveal:complete":
          setResults(data.results);
          setLeaderboard(data.leaderboard);
          setRoundWinnerId(data.roundWinnerId);
          setRevealIndex(0);
          setPhase("reveal");
          break;

        case "meme:player:satOut":
          setPlayers(prev => prev.map(p =>
            p.id === data.playerId ? { ...p, sittingOut: true } : p
          ));
          break;

        case "meme:gameComplete":
          setLeaderboard(data.leaderboard);
          setPhase("finished");
          break;

        case "player:disconnected":
          setPlayers(prev => prev.map(p =>
            p.id === data.playerId ? { ...p, submitted: false } : p
          ));
          break;
      }
    };

    ws.onclose = () => {
      setTimeout(() => {
        if (phase !== "finished" && phase !== "setup") {
          connectWebSocket();
        }
      }, 3000);
    };
  }, [user?.id, totalRounds, phase]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const sendWs = (msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const startLobby = () => {
    connectWebSocket();
  };

  const startGame = () => {
    if (players.length < 2) return;
    setCurrentRound(1);
    const prompt = shuffledPrompts[0];
    setCurrentPrompt(prompt);
    setSubmissionCount(0);
    setPlayers(prev => prev.map(p => ({ ...p, submitted: false, voted: false })));
    setPhase("selecting");

    sendWs({
      type: "meme:host:startRound",
      prompt: prompt.prompt,
      round: 1,
      deadline: Date.now() + 60000,
    });
  };

  const startVoting = () => {
    setVoteCount(0);
    setPlayers(prev => prev.map(p => ({ ...p, voted: false })));
    setPhase("voting");

    sendWs({
      type: "meme:host:startVoting",
      deadline: Date.now() + 30000,
    });
  };

  const revealResults = () => {
    sendWs({
      type: "meme:host:reveal",
      pointsPerVote: 100,
    });
  };

  const nextRound = () => {
    const nextRoundNum = currentRound + 1;
    if (nextRoundNum > totalRounds || nextRoundNum > shuffledPrompts.length) {
      sendWs({ type: "meme:host:endGame" });
      return;
    }

    setCurrentRound(nextRoundNum);
    const prompt = shuffledPrompts[nextRoundNum - 1];
    setCurrentPrompt(prompt);
    setSubmissionCount(0);
    setResults([]);
    setVotingSubmissions([]);
    setPlayers(prev => prev.map(p => ({ ...p, submitted: false, voted: false })));
    setPhase("selecting");

    sendWs({
      type: "meme:host:startRound",
      prompt: prompt.prompt,
      round: nextRoundNum,
      deadline: Date.now() + 60000,
    });
  };

  const sitOutPlayer = (playerId: string) => {
    sendWs({ type: "meme:host:sitOut", playerId });
  };

  const activePlayers = players.filter(p => !p.sittingOut);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="page-memenoharm-unauthorized">
        <AppHeader minimal backHref="/" title="Meme No Harm" />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">You need admin access to host games.</p>
              <Button onClick={() => setLocation("/")} className="mt-4" data-testid="button-go-home">
                Go Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-finished">
        <AppHeader minimal backHref="/" title="Meme No Harm - Game Over" />
        <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Game Over!</h2>
            {leaderboard[0] && (
              <div className="text-xl text-yellow-300">
                <Crown className="w-6 h-6 inline mr-2" />
                {leaderboard[0].playerName} wins with {leaderboard[0].score} points!
              </div>
            )}
          </motion.div>

          <Card className="bg-white/10 border-white/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Final Standings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.playerId}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-300' :
                      i === 1 ? 'bg-gray-400/20 text-gray-300' :
                      i === 2 ? 'bg-orange-500/20 text-orange-300' :
                      'bg-white/5 text-white/70'
                    }`}
                    data-testid={`leaderboard-entry-${entry.playerId}`}
                  >
                    <span className="font-bold text-lg mr-3">#{i + 1}</span>
                    <span className="flex-1 font-medium">{entry.playerName}</span>
                    <span className="font-bold">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => setLocation("/memenoharm/host")} className="text-white border-white/30" data-testid="button-play-again">
              Play Again
            </Button>
            <Button onClick={() => setLocation("/")} data-testid="button-go-home-finished">
              Back to Home
            </Button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (phase === "reveal") {
    const sortedResults = [...results].sort((a, b) => b.votes - a.votes);
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-reveal">
        <AppHeader minimal backHref="/" title={`Meme No Harm - Round ${currentRound} Results`} />
        <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Round {currentRound} Results</h2>
            <p className="text-white/60 text-lg">"{currentPrompt?.prompt}"</p>
          </div>

          <div className="space-y-4 mb-8">
            <AnimatePresence>
              {sortedResults.map((result, i) => (
                <motion.div
                  key={result.playerId}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.3 }}
                >
                  <Card className={`bg-white/10 border-white/20 overflow-visible ${result.playerId === roundWinnerId ? 'ring-2 ring-yellow-400' : ''}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-black/20">
                          <img src={result.gifUrl} alt={result.gifTitle} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {result.playerId === roundWinnerId && <Crown className="w-5 h-5 text-yellow-400" />}
                            <span className="text-white font-bold">{result.playerName}</span>
                          </div>
                          <p className="text-white/40 text-sm mb-2">{result.gifTitle}</p>
                          <div className="text-green-400 font-bold text-lg">
                            {result.votes} vote{result.votes !== 1 ? 's' : ''} = +{result.points} pts
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <Card className="bg-white/10 border-white/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-sm">Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div key={entry.playerId} className="flex items-center justify-between text-white/80 px-2 py-1">
                    <span>#{i + 1} {entry.playerName}</span>
                    <span className="font-bold">{entry.score}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button onClick={nextRound} size="lg" className="gap-2" data-testid="button-next-round">
              {currentRound >= totalRounds ? (
                <>
                  <Trophy className="w-4 h-4" />
                  End Game
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  Next Round
                </>
              )}
            </Button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (phase === "voting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-voting">
        <AppHeader minimal backHref="/" title={`Meme No Harm - Round ${currentRound}`} />
        <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Voting Time!</h2>
            <p className="text-white/60 text-lg mb-2">"{currentPrompt?.prompt}"</p>
            <p className="text-white/40 text-sm">Players are voting for their favorite GIF</p>
          </div>

          {votingSubmissions.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {votingSubmissions.map((sub) => (
                <Card key={sub.playerId} className="bg-white/10 border-white/20 overflow-visible">
                  <CardContent className="p-3">
                    <div className="aspect-square rounded-lg overflow-hidden bg-black/20 mb-2">
                      <img src={sub.gifUrl} alt={sub.gifTitle} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-white/40 text-xs truncate">{sub.playerName}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="pt-6">
              <div className="text-center text-white/60 mb-4">
                Votes received: {voteCount}
              </div>
              <div className="space-y-2">
                {activePlayers.map(player => (
                  <div key={player.id} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    player.voted ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
                  }`}>
                    <span className="font-medium">{player.name} {player.voted && "- Voted"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button onClick={revealResults} size="lg" data-testid="button-reveal-results">
              Reveal Results
            </Button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (phase === "selecting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col" data-testid="page-memenoharm-selecting">
        <AppHeader minimal backHref="/" title={`Meme No Harm - Round ${currentRound}/${totalRounds}`} />
        <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full">
          <div className="text-center mb-6">
            <p className="text-green-400 text-sm font-medium mb-1">Round {currentRound} of {totalRounds}</p>
            <h2 className="text-2xl font-bold text-white mb-2">Find the Perfect GIF!</h2>
            <p className="text-white/60 text-xl font-bold mt-4 mb-2">"{currentPrompt?.prompt}"</p>
            <p className="text-white/40 text-sm">Players are searching GIPHY on their phones</p>
          </div>

          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="pt-6">
              <div className="text-center text-white/60 mb-4">
                Waiting for submissions ({submissionCount}/{activePlayers.length} ready)
              </div>
              {activePlayers.length < 2 && (
                <div className="text-center text-orange-400 text-sm mb-4">
                  Need at least 2 active players to continue the round.
                </div>
              )}
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between gap-2 px-4 py-2 rounded-lg ${
                      player.sittingOut
                        ? 'bg-white/5 text-white/30'
                        : player.submitted
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/10 text-white/50'
                    }`}
                  >
                    <span className="font-medium">
                      {player.name} {player.submitted && !player.sittingOut && "- Submitted"} {player.sittingOut && "- Sitting Out"}
                    </span>
                    {!player.submitted && !player.sittingOut && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sitOutPlayer(player.id)}
                        className="text-orange-400/70"
                        data-testid={`button-sit-out-selecting-${player.id}`}
                        aria-label={`Sit out ${player.name}`}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Sit Out
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              onClick={startVoting}
              size="lg"
              disabled={submissionCount < 2}
              data-testid="button-start-voting"
            >
              Start Voting ({submissionCount} submissions)
            </Button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (phase === "lobby") {
    const joinUrl = `${window.location.origin}/memenoharm/${roomCode}`;
    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="page-memenoharm-lobby">
        <AppHeader minimal backHref="/" title="Meme No Harm - Lobby" />

        <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full">
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground mb-1">Step 1</p>
            <h2 className="text-2xl font-bold text-green-500 mb-4">Enlisting</h2>
            <div className="text-4xl font-mono font-bold tracking-widest text-green-500 mb-2">
              {roomCode}
            </div>
            <p className="text-muted-foreground">Join with this code - search for the perfect GIF each round!</p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players ({players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Waiting for players to join...
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="px-4 py-2 bg-green-500/10 text-green-600 rounded-lg font-medium"
                    >
                      {player.name}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={startGame}
              disabled={players.length < 2}
              size="lg"
              className="gap-2"
              data-testid="button-start-game"
            >
              <Play className="w-4 h-4" />
              Start Game
            </Button>
          </div>
        </main>

        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-memenoharm-setup">
      <AppHeader minimal backHref="/" title="Meme No Harm" />

      <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-green-500" />
                Start a Meme No Harm Game
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-lg text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold" data-testid="text-prompt-count">{prompts.length}</div>
                <div className="text-sm text-muted-foreground">Prompts Available</div>
              </div>

              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : !isReady ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    You need at least 3 prompts to play. Players will search GIPHY for GIFs during the game.
                  </p>
                  <Button onClick={() => setLocation("/admin/memenoharm")} data-testid="button-create-content">
                    Create Prompts
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Rounds:</label>
                    <Input
                      type="number"
                      min={3}
                      max={Math.min(10, prompts.length)}
                      value={totalRounds}
                      onChange={(e) => setTotalRounds(parseInt(e.target.value) || 5)}
                      className="w-20"
                      data-testid="input-total-rounds"
                    />
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    <ImageIcon className="w-4 h-4 inline mr-2 text-green-500" />
                    Players will search GIPHY for GIFs on their phones each round
                  </div>

                  <Button
                    onClick={startLobby}
                    size="lg"
                    className="w-full gap-2"
                    data-testid="button-create-room"
                  >
                    <Play className="w-5 h-5" />
                    Create Room
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/admin/memenoharm")}
            data-testid="button-manage-content"
          >
            Manage Prompts
          </Button>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
