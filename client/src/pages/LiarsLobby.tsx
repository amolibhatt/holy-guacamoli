import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sun, Moon, Users, Play, SkipForward, Vote, Eye, RotateCcw, Crown, Skull } from "lucide-react";
import { Link, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/context/ThemeContext";
import { useScore } from "@/components/ScoreContext";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import type { Game, LiarPromptPack, LiarPrompt } from "@shared/schema";

const sarcasticTitles = [
  "CEO of Gaslighting",
  "Professional Fibber",
  "Master of Deception",
  "Chief Lies Officer",
  "Scam Artist Supreme",
  "Lord of the Lies",
  "Fraud of the Year",
  "Truth Assassin",
];

function triggerLiarConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;
  const colors = ['#8b5cf6', '#ec4899', '#f43f5e'];
  
  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

interface RoomPlayer {
  id: string;
  name: string;
}

interface SubmissionResult {
  index: number;
  answer: string;
  playerId: string;
  playerName: string;
  isReal: boolean;
  voterIds: string[];
  voterNames: string[];
  voteCount: number;
}

type Phase = 'idle' | 'lobby' | 'submission' | 'voting' | 'results';

export default function LiarsLobby() {
  const { gameId } = useParams<{ gameId: string }>();
  const { isAuthenticated } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();
  const { contestants, awardPoints, deductPoints } = useScore();
  
  const wsRef = useRef<WebSocket | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [voteCount, setVoteCount] = useState(0);
  const [votingOptions, setVotingOptions] = useState<{ index: number; answer: string }[]>([]);
  const [results, setResults] = useState<SubmissionResult[]>([]);
  const [fooledEveryone, setFooledEveryone] = useState<{ playerId: string; playerName: string }[]>([]);
  const [sarcasticTitle, setSarcasticTitle] = useState('');
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { data: game } = useQuery<Game>({
    queryKey: ['/api/games', gameId],
    enabled: !!gameId && isAuthenticated,
  });

  const { data: gameLiarPacks = [] } = useQuery<{ id: number; gameId: number; packId: number; position: number; pack: LiarPromptPack }[]>({
    queryKey: ['/api/games', gameId, 'liar-packs'],
    enabled: !!gameId && isAuthenticated,
  });

  const firstPack = gameLiarPacks[0]?.pack;

  const { data: prompts = [] } = useQuery<LiarPrompt[]>({
    queryKey: ['/api/liar-packs', firstPack?.id, 'prompts'],
    enabled: !!firstPack?.id,
  });

  const currentPrompt = prompts[currentPromptIndex];

  useEffect(() => {
    if (!timerEnd) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [timerEnd]);

  const createRoom = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'host:create', gameMode: 'liar' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'room:created':
          setRoomCode(data.code);
          setPhase('lobby');
          setPlayers([]);
          break;
        case 'player:joined':
          setPlayers(prev => [...prev.filter(p => p.id !== data.player.id), data.player]);
          break;
        case 'player:left':
          setPlayers(prev => prev.filter(p => p.id !== data.playerId));
          break;
        case 'liar:submission-started':
          setPhase('submission');
          setSubmissionCount(0);
          break;
        case 'liar:submission-received':
          setSubmissionCount(data.submissionCount);
          break;
        case 'liar:voting-started':
          setPhase('voting');
          setVotingOptions(data.options);
          setVoteCount(0);
          break;
        case 'liar:vote-received':
          setVoteCount(data.voteCount);
          break;
        case 'liar:results':
          setPhase('results');
          setResults(data.results);
          setFooledEveryone(data.fooledEveryone || []);
          if (data.fooledEveryone && data.fooledEveryone.length > 0) {
            setSarcasticTitle(sarcasticTitles[Math.floor(Math.random() * sarcasticTitles.length)]);
            triggerLiarConfetti();
          }
          break;
        case 'liar:reset':
          setPhase('lobby');
          setResults([]);
          setFooledEveryone([]);
          break;
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    ws.onclose = () => {
      setRoomCode(null);
      setPhase('idle');
    };
  }, []);

  const startSubmissionPhase = () => {
    if (wsRef.current && currentPrompt) {
      const settings = game?.settings as { submissionTimerSeconds?: number } | null;
      const timerSeconds = settings?.submissionTimerSeconds || 60;
      wsRef.current.send(JSON.stringify({
        type: 'liar:start-submission',
        clue: currentPrompt.clue,
        truth: currentPrompt.truth,
        promptId: currentPrompt.id,
        timerSeconds,
      }));
      setTimerEnd(Date.now() + timerSeconds * 1000);
    }
  };

  const startVotingPhase = () => {
    if (wsRef.current) {
      const settings = game?.settings as { votingTimerSeconds?: number } | null;
      const timerSeconds = settings?.votingTimerSeconds || 30;
      wsRef.current.send(JSON.stringify({
        type: 'liar:start-voting',
        timerSeconds,
      }));
      setTimerEnd(Date.now() + timerSeconds * 1000);
    }
  };

  const revealAnswers = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'liar:reveal' }));
      setTimerEnd(null);
    }
  };

  const nextRound = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'liar:reset' }));
      setCurrentPromptIndex(prev => (prev + 1) % prompts.length);
      setTimerEnd(null);
    }
  };

  const awardPointsToPlayer = (playerId: string, points: number) => {
    const contestant = contestants.find(c => c.name === players.find(p => p.id === playerId)?.name);
    if (contestant) {
      awardPoints(contestant.id, points);
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/play` : '';

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h2 className="text-xl font-bold text-foreground mb-4">Game not found</h2>
        <Link href="/admin/games">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Button>
        </Link>
      </div>
    );
  }

  if (prompts.length === 0 && gameLiarPacks.length > 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h2 className="text-xl font-bold text-foreground mb-4">No prompts in this pack</h2>
        <Link href="/admin/games">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/admin/games">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground">{game.name} - Liar's Lobby</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span data-testid="text-player-count">{players.length}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleColorMode} data-testid="button-theme">
              {colorMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {phase === 'idle' && (
          <Card className="p-8 text-center">
            <CardHeader>
              <CardTitle>Start Liar's Lobby</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Players will submit fake answers to fool others. The real answer is hidden among the lies!
              </p>
              <Button onClick={createRoom} size="lg" className="gap-2" data-testid="button-create-room">
                <Play className="w-5 h-5" />
                Create Game Room
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === 'lobby' && roomCode && (
          <div className="space-y-6">
            <Card className="p-6 text-center">
              <CardHeader>
                <CardTitle>Join Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-5xl font-mono font-bold tracking-widest text-primary" data-testid="text-room-code">
                  {roomCode}
                </div>
                <div className="flex justify-center">
                  <QRCodeSVG value={`${joinUrl}?code=${roomCode}`} size={150} />
                </div>
                <p className="text-sm text-muted-foreground">Scan or go to {joinUrl}</p>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Players ({players.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {players.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Waiting for players to join...</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {players.map(player => (
                      <div key={player.id} className="px-3 py-1 bg-muted rounded-md text-sm" data-testid={`player-${player.id}`}>
                        {player.name}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {currentPrompt && (
              <Card className="p-6">
                <CardHeader>
                  <CardTitle>Next Prompt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-lg font-medium">{currentPrompt.clue}</p>
                    <p className="text-sm text-muted-foreground mt-2">Answer: {currentPrompt.truth}</p>
                  </div>
                  <Button 
                    onClick={startSubmissionPhase} 
                    size="lg" 
                    className="w-full gap-2"
                    disabled={players.length < 2}
                    data-testid="button-start-round"
                  >
                    <Play className="w-5 h-5" />
                    Start Round ({prompts.indexOf(currentPrompt) + 1}/{prompts.length})
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {phase === 'submission' && currentPrompt && (
          <div className="space-y-6">
            <Card className="p-6 text-center">
              <CardHeader>
                <CardTitle>Submission Phase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{currentPrompt.clue}</p>
                </div>
                {timeLeft !== null && (
                  <div className="text-4xl font-mono font-bold text-primary" data-testid="text-timer">
                    {timeLeft}s
                  </div>
                )}
                <div className="text-lg">
                  Submissions: <span className="font-bold text-primary" data-testid="text-submission-count">{submissionCount}</span> / {players.length}
                </div>
                <Button 
                  onClick={startVotingPhase} 
                  size="lg" 
                  className="gap-2"
                  disabled={submissionCount < 1}
                  data-testid="button-start-voting"
                >
                  <Vote className="w-5 h-5" />
                  Start Voting
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {phase === 'voting' && (
          <div className="space-y-6">
            <Card className="p-6 text-center">
              <CardHeader>
                <CardTitle>Voting Phase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xl font-bold">{currentPrompt?.clue}</p>
                </div>
                {timeLeft !== null && (
                  <div className="text-4xl font-mono font-bold text-primary" data-testid="text-timer">
                    {timeLeft}s
                  </div>
                )}
                <div className="text-lg">
                  Votes: <span className="font-bold text-primary" data-testid="text-vote-count">{voteCount}</span> / {players.length}
                </div>
                <div className="grid gap-2">
                  {votingOptions.map((opt, idx) => (
                    <div key={idx} className="p-3 bg-card border border-border rounded-lg text-left">
                      <span className="font-mono text-muted-foreground mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {opt.answer}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={revealAnswers} 
                  size="lg" 
                  className="gap-2"
                  data-testid="button-reveal"
                >
                  <Eye className="w-5 h-5" />
                  Reveal Answers
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {phase === 'results' && (
          <div className="space-y-6">
            <AnimatePresence>
              {fooledEveryone.length > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <Card className="p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500">
                    <CardContent className="text-center py-4">
                      <Skull className="w-12 h-12 mx-auto mb-2 text-purple-500" />
                      <h2 className="text-2xl font-bold text-purple-500">{sarcasticTitle}</h2>
                      {fooledEveryone.map(liar => (
                        <p key={liar.playerId} className="text-lg font-bold mt-2" data-testid={`liar-${liar.playerId}`}>{liar.playerName}</p>
                      ))}
                      <p className="text-muted-foreground mt-1">Fooled EVERYONE!</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card className="p-6">
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.map((result, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-4 rounded-lg border ${result.isReal ? 'bg-amber-500/10 border-amber-500' : 'border-border'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-muted-foreground">{String.fromCharCode(65 + idx)}.</span>
                          <span className="font-medium">{result.answer}</span>
                          {result.isReal && (
                            <Crown className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {result.isReal ? 'The Truth' : `By: ${result.playerName}`}
                        </p>
                        {result.voterNames.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Voted by: {result.voterNames.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{result.voteCount}</div>
                        <div className="text-xs text-muted-foreground">votes</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            <Button 
              onClick={nextRound} 
              size="lg" 
              className="w-full gap-2"
              data-testid="button-next-round"
            >
              <SkipForward className="w-5 h-5" />
              Next Round
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
