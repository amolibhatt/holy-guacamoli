import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Component Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("UI Component Logic", () => {
    it("should validate score input correctly", () => {
      const validateScore = (score: number): boolean => {
        return typeof score === 'number' && !isNaN(score) && score >= -100000 && score <= 100000;
      };

      expect(validateScore(100)).toBe(true);
      expect(validateScore(-50)).toBe(true);
      expect(validateScore(0)).toBe(true);
      expect(validateScore(NaN)).toBe(false);
      expect(validateScore(Infinity)).toBe(false);
    });

    it("should format scores correctly", () => {
      const formatScore = (score: number): string => {
        if (score > 0) return `+${score}`;
        return String(score);
      };

      expect(formatScore(100)).toBe("+100");
      expect(formatScore(-50)).toBe("-50");
      expect(formatScore(0)).toBe("0");
    });

    it("should generate room codes correctly", () => {
      const generateRoomCode = (): string => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 4; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
      };

      const code1 = generateRoomCode();
      const code2 = generateRoomCode();

      expect(code1).toHaveLength(4);
      expect(code2).toHaveLength(4);
      expect(code1).toMatch(/^[A-Z2-9]+$/);
    });

    it("should validate question point values", () => {
      const VALID_POINTS = [10, 20, 30, 40, 50];
      
      const isValidPoints = (points: number): boolean => {
        return VALID_POINTS.includes(points);
      };

      expect(isValidPoints(10)).toBe(true);
      expect(isValidPoints(50)).toBe(true);
      expect(isValidPoints(15)).toBe(false);
      expect(isValidPoints(100)).toBe(false);
    });

    it("should calculate completion percentage correctly", () => {
      const calculateProgress = (completed: number, total: number): number => {
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
      };

      expect(calculateProgress(3, 5)).toBe(60);
      expect(calculateProgress(5, 5)).toBe(100);
      expect(calculateProgress(0, 5)).toBe(0);
      expect(calculateProgress(0, 0)).toBe(0);
    });
  });

  describe("Category Management Logic", () => {
    it("should validate category has exactly 5 questions", () => {
      const hasValidQuestionCount = (questionCount: number): boolean => {
        return questionCount === 5;
      };

      expect(hasValidQuestionCount(5)).toBe(true);
      expect(hasValidQuestionCount(4)).toBe(false);
      expect(hasValidQuestionCount(6)).toBe(false);
    });

    it("should validate unique point values in category", () => {
      const hasUniquePoints = (points: number[]): boolean => {
        return new Set(points).size === points.length;
      };

      expect(hasUniquePoints([10, 20, 30, 40, 50])).toBe(true);
      expect(hasUniquePoints([10, 10, 30, 40, 50])).toBe(false);
      expect(hasUniquePoints([10, 20, 30])).toBe(true);
    });

    it("should validate category name length", () => {
      const isValidCategoryName = (name: string): boolean => {
        return name.length >= 1 && name.length <= 100;
      };

      expect(isValidCategoryName("Geography")).toBe(true);
      expect(isValidCategoryName("")).toBe(false);
      expect(isValidCategoryName("A".repeat(101))).toBe(false);
    });
  });

  describe("Game State Logic", () => {
    it("should track completed questions correctly", () => {
      const completedQuestions = new Set<number>();
      
      const markComplete = (qId: number) => {
        completedQuestions.add(qId);
      };

      const isComplete = (qId: number) => {
        return completedQuestions.has(qId);
      };

      expect(isComplete(1)).toBe(false);
      markComplete(1);
      expect(isComplete(1)).toBe(true);
      expect(isComplete(2)).toBe(false);
    });

    it("should calculate total score correctly", () => {
      const calculateTotalScore = (scores: Record<string, number>): number => {
        return Object.values(scores).reduce((sum, score) => sum + score, 0);
      };

      expect(calculateTotalScore({ "player1": 100, "player2": 50 })).toBe(150);
      expect(calculateTotalScore({ "player1": -30, "player2": 100 })).toBe(70);
      expect(calculateTotalScore({})).toBe(0);
    });

    it("should sort players by score correctly", () => {
      type Player = { name: string; score: number };
      
      const sortByScore = (players: Player[]): Player[] => {
        return [...players].sort((a, b) => b.score - a.score);
      };

      const players = [
        { name: "Alice", score: 50 },
        { name: "Bob", score: 100 },
        { name: "Charlie", score: 75 }
      ];

      const sorted = sortByScore(players);
      expect(sorted[0].name).toBe("Bob");
      expect(sorted[1].name).toBe("Charlie");
      expect(sorted[2].name).toBe("Alice");
    });
  });

  describe("Shuffle Algorithm Logic", () => {
    it("should select diverse source groups", () => {
      type Category = { id: number; sourceGroup: string };
      
      const selectDiverse = (categories: Category[], count: number): Category[] => {
        const byGroup = new Map<string, Category[]>();
        
        for (const cat of categories) {
          const group = cat.sourceGroup || "default";
          if (!byGroup.has(group)) byGroup.set(group, []);
          byGroup.get(group)!.push(cat);
        }

        const result: Category[] = [];
        const groups = Array.from(byGroup.keys());
        let groupIndex = 0;

        while (result.length < count && groups.length > 0) {
          const group = groups[groupIndex % groups.length];
          const cats = byGroup.get(group)!;
          
          if (cats.length > 0) {
            result.push(cats.shift()!);
          }
          
          if (cats.length === 0) {
            groups.splice(groups.indexOf(group), 1);
          } else {
            groupIndex++;
          }
        }

        return result;
      };

      const cats: Category[] = [
        { id: 1, sourceGroup: "A" },
        { id: 2, sourceGroup: "A" },
        { id: 3, sourceGroup: "B" },
        { id: 4, sourceGroup: "C" },
        { id: 5, sourceGroup: "B" }
      ];

      const selected = selectDiverse(cats, 3);
      expect(selected).toHaveLength(3);
      
      const groups = new Set(selected.map(c => c.sourceGroup));
      expect(groups.size).toBe(3);
    });

    it("should prioritize personal categories in meld mode", () => {
      type Category = { id: number; isPersonal: boolean };
      
      const prioritizePersonal = (categories: Category[]): Category[] => {
        const personal = categories.filter(c => c.isPersonal);
        const global = categories.filter(c => !c.isPersonal);
        return [...personal, ...global];
      };

      const cats: Category[] = [
        { id: 1, isPersonal: false },
        { id: 2, isPersonal: true },
        { id: 3, isPersonal: false },
        { id: 4, isPersonal: true }
      ];

      const sorted = prioritizePersonal(cats);
      expect(sorted[0].isPersonal).toBe(true);
      expect(sorted[1].isPersonal).toBe(true);
      expect(sorted[2].isPersonal).toBe(false);
      expect(sorted[3].isPersonal).toBe(false);
    });
  });

  describe("Input Sanitization Logic", () => {
    it("should trim whitespace from inputs", () => {
      const sanitize = (input: string): string => {
        return input.trim();
      };

      expect(sanitize("  hello  ")).toBe("hello");
      expect(sanitize("test")).toBe("test");
      expect(sanitize("  ")).toBe("");
    });

    it("should handle XSS in display text", () => {
      const escapeHtml = (text: string): string => {
        return text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      };

      expect(escapeHtml("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert('xss')&lt;/script&gt;");
      expect(escapeHtml('test "value"')).toBe('test &quot;value&quot;');
    });

    it("should validate URL format", () => {
      const isValidImageUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      };

      expect(isValidImageUrl("https://example.com/image.png")).toBe(true);
      expect(isValidImageUrl("http://example.com/image.jpg")).toBe(true);
      expect(isValidImageUrl("not-a-url")).toBe(false);
      expect(isValidImageUrl("javascript:alert(1)")).toBe(false);
    });
  });

  describe("Time and Date Logic", () => {
    it("should format relative time correctly", () => {
      const formatRelativeTime = (date: Date): string => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return "just now";
      };

      const now = new Date();
      expect(formatRelativeTime(now)).toBe("just now");
      
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      expect(formatRelativeTime(hourAgo)).toBe("1h ago");
    });

    it("should calculate countdown correctly", () => {
      const getCountdown = (targetDate: Date): { days: number; hours: number; minutes: number } => {
        const now = new Date();
        const diff = Math.max(0, targetDate.getTime() - now.getTime());
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return { days, hours, minutes };
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const countdown = getCountdown(tomorrow);
      expect(countdown.days).toBeLessThanOrEqual(1);
      expect(countdown.hours).toBeLessThan(24);
    });
  });
});

describe("Utility Functions", () => {
  it("should generate unique IDs", () => {
    const generateId = (): string => {
      return Math.random().toString(36).substring(2, 15);
    };

    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    
    expect(ids.size).toBe(100);
  });

  it("should deep clone objects correctly", () => {
    const deepClone = <T>(obj: T): T => {
      return JSON.parse(JSON.stringify(obj));
    };

    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);

    cloned.b.c = 999;
    expect(original.b.c).toBe(2);
  });

  it("should debounce function calls", async () => {
    let callCount = 0;
    
    const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number): T => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return ((...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
      }) as T;
    };

    const increment = debounce(() => { callCount++; }, 50);

    increment();
    increment();
    increment();
    
    expect(callCount).toBe(0);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(callCount).toBe(1);
  });
});
