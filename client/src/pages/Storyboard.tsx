import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Flame, Trophy, Calendar, Star, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import type { DoubleDipPair, DoubleDipMilestone, DoubleDipQuestion, DoubleDipAnswer } from "@shared/schema";

const CATEGORY_CONFIG: Record<string, { name: string; color: string; bg: string }> = {
  deep_end: { name: "The Deep End", color: "text-blue-500", bg: "bg-blue-500" },
  danger_zone: { name: "Danger Zone", color: "text-orange-500", bg: "bg-orange-500" },
  daily_loop: { name: "Daily Loop", color: "text-green-500", bg: "bg-green-500" },
  rewind: { name: "Rewind", color: "text-purple-500", bg: "bg-purple-500" },
  glitch: { name: "Glitch", color: "text-yellow-500", bg: "bg-yellow-500" },
};

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MilestoneCard({ milestone }: { milestone: DoubleDipMilestone }) {
  const iconMap: Record<string, any> = {
    streak: Flame,
    compatibility: Star,
    favorite: Heart,
    first_reveal: Sparkles,
    category_master: Trophy,
  };
  const Icon = iconMap[milestone.type] || Trophy;
  
  const bgColorMap: Record<string, string> = {
    streak: "from-orange-500 to-red-500",
    compatibility: "from-pink-500 to-rose-500",
    favorite: "from-red-500 to-pink-500",
    first_reveal: "from-purple-500 to-blue-500",
    category_master: "from-yellow-500 to-orange-500",
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <Card className="overflow-hidden border-2 border-yellow-500/30">
        <div className={`h-2 bg-gradient-to-r ${bgColorMap[milestone.type] || bgColorMap.streak}`} />
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bgColorMap[milestone.type] || bgColorMap.streak} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-foreground">{milestone.title}</h4>
              {milestone.description && (
                <p className="text-sm text-muted-foreground">{milestone.description}</p>
              )}
            </div>
            {milestone.value && (
              <div className="text-2xl font-bold text-yellow-500">{milestone.value}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FavoriteCard({ data }: { data: { favorite: any; answer: DoubleDipAnswer; question: DoubleDipQuestion } }) {
  const { answer, question } = data;
  const config = CATEGORY_CONFIG[question?.category] || CATEGORY_CONFIG.deep_end;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <Card className="border-2 border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-rose-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-medium ${config.color}`}>{config.name}</span>
              <p className="text-sm text-muted-foreground mt-1">{question?.questionText}</p>
              <p className="mt-2 text-foreground font-medium">"{answer?.answerText}"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RevealCard({ data }: { data: { dailySet: any; answers: DoubleDipAnswer[]; questions: DoubleDipQuestion[] } }) {
  const { dailySet, answers, questions } = data;
  const dateStr = dailySet.dateKey;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{formatDate(dateStr)}</span>
            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full ml-auto">Revealed</span>
          </div>
          <div className="space-y-2">
            {questions.slice(0, 2).map(q => {
              const config = CATEGORY_CONFIG[q.category] || CATEGORY_CONFIG.deep_end;
              return (
                <div key={q.id} className="text-sm">
                  <span className={`text-xs ${config.color}`}>{config.name}</span>
                  <p className="text-muted-foreground truncate">{q.questionText}</p>
                </div>
              );
            })}
            {questions.length > 2 && (
              <p className="text-xs text-muted-foreground">+{questions.length - 2} more questions</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Storyboard() {
  const { isAuthenticated } = useAuth();

  const { data: storyboard, isLoading } = useQuery<StoryboardResponse>({
    queryKey: ['/api/double-dip/storyboard'],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen gradient-game flex items-center justify-center">
        <Card className="max-w-md text-center p-6">
          <CardContent>
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-pink-500" />
            <h2 className="text-xl font-bold mb-2">Your Storyboard</h2>
            <p className="text-muted-foreground mb-4">Sign in to view your relationship journey</p>
            <Link href="/login">
              <Button data-testid="button-login">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-game flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading your story...</div>
      </div>
    );
  }

  if (!storyboard || !storyboard.pair) {
    return (
      <div className="min-h-screen gradient-game p-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/couples">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Double Dip
            </Button>
          </Link>
          <Card className="text-center p-8">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">No Story Yet</h2>
            <p className="text-muted-foreground">Start playing Double Dip with your partner to build your storyboard!</p>
          </Card>
        </div>
      </div>
    );
  }

  const { timeline, stats } = storyboard;

  return (
    <div className="min-h-screen gradient-game">
      <AppHeader
        title="Your Storyboard"
        subtitle="Relationship journey"
        backHref="/couples"
      />
      <div className="max-w-2xl mx-auto p-4 pb-24">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-3 mb-8"
        >
          <Card className="text-center p-3">
            <div className="text-2xl font-bold text-foreground">{stats.totalDays}</div>
            <div className="text-xs text-muted-foreground">Days</div>
          </Card>
          <Card className="text-center p-3">
            <div className="flex items-center justify-center gap-1">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold text-foreground">{stats.currentStreak}</span>
            </div>
            <div className="text-xs text-muted-foreground">Streak</div>
          </Card>
          <Card className="text-center p-3">
            <div className="flex items-center justify-center gap-1">
              <Heart className="w-5 h-5 text-pink-500" />
              <span className="text-2xl font-bold text-foreground">{stats.totalFavorites}</span>
            </div>
            <div className="text-xs text-muted-foreground">Favorites</div>
          </Card>
          <Card className="text-center p-3">
            <div className="flex items-center justify-center gap-1">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-2xl font-bold text-foreground">{stats.totalMilestones}</span>
            </div>
            <div className="text-xs text-muted-foreground">Milestones</div>
          </Card>
        </motion.div>

        {timeline.length === 0 ? (
          <Card className="text-center p-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-500" />
            <h3 className="font-bold mb-2">Your Story Begins Here</h3>
            <p className="text-sm text-muted-foreground">
              Complete your first daily questions together to start building your timeline!
            </p>
          </Card>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-500 via-purple-500 to-blue-500 opacity-30" />
            
            <div className="space-y-4">
              {timeline.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative pl-14"
                >
                  <div className="absolute left-4 w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 border-4 border-background" />
                  
                  <div className="text-xs text-muted-foreground mb-2">{formatDate(item.date)}</div>
                  
                  {item.type === 'milestone' && <MilestoneCard milestone={item.data} />}
                  {item.type === 'favorite' && <FavoriteCard data={item.data} />}
                  {item.type === 'reveal' && <RevealCard data={item.data} />}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
