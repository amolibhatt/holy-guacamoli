import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { ShieldAlert, LogIn, Mail } from "lucide-react";
import { useLocation } from "wouter";

interface AccessDeniedProps {
  gameName?: string;
}

export function AccessDenied({ gameName = "this game" }: AccessDeniedProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-access-denied">
      <AppHeader minimal backHref="/" title={gameName} />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 text-muted-foreground" />
            </div>

            {!isAuthenticated ? (
              <>
                <div>
                  <h2 className="text-xl font-bold mb-1" data-testid="text-access-denied-title">
                    Sign in to host
                  </h2>
                  <p className="text-muted-foreground text-sm" data-testid="text-access-denied-message">
                    You need to be signed in with a host account to run {gameName}. Players can join games without signing in.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => setLocation("/login")} className="gap-2" data-testid="button-sign-in">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                  <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
                    Back to Home
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-bold mb-1" data-testid="text-access-denied-title">
                    Host access required
                  </h2>
                  <p className="text-muted-foreground text-sm" data-testid="text-access-denied-message">
                    Your account doesn't have permission to host games yet. Host access is granted by an administrator.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground flex items-start gap-3 text-left">
                  <Mail className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>
                    Want to host? Reach out to your game organizer or admin to request host privileges for your account.
                  </span>
                </div>
                <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
                  Back to Home
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
