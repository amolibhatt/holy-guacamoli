import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Info, Users, Trophy, Clock, Zap, Target, Brain, ListOrdered, Grid3X3 } from "lucide-react";

export interface GameRulesContent {
  title: string;
  tagline: string;
  players: string;
  duration: string;
  overview: string;
  howToPlay: string[];
  scoring: string[];
  tips: string[];
  accentColor: string;
}

export const GAME_RULES: Record<string, GameRulesContent> = {
  blitzgrid: {
    title: "BlitzGrid",
    tagline: "Race the clock, decode the clues, and claim the grid.",
    players: "2+ players",
    duration: "15-30 min",
    accentColor: "#e879f9",
    overview: "A 5x5 trivia grid where players compete across 5 categories. Each category has questions worth 10-50 points. The player who answers correctly gets to pick the next question!",
    howToPlay: [
      "The host (or player in control) selects a category and point value",
      "The question is revealed to all players",
      "Players buzz in on their phones to answer",
      "The host judges if the answer is correct",
      "The player who answers correctly picks the next question",
      "Play continues until all questions are answered"
    ],
    scoring: [
      "Each question is worth 10, 20, 30, 40, or 50 points",
      "Higher point values = harder questions",
      "Incorrect answers can result in point deduction",
      "The player with the most points at the end wins"
    ],
    tips: [
      "Start with lower point values to build confidence",
      "Save the 50-point questions for when you're feeling lucky",
      "Listen carefully - the host's judgment is final!"
    ]
  },
  sequence_squeeze: {
    title: "Sort Circuit",
    tagline: "Put things in order. Fastest correct answer wins!",
    players: "2-20 players",
    duration: "10-20 min",
    accentColor: "#22d3ee",
    overview: "A fast-paced sorting game where players race to arrange 4 items in the correct order. It could be dates, sizes, rankings, or anything that has a logical sequence!",
    howToPlay: [
      "The host starts a round with 4 items to sort",
      "Players see the items on their phones",
      "Drag and drop to arrange them in the correct order",
      "Submit your answer as fast as you can",
      "Points are awarded based on speed and accuracy",
      "The round ends when time runs out or all players answer"
    ],
    scoring: [
      "Perfect order = Full points (faster = more points)",
      "Speed matters! First correct answer gets bonus points",
      "Partially correct orders may earn partial credit",
      "Wrong answers score zero for that round"
    ],
    tips: [
      "Trust your gut - speed is crucial",
      "Look for obvious anchors (earliest/latest, smallest/biggest)",
      "Don't overthink it - submit quickly!"
    ]
  },
  psyop: {
    title: "PsyOp",
    tagline: "Make up answers. Fool your friends!",
    players: "3-10 players",
    duration: "20-40 min",
    accentColor: "#8b5cf6",
    overview: "A bluffing game where players create fake answers to trick others. One answer is real - can you spot it? Or will your fake answer fool everyone?",
    howToPlay: [
      "The host reads a question nobody knows the answer to",
      "Each player submits a fake but believable answer",
      "All answers (including the real one) are shown",
      "Players vote for what they think is the real answer",
      "Points are earned for guessing right OR fooling others",
      "The best bluffers and detectives win!"
    ],
    scoring: [
      "2 points for correctly identifying the real answer",
      "1 point for each player you fool with your fake answer",
      "Bonus points for consistently good performance",
      "The ultimate trickster takes the crown"
    ],
    tips: [
      "Make your fake answer sound plausible",
      "Match the style/format of typical real answers",
      "Watch for answers that are 'too perfect' - they might be fakes!"
    ]
  }
};

interface GameRulesSheetProps {
  gameSlug: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GameRulesSheet({ gameSlug, open, onOpenChange }: GameRulesSheetProps) {
  if (!gameSlug || !GAME_RULES[gameSlug]) return null;
  
  const rules = GAME_RULES[gameSlug];
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="max-h-[85vh] overflow-y-auto bg-[#0d0d12] border-t border-white/10"
      >
        <SheetHeader className="text-left pb-4 border-b border-white/10">
          <SheetTitle className="flex items-center gap-3 text-2xl">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${rules.accentColor}30 0%, ${rules.accentColor}10 100%)`,
                border: `2px solid ${rules.accentColor}` 
              }}
            >
              {gameSlug === 'blitzgrid' && <Grid3X3 className="w-5 h-5" style={{ color: rules.accentColor }} />}
              {gameSlug === 'sequence_squeeze' && <ListOrdered className="w-5 h-5" style={{ color: rules.accentColor }} />}
              {gameSlug === 'psyop' && <Brain className="w-5 h-5" style={{ color: rules.accentColor }} />}
            </div>
            <span className="text-white">{rules.title}</span>
          </SheetTitle>
          <SheetDescription className="text-white/60 text-base">
            {rules.tagline}
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-white/70">
              <Users className="w-4 h-4" style={{ color: rules.accentColor }} />
              <span>{rules.players}</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Clock className="w-4 h-4" style={{ color: rules.accentColor }} />
              <span>{rules.duration}</span>
            </div>
          </div>
          
          <div>
            <p className="text-white/80 leading-relaxed">{rules.overview}</p>
          </div>
          
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
              <Zap className="w-5 h-5" style={{ color: rules.accentColor }} />
              How to Play
            </h3>
            <ol className="space-y-2">
              {rules.howToPlay.map((step, i) => (
                <li key={i} className="flex gap-3 text-white/70">
                  <span 
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ 
                      backgroundColor: `${rules.accentColor}20`,
                      color: rules.accentColor 
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
              <Trophy className="w-5 h-5" style={{ color: rules.accentColor }} />
              Scoring
            </h3>
            <ul className="space-y-2">
              {rules.scoring.map((item, i) => (
                <li key={i} className="flex gap-2 text-white/70">
                  <span style={{ color: rules.accentColor }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
              <Target className="w-5 h-5" style={{ color: rules.accentColor }} />
              Pro Tips
            </h3>
            <ul className="space-y-2">
              {rules.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-white/70">
                  <span style={{ color: rules.accentColor }}>★</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface GameRulesButtonProps {
  gameSlug: string;
  variant?: "icon" | "button";
  className?: string;
  onOpen: () => void;
}

export function GameRulesButton({ gameSlug, variant = "icon", className = "", onOpen }: GameRulesButtonProps) {
  const rules = GAME_RULES[gameSlug];
  if (!rules) return null;
  
  if (variant === "button") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className={className}
        data-testid={`button-rules-${gameSlug}`}
      >
        <Info className="w-4 h-4 mr-2" />
        How to Play
      </Button>
    );
  }
  
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={`p-2 rounded-full hover:bg-white/10 transition-colors ${className}`}
      title="How to Play"
      data-testid={`button-rules-${gameSlug}`}
    >
      <Info className="w-5 h-5 text-white/60 hover:text-white" />
    </button>
  );
}
