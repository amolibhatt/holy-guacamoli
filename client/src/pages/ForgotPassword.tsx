import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", data);
      setIsSubmitted(true);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col items-center justify-center p-8" data-testid="container-forgot-password">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-6">
          <motion.div 
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black flex items-center justify-center border border-white/20"
            animate={{ rotate: [0, -3, 3, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <AvocadoIcon className="w-10 h-10 drop-shadow-lg" />
          </motion.div>
          
          <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-title">
            Reset Password
          </h1>
          <p className="text-white/60 text-sm" data-testid="text-description">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <Card className="border-white/10 bg-background/80 backdrop-blur">
          <CardContent className="pt-6">
            {isSubmitted ? (
              <motion.div 
                className="text-center py-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2" data-testid="text-success-title">
                  Check your email
                </h3>
                <p className="text-white/60 text-sm mb-4" data-testid="text-success-message">
                  If an account exists with that email, you'll receive a password reset link shortly.
                </p>
                <Link href="/">
                  <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      {...form.register("email")}
                      data-testid="input-email"
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-destructive text-sm">{form.formState.errors.email.message}</p>
                  )}
                </div>
                
                {error && (
                  <p className="text-destructive text-sm" data-testid="text-error">
                    {error}
                  </p>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full gradient-header text-white font-bold"
                  disabled={isSubmitting}
                  data-testid="button-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <div className="text-center">
                  <Link href="/" className="inline-flex items-center text-sm text-white/60 hover:text-white hover:underline" data-testid="link-back-to-login">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
