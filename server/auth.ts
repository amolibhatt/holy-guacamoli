import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, pool } from "./db";
import { users, loginSchema, insertUserSchema } from "@shared/models/auth";
import { passwordResetTokens } from "@shared/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import type { SafeUser } from "@shared/models/auth";
import { z } from "zod";

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

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

      const role = email === 'amoli.bhatt@gmail.com' ? 'super_admin' : 'host';

      const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
      }).returning();

      req.session.userId = newUser.id;
      req.session.userRole = newUser.role;

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
      let currentRole = user.role;
      if (email === 'amoli.bhatt@gmail.com' && user.role !== 'super_admin') {
        await db.update(users).set({ role: 'super_admin' }).where(eq(users.id, user.id));
        currentRole = 'super_admin';
      }
      
      req.session.userId = user.id;
      req.session.userRole = currentRole;

      res.json(sanitizeUser({ ...user, role: currentRole }));
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
    password: z.string().min(8, "Password must be at least 8 characters"),
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
        .set({ password: hashedPassword })
        .where(eq(users.id, resetToken.userId));

      await db.update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));

      res.json({ message: "Password has been reset successfully. You can now sign in." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}
