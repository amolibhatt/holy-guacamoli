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
    <div className="dark min-h-screen bg-[#0a0a0f] flex flex-col lg:flex-row overflow-hidden" data-testid="container-landing">
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
      <div className="lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 overflow-y-auto relative z-10" data-testid="section-branding">
        <motion.div
          className="text-center lg:text-left max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Updated Logo */}
          <div className="flex justify-center lg:justify-start mb-8" data-testid="icon-logo">
            <motion.div
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <motion.div
                  className="absolute -inset-2 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-full blur-lg opacity-60"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative">
                  <AnimatedLogo size="xl" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                  Holy <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">Guac</span><span className="bg-gradient-to-r from-pink-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">Amoli</span>!
                </h1>
                <p className="text-sm text-white/50 mt-1">Dip into the fun</p>
              </div>
            </motion.div>
          </div>
          
          <p className="text-white/70 mb-10 text-lg" data-testid="text-description">
            The ultimate party game platform for unforgettable game nights with friends and family.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4" data-testid="section-features">
            <motion.div 
              className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)" }}
              data-testid="feature-qr"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold block">Instant Join</span>
              <span className="text-white/50 text-sm">Scan QR, start playing</span>
            </motion.div>

            <motion.div 
              className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)" }}
              data-testid="feature-multiplayer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold block">Multiplayer</span>
              <span className="text-white/50 text-sm">Play with friends</span>
            </motion.div>

            <motion.div 
              className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)" }}
              data-testid="feature-realtime"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold block">Real-time</span>
              <span className="text-white/50 text-sm">Live scores & buzzing</span>
            </motion.div>

            <motion.div 
              className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)" }}
              data-testid="feature-party"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3">
                <PartyPopper className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold block">Party Mode</span>
              <span className="text-white/50 text-sm">Built for celebrations</span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Right side - Login/Register */}
      <div className="lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 relative z-10" data-testid="section-login">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="text-center mb-6">
            <motion.div 
              className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
              whileHover={{ rotate: 10, scale: 1.05 }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white" data-testid="text-login-title">
              Ready to Play?
            </h2>
            <p className="text-white/60 text-sm mt-1" data-testid="text-login-description">
              Create your free account and start hosting games in minutes
            </p>
          </div>

          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="register-first-name" className="text-white/80">First Name</Label>
                        <Input
                          id="register-first-name"
                          placeholder="First"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                          {...registerForm.register("firstName")}
                          data-testid="input-register-firstname"
                        />
                      </div>
                      <div className="space-y-2">
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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

          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center" data-testid="text-free-notice">
            <p className="text-sm text-white font-medium mb-1">Playing with friends?</p>
            <p className="text-white/50 text-xs">
              Players join instantly via QR code or room code - no account needed!
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
