import Razorpay from "razorpay";
import crypto from "crypto";
import { Router, Request, Response } from "express";
import { db } from "./db";
import { users, payments } from "@shared/schema";
import { eq } from "drizzle-orm";

// Extend session types
declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

// Lazy initialization of Razorpay - only create instance when needed
let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET secrets.");
    }
    
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

// Pricing plans (amounts in paise - 100 paise = ₹1)
export const PLANS = {
  pro_monthly: {
    name: "Pro Monthly",
    amount: 19900, // ₹199
    currency: "INR",
    description: "Unlimited games, custom themes, priority support",
    duration: 30, // days
    plan: "pro" as const,
  },
  pro_yearly: {
    name: "Pro Yearly",
    amount: 149900, // ₹1499 (save ₹889)
    currency: "INR",
    description: "Unlimited games, custom themes, priority support - Best Value!",
    duration: 365,
    plan: "pro" as const,
  },
  party_pack: {
    name: "Party Pack",
    amount: 49900, // ₹499 one-time
    currency: "INR",
    description: "Unlock all starter packs forever - One-time purchase",
    duration: 36500, // ~100 years (lifetime)
    plan: "party_pack" as const,
  },
};

export const razorpayRouter = Router();

// Get pricing plans
razorpayRouter.get("/plans", (_req: Request, res: Response) => {
  res.json({
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
      amountDisplay: `₹${(plan.amount / 100).toFixed(0)}`,
    })),
    key_id: process.env.RAZORPAY_KEY_ID,
  });
});

// Create order
razorpayRouter.post("/create-order", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { planId } = req.body;
    const plan = PLANS[planId as keyof typeof PLANS];
    
    if (!plan) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const options = {
      amount: plan.amount,
      currency: plan.currency,
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId: userId,
        planId,
        planName: plan.name,
      },
    };

    const order = await getRazorpay().orders.create(options);

    // Save payment record
    await db.insert(payments).values({
      userId: userId,
      razorpayOrderId: order.id,
      amount: plan.amount,
      currency: plan.currency,
      status: "created",
      plan: plan.plan,
      description: plan.description,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planId,
      planName: plan.name,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Verify payment
razorpayRouter.post("/verify-payment", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Get the payment record to verify it belongs to this user and get the correct plan
    const [paymentRecord] = await db.select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, razorpay_order_id));

    if (!paymentRecord) {
      return res.status(400).json({ error: "Payment not found" });
    }

    if (paymentRecord.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Get plan from the payment record (stored at order creation time)
    const storedPlanType = paymentRecord.plan;
    
    // Find the matching PLANS entry
    let plan: typeof PLANS[keyof typeof PLANS] | undefined;
    for (const [key, value] of Object.entries(PLANS)) {
      if (value.plan === storedPlanType) {
        plan = value;
        break;
      }
    }
    
    if (!plan) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    // Update payment record
    await db.update(payments)
      .set({
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "paid",
        updatedAt: new Date(),
      })
      .where(eq(payments.razorpayOrderId, razorpay_order_id));

    // Update user subscription
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration);

    await db.update(users)
      .set({
        subscriptionPlan: plan.plan,
        subscriptionStatus: "active",
        subscriptionExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    res.json({ 
      success: true, 
      message: "Payment verified successfully",
      plan: plan.plan,
      expiresAt,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// Get user subscription status
razorpayRouter.get("/subscription", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [userData] = await db.select({
      subscriptionPlan: users.subscriptionPlan,
      subscriptionStatus: users.subscriptionStatus,
      subscriptionExpiresAt: users.subscriptionExpiresAt,
    })
    .from(users)
    .where(eq(users.id, userId));

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if subscription has expired
    const isExpired = userData.subscriptionExpiresAt && 
      new Date(userData.subscriptionExpiresAt) < new Date();

    res.json({
      plan: isExpired ? "free" : userData.subscriptionPlan,
      status: isExpired ? "expired" : userData.subscriptionStatus,
      expiresAt: userData.subscriptionExpiresAt,
      isPro: !isExpired && (userData.subscriptionPlan === "pro" || userData.subscriptionPlan === "party_pack"),
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

// Get payment history
razorpayRouter.get("/payments", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userPayments = await db.select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(payments.createdAt);

    res.json(userPayments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});
