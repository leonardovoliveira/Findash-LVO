import { and, desc, eq, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertTransaction, InsertUser, Transaction, transactions, users } from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const nullableFields = ["name", "email", "avatarUrl", "loginMethod"] as const;
  for (const field of nullableFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listTransactions(userId: number, from?: Date, to?: Date): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(transactions.userId, userId)];
  if (from) filters.push(gte(transactions.occurredAt, from));
  if (to) filters.push(lt(transactions.occurredAt, to));
  return db.select().from(transactions).where(and(...filters)).orderBy(desc(transactions.occurredAt));
}

export async function createTransaction(input: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(transactions).values(input);
  const id = Number(result[0].insertId);
  const rows = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return rows[0];
}

export async function updateTransaction(id: number, userId: number, input: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(transactions).set(input).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  const rows = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).limit(1);
  return rows[0];
}

export async function deleteTransaction(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  return { success: true } as const;
}
