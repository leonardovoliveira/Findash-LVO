import type { FinanceStatePayload } from "./supabase.js";

export const MAX_FINANCE_STATE_BYTES = 5_000_000;
const MAX_COLLECTION_ITEMS = 25_000;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isSafeJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 16) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= MAX_COLLECTION_ITEMS && value.every(item => isSafeJsonValue(item, depth + 1));
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.entries(value).every(([key, item]) => !FORBIDDEN_KEYS.has(key) && isSafeJsonValue(item, depth + 1));
}

function isSafeCollection(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length <= MAX_COLLECTION_ITEMS && value.every(item => isSafeJsonValue(item));
}

export function parseFinanceStatePayload(value: unknown): FinanceStatePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Estado financeiro inválido");
  const payload = value as Record<string, unknown>;
  if (payload.version !== 1 || !isSafeCollection(payload.transactions) || !isSafeCollection(payload.investments) || !isSafeCollection(payload.creditCards) || !isSafeCollection(payload.categories) || (payload.budgets !== undefined && !isSafeCollection(payload.budgets))) {
    throw new Error("Estado financeiro inválido");
  }
  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_FINANCE_STATE_BYTES) throw new Error("O estado financeiro excede o limite seguro de sincronização");
  return payload as unknown as FinanceStatePayload;
}
