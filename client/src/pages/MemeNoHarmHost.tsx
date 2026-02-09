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
import { useToast } from "@/hooks/use-toast";
import { Smile, Users, Play, MessageSquare, Trophy, Crown, Ban, Loader2, ChevronRight, SkipForward, Image as ImageIcon, Link2, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MemePrompt } from "@shared/schema";
import { PLAYER_AVATARS } from "@shared/schema";
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
  connected: boolean;
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
  const { toast } = useToast();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentPromptText, setCurrentPromptText] = useState<string>("");
  const [shuffledPrompts, setShuffledPrompts] = useState<MemePrompt[]>([]);
  const [results, setResults] = useState<MemeResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roundWinnerId, setRoundWinnerId] = useState<string | null>(null);
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

  useEffect(() => {
    if (prompts.length > 0 && phase === "setup") {
      const maxRounds = Math.min(10, prompts.length);
      setTotalRounds(prev => Math.min(prev, maxRounds));
    }
  }, [prompts.length, phase]);

  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (roomCodeRef.current) {
        ws.send(JSON.stringify({
          type: "meme:host:rejoin",
          code: roomCodeRef.current,
        }));
      } else {
        ws.send(JSON.stringify({
          type: "meme:host:create",
          hostId: user?.id,
          totalRounds,
        }));
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "meme:room:created":
          setRoomCode(data.code);
          setPhase("lobby");
          break;

        case "meme:host:rejoined": {
          setRoomCode(data.code);
          setCurrentRound(data.round || 0);
          if (data.totalRounds) setTotalRounds(data.totalRounds);

          const restoredPlayers = (data.players || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar || 'cat',
            score: p.score || 0,
            submitted: p.submitted || false,
            voted: p.voted || false,
            sittingOut: p.sittingOut || false,
            connected: p.isConnected !== false,
          }));
          setPlayers(restoredPlayers);

          if (data.votingSubmissions?.length > 0) {
            setVotingSubmissions(data.votingSubmissions.map((s: any) => ({
              playerId: s.id,
              playerName: s.playerName,
              gifUrl: s.gifUrl,
              gifTitle: s.gifTitle,
              votes: 0,
              points: 0,
            })));
          }

          if (data.prompt) {
            setCurrentPromptText(data.prompt);
          }
          usedPromptsRef.current.clear();
          if (data.usedPrompts?.length > 0) {
            data.usedPrompts.forEach((p: string) => usedPromptsRef.current.add(p));
          } else if (data.prompt) {
            usedPromptsRef.current.add(data.prompt);
          }

          if (data.results) {
            setResults(data.results);
          }
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
          if (data.roundWinnerId) {
            setRoundWinnerId(data.roundWinnerId);
          }

          const serverPhase = data.phase as string;
          if (serverPhase === 'selecting') setPhase('selecting');
          else if (serverPhase === 'voting') setPhase('voting');
          else if (serverPhase === 'reveal') {
            setPhase('reveal');
          }
          else if (serverPhase === 'gameComplete') {
            setPhase('finished');
          }
          else setPhase('lobby');
          break;
        }

        case "meme:player:joined":
          setPlayers(prev => {
            if (data.isReconnect) {
              return prev.map(p => p.id === data.playerId ? { ...p, name: data.playerName, avatar: data.playerAvatar || p.avatar, connected: true } : p);
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
              connected: true,
            }];
          });
          break;

        case "meme:submission":
          setPlayers(prev => prev.map(p =>
            p.id === data.playerId ? { ...p, submitted: true } : p
          ));
          break;

        case "meme:allSubmitted":
          break;

        case "meme:vote":
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
          setPhase("reveal");
          break;

        case "meme:player:satOut":
          setPlayers(prev => prev.map(p =>
            p.id === data.playerId ? { ...p, sittingOut: true } : p
          ));
          break;

        case "meme:player:unsatOut":
          setPlayers(prev => prev.map(p =>
            p.id === data.playerId ? { ...p, sittingOut: false } : p
          ));
          break;

        case "meme:gameComplete":
          setLeaderboard(data.leaderboard);
          setPhase("finished");
          break;

        case "player:disconnected":
          setPlayers(prev => prev.map(p =>
            p.id === data.playerId ? { ...p, connected: false } : p
          ));
          break;

        case "error":
          if (roomCodeRef.current && data.message?.includes('rejoin')) {
            setRoomCode("");
            ws.send(JSON.stringify({
              type: "meme:host:create",
              hostId: user?.id,
              totalRounds,
            }));
          }
          break;
      }
    };

    ws.onclose = () => {
      setTimeout(() => {
        if (phaseRef.current !== "finished" && phaseRef.current !== "setup") {
          connectWebSocket();
        }
      }, 3000);
    };
  }, [user?.id, totalRounds]);

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

  const connectedPlayers = players.filter(p => p.connected);

  const startGame = () => {
    if (connectedPlayers.length < 2) return;
    usedPromptsRef.current.clear();
    setCurrentRound(1);
    const prompt = shuffledPrompts[0];
    usedPromptsRef.current.add(prompt.prompt);
    setCurrentPromptText(prompt.prompt);
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

  const usedPromptsRef = useRef<Set<string>>(new Set());

  const nextRound = () => {
    const nextRoundNum = currentRound + 1;
    if (nextRoundNum > totalRounds || nextRoundNum > shuffledPrompts.length) {
      sendWs({ type: "meme:host:endGame" });
      return;
    }

    const availablePrompts = shuffledPrompts.filter(p => !usedPromptsRef.current.has(p.prompt));
    const prompt = availablePrompts.length > 0 ? availablePrompts[0] : shuffledPrompts[nextRoundNum - 1];
    usedPromptsRef.current.add(prompt.prompt);

    setCurrentRound(nextRoundNum);
    setCurrentPromptText(prompt.prompt);
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

  const resetGame = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    usedPromptsRef.current.clear();
    setRoomCode("");
    setPlayers([]);
    setCurrentRound(0);
    setCurrentPromptText("");
    setResults([]);
    setLeaderboard([]);
    setRoundWinnerId(null);
    setVotingSubmissions([]);
    const shuffled = [...prompts].sort(() => Math.random() - 0.5);
    setShuffledPrompts(shuffled);
    setPhase("setup");
  }, [prompts]);

  const sitOutPlayer = (playerId: string) => {
    sendWs({ type: "meme:host:sitOut", playerId });
  };

  const unsitOutPlayer = (playerId: string) => {
    sendWs({ type: "meme:host:unsitOut", playerId });
  };

  const activePlayers = players.filter(p => !p.sittingOut && p.connected);
  const totalSubmissions = players.filter(p => p.submitted).length;
  const activeSubmittedCount = activePlayers.filter(p => p.submitted).length;
  const allSubmitted = activePlayers.length > 0 && activeSubmittedCount >= activePlayers.length;
  const eligibleVoters = activePlayers.filter(p => p.submitted);
  const votedCount = eligibleVoters.filter(p => p.voted).length;
  const allVoted = eligibleVoters.length > 0 && votedCount >= eligibleVoters.length;

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
            <Button variant="outline" onClick={resetGame} className="text-white border-white/30" data-testid="button-play-again">
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
            <p className="text-white/60 text-lg">"{currentPromptText}"</p>
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
            <p className="text-white/60 text-lg mb-2">"{currentPromptText}"</p>
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
              <div className={`text-center mb-4 ${allVoted ? 'text-green-400 font-bold' : 'text-white/60'}`}>
                {allVoted ? 'All votes in!' : `Votes: ${votedCount}/${eligibleVoters.length}`}
              </div>
              <div className="space-y-2">
                {players.map(player => {
                  const isEligibleVoter = player.connected && !player.sittingOut && player.submitted;
                  const didNotSubmit = player.connected && !player.sittingOut && !player.submitted;
                  return (
                    <div key={player.id} className={`flex items-center justify-between gap-2 px-4 py-2 rounded-lg ${
                      player.sittingOut
                        ? 'bg-white/5 text-white/30'
                        : !player.connected
                          ? 'bg-red-500/10 text-red-400/70'
                          : didNotSubmit
                            ? 'bg-white/5 text-white/30'
                            : player.voted
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-white/10 text-white/50'
                    }`}>
                      <span className="font-medium">
                        {player.name}
                        {player.sittingOut && " - Sitting Out"}
                        {!player.connected && !player.sittingOut && " - Disconnected"}
                        {didNotSubmit && " - Didn't submit"}
                        {isEligibleVoter && player.voted && " - Voted"}
                      </span>
                      {player.sittingOut ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unsitOutPlayer(player.id)}
                          className="text-green-400/70"
                          data-testid={`button-bring-back-voting-${player.id}`}
                          aria-label={`Bring back ${player.name}`}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          Bring Back
                        </Button>
                      ) : isEligibleVoter && !player.voted ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sitOutPlayer(player.id)}
                          className="text-orange-400/70"
                          data-testid={`button-sit-out-voting-${player.id}`}
                          aria-label={`Sit out ${player.name}`}
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Sit Out
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
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
            <p className="text-white/60 text-xl font-bold mt-4 mb-2">"{currentPromptText}"</p>
            <p className="text-white/40 text-sm">Players are searching GIPHY on their phones</p>
          </div>

          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="pt-6">
              <div className={`text-center mb-4 ${allSubmitted ? 'text-green-400 font-bold' : 'text-white/60'}`}>
                {allSubmitted ? 'All submissions in!' : `Waiting for submissions (${activeSubmittedCount}/${activePlayers.length} ready)`}
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
                        : !player.connected
                          ? 'bg-red-500/10 text-red-400/70'
                          : player.submitted
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/10 text-white/50'
                    }`}
                  >
                    <span className="font-medium">
                      {player.name}
                      {player.sittingOut && " - Sitting Out"}
                      {!player.connected && !player.sittingOut && " - Disconnected"}
                      {player.submitted && !player.sittingOut && player.connected && " - Submitted"}
                    </span>
                    {player.sittingOut ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unsitOutPlayer(player.id)}
                        className="text-green-400/70"
                        data-testid={`button-bring-back-${player.id}`}
                        aria-label={`Bring back ${player.name}`}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Bring Back
                      </Button>
                    ) : !player.submitted ? (
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
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              onClick={startVoting}
              size="lg"
              disabled={totalSubmissions < 2}
              data-testid="button-start-voting"
            >
              Start Voting ({totalSubmissions} submissions)
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={nextRound}
              className="gap-2 text-white/70 border-white/20"
              data-testid="button-skip-round"
            >
              <SkipForward className="w-4 h-4" />
              {currentRound >= totalRounds ? 'End Game' : 'Skip Round'}
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

          <div className="flex justify-center mb-4">
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
          </div>

          <div className="flex items-center gap-2 max-w-xs mx-auto mb-8">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={async () => {
                try {
                  if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(joinUrl);
                  } else {
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
              className="flex-1 gap-2 text-green-500"
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
                  {players.map((player) => {
                    const avatarData = PLAYER_AVATARS.find(a => a.id === player.avatar);
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium ${
                          player.connected
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                        data-testid={`player-card-${player.id}`}
                      >
                        <span className="text-lg">{avatarData?.emoji || "?"}</span>
                        <span>{player.name}{!player.connected && " (offline)"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={startGame}
              disabled={connectedPlayers.length < 2}
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
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) return;
                        setTotalRounds(Math.max(3, Math.min(val, Math.min(10, prompts.length))));
                      }}
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
