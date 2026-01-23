import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AvocadoIcon } from "@/components/AvocadoIcon";
import { ArrowLeft, Settings, Shield, LogOut, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  showAdminButton?: boolean;
  adminHref?: string;
  showHelpButton?: boolean;
  showLogout?: boolean;
  onHelpClick?: () => void;
  rightContent?: React.ReactNode;
  themed?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  backHref,
  showAdminButton = false,
  adminHref = "/admin",
  showHelpButton = false,
  showLogout = false,
  onHelpClick,
  rightContent,
  themed = false,
}: AppHeaderProps) {
  const { user, logout, isLoggingOut } = useAuth();
  
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link href={backHref}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-foreground" 
                data-testid="button-back"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
          )}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div 
              className="w-10 h-10 flex items-center justify-center relative"
              animate={{ 
                rotate: [0, -5, 5, -5, 0], 
                y: [0, -3, 0],
                scale: [1, 1.02, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ 
                scale: 1.15, 
                rotate: [0, -10, 10, -10, 0],
                transition: { duration: 0.4 }
              }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Glow ring behind icon */}
              <motion.div 
                className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 via-emerald-300 to-lime-400 opacity-0 group-hover:opacity-40 blur-md"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <AvocadoIcon className="w-8 h-8 drop-shadow-lg relative z-10" />
            </motion.div>
            <div className="flex flex-col">
              <motion.h1 
                className="text-2xl sm:text-3xl font-black tracking-tight leading-none flex items-center" 
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <motion.span 
                  className="text-foreground"
                  whileHover={{ scale: 1.05 }}
                >
                  Holy{' '}
                </motion.span>
                <motion.span 
                  className="bg-gradient-to-r from-green-500 via-emerald-400 to-lime-400 bg-clip-text text-transparent bg-[length:200%_auto]"
                  animate={{ 
                    backgroundPosition: ['0% center', '100% center', '0% center']
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  whileHover={{ 
                    scale: 1.05,
                    textShadow: "0 0 20px rgba(34, 197, 94, 0.5)"
                  }}
                >
                  GuacAmoli!
                </motion.span>
              </motion.h1>
              {(title || subtitle) && (
                <motion.span 
                  className="text-xs text-muted-foreground tracking-wide"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {title}{subtitle ? ` - ${subtitle}` : ''}
                </motion.span>
              )}
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {rightContent}
          
          {showHelpButton && onHelpClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-primary" 
              onClick={onHelpClick}
              data-testid="button-help"
              aria-label="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
          )}
          
          {showAdminButton && (
            <Link href={adminHref}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-foreground" 
                data-testid="button-admin" 
                aria-label="Admin settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          )}
          
          {user?.role === 'super_admin' && (
            <Link href="/admin/super">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-purple-500 hover:text-purple-400" 
                data-testid="button-super-admin" 
                aria-label="Super admin panel"
              >
                <Shield className="w-5 h-5" />
              </Button>
            </Link>
          )}
          
          {showLogout && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-destructive" 
              data-testid="button-logout"
              onClick={() => logout()}
              disabled={isLoggingOut}
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
