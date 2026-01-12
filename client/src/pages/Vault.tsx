import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronDown, ChevronRight, Heart, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { DoubleDipDailySet, DoubleDipQuestion, DoubleDipAnswer, CategoryInsight } from "@shared/schema";

const CATEGORY_CONFIG: Record<string, { name: string; color: string; bg: string }> = {
  deep_end: { name: "The Deep End", color: "text-blue-500", bg: "bg-blue-500/10" },
  danger_zone: { name: "The Danger Zone", color: "text-orange-500", bg: "bg-orange-500/10" },
  daily_loop: { name: "The Daily Loop", color: "text-green-500", bg: "bg-green-500/10" },
  rewind: { name: "The Rewind", color: "text-purple-500", bg: "bg-purple-500/10" },
  glitch: { name: "The Glitch", color: "text-yellow-500", bg: "bg-yellow-500/10" },
};

interface VaultEntry {
  dailySet: DoubleDipDailySet & { categoryInsights?: CategoryInsight[] };
  questions: DoubleDipQuestion[];
  answers: DoubleDipAnswer[];
}

interface VaultResponse {
  entries: VaultEntry[];
  pair: { userAId: string; userBId: string };
}

export default function Vault() {
  const { user } = useAuth();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const { data, isLoading } = useQuery<VaultResponse>({
    queryKey: ['/api/double-dip/vault'],
  });

  const formatDate = (dateKey: string) => {
    const date = new Date(dateKey + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAverageCompatibility = (insights: CategoryInsight[] | undefined) => {
    if (!insights || insights.length === 0) return 0;
    const sum = insights.reduce((acc, i) => acc + i.compatibilityScore, 0);
    return Math.round(sum / insights.length);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading your history...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="The Vault"
        subtitle="Your answered questions"
        backHref="/couples"
      />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {!data?.entries || data.entries.length === 0 ? (
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
          data.entries.map((entry) => {
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
                            {formatDate(entry.dailySet.dateKey)}
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
                        {entry.dailySet.categoryInsights && entry.dailySet.categoryInsights.length > 0 && (
                          <Card className="bg-gradient-to-br from-pink-500/5 to-purple-500/5">
                            <CardContent className="p-4">
                              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-pink-500" />
                                Compatibility Insights
                              </h4>
                              <div className="space-y-2">
                                {entry.dailySet.categoryInsights.map((insight) => {
                                  const config = CATEGORY_CONFIG[insight.category] || CATEGORY_CONFIG.deep_end;
                                  const score = insight.compatibilityScore;
                                  const scoreColor = score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-orange-500";
                                  
                                  return (
                                    <div key={insight.category} className="flex items-center justify-between text-sm">
                                      <span className={config.color}>{config.name}</span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full ${config.bg.replace('/10', '')}`}
                                            style={{ width: `${score}%` }}
                                          />
                                        </div>
                                        <span className={`font-medium ${scoreColor}`}>{score}%</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        )}

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

                        {entry.dailySet.followupTask && (
                          <Card className="border-pink-500/30">
                            <CardContent className="p-3 flex items-start gap-2">
                              <Heart className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-foreground mb-1">Follow-up Task</p>
                                <p className="text-xs text-muted-foreground">{entry.dailySet.followupTask}</p>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </main>
    </div>
  );
}
