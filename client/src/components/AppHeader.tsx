import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BuzzkillLogo } from "@/components/BuzzkillLogo";
import { ArrowLeft, Settings, Shield, LogOut, HelpCircle } from "lucide-react";
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
          <BuzzkillLogo size="md" themed={themed} />
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-foreground">Holy </span>
              <span className="text-violet-500">Guac</span>
              <span className="text-foreground">Amoli</span>
              <span className="text-pink-500">!</span>
            </h1>
            {(title || subtitle) && (
              <span className="text-xs text-muted-foreground tracking-wide">{title}{subtitle ? ` - ${subtitle}` : ''}</span>
            )}
          </div>
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
