import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { 
  ArrowLeft, Heart, Copy, Check, Loader2, Send, Lock, Flame, Users, 
  Sparkles, Calendar, ChevronDown, ChevronRight, Trophy, Star, BookOpen,
  Archive, TrendingUp, Target, Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DoubleDipPair, DoubleDipQuestion, DoubleDipDailySet, DoubleDipAnswer, DoubleDipMilestone, CategoryInsight, DoubleDipWeeklyStake } from "@shared/schema";
import { SYNC_STAKES } from "@shared/schema";

const CATEGORY_CONFIG: Record<string, { name: string; color: string; bg: string }> = {
  deep_end: { name: "The Deep End", color: "text-blue-500", bg: "bg-blue-500/10" },
  danger_zone: { name: "The Danger Zone", color: "text-orange-500", bg: "bg-orange-500/10" },
  daily_loop: { name: "The Daily Loop", color: "text-green-500", bg: "bg-green-500/10" },
  rewind: { name: "The Rewind", color: "text-purple-500", bg: "bg-purple-500/10" },
  glitch: { name: "The Glitch", color: "text-yellow-500", bg: "bg-yellow-500/10" },
};

const STREAK_MILESTONES = [3, 7, 14, 30, 100];

interface DailyResponse {
  pair: DoubleDipPair;
  dailySet: DoubleDipDailySet & { followupTask?: string; categoryInsights?: CategoryInsight[] };
  questions: DoubleDipQuestion[];
  answers: DoubleDipAnswer[];
  userCompleted: boolean;
  partnerCompleted: boolean;
  isUserA: boolean;
  revealed: boolean;
  streakCount: number;
}

interface VaultEntry {
  dailySet: DoubleDipDailySet & { categoryInsights?: CategoryInsight[] };
  questions: DoubleDipQuestion[];
  answers: DoubleDipAnswer[];
}

interface VaultResponse {
  entries: VaultEntry[];
  pair: { userAId: string; userBId: string };
  favorites: Array<{
    favorite: any;
    answer: DoubleDipAnswer;
    question: DoubleDipQuestion;
  }>;
}

interface TimelineItem {
  type: 'milestone' | 'favorite' | 'reveal';
  id: string;
  date: string;
  data: any;
}

interface StoryboardResponse {
  pair: DoubleDipPair;
  timeline: TimelineItem[];
  stats: {
    totalDays: number;
    currentStreak: number;
    totalFavorites: number;
    totalMilestones: number;
  };
}

interface WeeklyStakeResponse {
  stake: DoubleDipWeeklyStake | null;
  weekStartDate: string;
  daysRemaining: number;
  isUserA: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
}

function getNextStreakMilestone(current: number): number {
  return STREAK_MILESTONES.find(m => m > current) || 100;
}

function getDaysUntilAnniversary(anniversaryDate: string): number {
  const today = new Date();
  const anniv = new Date(anniversaryDate + 'T00:00:00');
  
  const thisYearAnniv = new Date(today.getFullYear(), anniv.getMonth(), anniv.getDate());
  if (thisYearAnniv < today) {
    thisYearAnniv.setFullYear(today.getFullYear() + 1);
  }
  
  const diffTime = thisYearAnniv.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#ec4899', '#a855f7', '#f43f5e']
  });
}

export default function RelationshipHub() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("today");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: pair, isLoading: isLoadingPair } = useQuery<DoubleDipPair | null>({
    queryKey: ['/api/double-dip/pair'],
    enabled: isAuthenticated,
  });

  const { data: dailyData, isLoading: isLoadingDaily } = useQuery<DailyResponse>({
    queryKey: ['/api/double-dip/daily'],
    enabled: isAuthenticated && !!pair && pair.status === 'active',
  });

  const { data: vaultData, isLoading: isLoadingVault } = useQuery<VaultResponse>({
    queryKey: ['/api/double-dip/vault'],
    enabled: isAuthenticated && !!pair && pair.status === 'active',
  });

  const { data: storyboard, isLoading: isLoadingStoryboard } = useQuery<StoryboardResponse>({
    queryKey: ['/api/double-dip/storyboard'],
    enabled: isAuthenticated && !!pair && pair.status === 'active',
  });

  const { data: weeklyStake, isLoading: isLoadingWeeklyStake } = useQuery<WeeklyStakeResponse>({
    queryKey: ['/api/double-dip/weekly-stake'],
    enabled: isAuthenticated && !!pair && pair.status === 'active',
  });
  
  const [selectedStakeId, setSelectedStakeId] = useState<string | null>(null);

  // Persist answers in localStorage to survive navigation/reloads
  const storageKey = dailyData?.dailySet?.id ? `dd-answers-${dailyData.dailySet.id}` : null;
  
  const [answers, setAnswersState] = useState<Record<number, string>>(() => {
    if (typeof window !== 'undefined' && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    }
    return {};
  });

  const setAnswers = (updater: React.SetStateAction<Record<number, string>>) => {
    setAnswersState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  // Hydrate answers from localStorage or dailyData when dailySet changes
  useEffect(() => {
    if (!dailyData?.dailySet?.id) return;
    
    const key = `dd-answers-${dailyData.dailySet.id}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      // Restore from localStorage
      setAnswersState(JSON.parse(saved));
    } else if (dailyData.answers && dailyData.answers.length > 0 && user) {
      // Fall back to server data (already submitted)
      const userAnswers = dailyData.answers.filter(a => a.userId === user.id);
      if (userAnswers.length > 0) {
        const hydratedAnswers: Record<number, string> = {};
        userAnswers.forEach(a => {
          hydratedAnswers[a.questionId] = a.answerText;
        });
        setAnswersState(hydratedAnswers);
      } else {
        // No saved data and no server data - reset to empty
        setAnswersState({});
      }
    } else {
      // New day with no localStorage and no server answers - reset to empty
      setAnswersState({});
    }
  }, [dailyData?.dailySet?.id, dailyData?.answers, user]);

  const createPairMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/double-dip/pair');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/double-dip/pair'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create pair", variant: "destructive" });
    },
  });

  const joinPairMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest('POST', `/api/double-dip/join/${code}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/double-dip/pair'] });
      toast({ title: "Paired!", description: "You're now connected with your partner" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Invalid invite code", variant: "destructive" });
    },
  });

  const submitAnswersMutation = useMutation({
    mutationFn: async (data: { dailySetId: number; answers: { questionId: number; answerText: string }[] }) => {
      const res = await apiRequest('POST', '/api/double-dip/answers', data);
      return res.json();
    },
    onSuccess: () => {
      // Clear localStorage after successful submission
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/double-dip/daily'] });
      toast({ title: "Submitted!", description: "Your answers have been locked in" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit answers", variant: "destructive" });
    },
  });

  const anniversaryMutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await apiRequest('POST', '/api/double-dip/anniversary', { anniversaryDate: date });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/double-dip/pair'] });
      queryClient.invalidateQueries({ queryKey: ['/api/double-dip/storyboard'] });
      triggerConfetti();
      toast({ title: "Anniversary Saved!", description: "Your special date has been added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save anniversary", variant: "destructive" });
    },
  });

  const setWeeklyStakeMutation = useMutation({
    mutationFn: async (stakeId: string) => {
      const res = await apiRequest('POST', '/api/double-dip/weekly-stake', { stakeId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/double-dip/weekly-stake'] });
      setSelectedStakeId(null);
      toast({ title: "Stakes Set!", description: "This week's challenge is on!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to set weekly stake", variant: "destructive" });
    },
  });

  const revealWeeklyStakeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/double-dip/weekly-stake/reveal', {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/double-dip/weekly-stake'] });
      if (data.winnerId) {
        triggerConfetti();
        const isUserWinner = data.winnerId === user?.id;
        toast({ 
          title: isUserWinner ? "You Won!" : "Your Partner Won!", 
          description: isUserWinner ? "Time to collect your reward!" : "Better luck next week!"
        });
      } else {
        toast({ title: "It's a Tie!", description: "You're perfectly matched this week" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reveal winner", variant: "destructive" });
    },
  });

  const handleCopyCode = () => {
    if (pair?.inviteCode) {
      navigator.clipboard.writeText(pair.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitAnswers = () => {
    if (!dailyData) return;
    const answerList = Object.entries(answers).map(([qId, text]) => ({
      questionId: parseInt(qId),
      answerText: text,
    }));
    if (answerList.length < dailyData.questions.length) {
      toast({ title: "Incomplete", description: "Please answer all questions", variant: "destructive" });
      return;
    }
    submitAnswersMutation.mutate({ dailySetId: dailyData.dailySet.id, answers: answerList });
  };

  const getAverageCompatibility = (insights: CategoryInsight[] | undefined) => {
    if (!insights || insights.length === 0) return 0;
    const sum = insights.reduce((acc, i) => acc + i.compatibilityScore, 0);
    return Math.round(sum / insights.length);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500/5 via-background to-purple-500/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">Double Dip</h2>
            <p className="text-muted-foreground mb-6">Sign in to start your relationship journey</p>
            <Link href="/login">
              <Button className="w-full" data-testid="button-login">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingPair) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500/5 via-background to-purple-500/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!pair) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500/5 via-background to-purple-500/5 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
              Double Dip
            </h1>
            <p className="text-muted-foreground">Connect with your partner to begin</p>
          </motion.div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-foreground">Start a New Pair</h3>
                <p className="text-sm text-muted-foreground">Create a pair and share the code with your partner</p>
                <Button 
                  onClick={() => createPairMutation.mutate()} 
                  className="w-full"
                  disabled={createPairMutation.isPending}
                  data-testid="button-create-pair"
                >
                  {createPairMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Pair"}
                </Button>
              </CardContent>
            </Card>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-foreground">Join Your Partner</h3>
                <p className="text-sm text-muted-foreground">Enter the code your partner shared with you</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="text-center font-mono text-lg tracking-wider"
                    data-testid="input-join-code"
                  />
                  <Button 
                    onClick={() => joinPairMutation.mutate(joinCode)}
                    disabled={joinCode.length < 4 || joinPairMutation.isPending}
                    data-testid="button-join"
                  >
                    {joinPairMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (pair.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500/5 via-background to-purple-500/5 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          
          <Card className="text-center">
            <CardContent className="p-8">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center"
              >
                <Heart className="w-10 h-10 text-pink-500" />
              </motion.div>
              <h2 className="text-xl font-bold mb-2 text-foreground">Waiting for Partner</h2>
              <p className="text-muted-foreground mb-6">Share this code with your partner</p>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="text-3xl font-mono font-bold tracking-wider text-foreground bg-muted px-4 py-2 rounded-lg">
                  {pair.inviteCode}
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyCode} data-testid="button-copy-code">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentStreak = dailyData?.streakCount || storyboard?.stats?.currentStreak || 0;
  const nextMilestone = getNextStreakMilestone(currentStreak);
  const streakProgress = Math.min((currentStreak / nextMilestone) * 100, 100);
  const daysUntilAnniversary = pair.anniversaryDate ? getDaysUntilAnniversary(pair.anniversaryDate) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500/5 via-background to-purple-500/5">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  Double Dip
                </h1>
                <p className="text-xs text-muted-foreground">Your relationship journey</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentStreak > 0 && (
                <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-bold text-orange-500">{currentStreak}</span>
                </div>
              )}
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today" className="gap-1" data-testid="tab-today">
                <Heart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Today</span>
              </TabsTrigger>
              <TabsTrigger value="vault" className="gap-1" data-testid="tab-vault">
                <Archive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vault</span>
              </TabsTrigger>
              <TabsTrigger value="journey" className="gap-1" data-testid="tab-journey">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Journey</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "today" && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Progress & Goals Section */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-medium text-muted-foreground">Next Goal</span>
                    </div>
                    <p className="font-bold text-foreground mb-2">
                      {nextMilestone - currentStreak} days to {nextMilestone}-day streak
                    </p>
                    <Progress value={streakProgress} className="h-2" />
                  </CardContent>
                </Card>
                
                {daysUntilAnniversary !== null ? (
                  <Card className="bg-gradient-to-br from-pink-500/5 to-rose-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-4 h-4 text-pink-500" />
                        <span className="text-xs font-medium text-muted-foreground">Anniversary</span>
                      </div>
                      <p className="font-bold text-foreground">
                        {daysUntilAnniversary === 0 ? (
                          <span className="text-pink-500">Today!</span>
                        ) : (
                          <>{daysUntilAnniversary} days away</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pair.anniversaryDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card 
                    className="bg-gradient-to-br from-pink-500/5 to-rose-500/5 cursor-pointer hover-elevate"
                    onClick={() => document.getElementById('anniversary-input')?.focus()}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-4 h-4 text-pink-500" />
                        <span className="text-xs font-medium text-muted-foreground">Anniversary</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Add your special date</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Anniversary Input */}
              {!pair.anniversaryDate && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5 text-pink-500" />
                      <Input
                        id="anniversary-input"
                        type="date"
                        value={anniversaryDate}
                        onChange={(e) => setAnniversaryDate(e.target.value)}
                        className="flex-1"
                        data-testid="input-anniversary"
                      />
                      <Button
                        onClick={() => anniversaryMutation.mutate(anniversaryDate)}
                        disabled={!anniversaryDate || anniversaryMutation.isPending}
                        size="sm"
                        data-testid="button-save-anniversary"
                      >
                        {anniversaryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sync-Stakes Weekly Challenge */}
              {!isLoadingWeeklyStake && (
                <Card className="bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border-purple-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-5 h-5 text-purple-500" />
                      <h3 className="font-bold text-foreground">Sync-Stakes</h3>
                      {weeklyStake?.stake && !weeklyStake.stake.isRevealed && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {weeklyStake.daysRemaining} days left
                        </span>
                      )}
                    </div>
                    
                    {!weeklyStake?.stake ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Set a weekly stake! First to complete daily questions earns a point. 85%+ compatibility bonus!
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {SYNC_STAKES.map((stake) => (
                            <Button
                              key={stake.id}
                              variant={selectedStakeId === stake.id ? "default" : "outline"}
                              size="sm"
                              className="text-xs h-auto py-2 px-3"
                              onClick={() => setSelectedStakeId(selectedStakeId === stake.id ? null : stake.id)}
                              data-testid={`button-stake-${stake.id}`}
                            >
                              {stake.winner.replace("Winner ", "")}
                            </Button>
                          ))}
                        </div>
                        {selectedStakeId && (
                          <Button
                            onClick={() => setWeeklyStakeMutation.mutate(selectedStakeId)}
                            disabled={setWeeklyStakeMutation.isPending}
                            className="w-full"
                            data-testid="button-set-stake"
                          >
                            {setWeeklyStakeMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Lock In This Week's Stakes"
                            )}
                          </Button>
                        )}
                      </div>
                    ) : weeklyStake.stake.isRevealed ? (
                      <div className="text-center py-2">
                        <p className="text-sm text-muted-foreground mb-2">
                          {weeklyStake.stake.winnerId ? (
                            weeklyStake.stake.winnerId === user?.id ? (
                              <span className="text-green-500 font-bold">You won this week!</span>
                            ) : (
                              <span className="text-orange-500 font-bold">Your partner won!</span>
                            )
                          ) : (
                            <span className="text-purple-500 font-bold">It was a tie!</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const stakeInfo = SYNC_STAKES.find(s => s.id === weeklyStake.stake?.stakeId);
                            if (!stakeInfo || !weeklyStake.stake?.winnerId) return "No reward this week";
                            return weeklyStake.stake.winnerId === user?.id ? stakeInfo.winner : stakeInfo.loser;
                          })()}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">You</span>
                          <span className="font-bold text-purple-500">
                            {weeklyStake.isUserA ? weeklyStake.stake.userAScore : weeklyStake.stake.userBScore} pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Partner</span>
                          <span className="font-bold text-pink-500">
                            {weeklyStake.isUserA ? weeklyStake.stake.userBScore : weeklyStake.stake.userAScore} pts
                          </span>
                        </div>
                        <Progress 
                          value={(() => {
                            const userScore = weeklyStake.isUserA ? weeklyStake.stake.userAScore : weeklyStake.stake.userBScore;
                            const partnerScore = weeklyStake.isUserA ? weeklyStake.stake.userBScore : weeklyStake.stake.userAScore;
                            const total = userScore + partnerScore;
                            return total > 0 ? (userScore / total) * 100 : 50;
                          })()}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          {(() => {
                            const stakeInfo = SYNC_STAKES.find(s => s.id === weeklyStake.stake?.stakeId);
                            return stakeInfo?.winner || "Weekly challenge active";
                          })()}
                        </p>
                        {weeklyStake.daysRemaining <= 0 && (
                          <Button
                            onClick={() => revealWeeklyStakeMutation.mutate()}
                            disabled={revealWeeklyStakeMutation.isPending}
                            className="w-full"
                            data-testid="button-reveal-winner"
                          >
                            {revealWeeklyStakeMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Reveal Winner"
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {isLoadingDaily ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                </div>
              ) : dailyData?.revealed ? (
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/30">
                    <CardContent className="p-6 text-center">
                      <Sparkles className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <h3 className="text-xl font-bold text-foreground mb-1">Today Complete!</h3>
                      <p className="text-muted-foreground mb-3">You both answered today's questions</p>
                      {(() => {
                        const avgScore = getAverageCompatibility(dailyData.dailySet.categoryInsights);
                        if (!avgScore) return null;
                        return (
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="font-bold text-green-500">{avgScore}%</span>
                            <span className="text-sm text-muted-foreground">compatibility today</span>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {dailyData.dailySet.followupTask && (
                    <Card className="border-2 border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-foreground mb-1">Your Follow-up Task</h4>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              {dailyData.dailySet.followupTask}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Show both partners' answers */}
                  <h4 className="text-sm font-medium text-muted-foreground mt-4">Today's Answers</h4>
                  {dailyData.questions.map((question) => {
                    const config = CATEGORY_CONFIG[question.category] || CATEGORY_CONFIG.deep_end;
                    const userAnswer = dailyData.answers.find(a => a.questionId === question.id && a.userId === user?.id);
                    const partnerAnswer = dailyData.answers.find(a => a.questionId === question.id && a.userId !== user?.id);
                    
                    return (
                      <Card key={question.id} className="overflow-hidden">
                        <div className={`${config.bg} px-4 py-2`}>
                          <span className={`text-xs font-medium uppercase tracking-wider ${config.color}`}>
                            {config.name}
                          </span>
                        </div>
                        <CardContent className="p-4 space-y-3">
                          <p className="text-sm font-medium text-foreground">{question.questionText}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-pink-500/5 rounded-lg p-3">
                              <p className="text-xs text-pink-500 font-medium mb-1">You</p>
                              <p className="text-sm text-foreground">{userAnswer?.answerText || "—"}</p>
                            </div>
                            <div className="bg-purple-500/5 rounded-lg p-3">
                              <p className="text-xs text-purple-500 font-medium mb-1">Partner</p>
                              <p className="text-sm text-foreground">{partnerAnswer?.answerText || "—"}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : dailyData?.userCompleted ? (
                <div className="space-y-4">
                  <Card className="text-center py-8 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Lock className="w-12 h-12 text-pink-500/50 mx-auto mb-3" />
                    </motion.div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Your answers are locked!</h3>
                    <p className="text-sm text-muted-foreground">
                      Waiting for your partner to finish
                    </p>
                  </Card>
                  
                  <h4 className="text-sm font-medium text-muted-foreground">Your Answers</h4>
                  {dailyData.questions.map((question) => {
                    const config = CATEGORY_CONFIG[question.category] || CATEGORY_CONFIG.deep_end;
                    const userAnswer = dailyData.answers.find(a => a.questionId === question.id && a.userId === user?.id);
                    
                    return (
                      <Card key={question.id} className="overflow-hidden">
                        <div className={`${config.bg} px-4 py-2`}>
                          <span className={`text-xs font-medium uppercase tracking-wider ${config.color}`}>
                            {config.name}
                          </span>
                        </div>
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-foreground mb-2">{question.questionText}</p>
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-sm text-foreground">{userAnswer?.answerText || "—"}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : dailyData ? (
                <div className="space-y-4">
                  {dailyData.questions.map((question, index) => {
                    const config = CATEGORY_CONFIG[question.category] || CATEGORY_CONFIG.deep_end;
                    
                    return (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="overflow-hidden">
                          <div className={`${config.bg} px-4 py-2 flex items-center justify-between`}>
                            <span className={`text-xs font-medium uppercase tracking-wider ${config.color}`}>
                              {config.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {index + 1} of {dailyData.questions.length}
                            </span>
                          </div>
                          <CardContent className="p-4 space-y-3">
                            <p className="font-medium text-foreground">{question.questionText}</p>
                            <Textarea
                              placeholder="Type your answer..."
                              value={answers[question.id] || ""}
                              onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                              className="resize-none"
                              data-testid={`textarea-answer-${question.id}`}
                            />
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleSubmitAnswers}
                    disabled={submitAnswersMutation.isPending || Object.keys(answers).length < dailyData.questions.length}
                    data-testid="button-submit-answers"
                  >
                    {submitAnswersMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Lock In Answers
                  </Button>
                </div>
              ) : null}
            </motion.div>
          )}

          {activeTab === "vault" && (
            <motion.div
              key="vault"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {isLoadingVault ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                </div>
              ) : (
              <>
              {/* Favorites Section */}
              {(() => {
                const validFavorites = (vaultData?.favorites || []).filter(
                  fav => fav.answer && fav.question && fav.answer.answerText
                );
                if (validFavorites.length === 0) return null;
                
                return (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500" />
                      Favorite Moments
                    </h3>
                    <div className="grid gap-3">
                      {validFavorites.slice(0, 3).map((fav, i) => {
                        const config = CATEGORY_CONFIG[fav.question?.category] || CATEGORY_CONFIG.deep_end;
                        return (
                          <motion.div
                            key={fav.answer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <Card className="border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-rose-500/5">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Heart className="w-5 h-5 text-pink-500 fill-pink-500 shrink-0 mt-1" />
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-xs font-medium ${config.color}`}>{config.name}</span>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{fav.question.questionText}</p>
                                    <p className="mt-2 text-foreground font-medium">"{fav.answer.answerText}"</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Past Days */}
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Past Conversations
              </h3>
              
              {!vaultData?.entries || vaultData.entries.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-foreground mb-2">No History Yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete your first set of daily questions to see them here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                vaultData.entries.map((entry) => {
                  const isExpanded = expandedDate === entry.dailySet.dateKey;
                  const avgCompatibility = getAverageCompatibility(entry.dailySet.categoryInsights);
                  
                  return (
                    <motion.div
                      key={entry.dailySet.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card 
                        className="overflow-hidden cursor-pointer hover-elevate"
                        onClick={() => setExpandedDate(isExpanded ? null : entry.dailySet.dateKey)}
                        data-testid={`card-day-${entry.dailySet.dateKey}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-pink-500" />
                              </div>
                              <div>
                                <h3 className="font-medium text-foreground">
                                  {formatFullDate(entry.dailySet.dateKey)}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {entry.questions.length} questions answered
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {avgCompatibility > 0 && (
                                <div className="flex items-center gap-1 text-sm">
                                  <TrendingUp className="w-4 h-4 text-green-500" />
                                  <span className="font-medium text-green-500">{avgCompatibility}%</span>
                                </div>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-3 pl-4 border-l-2 border-pink-500/30">
                              {entry.questions.map((question) => {
                                const config = CATEGORY_CONFIG[question.category] || CATEGORY_CONFIG.deep_end;
                                const userAnswer = entry.answers.find(a => a.questionId === question.id && a.userId === user?.id);
                                const partnerAnswer = entry.answers.find(a => a.questionId === question.id && a.userId !== user?.id);
                                
                                return (
                                  <Card key={question.id}>
                                    <div className={`${config.bg} px-3 py-1.5`}>
                                      <span className={`text-xs font-medium uppercase tracking-wider ${config.color}`}>
                                        {config.name}
                                      </span>
                                    </div>
                                    <CardContent className="p-3 space-y-3">
                                      <p className="text-sm font-medium text-foreground">{question.questionText}</p>
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-pink-500/5 rounded-lg p-2">
                                          <p className="text-xs text-pink-500 font-medium mb-1">You</p>
                                          <p className="text-xs text-foreground">{userAnswer?.answerText || "—"}</p>
                                        </div>
                                        <div className="bg-purple-500/5 rounded-lg p-2">
                                          <p className="text-xs text-purple-500 font-medium mb-1">Partner</p>
                                          <p className="text-xs text-foreground">{partnerAnswer?.answerText || "—"}</p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
              </>
              )}
            </motion.div>
          )}

          {activeTab === "journey" && (
            <motion.div
              key="journey"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {isLoadingStoryboard ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : (
              <>
              {/* Stats Overview */}
              <div className="grid grid-cols-4 gap-2">
                <Card className="text-center p-3">
                  <div className="text-2xl font-bold text-foreground">{storyboard?.stats?.totalDays || 0}</div>
                  <div className="text-xs text-muted-foreground">Days</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-2xl font-bold text-foreground">{currentStreak}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Streak</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="flex items-center justify-center gap-1">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span className="text-2xl font-bold text-foreground">{storyboard?.stats?.totalFavorites || 0}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Favorites</div>
                </Card>
                <Card className="text-center p-3">
                  <div className="flex items-center justify-center gap-1">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-2xl font-bold text-foreground">{storyboard?.stats?.totalMilestones || 0}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Milestones</div>
                </Card>
              </div>

              {/* Progress Bar */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Relationship Journey</span>
                    <span className="text-xs text-muted-foreground">{storyboard?.stats?.totalDays || 0} days together</span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((storyboard?.stats?.totalDays || 0) / 100 * 100, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Start</span>
                    <span>100 Days</span>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              {!storyboard?.timeline || storyboard.timeline.length === 0 ? (
                <Card className="text-center p-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-500" />
                  <h3 className="font-bold mb-2 text-foreground">Your Story Begins Here</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete your first daily questions together to start building your timeline!
                  </p>
                </Card>
              ) : (
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-500 via-purple-500 to-blue-500 opacity-30" />
                  
                  <div className="space-y-4">
                    {storyboard.timeline.map((item, index) => {
                      const iconMap: Record<string, any> = {
                        streak: Flame,
                        compatibility: Star,
                        favorite: Heart,
                        first_reveal: Sparkles,
                        category_master: Trophy,
                        anniversary: Gift,
                      };
                      
                      const bgColorMap: Record<string, string> = {
                        streak: "from-orange-500 to-red-500",
                        compatibility: "from-pink-500 to-rose-500",
                        favorite: "from-red-500 to-pink-500",
                        first_reveal: "from-purple-500 to-blue-500",
                        category_master: "from-yellow-500 to-orange-500",
                        anniversary: "from-pink-500 to-red-500",
                      };
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative pl-14"
                        >
                          <div className="absolute left-4 w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 border-4 border-background" />
                          
                          <div className="text-xs text-muted-foreground mb-2">{formatDate(item.date)}</div>
                          
                          {item.type === 'milestone' && (
                            <Card className="overflow-hidden border-2 border-yellow-500/30">
                              <div className={`h-2 bg-gradient-to-r ${bgColorMap[item.data.type] || bgColorMap.streak}`} />
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bgColorMap[item.data.type] || bgColorMap.streak} flex items-center justify-center`}>
                                    {(() => {
                                      const Icon = iconMap[item.data.type] || Trophy;
                                      return <Icon className="w-6 h-6 text-white" />;
                                    })()}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-bold text-foreground">{item.data.title}</h4>
                                    {item.data.description && (
                                      <p className="text-sm text-muted-foreground">{item.data.description}</p>
                                    )}
                                  </div>
                                  {item.data.value && (
                                    <div className="text-2xl font-bold text-yellow-500">{item.data.value}</div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          
                          {item.type === 'favorite' && (
                            <Card className="border-2 border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-rose-500/5">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shrink-0">
                                    <Heart className="w-5 h-5 text-white fill-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-muted-foreground">{item.data.question?.questionText}</p>
                                    <p className="mt-2 text-foreground font-medium">"{item.data.answer?.answerText}"</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
              </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
