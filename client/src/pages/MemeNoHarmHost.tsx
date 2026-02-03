import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Smile, Users, Play, MessageSquare, Image as ImageIcon, Trophy, Crown, ChevronRight, ChevronLeft, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MemePrompt, MemeImage } from "@shared/schema";
import { QRCodeSVG } from "qrcode.react";

type GamePhase = "setup" | "lobby" | "selecting" | "reveal" | "voting" | "results" | "finished";

interface Player {
  id: string;
  name: string;
  score: number;
  hand: number[];
  submitted: boolean;
  voted: boolean;
  votedForPlayerId?: string;
}

interface Submission {
  playerId: string;
  playerName: string;
  imageId: number;
  imageUrl: string;
  votes: number;
}

export default function MemeNoHarmHost() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentPrompt, setCurrentPrompt] = useState<MemePrompt | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [shuffledPrompts, setShuffledPrompts] = useState<MemePrompt[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);

  const { data: prompts = [], isLoading: promptsLoading } = useQuery<MemePrompt[]>({
    queryKey: ["/api/memenoharm/prompts"],
  });

  const { data: images = [], isLoading: imagesLoading } = useQuery<MemeImage[]>({
    queryKey: ["/api/memenoharm/images"],
  });

  useEffect(() => {
    if (prompts.length > 0 && shuffledPrompts.length === 0) {
      const shuffled = [...prompts].sort(() => Math.random() - 0.5);
      setShuffledPrompts(shuffled);
    }
  }, [prompts, shuffledPrompts.length]);

  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const startLobby = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setPhase("lobby");
  };

  const addTestPlayer = () => {
    const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"];
    const availableNames = names.filter(n => !players.find(p => p.name === n));
    if (availableNames.length === 0) return;
    
    const name = availableNames[Math.floor(Math.random() * availableNames.length)];
    const playerImages = [...images].sort(() => Math.random() - 0.5).slice(0, 5).map(i => i.id);
    
    setPlayers(prev => [...prev, {
      id: `player-${Date.now()}`,
      name,
      score: 0,
      hand: playerImages,
      submitted: false,
      voted: false,
    }]);
  };

  const startGame = () => {
    if (players.length < 2) return;
    setCurrentRound(1);
    setCurrentPrompt(shuffledPrompts[0] || null);
    setPhase("selecting");
  };

  const simulateSubmissions = () => {
    // Each player picks a random meme from their hand
    const subs: Submission[] = players.map(player => {
      const randomIndex = Math.floor(Math.random() * player.hand.length);
      const submittedImageId = player.hand[randomIndex];
      const image = images.find(i => i.id === submittedImageId);
      return {
        playerId: player.id,
        playerName: player.name,
        imageId: submittedImageId,
        imageUrl: image?.imageUrl || "",
        votes: 0,
      };
    });
    
    // The Refresh: Replace submitted card with a new random meme
    // Get all image IDs currently in any player's hand to avoid duplicates
    const usedImageIds = new Set(players.flatMap(p => p.hand));
    const availableImages = images.filter(img => !usedImageIds.has(img.id));
    
    setPlayers(prev => prev.map(player => {
      const submittedSub = subs.find(s => s.playerId === player.id);
      if (!submittedSub) return player;
      
      // Remove the submitted card from hand
      const newHand = player.hand.filter(id => id !== submittedSub.imageId);
      
      // Add a new random card from available images
      if (availableImages.length > 0) {
        const newCard = availableImages[Math.floor(Math.random() * availableImages.length)];
        newHand.push(newCard.id);
      }
      
      return { ...player, hand: newHand, submitted: true };
    }));
    
    // Shuffle submissions for anonymous gallery display
    const shuffledSubs = [...subs].sort(() => Math.random() - 0.5);
    setSubmissions(shuffledSubs);
    setRevealIndex(0);
    setPhase("reveal");
  };

  const nextReveal = () => {
    if (revealIndex < submissions.length - 1) {
      setRevealIndex(prev => prev + 1);
    } else {
      setPhase("voting");
    }
  };

  const simulateVotes = () => {
    // Simulate each player voting for a random submission (not their own)
    const playerVotes: Record<string, string> = {};
    players.forEach(player => {
      const otherSubs = submissions.filter(s => s.playerId !== player.id);
      if (otherSubs.length > 0) {
        const votedFor = otherSubs[Math.floor(Math.random() * otherSubs.length)];
        playerVotes[player.id] = votedFor.playerId;
      }
    });
    
    // Count votes per submission
    const voteCounts: Record<string, number> = {};
    Object.values(playerVotes).forEach(votedForId => {
      voteCounts[votedForId] = (voteCounts[votedForId] || 0) + 1;
    });
    
    const updatedSubs = submissions.map(sub => ({
      ...sub,
      votes: voteCounts[sub.playerId] || 0,
    }));
    
    // Find the winner (most votes)
    const maxVotes = Math.max(...updatedSubs.map(s => s.votes));
    const winnerId = updatedSubs.find(s => s.votes === maxVotes)?.playerId;
    
    // Calculate scores:
    // +10 points for each vote your meme receives
    // +5 bonus if you voted for the winning meme
    setPlayers(prev => prev.map(p => {
      const votesReceived = voteCounts[p.id] || 0;
      const submitterPoints = votesReceived * 10;
      const votedForWinner = playerVotes[p.id] === winnerId;
      const voterBonus = votedForWinner ? 5 : 0;
      
      return {
        ...p,
        score: p.score + submitterPoints + voterBonus,
        votedForPlayerId: playerVotes[p.id],
      };
    }));
    
    setSubmissions(updatedSubs);
    setPhase("results");
  };

  const nextRound = () => {
    if (currentRound >= totalRounds) {
      setPhase("finished");
      return;
    }
    
    setCurrentRound(prev => prev + 1);
    setCurrentPrompt(shuffledPrompts[currentRound] || null);
    setSubmissions([]);
    setPlayers(prev => prev.map(p => ({ ...p, submitted: false, voted: false })));
    setPhase("selecting");
  };

  const playAgain = () => {
    setPhase("setup");
    setRoomCode("");
    setPlayers([]);
    setCurrentRound(0);
    setCurrentPrompt(null);
    setSubmissions([]);
    setShuffledPrompts([...prompts].sort(() => Math.random() - 0.5));
  };

  const isLoading = promptsLoading || imagesLoading;
  const isReady = prompts.length >= 5 && images.length >= 10;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  if (phase === "finished") {
    const winner = sortedPlayers[0];
    return (
      <div className="min-h-screen bg-background flex flex-col" data-testid="page-memenoharm-finished">
        <AppHeader minimal backHref="/" title="Meme No Harm - Game Over" />
        
        <main className="max-w-2xl mx-auto px-4 py-12 flex-1 w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center mb-8"
          >
            <Crown className="w-20 h-20 mx-auto text-yellow-500 mb-4" />
            <h1 className="text-3xl font-bold mb-2">Winner!</h1>
            <p className="text-4xl font-bold text-green-500">{winner?.name}</p>
            <p className="text-2xl text-muted-foreground">{winner?.score} points</p>
          </motion.div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Final Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedPlayers.map((player, index) => (
                  <div 
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{player.name}</span>
                      {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                    </div>
                    <span className="font-bold">{player.score}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button onClick={playAgain} size="lg" data-testid="button-play-again">
              Play Again
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} size="lg">
              Back to Home
            </Button>
          </div>
        </main>

        <AppFooter />
      </div>
    );
  }

  if (phase === "results") {
    const winner = [...submissions].sort((a, b) => b.votes - a.votes)[0];
    return (
      <div className="min-h-screen bg-[#0d0d12] text-white" data-testid="page-memenoharm-results">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-white/40 mb-1">Step 6 - Round {currentRound} of {totalRounds}</p>
            <h2 className="text-2xl font-bold text-green-400 mb-2">The Aftermath</h2>
            <p className="text-white/60">{currentPrompt?.prompt}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {submissions.map((sub) => {
              const isCanceled = sub.votes === 0;
              const isWinner = sub.playerId === winner.playerId;
              return (
                <motion.div
                  key={sub.playerId}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`relative rounded-lg overflow-hidden ${isWinner ? 'ring-4 ring-yellow-400' : ''}`}
                >
                  <img 
                    src={sub.imageUrl} 
                    alt="Meme" 
                    className={`w-full aspect-square object-cover ${isCanceled ? 'grayscale opacity-60' : ''}`} 
                  />
                  {isCanceled && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-red-600/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transform -rotate-12 shadow-lg">
                        <Ban className="w-6 h-6" />
                        <span className="font-bold text-lg">CANCELED</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{sub.playerName}</span>
                      <span className={`font-bold ${isCanceled ? 'text-red-400' : 'text-yellow-400'}`}>
                        {sub.votes} votes {isCanceled && '(+0 pts)'}
                      </span>
                    </div>
                    {isWinner && (
                      <div className="flex items-center gap-1 text-yellow-400 text-sm mt-1">
                        <Trophy className="w-4 h-4" />
                        Winner! (+{sub.votes * 10} pts)
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center">
            <Button onClick={nextRound} size="lg" className="gap-2" data-testid="button-next-round">
              {currentRound >= totalRounds ? "See Final Results" : `Next Round (${currentRound + 1}/${totalRounds})`}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "voting") {
    return (
      <div className="min-h-screen bg-[#0d0d12] text-white" data-testid="page-memenoharm-voting">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-white/40 mb-1">Step 5</p>
            <h2 className="text-2xl font-bold text-green-400 mb-2">The Vibe Check</h2>
            <p className="text-white/60 text-lg">{currentPrompt?.prompt}</p>
            <p className="text-white/40 text-sm mt-2">Vote for the funniest meme! (You can't vote for your own)</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {submissions.map((sub, index) => (
              <div key={sub.playerId} className="relative rounded-lg overflow-hidden bg-white/5">
                <img src={sub.imageUrl} alt="Meme" className="w-full aspect-square object-cover" />
                <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-green-500 text-white font-bold flex items-center justify-center text-lg">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-white/40 mb-6">
            Players are voting on their phones...
          </div>

          <div className="text-center">
            <Button onClick={simulateVotes} size="lg" data-testid="button-simulate-votes">
              Simulate Votes (Demo)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "reveal") {
    const currentSubmission = submissions[revealIndex];
    return (
      <div className="min-h-screen bg-[#0d0d12] text-white" data-testid="page-memenoharm-reveal">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-white/40 mb-1">Step 4 - Round {currentRound} of {totalRounds}</p>
            <h2 className="text-2xl font-bold text-green-400 mb-2">The Gallery</h2>
            <p className="text-white/60 text-lg">{currentPrompt?.prompt}</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={revealIndex}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-center"
            >
              <div className="rounded-xl overflow-hidden mb-4 inline-block">
                <img 
                  src={currentSubmission?.imageUrl} 
                  alt="Meme submission" 
                  className="max-h-[400px] object-contain"
                />
              </div>
              <p className="text-white/60">
                Submission {revealIndex + 1} of {submissions.length}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="text-center mt-8">
            <Button onClick={nextReveal} size="lg" className="gap-2" data-testid="button-next-reveal">
              {revealIndex < submissions.length - 1 ? "Next Submission" : "Start Voting"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "selecting") {
    const allSubmitted = players.every(p => p.submitted);
    return (
      <div className="min-h-screen bg-[#0d0d12] text-white" data-testid="page-memenoharm-selecting">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-white/40 mb-1">Steps 2 & 3 - Round {currentRound} of {totalRounds}</p>
            <h2 className="text-2xl font-bold text-green-400 mb-2">The Briefing</h2>
            <p className="text-white/60 text-3xl font-bold mt-4 mb-2">{currentPrompt?.prompt}</p>
            <p className="text-white/40 text-sm">Players: Pick your best meme from your hand!</p>
          </div>

          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="pt-6">
              <div className="text-center text-white/60 mb-4">
                Players are selecting their memes...
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`px-3 py-1 rounded-full text-sm ${
                      player.submitted 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {player.name} {player.submitted && "✓"}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center space-x-4">
            <Button onClick={simulateSubmissions} size="lg" data-testid="button-simulate-submissions">
              Simulate Submissions (Demo)
            </Button>
          </div>
        </div>
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
            <p className="text-muted-foreground">Join with this code - each player gets 5 random memes!</p>
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
            <Button variant="outline" onClick={addTestPlayer} data-testid="button-add-test-player">
              Add Test Player
            </Button>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{prompts.length}</div>
                  <div className="text-sm text-muted-foreground">Prompts</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{images.length}</div>
                  <div className="text-sm text-muted-foreground">Meme Images</div>
                </div>
              </div>

              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : !isReady ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    You need at least 5 prompts and 10 meme images to play.
                  </p>
                  <Button onClick={() => setLocation("/admin/memenoharm")} data-testid="button-create-content">
                    Create Content
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
            Manage Prompts & Images
          </Button>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
