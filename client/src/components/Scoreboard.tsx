import { useState } from "react";
import { useScore } from "./ScoreContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Plus, X, RotateCcw } from "lucide-react";

export function Scoreboard() {
  const { contestants, addContestant, removeContestant, resetGame } = useScore();
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (newName.trim()) {
      addContestant(newName.trim());
      setNewName("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  const sortedContestants = [...contestants].sort((a, b) => b.score - a.score);

  return (
    <Card className="p-4 bg-card">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="font-bold text-lg">Scoreboard</h2>
        </div>
        {contestants.length > 0 && (
          <Button variant="ghost" size="sm" onClick={resetGame} data-testid="button-reset-game">
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Add contestant..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          data-testid="input-contestant-name"
        />
        <Button onClick={handleAdd} size="icon" data-testid="button-add-contestant">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {sortedContestants.length > 0 ? (
        <div className="space-y-2">
          {sortedContestants.map((contestant, idx) => (
            <div
              key={contestant.id}
              className={`
                flex items-center justify-between gap-2 p-3 rounded-lg
                ${idx === 0 && contestant.score > 0 ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700' : 'bg-muted/30'}
              `}
              data-testid={`contestant-${contestant.id}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-muted-foreground w-6">{idx + 1}</span>
                <span className="font-medium text-foreground">{contestant.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${contestant.score < 0 ? 'text-red-500' : 'text-foreground'}`}>
                  {contestant.score}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeContestant(contestant.id)}
                  data-testid={`button-remove-${contestant.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground text-sm py-4">
          Add contestants to start the game
        </p>
      )}
    </Card>
  );
}
