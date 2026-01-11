import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Heart, Copy, Check, Loader2, Send, Lock, Unlock, Flame, Users, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DoubleDipPair, DoubleDipQuestion, DoubleDipDailySet, DoubleDipAnswer } from "@shared/schema";

const CATEGORY_CONFIG: Record<string, { name: string; emoji: string; color: string; bg: string }> = {
  deep_end: { name: "The Deep End", emoji: "ocean", color: "text-blue-500", bg: "bg-blue-500/10" },
  danger_zone: { name: "The Danger Zone", emoji: "fire", color: "text-orange-500", bg: "bg-orange-500/10" },
  daily_loop: { name: "The Daily Loop", emoji: "cycle", color: "text-green-500", bg: "bg-green-500/10" },
  rewind: { name: "The Rewind", emoji: "history", color: "text-purple-500", bg: "bg-purple-500/10" },
  glitch: { name: "The Glitch", emoji: "zap", color: "text-yellow-500", bg: "bg-yellow-500/10" },
};

interface DailyResponse {
  pair: DoubleDipPair;
  dailySet: DoubleDipDailySet;
  questions: DoubleDipQuestion[];
  answers: DoubleDipAnswer[];
  userCompleted: boolean;
  partnerCompleted: boolean;
  isUserA: boolean;
  revealed: boolean;
  streakCount: number;
}

export default function CouplesGame() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const { data: pair, isLoading: isLoadingPair } = useQuery<DoubleDipPair | null>({
    queryKey: ['/api/double-dip/pair'],
    enabled: isAuthenticated,
  });

  const { data: dailyData, isLoading: isLoadingDaily } = useQuery<DailyResponse>({
    queryKey: ['/api/double-dip/daily'],
    enabled: isAuthenticated && !!pair && pair.status === 'active',
  });

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
      queryClient.invalidateQueries({ queryKey: ['/api/double-dip/daily'] });
      toast({ title: "Submitted!", description: "Your answers have been locked in" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit answers", variant: "destructive" });
    },
  });

  const handleCopyCode = () => {
    if (pair?.inviteCode) {
      navigator.clipboard.writeText(pair.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinPair = () => {
    if (joinCode.length >= 4) {
      joinPairMutation.mutate(joinCode);
    }
  };

  const handleSubmitAnswers = () => {
    if (!dailyData) return;
    const answerList = Object.entries(answers).map(([questionId, answerText]) => ({
      questionId: Number(questionId),
      answerText,
    }));
    submitAnswersMutation.mutate({
      dailySetId: dailyData.dailySet.id,
      answers: answerList,
    });
  };

  const allQuestionsAnswered = dailyData?.questions?.every(q => answers[q.id]?.trim());

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen gradient-game flex items-center justify-center">
        <Card className="max-w-md text-center p-6">
          <Heart className="w-12 h-12 text-pink-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to play Double Dip</p>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoadingPair) {
    return (
      <div className="min-h-screen gradient-game flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-game flex flex-col">
      <header className="border-b border-pink-500/20 bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Double Dip</h1>
                <span className="text-xs text-muted-foreground">Daily Questions for Couples</span>
              </div>
            </div>
          </div>
          {dailyData && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-full">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-500">{dailyData.streakCount}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {!pair ? (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader className="text-center">
                    <motion.div 
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-4"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Heart className="w-10 h-10 text-white" />
                    </motion.div>
                    <CardTitle className="text-2xl">Welcome to Double Dip</CardTitle>
                    <CardDescription className="text-base mt-2">
                      Answer daily questions together, reveal answers simultaneously, and build your love story.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Button
                        onClick={() => createPairMutation.mutate()}
                        disabled={createPairMutation.isPending}
                        className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                        size="lg"
                        data-testid="button-create-pair"
                      >
                        {createPairMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                          <Users className="w-5 h-5 mr-2" />
                        )}
                        Create New Pair
                      </Button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">or join existing</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter invite code"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          className="text-center text-lg tracking-widest font-mono uppercase"
                          maxLength={6}
                          data-testid="input-join-code"
                        />
                        <Button
                          onClick={handleJoinPair}
                          disabled={joinCode.length < 4 || joinPairMutation.isPending}
                          data-testid="button-join-pair"
                        >
                          {joinPairMutation.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            "Join"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : pair.status === 'pending' ? (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="text-center">
                  <CardHeader>
                    <motion.div 
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-2 border-dashed border-pink-500/50 flex items-center justify-center mx-auto mb-4"
                      animate={{ rotate: [0, 360] }}
                      transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    >
                      <Heart className="w-10 h-10 text-pink-500" />
                    </motion.div>
                    <CardTitle className="text-2xl">Waiting for Partner</CardTitle>
                    <CardDescription className="text-base mt-2">
                      Share your invite code with your partner to start playing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted rounded-xl p-6">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Your Invite Code</p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-4xl font-bold tracking-[0.3em] text-foreground font-mono">
                          {pair.inviteCode}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopyCode}
                          className="shrink-0"
                          data-testid="button-copy-code"
                        >
                          {copied ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Once your partner joins, you'll both receive 5 daily questions to answer privately.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : isLoadingDaily ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
              </div>
            ) : dailyData ? (
              <motion.div
                key="daily"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Today's Questions</h2>
                  <div className="flex items-center gap-2 text-sm">
                    {dailyData.userCompleted ? (
                      <span className="flex items-center gap-1 text-green-500">
                        <Check className="w-4 h-4" /> You're done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Lock className="w-4 h-4" /> Answer privately
                      </span>
                    )}
                    <span className="text-muted-foreground">|</span>
                    {dailyData.partnerCompleted ? (
                      <span className="flex items-center gap-1 text-green-500">
                        <Check className="w-4 h-4" /> Partner done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Lock className="w-4 h-4" /> Waiting...
                      </span>
                    )}
                  </div>
                </div>

                {dailyData.revealed ? (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-full"
                      >
                        <Unlock className="w-4 h-4" />
                        <span className="font-medium">Answers Revealed!</span>
                        <Sparkles className="w-4 h-4" />
                      </motion.div>
                    </div>
                    
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
                          <CardContent className="p-4 space-y-4">
                            <p className="font-medium text-foreground">{question.questionText}</p>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-pink-500/5 rounded-lg p-3">
                                <p className="text-xs text-pink-500 font-medium mb-1">Your Answer</p>
                                <p className="text-sm text-foreground">{userAnswer?.answerText || "—"}</p>
                              </div>
                              <div className="bg-purple-500/5 rounded-lg p-3">
                                <p className="text-xs text-purple-500 font-medium mb-1">Partner's Answer</p>
                                <p className="text-sm text-foreground">{partnerAnswer?.answerText || "—"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : dailyData.userCompleted ? (
                  <Card className="text-center py-12">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Lock className="w-16 h-16 text-pink-500/50 mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Your answers are locked!</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      Waiting for your partner to finish. The answers will be revealed once you're both done.
                    </p>
                    <div className="mt-6">
                      <Button variant="outline" className="gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Send Nudge
                      </Button>
                    </div>
                  </Card>
                ) : (
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
                                rows={3}
                                data-testid={`textarea-answer-${question.id}`}
                              />
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                    
                    <Button
                      onClick={handleSubmitAnswers}
                      disabled={!allQuestionsAnswered || submitAnswersMutation.isPending}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                      size="lg"
                      data-testid="button-submit-answers"
                    >
                      {submitAnswersMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Send className="w-5 h-5 mr-2" />
                      )}
                      Lock In My Answers
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
