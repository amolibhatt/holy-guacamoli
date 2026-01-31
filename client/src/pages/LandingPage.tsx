import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
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

      {/* Logic Leaks - scrolling trivia facts */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.06]">
        <motion.div
          className="absolute left-0 right-0 text-lime-400 text-xs font-mono whitespace-nowrap"
          style={{ top: '10%' }}
          animate={{ x: [0, -1000] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          The first computer bug was an actual moth found in a Harvard computer in 1947 • Honey never spoils • Octopuses have three hearts •
        </motion.div>
        <motion.div
          className="absolute left-0 right-0 text-fuchsia-400 text-xs font-mono whitespace-nowrap"
          style={{ top: '25%' }}
          animate={{ x: [-500, 500] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          Bananas are berries but strawberries aren't • The Eiffel Tower grows 6 inches in summer • Venus is the only planet that spins clockwise •
        </motion.div>
        <motion.div
          className="absolute left-0 right-0 text-lime-400 text-xs font-mono whitespace-nowrap"
          style={{ top: '75%' }}
          animate={{ x: [200, -800] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        >
          A group of flamingos is called a flamboyance • The shortest war lasted 38 minutes • Cows have best friends •
        </motion.div>
        <motion.div
          className="absolute left-0 right-0 text-fuchsia-400 text-xs font-mono whitespace-nowrap"
          style={{ top: '90%' }}
          animate={{ x: [-200, -1200] }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        >
          Sharks are older than trees • A day on Venus is longer than a year on Venus • Wombat poop is cube-shaped •
        </motion.div>
      </div>

      {/* Centered Login */}
      <motion.div
        className="w-full max-w-md px-6 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-4" data-testid="icon-logo">
          <Logo size="lg" />
        </div>
        
        <p 
          className="text-lime-400 text-lg font-bold mb-8 text-center uppercase tracking-widest"
          style={{ fontFamily: "'Archivo Black', 'Impact', sans-serif" }}
        >
          Dip into the fun
        </p>

        <Card className="border-white/20 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-lime-500/10">
            <CardContent className="pt-4 pb-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-3 bg-white/5">
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
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-lime-400 rounded-xl h-11"
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
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-lime-400 rounded-xl h-11"
                        {...loginForm.register("password")}
                        data-testid="input-login-password"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-destructive text-sm">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Link href="/forgot-password" className="text-sm text-lime-400 hover:text-lime-300 hover:underline" data-testid="link-forgot-password">
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
                      className="w-full bg-gradient-to-r from-lime-400 to-green-600 hover:from-lime-500 hover:to-green-700 text-white font-bold border-0"
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
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-lime-400 rounded-xl h-11"
                          {...registerForm.register("firstName")}
                          data-testid="input-register-firstname"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="register-last-name" className="text-white/80">Last Name</Label>
                        <Input
                          id="register-last-name"
                          placeholder="Last"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-lime-400 rounded-xl h-11"
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
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-lime-400 rounded-xl h-11"
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
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-lime-400 rounded-xl h-11"
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
                      className="w-full bg-gradient-to-r from-lime-400 to-green-600 hover:from-lime-500 hover:to-green-700 text-white font-bold border-0"
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
  );
}
