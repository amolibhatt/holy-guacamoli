import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";
import { useScore } from "@/components/ScoreContext";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { 
  Plus, Trash2, Pencil, Check, X, Grid3X3, 
  ChevronRight, ArrowLeft, Play, Loader2,
  AlertCircle, CheckCircle2, Eye, RotateCcw, QrCode, Users, Minus, Zap, Lock, Trophy, ChevronLeft, UserPlus, Power, Crown, Sparkles, Medal,
  Circle, Waves, Sun, Star, TreePine, Flower2, Leaf, Bird,
  PartyPopper, Cake, Umbrella, Briefcase, Dog, Cat, Rocket, Music, Palette, Heart, Timer,
  Target, Flag, Award, Dribbble, Shirt, Footprints, Shell, Fish, Gift, Candy, Coffee, Laptop, Headphones, Mic2, Guitar
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Player {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  connected: boolean;
}
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import type { Board, Category, Question } from "@shared/schema";
import { PLAYER_AVATARS } from "@shared/schema";
import { getBoardColorConfig } from "@/lib/boardColors";

interface GridWithStats extends Board {
  categoryCount: number;
  questionCount: number;
  isActive: boolean;
}

interface CategoryWithQuestions extends Category {
  questionCount: number;
  questions: Question[];
}

const POINT_TIERS = [10, 20, 30, 40, 50];

// Available themes for grids - sophisticated and playful
const GRID_THEMES = [
  { id: 'sports', name: 'Football', iconType: 'trophy' as const, background: 'linear-gradient(180deg, #15803d 0%, #16a34a 30%, #22c55e 50%, #16a34a 70%, #15803d 100%)' },
  { id: 'birthday', name: 'Birthday', iconType: 'cake' as const, background: 'linear-gradient(180deg, #9333ea 0%, #c084fc 50%, #e879f9 70%, #c084fc 100%)' },
  { id: 'beach', name: 'Beach', iconType: 'umbrella' as const, background: 'linear-gradient(180deg, #0369a1 0%, #38bdf8 50%, #7dd3fc 70%, #38bdf8 100%)' },
  { id: 'office', name: 'Office', iconType: 'briefcase' as const, background: 'linear-gradient(180deg, #1f2937 0%, #4b5563 50%, #6b7280 70%, #4b5563 100%)' },
  { id: 'dogs', name: 'Dogs', iconType: 'dog' as const, background: 'linear-gradient(180deg, #b45309 0%, #f59e0b 50%, #fbbf24 70%, #f59e0b 100%)' },
  { id: 'cats', name: 'Cats', iconType: 'cat' as const, background: 'linear-gradient(180deg, #4c1d95 0%, #8b5cf6 50%, #a78bfa 70%, #8b5cf6 100%)' },
  { id: 'space', name: 'Space', iconType: 'rocket' as const, background: 'linear-gradient(180deg, #0f172a 0%, #1e3a5f 40%, #334155 60%, #1e3a5f 100%)' },
  { id: 'music', name: 'Music', iconType: 'music' as const, background: 'linear-gradient(180deg, #be123c 0%, #f43f5e 50%, #fb7185 70%, #f43f5e 100%)' },
  { id: 'nature', name: 'Nature', iconType: 'leaf' as const, background: 'linear-gradient(180deg, #14532d 0%, #16a34a 50%, #4ade80 70%, #16a34a 100%)' },
] as const;

type ThemeIconType = typeof GRID_THEMES[number]['iconType'];

// Map theme icon types to lucide icons
const ThemeIcon = ({ type, className }: { type: ThemeIconType; className?: string }) => {
  switch (type) {
    case 'trophy': return <Trophy className={className} />;
    case 'cake': return <Cake className={className} />;
    case 'umbrella': return <Umbrella className={className} />;
    case 'briefcase': return <Briefcase className={className} />;
    case 'dog': return <Dog className={className} />;
    case 'cat': return <Cat className={className} />;
    case 'rocket': return <Rocket className={className} />;
    case 'music': return <Music className={className} />;
    case 'leaf': return <Leaf className={className} />;
    default: return <PartyPopper className={className} />;
  }
};

// Color palettes for themes
const BALLOON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
const ART_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

// Pre-generate stable random values for theme elements
const generateElementData = (count: number) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      delay: i * 0.5,
      duration: 8 + (i * 0.7) % 6,
      startX: (i * 8.3) % 100,
      startY: 100 + (i * 1.7) % 20,
      endY: -20 - (i * 0.8) % 10,
      size: 16 + (i * 1.9) % 20,
      opacity: 0.15 + (i * 0.02) % 0.25,
      extraRandom1: (i * 2.3) % 30 - 15,
      extraRandom2: (i * 1.1) % 20 - 10,
      extraRandom3: (i * 0.9) % 15,
    });
  }
  return data;
};

const ELEMENT_DATA = generateElementData(12);

// Animated theme elements that float around the grid
const ThemeElements = ({ themeId }: { themeId: string }) => {
  const elements = ELEMENT_DATA.map((data, i) => {
    const { delay, duration, startX, startY, endY, size, opacity, extraRandom1, extraRandom2, extraRandom3 } = data;
    
    const sportsElements = [Trophy, Flag, Award, Target, Medal, Shirt];
    const SportsIcon = sportsElements[i % sportsElements.length];
    const sportsColors = ['text-yellow-400', 'text-orange-400', 'text-green-400', 'text-white', 'text-amber-300', 'text-red-400'];
    
    switch (themeId) {
      case 'sports': {
        // One ball with players kicking it around!
        if (i === 0) {
          // The soccer ball - bounces between kick positions
          return (
            <motion.div
              key="ball"
              className="absolute pointer-events-none z-10"
              animate={{ 
                x: ['15vw', '75vw', '50vw', '25vw', '80vw', '10vw', '60vw', '15vw'],
                y: ['70vh', '30vh', '65vh', '25vh', '55vh', '45vh', '20vh', '70vh'],
                rotate: [0, 360, 720, 1080, 1440, 1800, 2160, 2520],
                scale: [1, 1.1, 1, 1.15, 1, 1.1, 1, 1],
              }}
              transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", times: [0, 0.14, 0.28, 0.42, 0.56, 0.70, 0.85, 1] }}
              style={{ opacity: 0.9 }}
            >
              {/* Fun colorful beach ball style */}
              <svg width="55" height="55" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                <defs>
                  <clipPath id="ballClip">
                    <circle cx="50" cy="50" r="46"/>
                  </clipPath>
                </defs>
                <circle cx="50" cy="50" r="48" fill="white" stroke="#ddd" strokeWidth="2"/>
                <g clipPath="url(#ballClip)">
                  <path d="M50,4 L70,50 L50,96" fill="#ef4444"/>
                  <path d="M50,4 L30,50 L50,96" fill="#3b82f6"/>
                  <path d="M50,4 L50,50 L96,50 A46,46 0 0,0 50,4" fill="#fbbf24"/>
                  <path d="M50,96 L50,50 L96,50 A46,46 0 0,1 50,96" fill="#22c55e"/>
                  <path d="M50,4 L50,50 L4,50 A46,46 0 0,1 50,4" fill="#a855f7"/>
                  <path d="M50,96 L50,50 L4,50 A46,46 0 0,0 50,96" fill="#f97316"/>
                </g>
                <circle cx="50" cy="50" r="8" fill="white"/>
                <ellipse cx="35" cy="30" rx="10" ry="6" fill="white" opacity="0.5"/>
              </svg>
            </motion.div>
          );
        }
        // Players kicking at different positions
        const playerPositions = [
          { x: 12, y: 72, kickDelay: 0, facing: 'right' },
          { x: 72, y: 32, kickDelay: 2, facing: 'left' },
          { x: 47, y: 67, kickDelay: 4, facing: 'right' },
          { x: 22, y: 27, kickDelay: 6, facing: 'left' },
          { x: 77, y: 57, kickDelay: 8, facing: 'left' },
          { x: 7, y: 47, kickDelay: 10, facing: 'right' },
          { x: 57, y: 22, kickDelay: 12, facing: 'left' },
        ];
        const playerIndex = (i - 1) % playerPositions.length;
        if (i > playerPositions.length) return null;
        const player = playerPositions[playerIndex];
        const isRight = player.facing === 'right';
        
        return (
          <motion.div
            key={`player-${i}`}
            className="absolute pointer-events-none"
            style={{ left: `${player.x}vw`, top: `${player.y}vh`, transform: isRight ? 'scaleX(1)' : 'scaleX(-1)' }}
          >
            {/* Player silhouette */}
            <motion.div
              animate={{ 
                rotate: [0, 0, -25, 0, 0],
              }}
              transition={{ 
                duration: 16, 
                delay: player.kickDelay,
                repeat: Infinity, 
                times: [0, 0.02, 0.06, 0.10, 1],
                ease: "easeOut"
              }}
              style={{ transformOrigin: 'bottom center' }}
            >
              <svg width="45" height="70" viewBox="0 0 45 70" fill="none" style={{ opacity: 0.7 }}>
                {/* Head */}
                <circle cx="22" cy="10" r="8" fill="white"/>
                {/* Body */}
                <rect x="17" y="18" width="10" height="22" rx="3" fill="white"/>
                {/* Left arm */}
                <rect x="8" y="20" width="9" height="5" rx="2" fill="white"/>
                {/* Right arm */}
                <rect x="27" y="20" width="9" height="5" rx="2" fill="white"/>
                {/* Left leg (standing) */}
                <rect x="17" y="40" width="5" height="25" rx="2" fill="white"/>
                {/* Right leg (kicking) */}
                <motion.rect 
                  x="23" y="40" width="5" height="25" rx="2" fill="white"
                  animate={{ rotate: [0, 0, 60, 0, 0] }}
                  transition={{ 
                    duration: 16, 
                    delay: player.kickDelay,
                    repeat: Infinity, 
                    times: [0, 0.02, 0.06, 0.10, 1],
                    ease: "easeOut"
                  }}
                  style={{ transformOrigin: 'top center' }}
                />
              </svg>
            </motion.div>
          </motion.div>
        );
      }
      case 'birthday': {
        // Birthday cake with flickering candles in the center
        if (i === 0) {
          return (
            <motion.div
              key="cake"
              className="absolute pointer-events-none"
              style={{ left: '50%', bottom: '5%', transform: 'translateX(-50%)' }}
            >
              <svg width="120" height="100" viewBox="0 0 120 100" style={{ opacity: 0.85 }}>
                {/* Cake base */}
                <rect x="20" y="50" width="80" height="45" rx="5" fill="#f8a5c2"/>
                <rect x="15" y="45" width="90" height="10" rx="3" fill="#f78fb3"/>
                {/* Frosting drips */}
                <ellipse cx="30" cy="50" rx="8" ry="12" fill="#fff"/>
                <ellipse cx="60" cy="52" rx="10" ry="15" fill="#fff"/>
                <ellipse cx="90" cy="50" rx="8" ry="12" fill="#fff"/>
                {/* Candles */}
                {[35, 50, 65, 80].map((cx, idx) => (
                  <g key={idx}>
                    <rect x={cx-3} y="25" width="6" height="22" fill={['#ff6b6b','#ffd93d','#6bcb77','#4d96ff'][idx]} rx="2"/>
                    <motion.ellipse
                      cx={cx} cy="20" rx="5" ry="8"
                      fill="#ffd93d"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.9, 1, 0.9] }}
                      transition={{ duration: 0.3 + idx * 0.1, repeat: Infinity }}
                    />
                    <motion.ellipse
                      cx={cx} cy="18" rx="3" ry="5"
                      fill="#ff9f43"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.25 + idx * 0.1, repeat: Infinity }}
                    />
                  </g>
                ))}
              </svg>
            </motion.div>
          );
        }
        // Confetti bursts
        if (i === 1 || i === 2) {
          const burstX = i === 1 ? 25 : 75;
          return (
            <motion.div
              key={`confetti-burst-${i}`}
              className="absolute pointer-events-none"
              style={{ left: `${burstX}vw`, top: '30vh' }}
              animate={{ scale: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 3, delay: i * 2, repeat: Infinity }}
            >
              {[...Array(8)].map((_, j) => (
                <motion.div
                  key={j}
                  className="absolute w-3 h-3 rounded-sm"
                  style={{ background: ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#f8a5c2','#a55eea'][j % 6] }}
                  animate={{
                    x: [0, Math.cos(j * 45 * Math.PI / 180) * 60],
                    y: [0, Math.sin(j * 45 * Math.PI / 180) * 60],
                    rotate: [0, 360],
                    scale: [1, 0.5],
                  }}
                  transition={{ duration: 1.5, delay: i * 2, repeat: Infinity }}
                />
              ))}
            </motion.div>
          );
        }
        // Floating balloons
        const balloonY = 85 + (i * 3) % 15;
        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            initial={{ x: `${startX}vw`, y: `${balloonY}vh` }}
            animate={{ 
              y: [`${balloonY}vh`, '-15vh'],
              x: [`${startX}vw`, `${startX + (i % 2 === 0 ? 5 : -5)}vw`],
              rotate: [-5, 5, -5],
            }}
            transition={{ duration: duration * 1.5, delay: delay * 0.5, repeat: Infinity, ease: "easeOut" }}
            style={{ opacity: 0.85 }}
          >
            <div 
              className="rounded-full" 
              style={{ 
                width: size * 1.3, 
                height: size * 1.6, 
                background: BALLOON_COLORS[i % BALLOON_COLORS.length],
                boxShadow: `inset -${size/3}px -${size/3}px ${size/2}px rgba(0,0,0,0.15)`
              }} 
            />
            <div className="w-0.5 h-12 bg-white/40 mx-auto" style={{ background: `linear-gradient(to bottom, ${BALLOON_COLORS[i % BALLOON_COLORS.length]}, transparent)` }}/>
          </motion.div>
        );
      }
      case 'beach': {
        // Animated waves at the bottom
        if (i === 0 || i === 1) {
          return (
            <motion.div
              key={`wave-${i}`}
              className="absolute pointer-events-none bottom-0 left-0 right-0"
              style={{ bottom: i === 0 ? '0' : '15px' }}
            >
              <motion.svg 
                width="100%" height="60" viewBox="0 0 1200 60" preserveAspectRatio="none"
                style={{ opacity: i === 0 ? 0.6 : 0.4 }}
              >
                <motion.path
                  d="M0,30 Q150,10 300,30 T600,30 T900,30 T1200,30 L1200,60 L0,60 Z"
                  fill={i === 0 ? '#06b6d4' : '#22d3ee'}
                  animate={{ d: [
                    "M0,30 Q150,10 300,30 T600,30 T900,30 T1200,30 L1200,60 L0,60 Z",
                    "M0,30 Q150,50 300,30 T600,30 T900,30 T1200,30 L1200,60 L0,60 Z",
                    "M0,30 Q150,10 300,30 T600,30 T900,30 T1200,30 L1200,60 L0,60 Z",
                  ]}}
                  transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.svg>
            </motion.div>
          );
        }
        // Palm trees on sides
        if (i === 2 || i === 3) {
          const isLeft = i === 2;
          return (
            <motion.div
              key={`palm-${i}`}
              className="absolute pointer-events-none bottom-[50px]"
              style={{ [isLeft ? 'left' : 'right']: '5%' }}
              animate={{ rotate: isLeft ? [-3, 3, -3] : [3, -3, 3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="60" height="120" viewBox="0 0 60 120" style={{ opacity: 0.7 }}>
                <rect x="26" y="40" width="8" height="80" fill="#8B4513" rx="2"/>
                <ellipse cx="30" cy="35" rx="25" ry="15" fill="#22c55e" transform="rotate(-30 30 35)"/>
                <ellipse cx="30" cy="35" rx="25" ry="15" fill="#16a34a" transform="rotate(30 30 35)"/>
                <ellipse cx="30" cy="30" rx="20" ry="12" fill="#15803d" transform="rotate(0 30 30)"/>
              </svg>
            </motion.div>
          );
        }
        // Seagulls flying across
        if (i === 4 || i === 5) {
          return (
            <motion.div
              key={`seagull-${i}`}
              className="absolute pointer-events-none"
              initial={{ x: '-10vw', y: `${15 + i * 8}vh` }}
              animate={{ x: '110vw', y: [`${15 + i * 8}vh`, `${12 + i * 8}vh`, `${18 + i * 8}vh`, `${15 + i * 8}vh`] }}
              transition={{ duration: 12 + i * 2, delay: i * 3, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.7 }}
            >
              <svg width="40" height="20" viewBox="0 0 40 20">
                <motion.path
                  d="M0,15 Q10,5 20,10 Q30,5 40,15"
                  stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"
                  animate={{ d: ["M0,15 Q10,5 20,10 Q30,5 40,15", "M0,10 Q10,15 20,10 Q30,15 40,10", "M0,15 Q10,5 20,10 Q30,5 40,15"] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              </svg>
            </motion.div>
          );
        }
        // Beach balls bouncing
        const ballColors = ['#ff6b6b', '#ffd93d', '#4ecdc4', '#ff8a5b'];
        const ballX = 20 + (i * 15) % 60;
        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            initial={{ x: `${ballX}vw`, y: '75vh' }}
            animate={{ 
              y: ['75vh', '55vh', '75vh'],
              x: [`${ballX}vw`, `${ballX + 5}vw`, `${ballX}vw`],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 2 + (i % 3), delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ opacity: 0.8 }}
          >
            <div 
              className="rounded-full"
              style={{ 
                width: 35, height: 35,
                background: `conic-gradient(${ballColors[i % 4]}, white, ${ballColors[(i+1) % 4]}, white, ${ballColors[i % 4]})`,
                boxShadow: '2px 2px 8px rgba(0,0,0,0.2)'
              }}
            />
          </motion.div>
        );
      }
      case 'office': {
        // Paper airplanes flying around
        if (i < 4) {
          const planeStartX = -10 + (i * 5);
          const planeY = 20 + (i * 15);
          return (
            <motion.div
              key={`plane-${i}`}
              className="absolute pointer-events-none"
              initial={{ x: `${planeStartX}vw`, y: `${planeY}vh`, rotate: -15 }}
              animate={{ 
                x: ['-10vw', '110vw'],
                y: [`${planeY}vh`, `${planeY - 10}vh`, `${planeY + 5}vh`, `${planeY - 5}vh`],
                rotate: [-15, -20, -10, -15],
              }}
              transition={{ duration: 8 + i * 2, delay: i * 2, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.7 }}
            >
              <svg width="40" height="25" viewBox="0 0 40 25" fill="white">
                <polygon points="0,12 35,5 30,12 35,19" fill="white" stroke="#ccc" strokeWidth="0.5"/>
                <polygon points="25,12 35,0 35,5" fill="#f0f0f0"/>
                <polygon points="25,12 35,25 35,19" fill="#e0e0e0"/>
              </svg>
            </motion.div>
          );
        }
        // Coffee cups with steam
        if (i === 4 || i === 5) {
          const cupX = i === 4 ? 15 : 80;
          return (
            <motion.div
              key={`coffee-${i}`}
              className="absolute pointer-events-none"
              style={{ left: `${cupX}vw`, bottom: '10%' }}
            >
              <svg width="40" height="50" viewBox="0 0 40 50" style={{ opacity: 0.7 }}>
                <rect x="5" y="20" width="25" height="28" rx="3" fill="#8B4513"/>
                <ellipse cx="17" cy="20" rx="12" ry="4" fill="#3d2314"/>
                <path d="M30,25 Q40,25 40,35 Q40,45 30,45" stroke="#8B4513" strokeWidth="3" fill="none"/>
                {/* Steam */}
                <motion.path
                  d="M12,15 Q10,10 12,5 M17,15 Q19,8 17,2 M22,15 Q20,10 22,5"
                  stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"
                  animate={{ opacity: [0.3, 0.7, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </svg>
            </motion.div>
          );
        }
        // Floating sticky notes
        const noteColors = ['#fef08a', '#fcd34d', '#fde68a', '#fef3c7'];
        const noteX = 10 + (i * 12) % 80;
        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            initial={{ x: `${noteX}vw`, y: '90vh', rotate: extraRandom1 }}
            animate={{ 
              y: ['90vh', '-10vh'],
              rotate: [extraRandom1, extraRandom1 + 20, extraRandom1 - 15, extraRandom1],
              x: [`${noteX}vw`, `${noteX + 5}vw`, `${noteX - 3}vw`, `${noteX}vw`],
            }}
            transition={{ duration: duration * 2, delay: delay * 0.5, repeat: Infinity, ease: "easeOut" }}
            style={{ opacity: 0.75 }}
          >
            <div 
              className="rounded-sm shadow-md" 
              style={{ 
                width: 30, height: 30, 
                background: noteColors[i % noteColors.length],
                transform: 'rotate(-5deg)'
              }} 
            />
          </motion.div>
        );
      }
      case 'dogs': {
        // Dog running and chasing a ball
        if (i === 0) {
          return (
            <motion.div
              key="running-dog"
              className="absolute pointer-events-none"
              initial={{ x: '-15vw', y: '70vh' }}
              animate={{ x: ['-15vw', '110vw'] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.8 }}
            >
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 0.3, repeat: Infinity }}>
                <Dog style={{ width: 50, height: 50 }} className="text-amber-600"/>
              </motion.div>
            </motion.div>
          );
        }
        // Ball being chased
        if (i === 1) {
          return (
            <motion.div
              key="dog-ball"
              className="absolute pointer-events-none"
              initial={{ x: '0vw', y: '72vh' }}
              animate={{ x: ['5vw', '120vw'], rotate: [0, 720] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.85 }}
            >
              <div className="w-6 h-6 rounded-full bg-red-500 shadow-md" style={{ background: 'radial-gradient(circle at 30% 30%, #ef4444, #b91c1c)' }}/>
            </motion.div>
          );
        }
        // Bouncing bones
        if (i === 2 || i === 3) {
          const boneX = i === 2 ? 25 : 70;
          return (
            <motion.div
              key={`bone-${i}`}
              className="absolute pointer-events-none"
              style={{ left: `${boneX}vw`, top: '60vh' }}
              animate={{ y: [0, -20, 0], rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="40" height="20" viewBox="0 0 40 20" style={{ opacity: 0.75 }}>
                <ellipse cx="5" cy="5" rx="5" ry="5" fill="#f5f5dc"/>
                <ellipse cx="5" cy="15" rx="5" ry="5" fill="#f5f5dc"/>
                <ellipse cx="35" cy="5" rx="5" ry="5" fill="#f5f5dc"/>
                <ellipse cx="35" cy="15" rx="5" ry="5" fill="#f5f5dc"/>
                <rect x="5" y="7" width="30" height="6" fill="#f5f5dc"/>
              </svg>
            </motion.div>
          );
        }
        // Paw prints appearing and fading
        const pawX = 5 + (i * 10) % 85;
        const pawY = 30 + (i * 8) % 50;
        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{ left: `${pawX}vw`, top: `${pawY}vh` }}
            animate={{ opacity: [0, 0.6, 0.6, 0], scale: [0.5, 1, 1, 0.8] }}
            transition={{ duration: 3, delay: i * 0.8, repeat: Infinity }}
          >
            <svg width="30" height="35" viewBox="0 0 30 35" fill="#d4a574" style={{ opacity: 0.7 }}>
              <ellipse cx="15" cy="25" rx="10" ry="8"/>
              <ellipse cx="7" cy="12" rx="5" ry="6"/>
              <ellipse cx="23" cy="12" rx="5" ry="6"/>
              <ellipse cx="4" cy="22" rx="4" ry="5"/>
              <ellipse cx="26" cy="22" rx="4" ry="5"/>
            </svg>
          </motion.div>
        );
      }
      case 'cats': {
        // Cat chasing a yarn ball
        if (i === 0) {
          return (
            <motion.div
              key="chasing-cat"
              className="absolute pointer-events-none"
              animate={{ 
                x: ['10vw', '80vw', '30vw', '70vw', '10vw'],
                y: ['65vh', '55vh', '70vh', '60vh', '65vh'],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              style={{ opacity: 0.8 }}
            >
              <motion.div animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 0.5, repeat: Infinity }}>
                <Cat style={{ width: 45, height: 45 }} className="text-violet-400"/>
              </motion.div>
            </motion.div>
          );
        }
        // Yarn ball being chased
        if (i === 1) {
          return (
            <motion.div
              key="yarn-ball"
              className="absolute pointer-events-none"
              animate={{ 
                x: ['15vw', '85vw', '35vw', '75vw', '15vw'],
                y: ['63vh', '53vh', '68vh', '58vh', '63vh'],
                rotate: [0, 360, 720, 1080, 1440],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              style={{ opacity: 0.85 }}
            >
              <div className="w-8 h-8 rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, #f472b6, #be185d)', boxShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                <div className="absolute w-1 h-6 bg-pink-300 rounded-full" style={{ top: '100%', left: '40%', transform: 'rotate(20deg)' }}/>
              </div>
            </motion.div>
          );
        }
        // Fish swimming across
        if (i === 2 || i === 3) {
          const fishY = i === 2 ? 25 : 40;
          return (
            <motion.div
              key={`fish-${i}`}
              className="absolute pointer-events-none"
              initial={{ x: i === 2 ? '-10vw' : '110vw', y: `${fishY}vh` }}
              animate={{ x: i === 2 ? '110vw' : '-10vw' }}
              transition={{ duration: 15, delay: i * 3, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.6, transform: i === 3 ? 'scaleX(-1)' : 'none' }}
            >
              <svg width="35" height="25" viewBox="0 0 35 25" fill="#f97316">
                <ellipse cx="15" cy="12" rx="12" ry="8"/>
                <polygon points="25,12 35,5 35,20"/>
                <circle cx="8" cy="10" r="2" fill="white"/>
                <circle cx="8" cy="10" r="1" fill="black"/>
              </svg>
            </motion.div>
          );
        }
        // Paw prints appearing
        const pawX = 10 + (i * 12) % 80;
        const pawY = 20 + (i * 10) % 60;
        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{ left: `${pawX}vw`, top: `${pawY}vh` }}
            animate={{ opacity: [0, 0.5, 0.5, 0], scale: [0.6, 1, 1, 0.7] }}
            transition={{ duration: 2.5, delay: i * 0.6, repeat: Infinity }}
          >
            <svg width="25" height="30" viewBox="0 0 25 30" fill="#c4b5fd" style={{ opacity: 0.7 }}>
              <ellipse cx="12" cy="22" rx="8" ry="6"/>
              <ellipse cx="6" cy="10" rx="4" ry="5"/>
              <ellipse cx="18" cy="10" rx="4" ry="5"/>
              <ellipse cx="3" cy="18" rx="3" ry="4"/>
              <ellipse cx="21" cy="18" rx="3" ry="4"/>
            </svg>
          </motion.div>
        );
      }
      case 'space': {
        // Rocket flying across
        if (i === 0) {
          return (
            <motion.div
              key="rocket"
              className="absolute pointer-events-none"
              initial={{ x: '-10vw', y: '80vh', rotate: -45 }}
              animate={{ x: '110vw', y: '-10vh' }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
              style={{ opacity: 0.85 }}
            >
              <svg width="50" height="80" viewBox="0 0 50 80" style={{ transform: 'rotate(45deg)' }}>
                <ellipse cx="25" cy="30" rx="12" ry="25" fill="#e2e8f0"/>
                <ellipse cx="25" cy="25" rx="8" ry="15" fill="#94a3b8"/>
                <circle cx="25" cy="20" r="5" fill="#3b82f6"/>
                <polygon points="13,50 25,55 37,50 25,80" fill="#ef4444"/>
                <polygon points="10,45 13,55 20,45" fill="#64748b"/>
                <polygon points="40,45 37,55 30,45" fill="#64748b"/>
                {/* Fire trail */}
                <motion.ellipse
                  cx="25" cy="70" rx="6" ry="10"
                  fill="#fbbf24"
                  animate={{ ry: [10, 15, 10], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 0.2, repeat: Infinity }}
                />
              </svg>
            </motion.div>
          );
        }
        // Planets orbiting
        if (i === 1 || i === 2) {
          const planetColors = ['#a855f7', '#3b82f6'];
          const orbitRadius = i === 1 ? 80 : 120;
          return (
            <motion.div
              key={`planet-${i}`}
              className="absolute pointer-events-none"
              style={{ left: '50%', top: '50%' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20 + i * 10, repeat: Infinity, ease: "linear" }}
            >
              <div 
                className="rounded-full shadow-lg"
                style={{ 
                  width: 25 + i * 10, height: 25 + i * 10,
                  background: `radial-gradient(circle at 30% 30%, ${planetColors[i-1]}, #1e1b4b)`,
                  position: 'absolute',
                  left: orbitRadius, top: 0,
                  opacity: 0.7
                }}
              />
            </motion.div>
          );
        }
        // Shooting stars
        if (i === 3 || i === 4) {
          const starStartX = 20 + (i * 30);
          return (
            <motion.div
              key={`shooting-star-${i}`}
              className="absolute pointer-events-none"
              initial={{ x: `${starStartX}vw`, y: '10vh', opacity: 0 }}
              animate={{ x: `${starStartX + 30}vw`, y: '60vh', opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.5, delay: i * 4, repeat: Infinity, ease: "easeIn" }}
            >
              <div className="w-2 h-2 rounded-full bg-white shadow-lg" style={{ boxShadow: '0 0 10px 3px white' }}/>
              <div className="absolute w-20 h-0.5 bg-gradient-to-l from-white to-transparent" style={{ right: '100%', top: '25%' }}/>
            </motion.div>
          );
        }
        // Floating astronaut
        if (i === 5) {
          return (
            <motion.div
              key="astronaut"
              className="absolute pointer-events-none"
              animate={{ 
                x: ['20vw', '30vw', '25vw', '20vw'],
                y: ['30vh', '35vh', '25vh', '30vh'],
                rotate: [0, 10, -10, 0],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              style={{ opacity: 0.75 }}
            >
              <svg width="40" height="50" viewBox="0 0 40 50">
                <ellipse cx="20" cy="15" rx="12" ry="12" fill="white"/>
                <rect x="10" y="25" width="20" height="18" rx="5" fill="white"/>
                <ellipse cx="20" cy="14" rx="8" ry="8" fill="#0ea5e9"/>
                <rect x="5" y="28" width="8" height="12" rx="3" fill="white"/>
                <rect x="27" y="28" width="8" height="12" rx="3" fill="white"/>
                <rect x="12" y="42" width="6" height="8" rx="2" fill="white"/>
                <rect x="22" y="42" width="6" height="8" rx="2" fill="white"/>
              </svg>
            </motion.div>
          );
        }
        // Twinkling stars
        const starX = 5 + (i * 9) % 90;
        const starY = 5 + (i * 11) % 85;
        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{ left: `${starX}vw`, top: `${starY}vh` }}
            animate={{ scale: [0.5, 1, 0.5], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5 + (i % 3) * 0.5, delay: i * 0.3, repeat: Infinity }}
          >
            <Star style={{ width: 12 + (i % 3) * 4, height: 12 + (i % 3) * 4 }} className="text-yellow-200 fill-yellow-200"/>
          </motion.div>
        );
      }
      case 'music': {
        // Dancing stick figure
        if (i === 0) {
          return (
            <motion.div
              key="dancer"
              className="absolute pointer-events-none"
              style={{ left: '50%', bottom: '15%', transform: 'translateX(-50%)' }}
            >
              <motion.svg 
                width="50" height="80" viewBox="0 0 50 80" fill="white"
                animate={{ x: [-5, 5, -5] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ opacity: 0.7 }}
              >
                <circle cx="25" cy="10" r="8"/>
                <motion.line 
                  x1="25" y1="18" x2="25" y2="45" stroke="white" strokeWidth="3"
                  animate={{ x2: [25, 27, 23, 25] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
                <motion.line 
                  x1="25" y1="25" x2="10" y2="35" stroke="white" strokeWidth="3" strokeLinecap="round"
                  animate={{ x2: [10, 5, 15, 10], y2: [35, 30, 40, 35] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
                <motion.line 
                  x1="25" y1="25" x2="40" y2="35" stroke="white" strokeWidth="3" strokeLinecap="round"
                  animate={{ x2: [40, 45, 35, 40], y2: [35, 40, 30, 35] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
                <motion.line 
                  x1="25" y1="45" x2="15" y2="70" stroke="white" strokeWidth="3" strokeLinecap="round"
                  animate={{ x2: [15, 10, 20, 15] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
                <motion.line 
                  x1="25" y1="45" x2="35" y2="70" stroke="white" strokeWidth="3" strokeLinecap="round"
                  animate={{ x2: [35, 40, 30, 35] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              </motion.svg>
            </motion.div>
          );
        }
        // Bouncing music notes
        const noteX = 10 + (i * 12) % 80;
        const noteY = 20 + (i * 8) % 50;
        const noteColors = ['#f472b6', '#a855f7', '#ec4899', '#8b5cf6', '#f43f5e'];
        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{ left: `${noteX}vw`, top: `${noteY}vh` }}
            animate={{ 
              y: [0, -20, 0, -15, 0],
              x: [0, 5, -5, 3, 0],
              rotate: [-10, 10, -10],
              scale: [1, 1.2, 1, 1.1, 1],
            }}
            transition={{ duration: 2 + (i % 3) * 0.5, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="30" height="40" viewBox="0 0 30 40" fill={noteColors[i % noteColors.length]} style={{ opacity: 0.75 }}>
              <ellipse cx="8" cy="32" rx="7" ry="5" transform="rotate(-20 8 32)"/>
              <rect x="13" y="5" width="3" height="28"/>
              <path d="M16,5 Q25,8 25,15 Q25,22 16,18" fill={noteColors[i % noteColors.length]}/>
            </svg>
          </motion.div>
        );
      }
      case 'nature': {
        // Birds flying across
        if (i === 0 || i === 1) {
          const birdY = i === 0 ? 15 : 25;
          return (
            <motion.div
              key={`bird-${i}`}
              className="absolute pointer-events-none"
              initial={{ x: '-10vw', y: `${birdY}vh` }}
              animate={{ x: '110vw', y: [`${birdY}vh`, `${birdY - 5}vh`, `${birdY + 3}vh`, `${birdY}vh`] }}
              transition={{ duration: 12 + i * 4, delay: i * 5, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.7 }}
            >
              <motion.svg width="35" height="20" viewBox="0 0 35 20">
                <motion.path
                  d="M0,12 Q8,4 17,10 Q26,4 35,12"
                  stroke="#60a5fa" strokeWidth="3" fill="none" strokeLinecap="round"
                  animate={{ d: ["M0,12 Q8,4 17,10 Q26,4 35,12", "M0,8 Q8,14 17,10 Q26,14 35,8", "M0,12 Q8,4 17,10 Q26,4 35,12"] }}
                  transition={{ duration: 0.4, repeat: Infinity }}
                />
              </motion.svg>
            </motion.div>
          );
        }
        // Butterflies fluttering
        if (i === 2 || i === 3) {
          const butterflyX = i === 2 ? 25 : 65;
          const butterflyY = i === 2 ? 35 : 50;
          const wingColors = i === 2 ? '#f472b6' : '#fbbf24';
          return (
            <motion.div
              key={`butterfly-${i}`}
              className="absolute pointer-events-none"
              animate={{ 
                x: [`${butterflyX}vw`, `${butterflyX + 15}vw`, `${butterflyX - 10}vw`, `${butterflyX}vw`],
                y: [`${butterflyY}vh`, `${butterflyY - 10}vh`, `${butterflyY + 5}vh`, `${butterflyY}vh`],
              }}
              transition={{ duration: 8, delay: i * 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ opacity: 0.75 }}
            >
              <motion.svg width="30" height="25" viewBox="0 0 30 25">
                <motion.ellipse cx="8" cy="12" rx="7" ry="10" fill={wingColors}
                  animate={{ rx: [7, 2, 7] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                />
                <motion.ellipse cx="22" cy="12" rx="7" ry="10" fill={wingColors}
                  animate={{ rx: [7, 2, 7] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                />
                <ellipse cx="15" cy="12" rx="2" ry="8" fill="#374151"/>
              </motion.svg>
            </motion.div>
          );
        }
        // Flowers blooming at the bottom
        if (i === 4 || i === 5) {
          const flowerX = i === 4 ? 20 : 75;
          const petalColors = i === 4 ? '#f472b6' : '#fbbf24';
          return (
            <motion.div
              key={`flower-${i}`}
              className="absolute pointer-events-none"
              style={{ left: `${flowerX}vw`, bottom: '5%' }}
            >
              <motion.svg 
                width="40" height="60" viewBox="0 0 40 60"
                animate={{ rotate: [-3, 3, -3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{ opacity: 0.75, transformOrigin: 'bottom center' }}
              >
                <rect x="18" y="25" width="4" height="35" fill="#22c55e"/>
                <motion.g animate={{ scale: [0.9, 1.1, 0.9] }} transition={{ duration: 4, repeat: Infinity }}>
                  {[0, 72, 144, 216, 288].map((angle, idx) => (
                    <ellipse key={idx} cx="20" cy="8" rx="8" ry="12" fill={petalColors} transform={`rotate(${angle} 20 20)`}/>
                  ))}
                  <circle cx="20" cy="20" r="6" fill="#fbbf24"/>
                </motion.g>
              </motion.svg>
            </motion.div>
          );
        }
        // Falling leaves
        const leafX = 10 + (i * 12) % 80;
        const leafColors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            initial={{ x: `${leafX}vw`, y: '-5vh', rotate: 0 }}
            animate={{ 
              y: '105vh',
              x: [`${leafX}vw`, `${leafX + 10}vw`, `${leafX - 5}vw`, `${leafX + 8}vw`],
              rotate: [0, 180, 360, 540, 720],
            }}
            transition={{ duration: duration * 2, delay: delay * 0.5, repeat: Infinity, ease: "linear" }}
            style={{ opacity: 0.7 }}
          >
            <svg width="20" height="25" viewBox="0 0 20 25" fill={leafColors[i % leafColors.length]}>
              <path d="M10,0 Q20,10 10,25 Q0,10 10,0"/>
              <line x1="10" y1="5" x2="10" y2="22" stroke={leafColors[i % leafColors.length]} strokeWidth="1" opacity="0.5"/>
            </svg>
          </motion.div>
        );
      }
      default: {
        return (
          <motion.div
            key={i}
            className="absolute pointer-events-none text-white"
            initial={{ x: `${startX}vw`, y: `${startY}vh`, scale: 0 }}
            animate={{ 
              y: `${endY}vh`,
              scale: [0, 1, 1, 0],
              rotate: [0, 360],
            }}
            transition={{ duration, delay, repeat: Infinity }}
            style={{ opacity }}
          >
            <Sparkles style={{ width: size, height: size }} />
          </motion.div>
        );
      }
    }
  });
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {elements}
    </div>
  );
};

export default function Blitzgrid() {
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  
  // View state
  const [selectedGridId, setSelectedGridId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [playMode, setPlayMode] = useState(false);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Play timer sound using Web Audio API
  const playTimerSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a sequence of beeps for a "time's up" sound
      const playBeep = (startTime: number, frequency: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      // Three ascending beeps
      playBeep(now, 440, 0.15);
      playBeep(now + 0.2, 554, 0.15);
      playBeep(now + 0.4, 659, 0.3);
    } catch (e) {
      console.log('Could not play timer sound');
    }
  }, []);
  
  // Timer countdown effect
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerIntervalRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timerActive && timeLeft === 0) {
      playTimerSound();
      setTimerActive(false);
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearTimeout(timerIntervalRef.current);
      }
    };
  }, [timerActive, timeLeft, playTimerSound]);
  
  // Reset timer when question changes
  useEffect(() => {
    setTimerActive(false);
    setTimeLeft(10);
  }, [activeQuestion?.id]);
  
  // Multiplayer state
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [buzzerLocked, setBuzzerLocked] = useState(true);
  const [buzzQueue, setBuzzQueue] = useState<Array<{ playerId: string; name: string; position: number; time: number }>>([]);
  const [isJudging, setIsJudging] = useState(false);
  const [lastJoinedPlayer, setLastJoinedPlayer] = useState<{ name: string; avatar?: string } | null>(null);
  const [lastScoreChange, setLastScoreChange] = useState<{ playerId: string; playerName: string; points: number } | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverPhase, setGameOverPhase] = useState(0);
  const [gridPickerMode, setGridPickerMode] = useState(false);
  const gameOverTimers = useRef<NodeJS.Timeout[]>([]);
  const joinNotificationTimer = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnect = useRef(true);
  
  // Persist room session in localStorage
  const getStoredSession = useCallback(() => {
    try {
      const data = localStorage.getItem('blitzgrid-host-session');
      if (data) {
        const parsed = JSON.parse(data);
        // Check if session is less than 4 hours old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 4 * 60 * 60 * 1000) {
          return parsed;
        }
        localStorage.removeItem('blitzgrid-host-session');
      }
    } catch {}
    return null;
  }, []);
  
  const storeSession = useCallback((code: string, sessionId?: number) => {
    try {
      localStorage.setItem('blitzgrid-host-session', JSON.stringify({
        code,
        sessionId,
        timestamp: Date.now(),
      }));
    } catch {}
  }, []);
  
  const clearStoredSession = useCallback(() => {
    try {
      localStorage.removeItem('blitzgrid-host-session');
    } catch {}
  }, []);
  
  // Form state
  const [showNewGridForm, setShowNewGridForm] = useState(false);
  const [newGridName, setNewGridName] = useState("");
  const [newGridTheme, setNewGridTheme] = useState("birthday");
  const [editingGridId, setEditingGridId] = useState<number | null>(null);
  const [editGridName, setEditGridName] = useState("");
  const [deleteGridId, setDeleteGridId] = useState<number | null>(null);
  
  // Question form state (keyed by "categoryId-points")
  const [questionForms, setQuestionForms] = useState<Record<string, { 
    question: string; 
    correctAnswer: string; 
    options: string[];
  }>>({});
  
  // New category form state
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  // Fetch all grids for current user
  const { data: grids = [], isLoading: loadingGrids } = useQuery<GridWithStats[]>({
    queryKey: ['/api/blitzgrid/grids'],
    enabled: isAuthenticated,
  });

  // Fetch categories for selected grid
  const { data: gridCategories = [], isLoading: loadingCategories } = useQuery<CategoryWithQuestions[]>({
    queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'],
    enabled: !!selectedGridId,
  });


  // Create grid mutation
  const createGridMutation = useMutation({
    mutationFn: async ({ name, theme }: { name: string; theme: string }) => {
      return apiRequest('POST', '/api/blitzgrid/grids', { name, theme });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewGridName("");
      setNewGridTheme("birthday");
      setShowNewGridForm(false);
      toast({ title: "Grid created" });
    },
    onError: () => {
      toast({ title: "Couldn't create grid", variant: "destructive" });
    },
  });

  // Update grid mutation
  const updateGridMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest('PATCH', `/api/blitzgrid/grids/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setEditingGridId(null);
      toast({ title: "Grid updated" });
    },
    onError: () => {
      toast({ title: "Couldn't update grid", variant: "destructive" });
    },
  });

  // Delete grid mutation
  const deleteGridMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/blitzgrid/grids/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setDeleteGridId(null);
      if (selectedGridId === deleteGridId) {
        setSelectedGridId(null);
      }
      toast({ title: "Grid deleted" });
    },
    onError: () => {
      toast({ title: "Couldn't delete grid", variant: "destructive" });
    },
  });

  // Add category to grid mutation
  const addCategoryMutation = useMutation({
    mutationFn: async ({ gridId, categoryId }: { gridId: number; categoryId: number }) => {
      return apiRequest('POST', `/api/blitzgrid/grids/${gridId}/categories`, { categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Category added" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't add category", variant: "destructive" });
    },
  });

  // Remove category from grid mutation
  const removeCategoryMutation = useMutation({
    mutationFn: async ({ gridId, categoryId }: { gridId: number; categoryId: number }) => {
      return apiRequest('DELETE', `/api/blitzgrid/grids/${gridId}/categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Category removed" });
    },
    onError: () => {
      toast({ title: "Couldn't remove category", variant: "destructive" });
    },
  });

  // Create new category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async ({ gridId, name, description }: { gridId: number; name: string; description?: string }) => {
      return apiRequest('POST', `/api/blitzgrid/grids/${gridId}/categories/create`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowNewCategoryForm(false);
      toast({ title: "Category created" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't create category", variant: "destructive" });
    },
  });

  // Save question mutation
  const saveQuestionMutation = useMutation({
    mutationFn: async ({ categoryId, points, question, correctAnswer, options }: { 
      categoryId: number; 
      points: number; 
      question: string; 
      correctAnswer: string;
      options: string[];
    }) => {
      return apiRequest('POST', `/api/blitzgrid/categories/${categoryId}/questions`, { 
        points, question, correctAnswer, options 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      setQuestionForms(prev => {
        const newForms = { ...prev };
        delete newForms[variables.points];
        return newForms;
      });
      toast({ title: "Question saved" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Couldn't save question", variant: "destructive" });
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return apiRequest('DELETE', `/api/blitzgrid/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids', selectedGridId, 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/blitzgrid/grids'] });
      toast({ title: "Question deleted" });
    },
    onError: () => {
      toast({ title: "Couldn't delete question", variant: "destructive" });
    },
  });

  // WebSocket connection for multiplayer with auto-reconnect
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Clear any pending reconnect
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setWsConnected(true);
      reconnectAttempts.current = 0;
      
      // Check if we have a stored session to rejoin
      const storedSession = getStoredSession();
      if (storedSession?.code) {
        ws.send(JSON.stringify({ type: 'host:join', code: storedSession.code }));
      } else {
        ws.send(JSON.stringify({ type: 'host:create' }));
      }
      
      // Start ping interval to keep connection alive
      if (pingInterval.current) clearInterval(pingInterval.current);
      pingInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000); // Ping every 25 seconds
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'room:created':
            setRoomCode(data.code);
            storeSession(data.code, data.sessionId);
            break;
          case 'room:joined':
            setRoomCode(data.code);
            storeSession(data.code, data.sessionId);
            if (data.players) {
              setPlayers(data.players.map((p: any) => ({ 
                ...p, 
                connected: p.connected ?? p.isConnected ?? true 
              })));
            }
            if (data.buzzerLocked !== undefined) {
              setBuzzerLocked(data.buzzerLocked);
            }
            if (data.buzzQueue) {
              setBuzzQueue(data.buzzQueue.map((b: any) => ({
                playerId: b.playerId,
                name: b.playerName,
                position: b.position,
                time: b.timestamp,
              })));
            }
            break;
          case 'room:notFound':
            // Stored session is stale, create new room
            clearStoredSession();
            ws.send(JSON.stringify({ type: 'host:create' }));
            break;
          case 'room:closed':
            clearStoredSession();
            setRoomCode(null);
            setPlayers([]);
            break;
          case 'player:joined':
            if (data.player) {
              setPlayers(prev => {
                const exists = prev.some(p => p.id === data.player.id);
                if (exists) {
                  return prev.map(p => p.id === data.player.id ? { ...data.player, connected: true } : p);
                }
                return [...prev, { ...data.player, connected: true }];
              });
              // Show join notification (clear any existing timer first)
              if (joinNotificationTimer.current) {
                clearTimeout(joinNotificationTimer.current);
              }
              setLastJoinedPlayer({ name: data.player.name, avatar: data.player.avatar });
              joinNotificationTimer.current = setTimeout(() => setLastJoinedPlayer(null), 3000);
            }
            break;
          case 'player:reconnected':
            if (data.player) {
              setPlayers(prev => prev.map(p => 
                p.id === data.player.id ? { ...data.player, connected: true } : p
              ));
            }
            break;
          case 'player:left':
            setPlayers(prev => prev.filter(p => p.id !== data.playerId));
            setBuzzQueue(prev => prev.filter(b => b.playerId !== data.playerId));
            break;
          case 'player:disconnected':
            setPlayers(prev => prev.map(p => 
              p.id === data.playerId ? { ...p, connected: false } : p
            ));
            setBuzzQueue(prev => prev.filter(b => b.playerId !== data.playerId));
            break;
          case 'score:updated':
            setPlayers(prev => prev.map(p => 
              p.id === data.playerId ? { ...p, score: data.score } : p
            ));
            break;
          case 'buzzer:locked':
            setBuzzerLocked(true);
            break;
          case 'buzzer:unlocked':
            setBuzzerLocked(false);
            setBuzzQueue([]);
            break;
          case 'player:buzzed':
            // Collect all buzzes - don't auto-lock
            setBuzzQueue(prev => [...prev, {
              playerId: data.playerId,
              name: data.playerName,
              position: data.position,
              time: data.timestamp
            }]);
            break;
          case 'buzzer:reset':
            setBuzzQueue([]);
            break;
          case 'pong':
            // Heartbeat response received
            break;
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    };
    
    ws.onclose = () => {
      setWsConnected(false);
      setIsJudging(false);
      if (pingInterval.current) {
        clearInterval(pingInterval.current);
        pingInterval.current = null;
      }
      
      // Auto-reconnect with exponential backoff if we should reconnect
      if (shouldReconnect.current && reconnectAttempts.current < 10) {
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      }
    };
    
    ws.onerror = () => {
      setWsConnected(false);
      setIsJudging(false);
    };
  }, [getStoredSession, storeSession, clearStoredSession]);
  
  const disconnectWebSocket = useCallback((clearSession = false) => {
    shouldReconnect.current = false;
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
    
    if (clearSession) {
      clearStoredSession();
      setRoomCode(null);
      setPlayers([]);
    }
  }, [clearStoredSession]);
  
  const updatePlayerScore = useCallback((playerId: string, points: number, trackForUndo = true) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'host:updateScore',
        playerId,
        points
      }));
      if (trackForUndo) {
        const player = players.find(p => p.id === playerId);
        setLastScoreChange({ playerId, playerName: player?.name || 'Player', points });
      }
    }
  }, [players]);

  const undoLastScore = useCallback(() => {
    if (lastScoreChange) {
      updatePlayerScore(lastScoreChange.playerId, -lastScoreChange.points, false);
      toast({
        title: "Undo successful",
        description: `Reversed ${lastScoreChange.points > 0 ? '+' : ''}${lastScoreChange.points} for ${lastScoreChange.playerName}`,
      });
      setLastScoreChange(null);
    }
  }, [lastScoreChange, updatePlayerScore, toast]);

  const sendFeedback = useCallback((playerId: string, correct: boolean, points: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'host:feedback',
        playerId,
        correct,
        points
      }));
    }
  }, []);

  const lockBuzzer = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:lock' }));
    }
    setBuzzerLocked(true);
    setBuzzQueue([]);
  }, []);
  
  const unlockBuzzer = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:unlock' }));
      setBuzzerLocked(false);
      setBuzzQueue([]);
      setIsJudging(false);
    }
  }, []);
  
  const resetBuzzers = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:reset' }));
      setBuzzQueue([]);
    }
  }, []);
  
  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:closeRoom' }));
    }
    disconnectWebSocket(true);
    clearStoredSession();
    setRoomCode(null);
    setPlayers([]);
    setBuzzQueue([]);
    setBuzzerLocked(true);
    setPlayMode(false);
    setSelectedGridId(null);
    setLastScoreChange(null);
    toast({ title: "Session ended", description: "All players have been disconnected." });
  }, [clearStoredSession, disconnectWebSocket, toast]);
  
  // Fire celebratory confetti
  const fireConfetti = useCallback(() => {
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    
    // Multiple bursts
    confetti({ ...defaults, particleCount: 80, origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.2, 0.4) }, colors: ['#22c55e', '#16a34a', '#FFD700', '#FFA500'] });
    setTimeout(() => {
      confetti({ ...defaults, particleCount: 80, origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.2, 0.4) }, colors: ['#22c55e', '#16a34a', '#FFD700', '#FFA500'] });
    }, 200);
    setTimeout(() => {
      confetti({ ...defaults, particleCount: 120, origin: { x: 0.5, y: 0.3 }, colors: ['#FFD700', '#FFFFFF', '#22c55e', '#4ADEBC'] });
    }, 400);
    setTimeout(() => {
      confetti({ particleCount: 50, spread: 100, origin: { x: 0.5, y: 0.5 }, shapes: ['star'], colors: ['#FFD700', '#FFA500'], scalar: 1.5 });
    }, 600);
  }, []);
  
  // Start the game over reveal animation
  const startGameOverReveal = useCallback(() => {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    if (sortedPlayers.length === 0) {
      endSession();
      return;
    }
    
    // Clear any existing timers
    gameOverTimers.current.forEach(clearTimeout);
    gameOverTimers.current = [];
    
    setShowGameOver(true);
    setGameOverPhase(0);
    
    // Animate phases: 0 → show 4th+ → 3rd → 2nd → drumroll → winner
    const phases = sortedPlayers.length >= 4 ? [500, 2000, 3500, 5000, 6500] : 
                   sortedPlayers.length === 3 ? [500, 2000, 3500, 5000] :
                   sortedPlayers.length === 2 ? [500, 2000, 3500] :
                   [500, 2000];
    
    phases.forEach((delay, i) => {
      const timer = setTimeout(() => {
        setGameOverPhase(i + 1);
        if (i === phases.length - 1) {
          fireConfetti();
        }
      }, delay);
      gameOverTimers.current.push(timer);
    });
  }, [players, endSession, fireConfetti]);
  
  // Close game over and actually end session
  const closeGameOver = useCallback(() => {
    // Clear reveal timers
    gameOverTimers.current.forEach(clearTimeout);
    gameOverTimers.current = [];
    setShowGameOver(false);
    setGameOverPhase(0);
    endSession();
  }, [endSession]);
  
  // Continue to next grid - keep room/players/scores, just reset grid state
  const continueToNextGrid = useCallback(() => {
    // Clear reveal timers
    gameOverTimers.current.forEach(clearTimeout);
    gameOverTimers.current = [];
    setShowGameOver(false);
    setGameOverPhase(0);
    
    // Reset grid-specific state but keep room/players/scores
    setActiveQuestion(null);
    setShowAnswer(false);
    setRevealedCells(new Set());
    setBuzzQueue([]);
    setBuzzerLocked(true);
    setIsJudging(false);
    setSelectedGridId(null);
    setPlayMode(false);
    
    // Enter grid picker mode - room stays open
    setGridPickerMode(true);
    
    // Notify players that host is picking next grid
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'host:pickingNextGrid' }));
    }
  }, []);
  
  // Auto-connect when entering play mode or grid picker mode (keep room alive)
  useEffect(() => {
    if (playMode || gridPickerMode) {
      shouldReconnect.current = true;
      connectWebSocket();
    } else {
      // Only disconnect when completely leaving both modes
      disconnectWebSocket(false);
    }
    return () => {
      // Don't clear session on unmount - allow reconnection on refresh
      disconnectWebSocket(false);
      if (joinNotificationTimer.current) {
        clearTimeout(joinNotificationTimer.current);
      }
      // Clear game over timers on unmount
      gameOverTimers.current.forEach(clearTimeout);
      gameOverTimers.current = [];
    };
  }, [playMode, gridPickerMode, connectWebSocket, disconnectWebSocket]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Blitzgrid" backHref="/" showAdminButton adminHref="/admin/games" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  // Grid detail view with inline categories and questions
  if (selectedGridId) {
    const grid = grids.find(g => g.id === selectedGridId);
    
    // GAMEPLAY MODE
    if (playMode && grid?.isActive) {
      const handleCellClick = (categoryId: number, points: number, question: Question) => {
        const cellKey = `${categoryId}-${points}`;
        if (!revealedCells.has(cellKey)) {
          setActiveQuestion(question);
          setShowAnswer(false);
          // Auto-unlock buzzers when opening a question
          unlockBuzzer();
        }
      };
      
      const handleRevealAnswer = () => {
        setShowAnswer(true);
        if (activeQuestion) {
          const cat = gridCategories.find(c => c.questions?.some(q => q.id === activeQuestion.id));
          if (cat) {
            const cellKey = `${cat.id}-${activeQuestion.points}`;
            setRevealedCells(prev => {
              const newSet = new Set(Array.from(prev));
              newSet.add(cellKey);
              return newSet;
            });
          }
        }
      };
      
      const handleCloseQuestion = () => {
        setActiveQuestion(null);
        setShowAnswer(false);
        lockBuzzer();
        setIsJudging(false);
        setLastScoreChange(null);
      };
      
      const resetGame = () => {
        setRevealedCells(new Set());
        toast({ title: "Game reset! All questions available again." });
      };
      
      const joinUrl = roomCode 
        ? `${window.location.origin}/play?code=${roomCode}` 
        : `${window.location.origin}/play`;
      
      // Sort players for podium display
      const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
      const winner = sortedPlayers[0];
      const runnerUp = sortedPlayers[1];
      const thirdPlace = sortedPlayers[2];
      const restOfPlayers = sortedPlayers.slice(3);
      
      // Phase thresholds based on player count
      const winnerPhase = sortedPlayers.length >= 4 ? 5 : sortedPlayers.length === 3 ? 4 : sortedPlayers.length === 2 ? 3 : 2;
      const secondPhase = sortedPlayers.length >= 4 ? 4 : sortedPlayers.length === 3 ? 3 : 2;
      const thirdPhase = sortedPlayers.length >= 4 ? 3 : 2;
      const restPhase = 2;
      
      // Get theme from grid
      const gridThemeId = grid.theme?.replace('blitzgrid:', '') || 'birthday';
      const currentTheme = GRID_THEMES.find(t => t.id === gridThemeId) || GRID_THEMES[0];
      
      return (
        <div className="h-screen overflow-hidden flex flex-col relative" style={{ background: currentTheme.background }} data-testid="page-blitzgrid-play">
          
          {/* Animated theme elements */}
          <ThemeElements themeId={gridThemeId} />
          
          {/* Game Over Reveal Overlay */}
          <AnimatePresence>
            {showGameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: currentTheme.background }}
              >
                <div className="text-center p-4 md:p-8 max-w-4xl w-full mx-4">
                  {/* Title */}
                  <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                  >
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Final Scores</h2>
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <span className="text-white/60">Who takes the crown?</span>
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                    </div>
                  </motion.div>

                  {/* 3D Podium */}
                  <div className="relative flex items-end justify-center gap-2 md:gap-4 mb-8 h-[320px] md:h-[380px]">
                    {/* 2nd Place - Left */}
                    <AnimatePresence>
                      {gameOverPhase >= secondPhase && runnerUp && (
                        <motion.div
                          initial={{ y: 100, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 100, damping: 15 }}
                          className="flex flex-col items-center"
                        >
                          {/* Player floating above podium */}
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="mb-1">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg border-4 border-gray-300 bg-gradient-to-br from-slate-500 to-slate-700">
                              {PLAYER_AVATARS.find(a => a.id === runnerUp.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                            </div>
                          </motion.div>
                          {/* Podium with name plate */}
                          <div className="w-24 md:w-32 h-28 md:h-36 bg-gradient-to-b from-gray-400 to-gray-600 rounded-t-lg flex flex-col items-center justify-between shadow-xl border-t-4 border-gray-300 pt-2 pb-3">
                            {/* Name plate */}
                            <div className="bg-white/90 px-2 py-0.5 rounded shadow-sm">
                              <div className="text-gray-800 font-bold text-xs md:text-sm truncate max-w-[80px] md:max-w-[110px]" data-testid="text-2nd-place-name">
                                {runnerUp.name}
                              </div>
                            </div>
                            <div className="text-2xl md:text-3xl font-black text-white drop-shadow" data-testid="text-2nd-place-score">
                              {runnerUp.score} pts
                            </div>
                            <div className="flex items-center">
                              <Medal className="w-6 h-6 text-white/80 mr-1" />
                              <span className="text-3xl md:text-4xl font-black text-white/80">2</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 1st Place - Center (elevated) */}
                    <AnimatePresence>
                      {gameOverPhase >= winnerPhase && winner && (
                        <motion.div
                          initial={{ y: 150, opacity: 0, scale: 0.5 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 80, damping: 12 }}
                          className="flex flex-col items-center relative z-10"
                        >
                          {/* Winner Spotlight Glow */}
                          <motion.div
                            className="absolute -inset-8 rounded-full"
                            animate={{ boxShadow: ["0 0 40px 10px rgba(255, 215, 0, 0.3)", "0 0 60px 20px rgba(255, 215, 0, 0.5)", "0 0 40px 10px rgba(255, 215, 0, 0.3)"] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                          
                          {/* Crown */}
                          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                            <Crown className="w-10 h-10 md:w-12 md:h-12 text-yellow-400 mx-auto drop-shadow-lg" />
                          </motion.div>
                          
                          {/* Player floating above podium */}
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="relative mb-1">
                            <motion.div
                              className="absolute inset-0 rounded-full border-4 border-yellow-400"
                              animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <div className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-4xl md:text-5xl shadow-2xl border-4 border-yellow-400 relative z-10 bg-gradient-to-br from-emerald-500 to-emerald-700">
                              {PLAYER_AVATARS.find(a => a.id === winner.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                            </div>
                          </motion.div>
                          
                          {/* Grand Podium with name plate */}
                          <div className="w-28 md:w-40 h-44 md:h-56 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-700 rounded-t-lg flex flex-col items-center justify-between shadow-2xl border-t-4 border-yellow-300 pt-2 pb-4">
                            {/* Name plate */}
                            <div className="bg-white px-3 py-1 rounded shadow-md">
                              <div className="text-yellow-900 font-black text-sm md:text-base truncate max-w-[90px] md:max-w-[130px]" data-testid="text-winner-name">
                                {winner.name}
                              </div>
                            </div>
                            <motion.div 
                              className="text-3xl md:text-4xl font-black text-yellow-900 drop-shadow"
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                              data-testid="text-winner-score"
                            >
                              {winner.score} pts
                            </motion.div>
                            <div className="flex flex-col items-center">
                              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-900 mb-1" />
                              <span className="text-5xl md:text-6xl font-black text-yellow-900">1</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 3rd Place - Right */}
                    <AnimatePresence>
                      {gameOverPhase >= thirdPhase && thirdPlace && (
                        <motion.div
                          initial={{ y: 100, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 100, damping: 15 }}
                          className="flex flex-col items-center"
                        >
                          {/* Player floating above podium */}
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="mb-1">
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-3xl shadow-lg border-4 border-amber-600 bg-gradient-to-br from-amber-700 to-amber-900">
                              {PLAYER_AVATARS.find(a => a.id === thirdPlace.avatar)?.emoji || PLAYER_AVATARS[0].emoji}
                            </div>
                          </motion.div>
                          {/* Podium with name plate */}
                          <div className="w-20 md:w-28 h-20 md:h-24 bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-lg flex flex-col items-center justify-between shadow-xl border-t-4 border-amber-500 pt-1 pb-2">
                            {/* Name plate */}
                            <div className="bg-white/90 px-2 py-0.5 rounded shadow-sm">
                              <div className="text-amber-900 font-bold text-xs truncate max-w-[70px] md:max-w-[100px]" data-testid="text-3rd-place-name">
                                {thirdPlace.name}
                              </div>
                            </div>
                            <div className="text-lg md:text-xl font-black text-white drop-shadow" data-testid="text-3rd-place-score">
                              {thirdPlace.score} pts
                            </div>
                            <span className="text-2xl md:text-3xl font-black text-white/80">3</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Drumroll Phase */}
                    <AnimatePresence>
                      {gameOverPhase === winnerPhase - 1 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        >
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3, repeat: Infinity }} className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Sparkles className="w-10 h-10 md:w-14 md:h-14 text-yellow-400" />
                              <Trophy className="w-12 h-12 md:w-16 md:h-16 text-yellow-400" />
                              <Sparkles className="w-10 h-10 md:w-14 md:h-14 text-yellow-400" />
                            </div>
                            <motion.p 
                              className="text-white text-xl md:text-2xl font-bold mt-2"
                              animate={{ opacity: [1, 0.5, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            >
                              And the winner is...
                            </motion.p>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Other players (4th place and beyond) */}
                  {gameOverPhase >= restPhase && restOfPlayers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap justify-center gap-2 mb-6"
                    >
                      {restOfPlayers.map((p, i) => (
                        <div key={p.id} className="bg-white/10 backdrop-blur px-3 py-2 rounded-lg border border-white/20 flex items-center gap-2">
                          <span className="text-white/60 font-medium">#{i + 4}</span>
                          <span className="text-lg">{PLAYER_AVATARS.find(a => a.id === p.avatar)?.emoji || PLAYER_AVATARS[0].emoji}</span>
                          <span className="text-white/80 font-medium">{p.name}</span>
                          <span className="text-white/60">{p.score} pts</span>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <AnimatePresence>
                    {gameOverPhase >= winnerPhase && (
                      <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="flex flex-col sm:flex-row gap-3 justify-center items-center"
                      >
                        <Button
                          size="lg"
                          onClick={continueToNextGrid}
                          className="font-bold shadow-lg"
                          data-testid="button-next-grid"
                        >
                          <Grid3X3 className="w-5 h-5 mr-2" />
                          Next Grid
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={closeGameOver}
                          className="font-bold"
                          data-testid="button-end-session"
                        >
                          <Power className="w-5 h-5 mr-2" />
                          End Session
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Minimal Header */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-md border-b border-white/10"
          >
            {/* Left: Back + Logo + Grid Name */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => { setPlayMode(false); setSelectedGridId(null); }}
                className="text-white/60 h-9 w-9"
                data-testid="button-exit-play"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Logo size="md" variant="light" />
              <div className="hidden sm:block">
                <h1 className="text-sm font-medium text-white/80 tracking-tight">{grid.name}</h1>
              </div>
            </div>
            
            {/* Right: Room Code + Action Buttons */}
            <div className="flex items-center gap-2">
              {roomCode && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                  <Badge className="bg-emerald-400 text-black font-mono font-bold px-3 py-1">{roomCode}</Badge>
                </motion.div>
              )}
              <Button size="sm" onClick={() => setShowQRCode(true)} className="bg-emerald-400 text-black font-medium h-9" data-testid="button-show-qr">
                <QrCode className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">Join</span>
              </Button>
              <Button size="icon" variant="ghost" onClick={resetGame} className="text-white/50 h-9 w-9" data-testid="button-reset-game">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-red-400/70 h-9 w-9" data-testid="button-end-session">
                    <Power className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End this game session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect all {players.length} player{players.length !== 1 ? 's' : ''} and close the room. 
                      Players will need to rejoin with a new room code to play again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={startGameOverReveal} className="bg-red-600">
                      End Session
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
          
          {/* Join Notification */}
          <AnimatePresence>
            {lastJoinedPlayer && (
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-50"
              >
                <div className="bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <span className="text-lg">{PLAYER_AVATARS.find(a => a.id === lastJoinedPlayer.avatar)?.emoji || PLAYER_AVATARS[0].emoji}</span>
                  <span className="font-medium">{lastJoinedPlayer.name} joined!</span>
                  <UserPlus className="w-4 h-4" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Game Grid */}
          <div className="flex-1 p-3 md:p-5 overflow-hidden relative">
            {/* Football pitch markings - only show for sports theme */}
            {gridThemeId === 'sports' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white/80 -translate-x-1/2" />
                {/* Center circle */}
                <div className="absolute left-1/2 top-1/2 w-32 h-32 md:w-56 md:h-56 border-4 border-white/80 rounded-full -translate-x-1/2 -translate-y-1/2" />
                {/* Center dot */}
                <div className="absolute left-1/2 top-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                {/* Left penalty box */}
                <div className="absolute left-0 top-1/2 w-16 md:w-24 h-40 md:h-56 border-4 border-white/80 border-l-0 -translate-y-1/2" />
                {/* Right penalty box */}
                <div className="absolute right-0 top-1/2 w-16 md:w-24 h-40 md:h-56 border-4 border-white/80 border-r-0 -translate-y-1/2" />
                {/* Left goal post */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-70">
                  <svg width="40" height="120" viewBox="0 0 40 120" className="md:w-[60px] md:h-[180px]">
                    <rect x="0" y="0" width="6" height="120" fill="white" rx="2"/>
                    <rect x="34" y="0" width="6" height="120" fill="white" rx="2"/>
                    <rect x="0" y="0" width="40" height="6" fill="white" rx="2"/>
                    <rect x="5" y="5" width="30" height="3" fill="white" opacity="0.5"/>
                    <line x1="5" y1="10" x2="5" y2="115" stroke="white" strokeWidth="1" opacity="0.3"/>
                    <line x1="35" y1="10" x2="35" y2="115" stroke="white" strokeWidth="1" opacity="0.3"/>
                  </svg>
                </div>
                {/* Right goal post */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-70">
                  <svg width="40" height="120" viewBox="0 0 40 120" className="md:w-[60px] md:h-[180px]">
                    <rect x="0" y="0" width="6" height="120" fill="white" rx="2"/>
                    <rect x="34" y="0" width="6" height="120" fill="white" rx="2"/>
                    <rect x="0" y="0" width="40" height="6" fill="white" rx="2"/>
                    <rect x="5" y="5" width="30" height="3" fill="white" opacity="0.5"/>
                    <line x1="5" y1="10" x2="5" y2="115" stroke="white" strokeWidth="1" opacity="0.3"/>
                    <line x1="35" y1="10" x2="35" y2="115" stroke="white" strokeWidth="1" opacity="0.3"/>
                  </svg>
                </div>
              </div>
            )}
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full flex flex-col gap-3 relative z-10"
            >
              {/* Category Headers */}
              <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: `repeat(${gridCategories.length}, 1fr)` }}>
                {gridCategories.map((category, idx) => (
                  <motion.div 
                    key={category.id}
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.08, type: "spring", stiffness: 120 }}
                    className="bg-white/95 py-3 md:py-4 px-2 rounded-lg text-center shadow-lg"
                  >
                    <span className="text-gray-800 font-bold text-xs md:text-sm uppercase tracking-wider block">
                      {category.name}
                    </span>
                    {category.description && (
                      <span className="text-gray-500 text-[10px] md:text-xs block mt-0.5 font-normal">
                        {category.description}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
              
              {/* Point Grid */}
              <div className="flex-1 grid gap-2 md:gap-3" style={{ gridTemplateColumns: `repeat(${gridCategories.length}, 1fr)`, gridTemplateRows: 'repeat(5, 1fr)' }}>
                {POINT_TIERS.map((points, rowIdx) => (
                  gridCategories.map((category, colIdx) => {
                    const question = category.questions?.find(q => q.points === points);
                    const cellKey = `${category.id}-${points}`;
                    const isRevealed = revealedCells.has(cellKey);
                    const delay = 0.3 + (rowIdx * gridCategories.length + colIdx) * 0.03;
                    
                    return (
                      <motion.button
                        key={cellKey}
                        initial={{ opacity: 0, rotateX: -15, y: 20 }}
                        animate={{ opacity: 1, rotateX: 0, y: 0 }}
                        transition={{ delay, type: "spring", stiffness: 150, damping: 15 }}
                        className={`
                          rounded-lg font-black text-2xl md:text-4xl flex items-center justify-center transition-all duration-300 relative overflow-hidden
                          ${isRevealed 
                            ? 'bg-white/10 backdrop-blur-sm cursor-default border border-white/20' 
                            : 'bg-gradient-to-br from-white via-white to-gray-50 text-gray-800 cursor-pointer hover:from-gray-50 hover:to-white'
                          }
                        `}
                        style={!isRevealed ? { 
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)' 
                        } : {}}
                        onClick={() => question && !isRevealed && handleCellClick(category.id, points, question)}
                        disabled={isRevealed || !question}
                        whileHover={!isRevealed ? { scale: 1.04, y: -4, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)' } : {}}
                        whileTap={!isRevealed ? { scale: 0.96 } : {}}
                        data-testid={`cell-${category.id}-${points}`}
                      >
                        {isRevealed ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className="flex items-center justify-center"
                          >
                            <Check className="w-8 h-8 md:w-12 md:h-12 text-white/40" strokeWidth={3} />
                          </motion.div>
                        ) : (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: delay + 0.1, type: "spring", stiffness: 200 }}
                          >
                            {points}
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Bottom Scoreboard Bar */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="bg-white/5 backdrop-blur-md border-t border-white/10 px-4 py-3"
          >
            {players.length > 0 ? (
              <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
                {[...players].sort((a, b) => b.score - a.score).map((player, idx) => {
                  const avatarEmoji = PLAYER_AVATARS.find(a => a.id === player.avatar)?.emoji || PLAYER_AVATARS[0].emoji;
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      className={`flex items-center gap-3 bg-white/5 rounded-full pl-1 pr-4 py-1 border ${player.connected ? 'border-white/10' : 'border-red-500/30 opacity-60'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' : idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' : idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
                            {avatarEmoji}
                          </div>
                          {/* Connection status dot */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${player.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                        <span className="text-white font-medium text-sm">{player.name}</span>
                      </div>
                      <span className="text-emerald-400 font-bold text-lg">{player.score}</span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-emerald-400"
                          onClick={() => updatePlayerScore(player.id, 10)}
                          data-testid={`button-add-score-${player.id}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-400"
                          onClick={() => updatePlayerScore(player.id, -10)}
                          data-testid={`button-sub-score-${player.id}`}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                <Users className="w-4 h-4" />
                <span>No players yet - share the room code to invite players</span>
              </div>
            )}
          </motion.div>
          
          {/* QR Code Modal */}
          <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-center text-2xl">Join the Game</DialogTitle>
                <DialogDescription className="text-center">
                  Scan with your phone to join
                </DialogDescription>
              </DialogHeader>
              
              {roomCode && (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground mb-1">Room Code</p>
                  <p className="text-4xl font-bold tracking-widest text-primary">{roomCode}</p>
                </div>
              )}
              
              <div className="flex justify-center py-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={joinUrl} size={180} />
                </div>
              </div>
              
              <p className="text-center text-xs text-muted-foreground break-all">{joinUrl}</p>
              
              {players.length > 0 && (
                <div className="border-t pt-3 mt-2">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    {players.length} player{players.length !== 1 ? 's' : ''} joined
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {players.map(p => (
                      <Badge key={p.id} variant="secondary">{p.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Question Modal */}
          <Dialog open={!!activeQuestion} onOpenChange={(open) => !open && handleCloseQuestion()}>
            <DialogContent className="max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-violet-200/50 dark:border-violet-500/30 shadow-2xl shadow-violet-500/10">
              <DialogHeader>
                {/* Category Name and Description */}
                {(() => {
                  const category = gridCategories.find(c => c.id === activeQuestion?.categoryId);
                  return category ? (
                    <div className="text-center mb-2">
                      <p className="text-violet-600 dark:text-violet-300 text-sm font-semibold uppercase tracking-wider">
                        {category.name}
                      </p>
                      {category.description && (
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {category.description}
                        </p>
                      )}
                    </div>
                  ) : null;
                })()}
                {/* Animated shimmer points badge */}
                <div className="flex justify-center">
                  <motion.div 
                    className="relative overflow-hidden px-6 py-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 shadow-lg"
                    animate={{ 
                      boxShadow: ['0 4px 20px rgba(251, 191, 36, 0.3)', '0 4px 30px rgba(251, 191, 36, 0.5)', '0 4px 20px rgba(251, 191, 36, 0.3)']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {/* Shimmer effect */}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <DialogTitle className="text-amber-900 text-2xl font-black relative z-10">
                      {activeQuestion?.points} Points
                    </DialogTitle>
                  </motion.div>
                </div>
              </DialogHeader>
              
              {/* Question */}
              <div className="py-4">
                <p className="text-xl md:text-2xl text-center font-medium text-foreground">
                  {activeQuestion?.question}
                </p>
              </div>
              
              {/* Media Display */}
              {(activeQuestion?.imageUrl || activeQuestion?.audioUrl || activeQuestion?.videoUrl) && (
                <div className="flex flex-col items-center gap-3 py-2">
                  {activeQuestion?.imageUrl && (
                    <img 
                      src={activeQuestion.imageUrl} 
                      alt="Question media"
                      className="max-w-full max-h-48 md:max-h-64 rounded-lg object-contain shadow-lg"
                    />
                  )}
                  {activeQuestion?.videoUrl && (
                    <video 
                      src={activeQuestion.videoUrl}
                      controls
                      className="max-w-full max-h-48 md:max-h-64 rounded-lg shadow-lg"
                    />
                  )}
                  {activeQuestion?.audioUrl && (
                    <audio 
                      src={activeQuestion.audioUrl}
                      controls
                      className="w-full max-w-sm"
                    />
                  )}
                </div>
              )}
              
              {/* Timer Button */}
              <div className="flex justify-center py-2">
                <Button
                  variant={timerActive ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (timerActive) {
                      setTimerActive(false);
                      setTimeLeft(10);
                    } else {
                      setTimeLeft(10);
                      setTimerActive(true);
                    }
                  }}
                  className={`gap-2 ${timerActive ? 'animate-pulse' : ''}`}
                  data-testid="button-timer"
                >
                  <Timer className="w-4 h-4" />
                  {timerActive ? (
                    <span className="font-mono font-bold text-lg min-w-[2ch]">{timeLeft}</span>
                  ) : (
                    <span>Start 10s Timer</span>
                  )}
                </Button>
              </div>
              
              {/* Buzzer Status + Skip Option */}
              {players.length > 0 && !showAnswer && buzzQueue.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-600 rounded-full">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">Buzzers Active - Waiting for players</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      lockBuzzer();
                      handleRevealAnswer();
                    }}
                    className="text-muted-foreground"
                    data-testid="button-skip-reveal"
                  >
                    <Eye className="w-4 h-4 mr-2" /> No one buzzing? Reveal Answer
                  </Button>
                </div>
              )}
              
              {/* Buzz Queue - players who buzzed in order */}
              {buzzQueue.length > 0 && !showAnswer && (
                <div className="bg-violet-50 dark:bg-indigo-900/50 border border-violet-200 dark:border-indigo-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-violet-500 dark:text-indigo-400" />
                    <span className="text-sm text-violet-700 dark:text-indigo-300 font-medium">Buzz Order</span>
                  </div>
                  <div className="space-y-2">
                    {buzzQueue.map((buzz, index) => {
                      const player = players.find(p => p.id === buzz.playerId);
                      return (
                        <div 
                          key={buzz.playerId}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                            index === 0 ? 'bg-amber-100 dark:bg-amber-600/30 border border-amber-300 dark:border-amber-500' : 'bg-gray-100 dark:bg-slate-600/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold ${index === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-slate-500'}`}>
                              #{index + 1}
                            </span>
                            <span className="font-medium text-foreground">{buzz.name}</span>
                            <span className="text-xs text-muted-foreground">({player?.score || 0} pts)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {index === 0 ? (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-red-500 hover:bg-red-600 text-white h-8"
                                  disabled={isJudging}
                                  onClick={() => {
                                    setIsJudging(true);
                                    const pts = activeQuestion?.points || 0;
                                    updatePlayerScore(buzz.playerId, -pts);
                                    sendFeedback(buzz.playerId, false, -pts);
                                    // Remove player from queue
                                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                                      wsRef.current.send(JSON.stringify({ type: 'host:passPlayer', playerId: buzz.playerId }));
                                    }
                                    const remainingQueue = buzzQueue.slice(1);
                                    if (remainingQueue.length > 0) {
                                      // More players in queue - let next one answer
                                      setBuzzQueue(remainingQueue.map((b, i) => ({ ...b, position: i + 1 })));
                                      setTimeout(() => setIsJudging(false), 300);
                                    } else {
                                      // No more players - end round and reveal answer
                                      lockBuzzer();
                                      handleRevealAnswer();
                                    }
                                  }}
                                  data-testid={`button-wrong-${buzz.playerId}`}
                                >
                                  <X className="w-3 h-3 mr-1" /> Wrong
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-8"
                                  disabled={isJudging}
                                  onClick={() => {
                                    setIsJudging(true);
                                    lockBuzzer();
                                    const pts = activeQuestion?.points || 0;
                                    updatePlayerScore(buzz.playerId, pts);
                                    sendFeedback(buzz.playerId, true, pts);
                                    handleRevealAnswer();
                                  }}
                                  data-testid={`button-correct-${buzz.playerId}`}
                                >
                                  <Check className="w-3 h-3 mr-1" /> Correct
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">Waiting...</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* No players yet prompt */}
              {players.length === 0 && !showAnswer && (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No players have joined yet</p>
                  <p className="text-xs mt-1">Click "Join" to show QR code</p>
                </div>
              )}
              
              {/* Waiting for buzzes */}
              {players.length > 0 && !buzzerLocked && buzzQueue.length === 0 && !showAnswer && (
                <div className="text-center py-6">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="inline-block"
                  >
                    <Zap className="w-12 h-12 text-amber-500 mx-auto" />
                  </motion.div>
                  <p className="text-amber-600 dark:text-amber-300 mt-2 font-medium">Waiting for buzzes...</p>
                  <p className="text-muted-foreground text-sm">{players.length} player{players.length !== 1 ? 's' : ''} ready</p>
                </div>
              )}
              
              {/* Answer Revealed */}
              <AnimatePresence>
                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/50 dark:to-green-900/30 border border-emerald-300 dark:border-emerald-600 rounded-lg p-4 text-center"
                  >
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Answer</p>
                    <p className="text-xl font-bold text-emerald-800 dark:text-emerald-100">
                      {activeQuestion?.correctAnswer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* All Players for Manual Scoring (after answer revealed) */}
              {showAnswer && players.length > 0 && (
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mt-4 border border-gray-200 dark:border-transparent">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Manage Points</span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {players.map(player => (
                      <div 
                        key={player.id}
                        className="flex items-center justify-between bg-white dark:bg-slate-600/50 rounded-lg px-3 py-2 border border-gray-100 dark:border-transparent"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{player.name}</span>
                          <span className="text-sm text-muted-foreground">({player.score} pts)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500"
                            onClick={() => updatePlayerScore(player.id, -(activeQuestion?.points || 0))}
                            data-testid={`button-deduct-${player.id}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-500"
                            onClick={() => updatePlayerScore(player.id, activeQuestion?.points || 0)}
                            data-testid={`button-award-${player.id}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex gap-2 sm:justify-center mt-4">
                {lastScoreChange && (
                  <Button 
                    onClick={undoLastScore}
                    variant="outline"
                    className="border-amber-500 text-amber-400"
                    data-testid="button-undo-score"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Undo {lastScoreChange.points > 0 ? '+' : ''}{lastScoreChange.points}
                  </Button>
                )}
                {!showAnswer ? (
                  <Button 
                    onClick={() => {
                      lockBuzzer();
                      handleRevealAnswer();
                    }}
                    className="bg-amber-500 text-slate-900"
                    data-testid="button-reveal-answer"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Show Answer
                  </Button>
                ) : (
                  <Button 
                    onClick={handleCloseQuestion}
                    variant="outline"
                    className="border-slate-600 text-white"
                    data-testid="button-close-question"
                  >
                    Continue
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    }
    
    // Helper to render question form for a category
    const renderQuestionSlot = (category: CategoryWithQuestions, points: number) => {
      const existingQuestion = category.questions?.find(q => q.points === points);
      const formKey = `${category.id}-${points}`;
      const formData = questionForms[formKey];
      const isEditing = !!formData;
      
      if (existingQuestion && !isEditing) {
        return (
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-xs text-muted-foreground mr-2">{points}pts:</span>
              <span className="truncate">{existingQuestion.question}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button 
                size="icon" 
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setQuestionForms(prev => ({
                  ...prev,
                  [formKey]: {
                    question: existingQuestion.question,
                    correctAnswer: existingQuestion.correctAnswer,
                    options: existingQuestion.options || [],
                  }
                }))}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost"
                className="h-6 w-6"
                onClick={() => deleteQuestionMutation.mutate(existingQuestion.id)}
                disabled={deleteQuestionMutation.isPending}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          </div>
        );
      }
      
      return (
        <div className="space-y-2 p-2 border border-dashed rounded">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs shrink-0">{points}pts</Badge>
            <Input
              placeholder="Question..."
              className="h-8 text-sm"
              value={formData?.question || ''}
              onChange={(e) => setQuestionForms(prev => ({
                ...prev,
                [formKey]: { ...prev[formKey] || { question: '', correctAnswer: '', options: [] }, question: e.target.value }
              }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Answer..."
              className="h-8 text-sm"
              value={formData?.correctAnswer || ''}
              onChange={(e) => setQuestionForms(prev => ({
                ...prev,
                [formKey]: { ...prev[formKey] || { question: '', correctAnswer: '', options: [] }, correctAnswer: e.target.value }
              }))}
            />
            <Button
              size="sm"
              className="h-8 shrink-0"
              onClick={() => {
                if (formData?.question && formData?.correctAnswer) {
                  saveQuestionMutation.mutate({
                    categoryId: category.id,
                    points,
                    question: formData.question,
                    correctAnswer: formData.correctAnswer,
                    options: formData.options || [],
                  });
                  setQuestionForms(prev => {
                    const newForms = { ...prev };
                    delete newForms[formKey];
                    return newForms;
                  });
                }
              }}
              disabled={!formData?.question || !formData?.correctAnswer || saveQuestionMutation.isPending}
            >
              {saveQuestionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      );
    };
    
    return (
      <div className="min-h-screen flex flex-col bg-background" data-testid="page-blitzgrid-grid">
        <AppHeader 
          title="Blitzgrid" 
          subtitle={grid?.name}
          onBack={() => setSelectedGridId(null)}
          showAdminButton 
          adminHref="/admin/games" 
        />
        <div className="flex-1 flex flex-col container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h1 className="text-xl font-bold">{grid?.name || 'Grid'}</h1>
              <p className="text-muted-foreground text-xs">
                {gridCategories.length}/5 categories · {grid?.questionCount || 0}/25 questions
              </p>
            </div>
            <div className="flex items-center gap-2">
              {grid?.isActive ? (
                <Badge variant="secondary" className="text-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600">
                  <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
                </Badge>
              )}
              {grid?.isActive && (
                <Button 
                  size="sm" 
                  data-testid="button-play-grid"
                  onClick={() => {
                    setPlayMode(true);
                    setRevealedCells(new Set());
                    setActiveQuestion(null);
                    setShowAnswer(false);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" /> Play
                </Button>
              )}
            </div>
          </div>

          {/* New Category Form */}
          {gridCategories.length < 5 && (
            <Card className="mb-4 shrink-0">
              <CardContent className="py-3">
                {showNewCategoryForm ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Category name..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowNewCategoryForm(false);
                            setNewCategoryName("");
                            setNewCategoryDescription("");
                          }
                        }}
                        data-testid="input-category-name"
                      />
                      <Button
                        onClick={() => createCategoryMutation.mutate({ gridId: selectedGridId, name: newCategoryName.trim(), description: newCategoryDescription.trim() })}
                        disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                        data-testid="button-create-category"
                      >
                        {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                      </Button>
                      <Button variant="ghost" onClick={() => { setShowNewCategoryForm(false); setNewCategoryName(""); setNewCategoryDescription(""); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Description (optional)..."
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCategoryName.trim()) {
                          createCategoryMutation.mutate({ gridId: selectedGridId, name: newCategoryName.trim(), description: newCategoryDescription.trim() });
                        }
                        if (e.key === 'Escape') {
                          setShowNewCategoryForm(false);
                          setNewCategoryName("");
                          setNewCategoryDescription("");
                        }
                      }}
                      data-testid="input-category-description"
                    />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowNewCategoryForm(true)}
                    data-testid="button-new-category"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Category ({gridCategories.length}/5)
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Categories with inline questions */}
          <div className="flex-1">
            {loadingCategories ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : gridCategories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No categories yet</h3>
                  <p className="text-muted-foreground text-sm">Add your first category above to start building your grid</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {gridCategories.map(category => {
                  const isExpanded = selectedCategoryId === category.id;
                  
                  return (
                    <Card key={category.id} className={isExpanded ? 'ring-2 ring-primary/20' : ''}>
                      <CardHeader 
                        className="cursor-pointer py-3"
                        onClick={() => setSelectedCategoryId(isExpanded ? null : category.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            <div>
                              <CardTitle className="text-base">{category.name}</CardTitle>
                              <CardDescription className="text-xs">
                                {category.questionCount}/5 questions
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {category.questionCount >= 5 ? (
                              <Badge variant="secondary" className="text-green-600 text-xs">Complete</Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 text-xs">
                                {5 - category.questionCount} needed
                              </Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCategoryMutation.mutate({ gridId: selectedGridId, categoryId: category.id });
                              }}
                              disabled={removeCategoryMutation.isPending}
                              data-testid={`button-remove-category-${category.id}`}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <CardContent className="pt-0 space-y-2">
                              {POINT_TIERS.map(points => (
                                <div key={points}>
                                  {renderQuestionSlot(category, points)}
                                </div>
                              ))}
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid picker mode - choosing next grid while room stays open
  if (gridPickerMode) {
    const startNextGrid = (gridId: number, gridName: string) => {
      setSelectedGridId(gridId);
      setPlayMode(true);
      setGridPickerMode(false);
      setRevealedCells(new Set());
      setActiveQuestion(null);
      setShowAnswer(false);
      
      // Notify players that new grid is starting
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'host:startNextGrid', boardId: gridId, gridName }));
      }
    };
    
    const endSessionFromPicker = () => {
      setGridPickerMode(false);
      endSession();
    };
    
    return (
      <div className="min-h-screen bg-background" data-testid="page-blitzgrid-picker">
        <div className="container mx-auto px-4 py-6">
          {/* Session Info Banner */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {roomCode && (
                  <div className="flex items-center gap-2">
                    <Badge className="font-mono font-bold px-3 py-1" data-testid="badge-picker-room-code">{roomCode}</Badge>
                    <span className="text-primary text-sm font-medium" data-testid="text-picker-room-active">Room Active</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary" data-testid="text-picker-player-count">{players.length}</span>
                  <span className="text-muted-foreground text-sm">player{players.length !== 1 ? 's' : ''} waiting</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={endSessionFromPicker} data-testid="button-end-session-picker">
                <Power className="w-4 h-4 mr-2" /> End Session
              </Button>
            </div>
          </motion.div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Grid3X3 className="w-6 h-6 text-purple-500" />
                Choose Next Grid
              </h1>
              <p className="text-muted-foreground text-sm">Select a grid to continue playing</p>
            </div>
          </div>

          {loadingGrids ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : grids.filter(g => g.isActive).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
                <h3 className="font-medium mb-2">No active grids available</h3>
                <p className="text-muted-foreground text-sm mb-4">All grids need to be completed to be playable</p>
                <Button variant="outline" onClick={endSessionFromPicker} data-testid="button-end-no-grids">
                  End Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grids.filter(g => g.isActive).map(grid => {
                const colorConfig = getBoardColorConfig(grid.colorCode);
                return (
                  <Card
                    key={grid.id}
                    className={`hover-elevate cursor-pointer transition-all border bg-gradient-to-br ${colorConfig.card}`}
                    onClick={() => startNextGrid(grid.id, grid.name)}
                    data-testid={`card-picker-grid-${grid.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 min-w-0 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorConfig.bg}`}>
                          <Grid3X3 className="w-4 h-4 text-white" />
                        </div>
                        <h3 className={`font-semibold truncate ${colorConfig.cardTitle}`} data-testid={`text-picker-grid-name-${grid.id}`}>{grid.name}</h3>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm ${colorConfig.cardSub}`} data-testid={`text-picker-grid-stats-${grid.id}`}>
                          {grid.categoryCount} categories · {grid.questionCount} questions
                        </p>
                        <Badge variant="secondary" className="text-xs shrink-0" data-testid={`badge-picker-grid-play-${grid.id}`}>
                          <Play className="w-3 h-3 mr-1" /> Play
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main grid list view
  return (
    <div className="min-h-screen bg-background" data-testid="page-blitzgrid">
      <AppHeader title="Blitzgrid" backHref="/" showAdminButton adminHref="/admin/games" />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Grid3X3 className="w-6 h-6 text-purple-500" />
              Blitzgrid
            </h1>
            <p className="text-muted-foreground text-sm">{grids.length} grids</p>
          </div>
          <Button onClick={() => setShowNewGridForm(true)} data-testid="button-new-grid">
            <Plus className="w-4 h-4 mr-2" /> New Grid
          </Button>
        </div>

        <AnimatePresence>
          {showNewGridForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Grid name..."
                      value={newGridName}
                      onChange={(e) => setNewGridName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newGridName.trim()) {
                          createGridMutation.mutate({ name: newGridName.trim(), theme: newGridTheme });
                        }
                        if (e.key === 'Escape') setShowNewGridForm(false);
                      }}
                      data-testid="input-grid-name"
                    />
                    <Button
                      onClick={() => createGridMutation.mutate({ name: newGridName.trim(), theme: newGridTheme })}
                      disabled={!newGridName.trim() || createGridMutation.isPending}
                      data-testid="button-create-grid"
                    >
                      {createGridMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowNewGridForm(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Theme selector */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground self-center mr-1" data-testid="text-theme-label">Theme:</span>
                    {GRID_THEMES.map(theme => (
                      <Button
                        key={theme.id}
                        variant={newGridTheme === theme.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewGridTheme(theme.id)}
                        className="gap-1"
                        data-testid={`button-theme-${theme.id}`}
                      >
                        <ThemeIcon type={theme.iconType} className="w-4 h-4" />
                        <span className="hidden sm:inline">{theme.name}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {loadingGrids ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : grids.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium mb-2">No grids yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first Blitzgrid</p>
              <Button onClick={() => setShowNewGridForm(true)} data-testid="button-create-first-grid">
                <Plus className="w-4 h-4 mr-2" /> Create Grid
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grids.map(grid => {
              const colorConfig = getBoardColorConfig(grid.colorCode);
              return (
                <Card
                  key={grid.id}
                  className={`hover-elevate transition-all border bg-gradient-to-br ${colorConfig.card} ${grid.isActive ? 'cursor-pointer' : 'opacity-60'}`}
                  onClick={() => {
                    if (grid.isActive) {
                      setSelectedGridId(grid.id);
                      setPlayMode(true);
                      setRevealedCells(new Set());
                      setActiveQuestion(null);
                      setShowAnswer(false);
                    } else {
                      toast({ title: "Grid not ready", description: "This grid needs 5 categories with 5 questions each." });
                    }
                  }}
                  data-testid={`card-grid-${grid.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 min-w-0 mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorConfig.bg}`}>
                        <Grid3X3 className="w-4 h-4 text-white" />
                      </div>
                      <h3 className={`font-semibold truncate ${colorConfig.cardTitle}`}>{grid.name}</h3>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${colorConfig.cardSub}`}>
                        {grid.categoryCount}/5 categories · {grid.questionCount}/25 questions
                      </p>
                      {grid.isActive ? (
                        <Badge className="bg-green-400/30 text-green-700 dark:text-green-300 text-xs shrink-0">
                          <Play className="w-3 h-3 mr-1" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Incomplete
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={deleteGridId !== null} onOpenChange={(open) => !open && setDeleteGridId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this grid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the grid and unlink all categories. Categories and questions will still exist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGridId && deleteGridMutation.mutate(deleteGridId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
