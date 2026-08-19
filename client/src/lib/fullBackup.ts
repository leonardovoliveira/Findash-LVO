import type { CreditCard } from "./localCreditCards";
import type { LocalInvestment } from "./localInvestments";
import type { LocalCategory } from "./localCategories";
import type { LocalTransaction } from "./localTransactions";
import type { MonthlyBudget } from "./localBudgets";

export type FullBackup = {
  format: "findash-lvo-full-backup";
  version: 1;
  exportedAt: string;
  transactions: LocalTransaction[];
  investments: LocalInvestment[];
  creditCards: CreditCard[];
  categories: LocalCategory[];
  budgets: MonthlyBudget[];
};

export function createFullBackup(data: Omit<FullBackup, "format" | "version" | "exportedAt">): FullBackup {
  return { format: "findash-lvo-full-backup", version: 1, exportedAt: new Date().toISOString(), ...data };
}

export function parseFullBackup(source: string): FullBackup | null {
  try {
    const value: unknown = JSON.parse(source);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const backup = value as Record<string, unknown>;
    if (backup.format !== "findash-lvo-full-backup" || backup.version !== 1) return null;
    const collections = ["transactions", "investments", "creditCards", "categories", "budgets"];
    if (!collections.every(key => Array.isArray(backup[key]))) throw new Error("O backup completo está incompleto ou corrompido");
    return backup as unknown as FullBackup;
  } catch (error) {
    if (error instanceof Error && error.message.includes("backup completo")) throw error;
    return null;
  }
}
