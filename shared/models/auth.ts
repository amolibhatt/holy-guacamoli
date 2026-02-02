import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, integer, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Subscription plans
export const SUBSCRIPTION_PLANS = ["free", "pro", "party_pack"] as const;
export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[number];

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Host users table (email/password auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role").notNull().default("host"),
  // Subscription fields
  subscriptionPlan: varchar("subscription_plan").notNull().$type<SubscriptionPlan>().default("free"),
  subscriptionStatus: varchar("subscription_status").notNull().default("active"), // active, cancelled, expired
  razorpayCustomerId: varchar("razorpay_customer_id"),
  razorpaySubscriptionId: varchar("razorpay_subscription_id"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  // Permanent pairing token for Sync or Sink
  pairingToken: varchar("pairing_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_pairing_token").on(table.pairingToken),
]);

// Payments table for transaction history
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  razorpayOrderId: varchar("razorpay_order_id").notNull(),
  razorpayPaymentId: varchar("razorpay_payment_id"),
  razorpaySignature: varchar("razorpay_signature"),
  amount: integer("amount").notNull(), // in paise (INR cents)
  currency: varchar("currency").notNull().default("INR"),
  status: varchar("status").notNull().default("created"), // created, paid, failed
  plan: varchar("plan").notNull().$type<SubscriptionPlan>(),
  description: varchar("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payments_user").on(table.userId),
  index("idx_payments_order").on(table.razorpayOrderId),
]);

// Insert schema for registration
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Safe user type without password (for frontend)
export type SafeUser = Omit<User, "password">;

// Payment types
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
