import { Logo } from "@/components/Logo";
import { Heart } from "lucide-react";
import { Link } from "wouter";

interface AppLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
}

export function AppLayout({ children, showBackButton = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/10">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo size="sm" />
        </Link>
        {showBackButton && (
          <Link 
            href="/"
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Back to Home
          </Link>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-white/10">
        <p className="text-white/50 text-sm">
          made with{' '}
          <Heart className="inline-block w-4 h-4 text-pink-400 fill-pink-400 mx-0.5" />{' '}
          by{' '}
          <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-pink-400 bg-clip-text text-transparent font-semibold">
            Amoli
          </span>
        </p>
      </footer>
    </div>
  );
}
