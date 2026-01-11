import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      await apiRequest("POST", "/api/auth/reset-password", {
        token,
        password: data.password,
      });
      setIsSuccess(true);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen gradient-game grid-bg flex flex-col items-center justify-center p-8" data-testid="container-reset-password-error">
        <motion.div
          className="w-full max-w-sm text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-error-title">
            Invalid Reset Link
          </h1>
          <p className="text-white/60 text-sm mb-6" data-testid="text-error-message">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link href="/forgot-password">
            <Button className="gradient-header text-white font-bold" data-testid="button-request-new">
              Request New Link
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col items-center justify-center p-8" data-testid="container-reset-password">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-6">
          <motion.div 
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center border border-white/20"
            animate={{ rotate: [0, -3, 3, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <AvocadoIcon className="w-10 h-10 drop-shadow-lg" />
          </motion.div>
          
          <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-title">
            Create New Password
          </h1>
          <p className="text-white/60 text-sm" data-testid="text-description">
            Enter your new password below
          </p>
        </div>

        <Card className="border-white/10 bg-background/80 backdrop-blur">
          <CardContent className="pt-6">
            {isSuccess ? (
              <motion.div 
                className="text-center py-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2" data-testid="text-success-title">
                  Password Updated
                </h3>
                <p className="text-white/60 text-sm mb-4" data-testid="text-success-message">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
                <Link href="/">
                  <Button className="w-full gradient-header text-white font-bold" data-testid="button-go-login">
                    Sign In
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 8 characters"
                      className="pl-10"
                      {...form.register("password")}
                      data-testid="input-password"
                    />
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-destructive text-sm">{form.formState.errors.password.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      className="pl-10"
                      {...form.register("confirmPassword")}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-destructive text-sm">{form.formState.errors.confirmPassword.message}</p>
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
                      Updating...
                    </>
                  ) : (
                    "Reset Password"
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
