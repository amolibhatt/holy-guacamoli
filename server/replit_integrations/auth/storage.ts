import { db } from "../../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

interface OAuthUserData {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl?: string | null;
}

export const authStorage = {
  async getUser(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user || null;
  },

  async getUserByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user || null;
  },

  async upsertUser(userData: OAuthUserData) {
    let existingUser = null;

    if (userData.email) {
      existingUser = await this.getUserByEmail(userData.email);
    }

    if (!existingUser) {
      existingUser = await this.getUser(userData.id);
    }

    if (existingUser) {
      const [updated] = await db
        .update(users)
        .set({
          firstName: userData.firstName || existingUser.firstName,
          lastName: userData.lastName || existingUser.lastName,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updated;
    }

    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    const role = userData.email === "amoli.bhatt@gmail.com" ? "super_admin" : "user";

    const [newUser] = await db
      .insert(users)
      .values({
        id: userData.id,
        email: userData.email || `oauth_${userData.id}@placeholder.local`,
        password: randomPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role,
      })
      .returning();

    console.log(`[REPLIT AUTH] Created new user: ${newUser.email} (${newUser.id})`);
    return newUser;
  },
};
