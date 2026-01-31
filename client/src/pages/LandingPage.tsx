import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedLogo } from "@/components/AvocadoIcon";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Loader2, QrCode, Users, Zap, PartyPopper } from "lucide-react";
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
    <div className="dark h-screen bg-[#0a0a0f] flex flex-col lg:flex-row overflow-hidden" data-testid="container-landing">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{ x: [-50, 50, -50], y: [-30, 30, -30] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>

      {/* Left side - Branding */}
      <div className="lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 relative z-10" data-testid="section-branding">
        <motion.div
          className="text-center lg:text-left max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo with glow */}
          <div className="flex justify-center lg:justify-start mb-6" data-testid="icon-logo">
            <div className="relative">
              <motion.div
                className="absolute -inset-3 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-full blur-xl opacity-50"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative">
                <AnimatedLogo size="xl" showText={false} />
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-2 text-center lg:text-left">
            Holy <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">Guac</span><span className="bg-gradient-to-r from-pink-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">Amoli</span>!
          </h1>
          <p className="text-white/50 text-sm mb-6 text-center lg:text-left">Dip into the fun</p>
          
          <p className="text-white/70 mb-6 text-center lg:text-left" data-testid="text-description">
            The ultimate party game platform for unforgettable game nights.
          </p>

          {/* Features - compact */}
          <div className="grid grid-cols-2 gap-3" data-testid="section-features">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10" data-testid="feature-qr">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">Instant Join</span>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10" data-testid="feature-multiplayer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">Multiplayer</span>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10" data-testid="feature-realtime">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">Real-time</span>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10" data-testid="feature-party">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0">
                <PartyPopper className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">Party Mode</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side - Login/Register */}
      <div className="lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 relative z-10" data-testid="section-login">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white" data-testid="text-login-title">
              Ready to Play?
            </h2>
            <p className="text-white/60 text-sm" data-testid="text-login-description">
              Create your free account to start hosting
            </p>
          </div>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="pt-4 pb-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="login-email" className="text-white/80">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        {...loginForm.register("email")}
                        data-testid="input-login-email"
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-destructive text-sm">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="login-password" className="text-white/80">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Your password"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        {...loginForm.register("password")}
                        data-testid="input-login-password"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-destructive text-sm">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 hover:underline" data-testid="link-forgot-password">
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
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold border-0"
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
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="register-first-name" className="text-white/80">First Name</Label>
                        <Input
                          id="register-first-name"
                          placeholder="First"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                          {...registerForm.register("firstName")}
                          data-testid="input-register-firstname"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="register-last-name" className="text-white/80">Last Name</Label>
                        <Input
                          id="register-last-name"
                          placeholder="Last"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                          {...registerForm.register("lastName")}
                          data-testid="input-register-lastname"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="register-email" className="text-white/80">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        {...registerForm.register("email")}
                        data-testid="input-register-email"
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-destructive text-sm">{registerForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="register-password" className="text-white/80">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="At least 6 characters"
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
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
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold border-0"
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

          <p className="mt-4 text-center text-white/40 text-xs" data-testid="text-free-notice">
            Players join via QR code - no account needed!
          </p>
        </motion.div>
      </div>
    </div>
  );
}
