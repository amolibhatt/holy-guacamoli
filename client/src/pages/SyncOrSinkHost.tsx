import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, HeartHandshake, Copy, Check, Users, Play, 
  ArrowRight, Sparkles, Heart, Plus, Settings
} from "lucide-react";
import type { SyncQuestion, Couple } from "@shared/schema";

export default function SyncOrSinkHost() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [coupleName, setCoupleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: couple, isLoading: coupleLoading, refetch: refetchCouple } = useQuery<Couple | null>({
    queryKey: ["/api/couples/me"],
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<SyncQuestion[]>({
    queryKey: ["/api/sync/questions"],
  });

  const createInviteMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/couples/create-invite", { coupleName: name });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create invite");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setInviteCode(data.inviteCode);
      queryClient.invalidateQueries({ queryKey: ["/api/couples/me"] });
      toast({ title: "Invite created! Share the code with your partner." });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create invite", variant: "destructive" });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/couples/join", { inviteCode: code });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to join");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/couples/me"] });
      toast({ title: "Paired successfully!" });
      setShowJoinForm(false);
      setJoinCode("");
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to join", variant: "destructive" });
    },
  });

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Code copied!" });
    }
  };

  if (isAuthLoading || coupleLoading) {
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

  const isPaired = couple?.status === 'active';
  const hasPendingInvite = couple?.status === 'pending';
  const hasQuestions = questions.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-sync-host">
      <div className="fixed inset-0 bg-gradient-to-br from-rose-300/5 via-transparent to-pink-300/5 pointer-events-none" />
      
      <AppHeader minimal backHref="/" title="Sync or Sink" />

      <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f472b6, #ec4899)' }}>
            <HeartHandshake className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Sync or Sink</h1>
          <p className="text-muted-foreground">Answer separately. Reveal together. See how in sync you are!</p>
        </div>

        {!isPaired && !hasPendingInvite && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Connect with Your Partner
                </CardTitle>
                <CardDescription>
                  Create an invite link or join using your partner's code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showJoinForm ? (
                  <>
                    <div>
                      <Label htmlFor="coupleName">Couple Name (optional)</Label>
                      <Input
                        id="coupleName"
                        placeholder="e.g., Team Awesome"
                        value={coupleName}
                        onChange={(e) => setCoupleName(e.target.value)}
                        className="mt-1"
                        data-testid="input-couple-name"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => createInviteMutation.mutate(coupleName)}
                        disabled={createInviteMutation.isPending}
                        className="flex-1"
                        data-testid="button-create-invite"
                      >
                        {createInviteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Create Invite
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setShowJoinForm(true)}
                        className="flex-1"
                        data-testid="button-show-join"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Join Partner
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="joinCode">Enter Partner's Code</Label>
                      <Input
                        id="joinCode"
                        placeholder="e.g., ABC123"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="mt-1 text-center text-lg tracking-widest uppercase"
                        data-testid="input-join-code"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => joinMutation.mutate(joinCode)}
                        disabled={joinMutation.isPending || joinCode.length < 6}
                        className="flex-1"
                        data-testid="button-join-couple"
                      >
                        {joinMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <HeartHandshake className="w-4 h-4 mr-2" />
                        )}
                        Join
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => { setShowJoinForm(false); setJoinCode(""); }}
                        data-testid="button-cancel-join"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {hasPendingInvite && couple && (
          <Card className="border-2 border-pink-500/30 bg-pink-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-500" />
                Waiting for Partner
              </CardTitle>
              <CardDescription>
                Share this code with your partner to connect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl font-mono font-bold tracking-[0.3em] text-pink-500 bg-pink-500/10 px-6 py-3 rounded-lg">
                  {couple.inviteCode}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyCode}
                  data-testid="button-copy-code"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Your partner needs to enter this code in their Sync or Sink lobby
              </p>
            </CardContent>
          </Card>
        )}

        {isPaired && (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-green-500/30 bg-green-500/5">
                <CardContent className="py-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <HeartHandshake className="w-6 h-6 text-green-500" />
                    <span className="text-lg font-semibold text-green-500">Connected!</span>
                  </div>
                  {couple?.coupleName && (
                    <p className="text-muted-foreground">
                      Playing as <span className="font-medium text-foreground">{couple.coupleName}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {hasQuestions ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Ready to Play
                  </CardTitle>
                  <CardDescription>
                    You have {questions.length} question{questions.length !== 1 ? 's' : ''} ready
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="lg" data-testid="button-start-game">
                    <Play className="w-5 h-5 mr-2" />
                    Start Game
                  </Button>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Game functionality coming soon!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    No Questions Yet
                  </CardTitle>
                  <CardDescription>
                    Create some questions first to start playing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation("/admin/sync-or-sink")}
                    data-testid="button-create-questions"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Questions
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/admin/sync-or-sink")}
            className="text-muted-foreground"
            data-testid="link-manage-questions"
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Questions
          </Button>
        </div>
      </main>
    </div>
  );
}
