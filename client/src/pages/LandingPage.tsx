import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import { Loader2, Heart, Chrome, Github, Apple } from "lucide-react";
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
    <div className="dark min-h-screen bg-[#0a0a0f] flex items-center justify-center overflow-hidden" data-testid="container-landing">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-1/4 w-72 h-72 bg-lime-500/15 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 right-1/4 w-96 h-96 bg-green-600/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>


      {/* Centered Login */}
      <motion.div
        className="w-full max-w-md px-6 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6" data-testid="icon-logo">
          <Logo size="xl" />
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-lime-500/5 rounded-2xl">
            <CardContent className="p-6">
              {/* Social Login Buttons */}
              <div className="space-y-3 mb-5">
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25 gap-3"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-social-login"
                >
                  <div className="flex items-center gap-2">
                    <Chrome className="h-5 w-5 text-[#4285F4]" />
                    <Github className="h-5 w-5" />
                    <Apple className="h-5 w-5" />
                  </div>
                  <span>Continue with Google, GitHub, or Apple</span>
                </Button>
              </div>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-transparent px-3 text-white/40">or use email</span>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-5 bg-white/5 h-11 rounded-xl">
                  <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-400" data-testid="tab-login">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-400" data-testid="tab-register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-white/70 text-sm">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus:border-lime-400 focus:ring-lime-400/20 rounded-xl h-12"
                        {...loginForm.register("email")}
                        data-testid="input-login-email"
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-destructive text-xs mt-1">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-white/70 text-sm">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Your password"
                        className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus:border-lime-400 focus:ring-lime-400/20 rounded-xl h-12"
                        {...loginForm.register("password")}
                        data-testid="input-login-password"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-destructive text-xs mt-1">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <div className="flex justify-end pt-1">
                      <Link href="/forgot-password" className="text-xs text-white/50 hover:text-lime-400 transition-colors" data-testid="link-forgot-password">
                        Forgot password?
                      </Link>
                    </div>
                    {loginError && (
                      <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg" data-testid="text-login-error">
                        {loginError.message}
                      </p>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-black font-bold border-0 h-12 rounded-xl mt-2"
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
                        <Label htmlFor="register-first-name" className="text-white/70 text-sm">First Name</Label>
                        <Input
                          id="register-first-name"
                          placeholder="First"
                          className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus:border-lime-400 focus:ring-lime-400/20 rounded-xl h-12"
                          {...registerForm.register("firstName")}
                          data-testid="input-register-firstname"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-last-name" className="text-white/70 text-sm">Last Name</Label>
                        <Input
                          id="register-last-name"
                          placeholder="Last"
                          className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus:border-lime-400 focus:ring-lime-400/20 rounded-xl h-12"
                          {...registerForm.register("lastName")}
                          data-testid="input-register-lastname"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-white/70 text-sm">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus:border-lime-400 focus:ring-lime-400/20 rounded-xl h-12"
                        {...registerForm.register("email")}
                        data-testid="input-register-email"
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-destructive text-xs mt-1">{registerForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-white/70 text-sm">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="At least 6 characters"
                        className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus:border-lime-400 focus:ring-lime-400/20 rounded-xl h-12"
                        {...registerForm.register("password")}
                        data-testid="input-register-password"
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-destructive text-xs mt-1">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    {registerError && (
                      <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg" data-testid="text-register-error">
                        {registerError.message}
                      </p>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-black font-bold border-0 h-12 rounded-xl mt-2"
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

          <p className="mt-6 text-center text-white/40 text-xs tracking-wide" data-testid="text-free-notice">
            Players join via QR code &mdash; no account needed
          </p>
          
          {/* Footer */}
          <p className="mt-8 text-center text-white/50 text-sm">
            made with{' '}
            <Heart className="inline-block w-4 h-4 text-pink-400 fill-pink-400 mx-0.5" />{' '}
            by{' '}
            <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-pink-400 bg-clip-text text-transparent font-semibold">
              Amoli
            </span>
          </p>
      </motion.div>

    </div>
  );
}
