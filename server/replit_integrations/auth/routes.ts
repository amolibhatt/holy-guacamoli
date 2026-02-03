import type { Express } from "express";
import { db } from "../../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

export function registerReplitAuthApiRoutes(app: Express): void {
  app.get("/api/auth/replit-user", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId))
        .limit(1);

      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("[REPLIT AUTH] Get user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
