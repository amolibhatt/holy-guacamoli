import confetti from "canvas-confetti";

export const particles = {
  milestone: (score: number) => {
    const milestones = [100, 250, 500, 1000];
    if (milestones.includes(score)) {
      confetti({
        particleCount: score / 2,
        spread: 100,
        origin: { y: 0.7 },
        colors: ["#FFD700", "#FFA500", "#FF6B6B", "#C44AF5"],
      });
      
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
        });
      }, 300);
    }
  },

  streak: (streakCount: number) => {
    if (streakCount >= 3) {
      const colors = streakCount >= 5 
        ? ["#FFD700", "#FFA500", "#FF0000"] 
        : ["#4ADEBC", "#3B82F6", "#8B5CF6"];
      
      confetti({
        particleCount: 30 * streakCount,
        spread: 80,
        origin: { y: 0.6 },
        colors,
        shapes: ["star"],
        scalar: 1.2,
      });
    }
  },

  categoryComplete: () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    intervalId = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        cleanup();
        return;
      }

      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#FFD93D", "#FF6B6B", "#C44AF5"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#FFD93D", "#FF6B6B", "#C44AF5"],
      });
    }, 100);

    return cleanup;
  },

  fireworks: () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  },

  sparkle: (x: number, y: number) => {
    confetti({
      particleCount: 15,
      spread: 50,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: ["#FFD93D", "#FFFFFF"],
      shapes: ["star"],
      scalar: 0.8,
      gravity: 0.5,
      ticks: 50,
    });
  },

  burst: (x: number, y: number, colors?: string[]) => {
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: colors || ["#FF6B6B", "#FF8E53", "#FFD93D", "#4ADEBC"],
      startVelocity: 30,
      gravity: 1,
      ticks: 100,
    });
  },
};
