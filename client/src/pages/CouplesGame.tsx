import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function CouplesGame() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen gradient-game flex flex-col">
      <header className="border-b border-pink-500/20 bg-card/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Couples Quiz</h1>
                <span className="text-xs text-muted-foreground">Fun Challenges for Pairs</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="text-center">
            <CardHeader>
              <motion.div 
                className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-4"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Heart className="w-10 h-10 text-white" />
              </motion.div>
              <CardTitle className="text-2xl">Coming Soon!</CardTitle>
              <CardDescription className="text-base mt-2">
                The Couples Quiz is being prepared with love
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3 p-3 bg-pink-500/5 rounded-lg">
                  <Sparkles className="w-5 h-5 text-pink-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Fun Prompts</p>
                    <p className="text-xs text-muted-foreground">Would you rather, most likely to, and more</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-pink-500/5 rounded-lg">
                  <Users className="w-5 h-5 text-pink-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-foreground">For Couples</p>
                    <p className="text-xs text-muted-foreground">Test how well you know each other</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4">
                  The super admin can enable this game when it's ready.
                </p>
                <Link href="/">
                  <Button className="w-full gap-2" variant="outline">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
