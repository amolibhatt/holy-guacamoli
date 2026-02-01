import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

interface TooltipStep {
  target: string;
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface OnboardingTooltipProps {
  steps: TooltipStep[];
  storageKey: string;
  onComplete?: () => void;
}

export function OnboardingTooltip({ steps, storageKey, onComplete }: OnboardingTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(storageKey);
    if (!hasSeenOnboarding && steps.length > 0) {
      setTimeout(() => {
        setIsVisible(true);
        trackEvent('onboarding_started', { storageKey });
      }, 500);
    }
  }, [storageKey, steps.length]);

  useEffect(() => {
    if (!isVisible || !steps[currentStep]) return;

    const updatePosition = () => {
      const target = document.querySelector(steps[currentStep].target);
      if (target) {
        const rect = target.getBoundingClientRect();
        const pos = steps[currentStep].position || "bottom";
        
        let top = 0;
        let left = 0;
        
        switch (pos) {
          case "bottom":
            top = rect.bottom + 12;
            left = rect.left + rect.width / 2;
            break;
          case "top":
            top = rect.top - 12;
            left = rect.left + rect.width / 2;
            break;
          case "left":
            top = rect.top + rect.height / 2;
            left = rect.left - 12;
            break;
          case "right":
            top = rect.top + rect.height / 2;
            left = rect.right + 12;
            break;
        }
        
        setPosition({ top, left });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);
    
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [currentStep, isVisible, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleDismiss = (wasSkipped = false) => {
    setIsVisible(false);
    localStorage.setItem(storageKey, "true");
    trackEvent(wasSkipped ? 'onboarding_skipped' : 'onboarding_completed', { 
      storageKey, 
      stepReached: currentStep + 1,
      totalSteps: steps.length 
    });
    onComplete?.();
  };

  if (!isVisible || !steps[currentStep]) return null;

  const step = steps[currentStep];
  const pos = step.position || "bottom";

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]" 
        onClick={() => handleDismiss(true)}
        data-testid="onboarding-overlay"
      />
      <AnimatePresence>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed z-50 w-72 bg-card border border-border rounded-lg shadow-xl p-4"
          style={{
            top: position.top,
            left: position.left,
            transform: pos === "bottom" || pos === "top" 
              ? "translateX(-50%)" 
              : pos === "left" 
                ? "translate(-100%, -50%)" 
                : "translateY(-50%)",
          }}
          data-testid="onboarding-tooltip"
        >
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDismiss(true)}
            className="absolute top-2 right-2"
            data-testid="button-dismiss-onboarding"
          >
            <X className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">{step.title}</h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">{step.content}</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handlePrev}
                  data-testid="button-prev-tooltip"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={handleNext}
                data-testid="button-next-tooltip"
              >
                {currentStep === steps.length - 1 ? "Done" : "Next"}
                {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export const HOST_ONBOARDING_STEPS: TooltipStep[] = [
  {
    target: "[data-testid='scoreboard']",
    title: "Scoreboard",
    content: "Add contestants and track scores. Click +/- to adjust points, or use the undo button if you make a mistake.",
    position: "left"
  },
  {
    target: "[data-testid='category-column']",
    title: "Categories",
    content: "Click any point value to reveal a question. The buzzer will automatically unlock for players.",
    position: "bottom"
  },
  {
    target: "[data-testid='buzzer-panel']",
    title: "Buzzer Control",
    content: "Players join via QR code. You control when buzzers are locked/unlocked. First buzz wins!",
    position: "top"
  }
];

export const PLAYER_ONBOARDING_STEPS: TooltipStep[] = [
  {
    target: "[data-testid='buzzer-button']",
    title: "Ready to Buzz?",
    content: "When the host reveals a question, tap this button as fast as you can! First to buzz gets to answer.",
    position: "top"
  },
  {
    target: "[data-testid='player-score']",
    title: "Your Score",
    content: "Watch your points grow! Correct answers earn points, wrong answers may deduct them.",
    position: "bottom"
  }
];

export const COUPLES_ONBOARDING_STEPS: TooltipStep[] = [
  {
    target: "[data-testid='tab-today']",
    title: "Daily Questions",
    content: "Answer today's questions to see how well you and your partner match. New questions every day!",
    position: "bottom"
  },
  {
    target: "[data-testid='tab-vault']",
    title: "The Vault",
    content: "Browse past answers and save your favorites. Great for revisiting special moments.",
    position: "bottom"
  },
  {
    target: "[data-testid='tab-journey']",
    title: "Your Journey",
    content: "See your relationship timeline with milestones, streaks, and compatibility insights.",
    position: "bottom"
  }
];
