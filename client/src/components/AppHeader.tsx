import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Settings, Shield, LogOut, HelpCircle, User, ChevronDown, Crown, Gamepad2 } from "lucide-react";
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
      <header className="border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            {backHref && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground" 
                data-testid="button-back"
                aria-label="Go back"
                asChild
              >
                <Link href={backHref}>
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
            )}
            <Link href="/">
              <Logo size="md" />
            </Link>
            {title && (
              <span className="font-semibold text-muted-foreground">| {title}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            
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
              <DropdownMenuContent align="end" className="w-64 p-2">
                {/* User profile section */}
                <div className="flex items-center gap-3 px-2 py-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate" data-testid="text-username">
                        {user?.firstName || 'User'}
                      </p>
                      {user?.role === 'super_admin' && (
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0 shrink-0">
                          <Shield className="w-2.5 h-2.5 mr-0.5" />
                          Super
                        </Badge>
                      )}
                      {user?.role === 'admin' && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0 shrink-0">
                          Admin
                        </Badge>
                      )}
                      {(!user?.role || user?.role === 'user') && (
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0 shrink-0">
                          <Gamepad2 className="w-2.5 h-2.5 mr-0.5" />
                          Player
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email || ''}
                    </p>
                  </div>
                </div>
                
                <DropdownMenuSeparator className="my-1" />
                
                <Link href="/profile">
                  <DropdownMenuItem className="cursor-pointer py-2.5" data-testid="menu-profile">
                    <User className="w-4 h-4 mr-3" />
                    My Profile
                  </DropdownMenuItem>
                </Link>
                
                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                  <Link href={adminHref}>
                    <DropdownMenuItem className="cursor-pointer py-2.5" data-testid="menu-admin">
                      <Settings className="w-4 h-4 mr-3" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </Link>
                )}
                
                {user?.role === 'super_admin' && (
                  <Link href="/admin/super">
                    <DropdownMenuItem className="cursor-pointer py-2.5" data-testid="menu-super-admin">
                      <Shield className="w-4 h-4 mr-3 text-purple-500 dark:text-purple-400" />
                      Super Admin
                    </DropdownMenuItem>
                  </Link>
                )}
                
                <DropdownMenuSeparator className="my-1" />
                
                {user?.subscriptionPlan === 'pro' || user?.subscriptionPlan === 'party_pack' ? (
                  <div className="flex items-center gap-2 px-2 py-2 text-sm text-amber-500">
                    <Crown className="w-4 h-4" />
                    <span className="font-medium">Pro Member</span>
                  </div>
                ) : (
                  <Link href="/pricing">
                    <DropdownMenuItem className="cursor-pointer py-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 text-amber-700 dark:text-amber-400" data-testid="menu-upgrade">
                      <Crown className="w-4 h-4 mr-3" />
                      Upgrade to Pro
                    </DropdownMenuItem>
                  </Link>
                )}
                
                <DropdownMenuSeparator className="my-1" />
                
                <DropdownMenuItem 
                  className="cursor-pointer py-2.5 text-destructive focus:text-destructive" 
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {(backHref || onBack) && (
            onBack ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground" 
                data-testid="button-back"
                aria-label="Go back"
                onClick={onBack}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground" 
                data-testid="button-back"
                aria-label="Go back"
                asChild
              >
                <Link href={backHref!}>
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
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
          
          {showHelpButton && onHelpClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground" 
              onClick={onHelpClick}
              data-testid="button-help"
              aria-label="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
          )}
          
          {showAdminButton && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground" 
              data-testid="button-admin" 
              aria-label="Admin settings"
              asChild
            >
              <Link href={adminHref}>
                <Settings className="w-5 h-5" />
              </Link>
            </Button>
          )}
          
          {user?.role === 'super_admin' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-purple-500 dark:text-purple-400" 
              data-testid="button-super-admin" 
              aria-label="Super admin panel"
              asChild
            >
              <Link href="/admin/super">
                <Shield className="w-5 h-5" />
              </Link>
            </Button>
          )}
          
          {showLogout && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive" 
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
