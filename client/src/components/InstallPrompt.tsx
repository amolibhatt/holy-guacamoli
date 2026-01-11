import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) return;

    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (isIOSDevice && !isInStandaloneMode) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 z-50"
        data-testid="container-install-prompt"
      >
        <div className="bg-card border border-border rounded-xl p-4 shadow-lg max-w-sm mx-auto">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg gradient-header flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-sm">Add to Home Screen</h3>
              <p className="text-muted-foreground text-xs mt-1">
                {isIOS
                  ? "Tap the share button and select 'Add to Home Screen' for quick access"
                  : "Install this app for a better buzzer experience"}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 -mt-1 -mr-1"
              onClick={handleDismiss}
              data-testid="button-dismiss-install"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {isIOS ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
              <Share className="w-4 h-4 text-primary" />
              <span>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong></span>
            </div>
          ) : deferredPrompt ? (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="flex-1 gradient-header text-white"
                onClick={handleInstall}
                data-testid="button-install-app"
              >
                Install App
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                data-testid="button-not-now"
              >
                Not Now
              </Button>
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
