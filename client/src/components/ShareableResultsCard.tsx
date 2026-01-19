import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { soundManager } from "@/lib/sounds";
import * as QRCode from "qrcode";

interface Contestant {
  name: string;
  score: number;
  color: string;
}

interface ShareableResultsCardProps {
  contestants: Contestant[];
  onClose?: () => void;
}

const PLAYER_EMOJIS = ["🎮", "🎯", "🎪", "🎨", "🎭", "🎬", "🎤", "🎧", "🎸", "🎺", "🎻", "🥁", "🎲", "🎰", "🎳"];

export function ShareableResultsCard({ contestants, onClose }: ShareableResultsCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const { toast } = useToast();

  const sortedContestants = [...contestants].sort((a, b) => b.score - a.score);
  const getPlayerEmoji = (index: number) => PLAYER_EMOJIS[index % PLAYER_EMOJIS.length];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#1a0533");
    gradient.addColorStop(0.3, "#2d1b4e");
    gradient.addColorStop(0.6, "#4a1942");
    gradient.addColorStop(1, "#1a0533");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const confettiColors = [
      "#FFD700", "#FF6B6B", "#4ADEBC", "#C44AF5", "#FF8C00", 
      "#00CED1", "#FF69B4", "#7B68EE", "#32CD32", "#FF4500"
    ];
    
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 12 + 4;
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      const opacity = Math.random() * 0.7 + 0.3;
      const rotation = Math.random() * Math.PI * 2;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = opacity;
      
      const shapeType = Math.floor(Math.random() * 4);
      ctx.fillStyle = color;
      
      if (shapeType === 0) {
        ctx.fillRect(-size/2, -size/4, size, size/2);
      } else if (shapeType === 1) {
        ctx.beginPath();
        ctx.arc(0, 0, size/2, 0, Math.PI * 2);
        ctx.fill();
      } else if (shapeType === 2) {
        ctx.beginPath();
        ctx.moveTo(0, -size/2);
        ctx.lineTo(size/2, size/2);
        ctx.lineTo(-size/2, size/2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        const spikes = 5;
        const outerRadius = size/2;
        const innerRadius = size/4;
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        ctx.moveTo(0, -outerRadius);
        for (let j = 0; j < spikes; j++) {
          ctx.lineTo(Math.cos(rot) * outerRadius, -Math.sin(rot) * outerRadius);
          rot += step;
          ctx.lineTo(Math.cos(rot) * innerRadius, -Math.sin(rot) * innerRadius);
          rot += step;
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 3 + 1;
      const opacity = Math.random() * 0.6 + 0.3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    }
    ctx.restore();

    const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string) => {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy - Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy - Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    drawStar(120, 200, 5, 25, 12, "rgba(255, 215, 0, 0.6)");
    drawStar(960, 180, 5, 20, 10, "rgba(255, 215, 0, 0.5)");
    drawStar(200, 1100, 5, 18, 9, "rgba(255, 215, 0, 0.4)");
    drawStar(880, 1150, 5, 22, 11, "rgba(255, 215, 0, 0.5)");
    drawStar(100, 700, 5, 15, 7, "rgba(255, 215, 0, 0.3)");
    drawStar(980, 600, 5, 17, 8, "rgba(255, 215, 0, 0.4)");

    ctx.save();
    ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
    ctx.shadowBlur = 30;
    ctx.font = "bold 72px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700";
    ctx.fillText("HOLY GUACAMOLI!", width / 2, 100);
    ctx.restore();

    ctx.font = "italic 600 42px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("Who knows you best?", width / 2, 160);

    ctx.font = "500 28px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 215, 0, 0.7)";
    ctx.fillText("GAME RESULTS", width / 2, 210);

    const podiumBaseY = 750;
    const podiumWidth = 220;
    
    const drawPodium = (x: number, height: number, place: number, color1: string, color2: string) => {
      const podiumGrad = ctx.createLinearGradient(x - podiumWidth/2, podiumBaseY - height, x + podiumWidth/2, podiumBaseY);
      podiumGrad.addColorStop(0, color1);
      podiumGrad.addColorStop(1, color2);
      
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      
      ctx.beginPath();
      ctx.roundRect(x - podiumWidth/2, podiumBaseY - height, podiumWidth, height + 50, [20, 20, 0, 0]);
      ctx.fillStyle = podiumGrad;
      ctx.fill();
      ctx.restore();

      ctx.font = "bold 80px system-ui";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fillText(place.toString(), x, podiumBaseY - height/2 + 30);
    };

    drawPodium(width/2 - 260, 200, 2, "#A8A8A8", "#6B6B6B");
    drawPodium(width/2, 280, 1, "#FFD700", "#B8860B");
    drawPodium(width/2 + 260, 140, 3, "#CD7F32", "#8B4513");

    const getMedalEmoji = (place: number) => {
      if (place === 1) return "🥇";
      if (place === 2) return "🥈";
      if (place === 3) return "🥉";
      return "";
    };

    const drawBurstRays = (cx: number, cy: number, radius: number) => {
      const numRays = 24;
      ctx.save();
      for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2;
        const innerRadius = radius * 0.3;
        const outerRadius = radius * (0.8 + Math.random() * 0.4);
        
        const gradient = ctx.createLinearGradient(
          cx + Math.cos(angle) * innerRadius,
          cy + Math.sin(angle) * innerRadius,
          cx + Math.cos(angle) * outerRadius,
          cy + Math.sin(angle) * outerRadius
        );
        gradient.addColorStop(0, "rgba(255, 215, 0, 0.8)");
        gradient.addColorStop(0.5, "rgba(255, 140, 0, 0.4)");
        gradient.addColorStop(1, "rgba(255, 100, 0, 0)");
        
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle - 0.08) * innerRadius, cy + Math.sin(angle - 0.08) * innerRadius);
        ctx.lineTo(cx + Math.cos(angle) * outerRadius, cy + Math.sin(angle) * outerRadius);
        ctx.lineTo(cx + Math.cos(angle + 0.08) * innerRadius, cy + Math.sin(angle + 0.08) * innerRadius);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }
      ctx.restore();
    };

    const drawPlayer = (contestant: Contestant | undefined, x: number, y: number, place: number, originalIndex: number) => {
      if (!contestant) return;

      const avatarSize = place === 1 ? 140 : 100;
      const avatarY = y - avatarSize - 40;

      if (place === 1) {
        drawBurstRays(x, avatarY, 200);
        
        ctx.save();
        ctx.shadowColor = "rgba(255, 215, 0, 0.9)";
        ctx.shadowBlur = 60;
        ctx.beginPath();
        ctx.arc(x, avatarY, avatarSize/2 + 25, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
        ctx.fill();
        ctx.restore();

        ctx.font = "90px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("👑", x, avatarY - avatarSize/2 - 25);
      }

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(x, avatarY, avatarSize/2, 0, Math.PI * 2);
      ctx.fillStyle = contestant.color;
      ctx.fill();
      
      ctx.strokeStyle = place === 1 ? "#FFD700" : place === 2 ? "#C0C0C0" : "#CD7F32";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();

      ctx.font = `${place === 1 ? 70 : 50}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(getPlayerEmoji(originalIndex), x, avatarY);

      ctx.font = `bold ${place === 1 ? 36 : 28}px system-ui`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "alphabetic";
      const displayName = contestant.name.length > 10 ? contestant.name.slice(0, 10) + "..." : contestant.name;
      ctx.fillText(displayName, x, avatarY + avatarSize/2 + 40);

      ctx.font = `${place === 1 ? 50 : 38}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(getMedalEmoji(place), x, avatarY + avatarSize/2 + 85);

      ctx.save();
      if (place === 1) {
        ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
        ctx.shadowBlur = 20;
      }
      ctx.font = `bold ${place === 1 ? 48 : 36}px system-ui`;
      ctx.fillStyle = place === 1 ? "#FFD700" : place === 2 ? "#E0E0E0" : "#CD9B5A";
      ctx.fillText(`${contestant.score} pts`, x, avatarY + avatarSize/2 + 130);
      ctx.restore();
    };

    const winner = sortedContestants[0];
    const runnerUp = sortedContestants[1];
    const thirdPlace = sortedContestants[2];

    const winnerIdx = contestants.findIndex(c => c.name === winner?.name);
    const runnerUpIdx = contestants.findIndex(c => c.name === runnerUp?.name);
    const thirdPlaceIdx = contestants.findIndex(c => c.name === thirdPlace?.name);

    drawPlayer(runnerUp, width/2 - 260, podiumBaseY - 200, 2, runnerUpIdx);
    drawPlayer(winner, width/2, podiumBaseY - 280, 1, winnerIdx);
    drawPlayer(thirdPlace, width/2 + 260, podiumBaseY - 140, 3, thirdPlaceIdx);

    if (sortedContestants.length > 3) {
      const startY = 900;
      ctx.font = "600 28px system-ui";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.textAlign = "center";
      ctx.fillText("OTHER PLAYERS", width/2, startY);

      const others = sortedContestants.slice(3, 8);
      others.forEach((contestant, i) => {
        const yPos = startY + 60 + i * 70;
        const originalIdx = contestants.findIndex(c => c.name === contestant.name);
        
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.roundRect(width/2 - 300, yPos - 30, 600, 60, 15);
        ctx.fill();
        ctx.restore();

        ctx.font = "40px system-ui";
        ctx.textAlign = "left";
        ctx.fillText(getPlayerEmoji(originalIdx), width/2 - 260, yPos + 10);

        ctx.font = "bold 28px system-ui";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(contestant.name, width/2 - 200, yPos + 10);

        ctx.font = "bold 28px system-ui";
        ctx.fillStyle = "rgba(255, 215, 0, 0.8)";
        ctx.textAlign = "right";
        ctx.fillText(`${contestant.score} pts`, width/2 + 260, yPos + 10);
      });
    }

    const date = new Date().toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
    ctx.font = "24px system-ui";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.textAlign = "center";
    ctx.fillText(date, width/2, height - 40);

    // Generate QR code and draw it
    const gameUrl = window.location.origin;
    QRCode.toDataURL(gameUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: "#1a0533",
        light: "#FFFFFF"
      }
    }).then((qrDataUrl) => {
      const qrImage = new Image();
      qrImage.onload = () => {
        const qrSize = 120;
        const qrX = width - qrSize - 40;
        const qrY = height - qrSize - 60;
        
        // Draw white rounded background for QR
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 15;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12);
        ctx.fill();
        ctx.restore();
        
        // Draw QR code
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        
        // Draw "Scan to play!" text below QR
        ctx.font = "bold 18px system-ui";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.fillText("Scan to play!", qrX + qrSize/2, qrY + qrSize + 35);
        
        const dataUrl = canvas.toDataURL("image/png");
        setImageUrl(dataUrl);
        setIsGenerating(false);
      };
      qrImage.src = qrDataUrl;
    }).catch(() => {
      // If QR generation fails, still show the image without QR
      const dataUrl = canvas.toDataURL("image/png");
      setImageUrl(dataUrl);
      setIsGenerating(false);
    });
  }, [contestants]);

  const handleDownload = () => {
    if (!imageUrl) return;
    soundManager.play("click", 0.3);
    
    const link = document.createElement("a");
    link.download = `holy-guacamoli-results-${Date.now()}.png`;
    link.href = imageUrl;
    link.click();
    
    toast({ title: "Image downloaded!" });
  };

  const handleShare = async () => {
    if (!imageUrl) return;
    soundManager.play("click", 0.3);

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "holy-guacamoli-results.png", { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Holy GuacAmoli! Results",
          text: "Check out my game results!"
        });
      } else {
        handleDownload();
        toast({ title: "Image downloaded - share it on your favorite platform!" });
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        handleDownload();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <canvas ref={canvasRef} className="hidden" />
      
      {isGenerating ? (
        <div className="w-[300px] h-[375px] rounded-2xl bg-white/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      ) : imageUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group"
        >
          <img 
            src={imageUrl} 
            alt="Game Results" 
            className="w-[300px] rounded-2xl shadow-2xl border-2 border-white/20"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleDownload}
              className="bg-white text-black hover:bg-white/90"
              data-testid="button-download-image"
            >
              <Download className="w-5 h-5 mr-2" />
              Download
            </Button>
          </div>
        </motion.div>
      )}

      <div className="flex gap-3">
        <Button
          size="lg"
          onClick={handleShare}
          disabled={isGenerating}
          className="gradient-header text-white font-bold glow-primary"
          data-testid="button-share-image"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share Image
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={handleDownload}
          disabled={isGenerating}
          className="border-white/30 text-white hover:bg-white/10"
          data-testid="button-download-results"
        >
          <Download className="w-5 h-5 mr-2" />
          Download
        </Button>
      </div>
    </motion.div>
  );
}
