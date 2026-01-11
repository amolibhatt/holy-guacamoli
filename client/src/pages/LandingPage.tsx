import { Button } from "@/components/ui/button";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { motion } from "framer-motion";
import { Sparkles, Users, QrCode, Trophy } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-game grid-bg flex flex-col lg:flex-row" data-testid="container-landing">
      {/* Left side - Branding */}
      <div className="lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16" data-testid="section-branding">
        <motion.div
          className="text-center lg:text-left max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="w-24 h-24 mx-auto lg:mx-0 mb-6 rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center border border-white/20 shadow-xl"
            animate={{ 
              rotate: [0, -5, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            data-testid="icon-logo"
          >
            <AvocadoIcon className="w-14 h-14 drop-shadow-lg" />
          </motion.div>
          
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-2 text-glow" data-testid="text-title">
            Holy GuacAmoli!
          </h1>
          <p className="text-white/50 text-sm uppercase tracking-widest mb-6" data-testid="text-tagline">
            Amoli's Birthday Trivia
          </p>
          
          <p className="text-white/70 text-lg mb-8" data-testid="text-description">
            Host an exciting Jeopardy-style trivia game for your party. Create custom categories, manage questions, and let players buzz in from their phones!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center lg:text-left" data-testid="section-features">
            <div className="flex flex-col items-center lg:items-start gap-2" data-testid="feature-categories">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span className="text-white/60 text-sm">Custom Categories</span>
            </div>
            <div className="flex flex-col items-center lg:items-start gap-2" data-testid="feature-buzzer">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary" />
              </div>
              <span className="text-white/60 text-sm">QR Code Buzzer</span>
            </div>
            <div className="flex flex-col items-center lg:items-start gap-2" data-testid="feature-scoreboard">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <span className="text-white/60 text-sm">Live Scoreboard</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side - Login */}
      <div className="lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 bg-card/30 backdrop-blur-sm" data-testid="section-login">
        <motion.div
          className="text-center max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-login-title">
            Host Login
          </h2>
          <p className="text-white/60 mb-8" data-testid="text-login-description">
            Sign in to create and host trivia games. Players don't need an account - they just scan the QR code!
          </p>

          <a href="/api/login">
            <Button 
              size="lg" 
              className="w-full gradient-header text-white font-bold shadow-lg glow-primary hover:shadow-xl border-2 border-primary/30"
              data-testid="button-login"
            >
              Sign in to Host
            </Button>
          </a>

          <p className="text-white/40 text-sm mt-6" data-testid="text-free-notice">
            Free to use. No credit card required.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
