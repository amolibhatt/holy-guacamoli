import { Heart } from "lucide-react";

interface AppFooterProps {
  className?: string;
}

export function AppFooter({ className = "" }: AppFooterProps) {
  return (
    <footer className={`border-t border-white/5 px-6 py-6 mt-auto relative z-10 ${className}`}>
      <div className="max-w-5xl mx-auto flex items-center justify-center">
        <p className="text-sm text-white/50 flex flex-wrap items-center justify-center gap-1">
          made with <Heart className="w-4 h-4 text-pink-400 fill-pink-400 inline mx-0.5" /> by{' '}
          <span className="font-semibold bg-gradient-to-r from-pink-400 via-rose-300 to-pink-400 bg-clip-text text-transparent">
            Amoli
          </span>
        </p>
      </div>
    </footer>
  );
}
