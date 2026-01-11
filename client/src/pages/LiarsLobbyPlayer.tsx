import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Vote, Clock, Check, Skull, Crown } from "lucide-react";
import { Link, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

type Phase = 'joining' | 'waiting' | 'submission' | 'voting' | 'results';

interface VotingOption {
  index: number;
  answer: string;
}

interface Result {
  index: number;
  answer: string;
  playerId: string;
  playerName: string;
  isReal: boolean;
  voterIds: string[];
  voterNames: string[];
  voteCount: number;
}

export default function LiarsLobbyPlayer() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const codeFromUrl = params.get('code') || '';
  
  const { colorMode } = useTheme();
  
  const wsRef = useRef<WebSocket | null>(null);
  const [roomCode, setRoomCode] = useState(codeFromUrl);
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('joining');
  const [error, setError] = useState<string | null>(null);
  
  const [clue, setClue] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [votingOptions, setVotingOptions] = useState<VotingOption[]>([]);
  const [mySubmissionIndex, setMySubmissionIndex] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [votedCorrectly, setVotedCorrectly] = useState(false);

  useEffect(() => {
    if (!timerEnd) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 100);
    return () => clearInterval(interval);
  }, [timerEnd]);

  const joinGame = () => {
    if (!roomCode.trim() || !playerName.trim()) {
      setError('Please enter room code and name');
      return;
    }
    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      const storedPlayerId = localStorage.getItem(`liar_player_${roomCode}`);
      ws.send(JSON.stringify({
        type: 'player:join',
        code: roomCode.toUpperCase(),
        name: playerName,
        playerId: storedPlayerId || undefined,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'joined':
          setPlayerId(data.playerId);
          localStorage.setItem(`liar_player_${roomCode}`, data.playerId);
          setPhase('waiting');
          break;
        case 'error':
          setError(data.message);
          break;
        case 'liar:submission-phase':
          setPhase('submission');
          setClue(data.clue);
          setTimerEnd(data.timerEnd);
          setMyAnswer('');
          setSubmitted(false);
          break;
        case 'liar:submit-confirmed':
          setSubmitted(true);
          break;
        case 'liar:voting-phase':
          setPhase('voting');
          setClue(data.clue);
          setVotingOptions(data.options);
          setMySubmissionIndex(data.mySubmissionIndex);
          setTimerEnd(data.timerEnd);
          setVoted(false);
          setSelectedVote(null);
          break;
        case 'liar:vote-confirmed':
          setVoted(true);
          break;
        case 'liar:results':
          setPhase('results');
          setResults(data.results);
          setVotedCorrectly(data.votedCorrectly);
          setTimerEnd(null);
          break;
        case 'liar:reset':
          setPhase('waiting');
          setResults([]);
          setVotedCorrectly(false);
          break;
        case 'kicked':
          setPhase('joining');
          setError('You were removed from the game');
          break;
      }
    };

    ws.onerror = () => {
      setError('Connection error');
    };

    ws.onclose = () => {
      if (phase !== 'joining') {
        setError('Connection lost');
        setPhase('joining');
      }
    };
  };

  const submitAnswer = () => {
    if (wsRef.current && myAnswer.trim()) {
      wsRef.current.send(JSON.stringify({
        type: 'liar:submit',
        answer: myAnswer.trim(),
      }));
    }
  };

  const castVote = (optionIndex: number) => {
    if (wsRef.current && optionIndex !== mySubmissionIndex) {
      setSelectedVote(optionIndex);
      wsRef.current.send(JSON.stringify({
        type: 'liar:vote',
        optionIndex,
      }));
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground">Liar's Lobby</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        {phase === 'joining' && (
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-center">Join Game</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="text-center text-2xl font-mono tracking-widest"
                  maxLength={4}
                  data-testid="input-room-code"
                />
              </div>
              <div>
                <Input
                  placeholder="Your Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={50}
                  data-testid="input-player-name"
                />
              </div>
              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}
              <Button 
                onClick={joinGame} 
                className="w-full" 
                size="lg"
                disabled={!roomCode.trim() || !playerName.trim()}
                data-testid="button-join"
              >
                Join Game
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === 'waiting' && (
          <Card className="p-6 text-center">
            <CardContent className="py-8">
              <div className="animate-pulse mb-4">
                <Clock className="w-16 h-16 mx-auto text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">Waiting for host...</h2>
              <p className="text-muted-foreground">The game will start soon!</p>
            </CardContent>
          </Card>
        )}

        {phase === 'submission' && (
          <div className="space-y-6">
            <Card className="p-6">
              <CardHeader>
                <CardTitle className="text-center">Make Up a Lie!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg font-medium text-center">{clue}</p>
                </div>
                {timeLeft !== null && (
                  <div className="text-3xl font-mono font-bold text-center text-primary" data-testid="text-timer">
                    {timeLeft}s
                  </div>
                )}
                {!submitted ? (
                  <>
                    <Textarea
                      placeholder="Write a convincing fake answer..."
                      value={myAnswer}
                      onChange={(e) => setMyAnswer(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="input-answer"
                    />
                    <Button 
                      onClick={submitAnswer} 
                      className="w-full gap-2" 
                      size="lg"
                      disabled={!myAnswer.trim()}
                      data-testid="button-submit"
                    >
                      <Send className="w-5 h-5" />
                      Submit Answer
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Check className="w-12 h-12 mx-auto text-primary mb-2" />
                    <p className="text-lg font-medium">Answer Submitted!</p>
                    <p className="text-muted-foreground">Waiting for others...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {phase === 'voting' && (
          <div className="space-y-6">
            <Card className="p-6">
              <CardHeader>
                <CardTitle className="text-center">Find the Truth!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg font-medium text-center">{clue}</p>
                </div>
                {timeLeft !== null && (
                  <div className="text-3xl font-mono font-bold text-center text-primary" data-testid="text-timer">
                    {timeLeft}s
                  </div>
                )}
                {!voted ? (
                  <div className="space-y-2">
                    {votingOptions.map((opt) => (
                      <Button
                        key={opt.index}
                        variant={opt.index === mySubmissionIndex ? "outline" : "secondary"}
                        className="w-full justify-start text-left h-auto py-3 px-4"
                        disabled={opt.index === mySubmissionIndex}
                        onClick={() => castVote(opt.index)}
                        data-testid={`vote-option-${opt.index}`}
                      >
                        <span className="font-mono mr-2">{String.fromCharCode(65 + opt.index)}.</span>
                        <span className="flex-1">{opt.answer}</span>
                        {opt.index === mySubmissionIndex && (
                          <span className="text-xs text-muted-foreground">(yours)</span>
                        )}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Vote className="w-12 h-12 mx-auto text-primary mb-2" />
                    <p className="text-lg font-medium">Vote Cast!</p>
                    <p className="text-muted-foreground">You voted for {String.fromCharCode(65 + (selectedVote ?? 0))}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {phase === 'results' && (
          <div className="space-y-6">
            <AnimatePresence>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Card className={`p-6 text-center ${votedCorrectly ? 'bg-amber-500/10 border-amber-500' : ''}`}>
                  <CardContent className="py-4">
                    {votedCorrectly ? (
                      <>
                        <Crown className="w-12 h-12 mx-auto mb-2 text-amber-500" />
                        <h2 className="text-xl font-bold text-amber-500">You Found the Truth!</h2>
                      </>
                    ) : (
                      <>
                        <Skull className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                        <h2 className="text-xl font-bold">You Got Fooled!</h2>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            <Card className="p-6">
              <CardHeader>
                <CardTitle>All Answers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.map((result, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-3 rounded-lg border ${result.isReal ? 'bg-amber-500/10 border-amber-500' : 'border-border'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-muted-foreground">{String.fromCharCode(65 + idx)}.</span>
                      <div className="flex-1">
                        <p className="font-medium">{result.answer}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.isReal ? 'The Truth' : result.playerName}
                          {result.voteCount > 0 && ` • ${result.voteCount} vote${result.voteCount > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {result.isReal && <Crown className="w-4 h-4 text-amber-500" />}
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
