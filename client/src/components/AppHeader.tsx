import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Settings, Shield, LogOut, HelpCircle, User, ChevronDown, Palette } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
  showAdminButton?: boolean;
  adminHref?: string;
  showHelpButton?: boolean;
  showLogout?: boolean;
  onHelpClick?: () => void;
  rightContent?: React.ReactNode;
  themed?: boolean;
  minimal?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  backHref,
  onBack,
  showAdminButton = false,
  adminHref = "/admin/games",
  showHelpButton = false,
  showLogout = false,
  onHelpClick,
  rightContent,
  themed = false,
  minimal = false,
}: AppHeaderProps) {
  const { user, logout, isLoggingOut } = useAuth();

  if (minimal) {
    return (
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <Link href="/">
            <Logo size="md" />
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2"
                  data-testid="button-account-menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider">
                  Welcome back
                </DropdownMenuLabel>
                <DropdownMenuItem className="font-medium cursor-default focus:bg-transparent" data-testid="text-username">
                  {user?.firstName || user?.email || 'User'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                <Link href={adminHref}>
                  <DropdownMenuItem className="cursor-pointer" data-testid="menu-admin">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin
                  </DropdownMenuItem>
                </Link>
                
                {user?.role === 'super_admin' && (
                  <Link href="/admin/super">
                    <DropdownMenuItem className="cursor-pointer" data-testid="menu-super-admin">
                      <Shield className="w-4 h-4 mr-2" />
                      Super Admin
                    </DropdownMenuItem>
                  </Link>
                )}
                
                <Link href="/settings/appearance">
                  <DropdownMenuItem className="cursor-pointer" data-testid="menu-mode">
                    <Palette className="w-4 h-4 mr-2" />
                    Mode
                  </DropdownMenuItem>
                </Link>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  className="cursor-pointer text-destructive" 
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {(backHref || onBack) && (
            onBack ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-foreground" 
                data-testid="button-back"
                aria-label="Go back"
                onClick={onBack}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <Link href={backHref!}>
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
            )
          )}
          <Link href="/">
            <Logo size="md" />
          </Link>
          
          {title && (
            <div className="flex items-center gap-2 ml-2">
              <div className="w-px h-6 bg-border" />
              <h1 className="text-lg font-semibold text-foreground">
                {title}
                {subtitle && <span className="text-muted-foreground font-normal ml-2">- {subtitle}</span>}
              </h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {rightContent}
          
          <ThemeToggle />
          
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
