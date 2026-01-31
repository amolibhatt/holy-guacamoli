import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { AppHeader } from "@/components/AppHeader";
import { PsyOpQuestionAdmin } from "@/components/PsyOpQuestionAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Grid3X3, ListOrdered, Eye, HelpCircle, ChevronDown, Lightbulb, Target, Users, Trophy } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function PsyOpAdmin() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-psyop-admin">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-300/5 via-transparent to-purple-300/5 pointer-events-none" />
      
      <AppHeader minimal backHref="/" title="PsyOp Admin" />

      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <nav className="flex flex-wrap gap-1">
            <Link href="/admin/games">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                data-testid="tab-blitzgrid"
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Blitzgrid
              </Button>
            </Link>
            <Link href="/admin/sort-circuit">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                data-testid="tab-sort-circuit"
              >
                <ListOrdered className="w-4 h-4 mr-2" />
                Sort Circuit
              </Button>
            </Link>
            <Link href="/admin/psyop">
              <Button 
                variant="ghost" 
                className="relative rounded-none border-b-2 border-primary text-foreground"
                data-testid="tab-psyop"
              >
                <Eye className="w-4 h-4 mr-2" />
                PsyOp
              </Button>
            </Link>
          </nav>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">PsyOp Questions</h1>
          <p className="text-muted-foreground text-sm">Create fill-in-the-blank facts for the lie-guessing game</p>
        </div>

        <Collapsible open={helpOpen} onOpenChange={setHelpOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2 justify-between" data-testid="button-how-it-works">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                How to Create Questions
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <Card className="border-purple-500/20">
              <CardContent className="pt-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium">
                      <Target className="w-5 h-5" />
                      Writing a Question
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Write a bizarre or surprising fact, then replace one key word with <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-purple-600 dark:text-purple-400">[REDACTED]</code></p>
                      <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                        <p className="font-medium text-foreground">Example:</p>
                        <p>"The national animal of Scotland is the <span className="bg-purple-500/20 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400 font-semibold">[REDACTED]</span>"</p>
                        <p className="text-xs">Correct Answer: <span className="font-medium">unicorn</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium">
                      <Lightbulb className="w-5 h-5" />
                      Tips for Great Questions
                    </div>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li>• Pick facts that sound unbelievable (even true ones!)</li>
                      <li>• The hidden word should be surprising or unusual</li>
                      <li>• Avoid common/obvious answers that are easy to guess</li>
                      <li>• The more bizarre, the harder to spot the real answer</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium mb-3">
                    <Users className="w-5 h-5" />
                    How the Game Works
                  </div>
                  <div className="grid gap-4 md:grid-cols-3 text-sm">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="font-medium mb-1">1. Submit Lies</div>
                      <p className="text-muted-foreground text-xs">Players see the fact with [REDACTED] and write convincing fake answers</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="font-medium mb-1">2. Vote</div>
                      <p className="text-muted-foreground text-xs">Players vote on which answer they think is the real one (can't vote for their own lie)</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="font-medium mb-1">3. Score</div>
                      <p className="text-muted-foreground text-xs">+10 for finding truth, +5 for each player fooled by your lie</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium mb-3">
                    <Trophy className="w-5 h-5" />
                    Example Questions
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="bg-muted/50 p-2 rounded flex flex-wrap gap-x-4 gap-y-1">
                      <span>"Honey never [REDACTED]"</span>
                      <span className="text-muted-foreground">Answer: spoils</span>
                    </div>
                    <div className="bg-muted/50 p-2 rounded flex flex-wrap gap-x-4 gap-y-1">
                      <span>"A group of flamingos is called a [REDACTED]"</span>
                      <span className="text-muted-foreground">Answer: flamboyance</span>
                    </div>
                    <div className="bg-muted/50 p-2 rounded flex flex-wrap gap-x-4 gap-y-1">
                      <span>"The inventor of the Pringles can is buried in a [REDACTED]"</span>
                      <span className="text-muted-foreground">Answer: Pringles can</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <PsyOpQuestionAdmin />
      </main>
    </div>
  );
}
