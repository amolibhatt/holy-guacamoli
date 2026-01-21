import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Check if we need SSL (production databases usually require it)
const connectionString = process.env.DATABASE_URL;
const needsSSL = connectionString.includes('render.com') || 
                 connectionString.includes('neon.tech') || 
                 connectionString.includes('supabase') ||
                 process.env.NODE_ENV === 'production';

export const pool = new Pool({ 
  connectionString,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(pool, { schema });
