import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedLogo } from "@/components/AvocadoIcon";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Loader2, Grid3X3, ListOrdered, Brain } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, insertUserSchema } from "@shared/models/auth";
import type { LoginCredentials, InsertUser } from "@shared/models/auth";
import { Link } from "wouter";

export default function LandingPage() {
  const { loginAsync, registerAsync, isLoggingIn, isRegistering, loginError, registerError } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  const loginForm = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { email: "", password: "", firstName: "", lastName: "" },
  });

  const onLogin = async (data: LoginCredentials) => {
    try {
      await loginAsync(data);
    } catch (e) {
    }
  };

  const onRegister = async (data: InsertUser) => {
    try {
      await registerAsync(data);
    } catch (e) {
    }
  };

  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col lg:flex-row" data-testid="container-landing">
      {/* Left side - Branding */}
      <div className="lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 overflow-y-auto" data-testid="section-branding">
        <motion.div
          className="text-center lg:text-left max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center lg:justify-start mb-6" data-testid="icon-logo">
            <AnimatedLogo size="xl" showText />
          </div>
          
          <p className="text-muted-foreground mb-8" data-testid="text-description">
            The ultimate party game platform. Three unique games, endless fun with friends!
          </p>

          {/* Games Showcase */}
          <div className="space-y-3" data-testid="section-games">
            <motion.div 
              className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-fuchsia-500/20 border border-rose-500/30"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              data-testid="game-blitzgrid"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                <Grid3X3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-foreground font-bold block">Blitzgrid</span>
                <span className="text-muted-foreground text-sm">5x5 trivia grid - race the clock, claim the grid!</span>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/30"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              data-testid="game-sortcircuit"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
                <ListOrdered className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-foreground font-bold block">Sort Circuit</span>
                <span className="text-muted-foreground text-sm">Arrange 4 options in order - fastest wins!</span>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-indigo-500/20 border border-violet-500/30"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              data-testid="game-psyop"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-foreground font-bold block">PsyOp</span>
                <span className="text-muted-foreground text-sm">Write lies, spot the truth - outsmart everyone!</span>
              </div>
            </motion.div>
          </div>

          {/* Quick info */}
          <div className="mt-6 flex items-center justify-center lg:justify-start gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              <span>Live scores</span>
            </div>
            <div className="flex items-center gap-1">
              <span>QR join</span>
            </div>
            <div className="flex items-center gap-1">
              <span>No app needed</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side - Login/Register */}
      <div className="lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 bg-card/30 backdrop-blur-sm" data-testid="section-login">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground" data-testid="text-login-title">
              Ready to Play?
            </h2>
            <p className="text-muted-foreground text-sm mt-1" data-testid="text-login-description">
              Create your free account and start hosting games in minutes
            </p>
          </div>

          <Card className="border-white/10 bg-background/80 backdrop-blur">
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        {...loginForm.register("email")}
                        data-testid="input-login-email"
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-destructive text-sm">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Your password"
                        {...loginForm.register("password")}
                        data-testid="input-login-password"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-destructive text-sm">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Link href="/forgot-password" className="text-sm text-primary/70 hover:text-primary hover:underline" data-testid="link-forgot-password">
                        Forgot password?
                      </Link>
                    </div>
                    {loginError && (
                      <p className="text-destructive text-sm" data-testid="text-login-error">
                        {loginError.message}
                      </p>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full gradient-header text-white font-bold"
                      disabled={isLoggingIn}
                      data-testid="button-login"
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="register-first-name">First Name</Label>
                        <Input
                          id="register-first-name"
                          placeholder="First"
                          {...registerForm.register("firstName")}
                          data-testid="input-register-firstname"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-last-name">Last Name</Label>
                        <Input
                          id="register-last-name"
                          placeholder="Last"
                          {...registerForm.register("lastName")}
                          data-testid="input-register-lastname"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        {...registerForm.register("email")}
                        data-testid="input-register-email"
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-destructive text-sm">{registerForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="At least 6 characters"
                        {...registerForm.register("password")}
                        data-testid="input-register-password"
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-destructive text-sm">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    {registerError && (
                      <p className="text-destructive text-sm" data-testid="text-register-error">
                        {registerError.message}
                      </p>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full gradient-header text-white font-bold"
                      disabled={isRegistering}
                      data-testid="button-register"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border text-center" data-testid="text-free-notice">
            <p className="text-sm text-foreground font-medium mb-1">Playing with friends?</p>
            <p className="text-muted-foreground text-xs">
              Players join instantly via QR code or room code - no account needed!
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
