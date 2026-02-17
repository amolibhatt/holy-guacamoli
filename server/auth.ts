import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, pool } from "./db";
import { users, loginSchema, insertUserSchema } from "@shared/models/auth";
import { passwordResetTokens, boards, boardCategories, categories, questions } from "@shared/schema";
import { eq, and, isNull, gt, lt, inArray } from "drizzle-orm";
import type { SafeUser } from "@shared/models/auth";
import { z } from "zod";

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

const resetAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_RESET_ATTEMPTS = 3;
const RESET_WINDOW = 15 * 60 * 1000;

function checkResetRateLimit(ip: string): { blocked: boolean; remainingTime?: number } {
  const now = Date.now();
  const attempt = resetAttempts.get(ip);

  if (!attempt) return { blocked: false };

  if (now - attempt.firstAttempt > RESET_WINDOW) {
    resetAttempts.delete(ip);
    return { blocked: false };
  }

  if (attempt.count >= MAX_RESET_ATTEMPTS) {
    return { blocked: true, remainingTime: Math.ceil((RESET_WINDOW - (now - attempt.firstAttempt)) / 1000) };
  }

  return { blocked: false };
}

function recordResetAttempt(ip: string) {
  const now = Date.now();
  const attempt = resetAttempts.get(ip);

  if (!attempt || now - attempt.firstAttempt > RESET_WINDOW) {
    resetAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    resetAttempts.set(ip, { count: attempt.count + 1, firstAttempt: attempt.firstAttempt });
  }
}

function checkRateLimit(ip: string): { blocked: boolean; remainingTime?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  
  if (!attempt) return { blocked: false };
  
  if (now - attempt.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.delete(ip);
    return { blocked: false };
  }
  
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    return { blocked: true, remainingTime: Math.ceil((LOCKOUT_DURATION - (now - attempt.lastAttempt)) / 1000) };
  }
  
  return { blocked: false };
}

function recordLoginAttempt(ip: string, success: boolean) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  
  if (!attempt || now - attempt.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    loginAttempts.set(ip, { count: attempt.count + 1, lastAttempt: now });
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: string;
    guestId?: string;
    codeVerifier?: string;
    state?: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export function setupAuth(app: Express) {
  // Trust proxy - required for secure cookies behind Render/Heroku load balancers
  // Use 'true' to trust all proxies, which works more reliably on various hosting platforms
  app.set("trust proxy", true);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

function sanitizeUser(user: typeof users.$inferSelect): SafeUser {
  const { password, ...safeUser } = user;
  return safeUser;
}

// Board colors for new users
const BOARD_COLORS = [
  "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6"
];

export async function copyStarterPacksToUser(userId: string): Promise<void> {
  try {
    // Get all starter pack boards
    const starterPacks = await db.select().from(boards).where(eq(boards.isStarterPack, true));
    
    if (starterPacks.length === 0) return;
    
    // Get existing user boards count for color assignment
    const existingBoards = await db.select().from(boards).where(eq(boards.userId, userId));
    let colorIndex = existingBoards.length;
    
    for (const starterBoard of starterPacks) {
      // Create a copy of the board for the new user
      const [newBoard] = await db.insert(boards).values({
        userId,
        name: starterBoard.name,
        description: starterBoard.description,
        pointValues: starterBoard.pointValues,
        theme: starterBoard.theme,
        visibility: 'private',
        isGlobal: false,
        isStarterPack: false,
        colorCode: BOARD_COLORS[colorIndex % BOARD_COLORS.length],
        sortOrder: colorIndex,
      }).returning();
      
      colorIndex++;
      
      // Get board categories for this starter pack, ordered by position
      const starterBoardCategories = await db.select()
        .from(boardCategories)
        .where(eq(boardCategories.boardId, starterBoard.id));
      
      // Sort by position to preserve order
      starterBoardCategories.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      
      for (const bc of starterBoardCategories) {
        // Get the category
        const [originalCategory] = await db.select().from(categories).where(eq(categories.id, bc.categoryId));
        if (!originalCategory) continue;
        
        // Create a copy of the category
        const [newCategory] = await db.insert(categories).values({
          name: originalCategory.name,
          description: originalCategory.description,
          rule: originalCategory.rule,
          imageUrl: originalCategory.imageUrl,
          sourceGroup: originalCategory.sourceGroup,
          isActive: originalCategory.isActive,
        }).returning();
        
        // Link category to new board, preserving the original position
        await db.insert(boardCategories).values({
          boardId: newBoard.id,
          categoryId: newCategory.id,
          position: bc.position ?? 0,
        });
        
        // Get and copy all questions from the original category
        const originalQuestions = await db.select().from(questions).where(eq(questions.categoryId, originalCategory.id));
        
        for (const q of originalQuestions) {
          await db.insert(questions).values({
            categoryId: newCategory.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points,
          });
        }
      }
    }
    
    console.log(`[AUTH] Copied ${starterPacks.length} starter packs to user ${userId}`);
  } catch (error) {
    console.error("[AUTH] Failed to copy starter packs:", error);
    // Non-fatal error - don't block registration
  }
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors[0].message,
          field: parsed.error.errors[0].path.join('.')
        });
      }

      const { email, password, firstName, lastName } = parsed.data;

      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const role = email === 'amoli.bhatt@gmail.com' ? 'super_admin' : 'user';

      const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
        lastLoginAt: new Date(),
      }).returning();

      req.session.userId = newUser.id;
      req.session.userRole = newUser.role;

      // Copy starter pack grids to new user (non-blocking)
      copyStarterPacksToUser(newUser.id).catch(err => {
        console.error("[AUTH] Failed to copy starter packs:", err);
      });

      res.status(201).json(sanitizeUser(newUser));
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const rateCheck = checkRateLimit(ip);
      
      if (rateCheck.blocked) {
        return res.status(429).json({ 
          message: `Too many login attempts. Try again in ${Math.ceil(rateCheck.remainingTime! / 60)} minutes.`
        });
      }
      
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors[0].message,
          field: parsed.error.errors[0].path.join('.')
        });
      }

      const { email, password } = parsed.data;

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) {
        recordLoginAttempt(ip, false);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        recordLoginAttempt(ip, false);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      recordLoginAttempt(ip, true);
      
      // Auto-upgrade owner to super_admin if not already
      const shouldUpgradeRole = email === 'amoli.bhatt@gmail.com' && user.role !== 'super_admin';
      const [updatedUser] = await db.update(users).set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
        ...(shouldUpgradeRole ? { role: 'super_admin' as const } : {}),
      }).where(eq(users.id, user.id)).returning();
      
      req.session.userId = updatedUser.id;
      req.session.userRole = updatedUser.role;

      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      if (req.session.userRole !== user.role) {
        req.session.userRole = user.role;
      }

      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const rateCheck = checkResetRateLimit(ip);
      if (rateCheck.blocked) {
        return res.status(429).json({
          message: `Too many reset requests. Try again in ${Math.ceil(rateCheck.remainingTime! / 60)} minutes.`
        });
      }

      recordResetAttempt(ip);

      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors[0].message,
          field: parsed.error.errors[0].path.join('.')
        });
      }

      const { email } = parsed.data;

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (user) {
        await db.update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(
            and(
              eq(passwordResetTokens.userId, user.id),
              isNull(passwordResetTokens.usedAt)
            )
          );

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash,
          expiresAt,
        });

        const resetUrl = `${req.protocol}://${req.get("host")}/reset-password?token=${token}`;
        
        console.log(`\n[Password Reset] Token generated for ${email}`);
        console.log(`[Password Reset] Reset URL: ${resetUrl}\n`);
      }

      try {
        await db.delete(passwordResetTokens).where(
          lt(passwordResetTokens.expiresAt, new Date())
        );
      } catch (_cleanupErr) {}

      res.status(202).json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors[0].message,
          field: parsed.error.errors[0].path.join('.')
        });
      }

      const { token, password } = parsed.data;
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const [resetToken] = await db.select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!resetToken) {
        return res.status(400).json({ 
          message: "Invalid or expired reset link. Please request a new one." 
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await db.update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, resetToken.userId));

      await db.update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokens.userId, resetToken.userId),
            isNull(passwordResetTokens.usedAt)
          )
        );

      // Invalidate all existing sessions for this user (security: revoke stolen sessions)
      try {
        await pool.query(
          `DELETE FROM sessions WHERE sess->>'userId' = $1`,
          [resetToken.userId]
        );
      } catch (sessionErr) {
        console.error("[AUTH] Failed to invalidate sessions after password reset:", sessionErr);
      }

      res.json({ message: "Password has been reset successfully. You can now sign in." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}
