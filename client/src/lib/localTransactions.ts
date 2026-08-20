import type { Transaction } from "../../../drizzle/schema";
import * as XLSX from "xlsx";

export type LocalTransaction = Omit<Transaction, "occurredAt" | "createdAt" | "updatedAt"> & {
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  icon?: string;
  store?: string;
  product?: string;
  paymentMethod?: PaymentMethod;
  creditCardId?: number;
  creditTotal?: string;
  installmentIndex?: number;
  installmentsTotal?: number;
  purchaseId?: number;
  invoiceMonth?: string;
};

export type PaymentMethod = "cash" | "pix" | "boleto" | "debit" | "credit";

const STORAGE_PREFIX = "findash-lvo:transactions:";

export function storageKey(userId: number | string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadLocalTransactions(userId: number | string): LocalTransaction[] {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLocalTransaction) : [];
  } catch {
    return [];
  }
}

export function saveLocalTransactions(userId: number | string, transactions: LocalTransaction[]) {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(transactions));
}

export function filterLocalTransactions(transactions: LocalTransaction[], month: number, year: number) {
  return transactions.filter(item => {
    const date = new Date(item.occurredAt);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  });
}

export function filterLocalTransactionsByInvoiceMonth(transactions: LocalTransaction[], month: number, year: number) {
  const invoiceMonth = `${year}-${String(month).padStart(2, "0")}`;
  return transactions.filter(item => {
    if (item.type === "expense" && item.paymentMethod === "credit") return (item.invoiceMonth ?? item.occurredAt.slice(0, 7)) === invoiceMonth;
    const date = new Date(item.occurredAt);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  });
}

/** Ordena por data de lançamento mais recente e preserva uma ordem estável para empates. */
export function sortTransactionsByDate(transactions: LocalTransaction[]) {
  return [...transactions].sort((first, second) => {
    const dateOrder = new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime();
    return dateOrder || new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime() || second.id - first.id;
  });
}

export function createLocalTransaction(
  transactions: LocalTransaction[],
  input: Omit<LocalTransaction, "id" | "createdAt" | "updatedAt">,
  now = new Date(),
): LocalTransaction[] {
  const nowIso = now.toISOString();
  const next: LocalTransaction = {
    ...input,
    id: transactions.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return [...transactions, next];
}

export function isLocalTransaction(value: unknown): value is LocalTransaction {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    Number.isInteger(item.id) &&
    (item.type === "income" || item.type === "expense") &&
    typeof item.description === "string" &&
    item.description.trim().length > 0 &&
    typeof item.amount === "string" &&
    Number(item.amount) > 0 &&
    typeof item.category === "string" &&
    item.category.trim().length > 0 &&
    (item.icon === undefined || typeof item.icon === "string") &&
    typeof item.occurredAt === "string" &&
    !Number.isNaN(Date.parse(item.occurredAt)) &&
    (item.paymentMethod === undefined || ["cash", "pix", "boleto", "debit", "credit"].includes(String(item.paymentMethod))) &&
    (item.creditCardId === undefined || Number.isInteger(item.creditCardId)) &&
    (item.installmentIndex === undefined || Number.isInteger(item.installmentIndex)) &&
    (item.installmentsTotal === undefined || (Number.isInteger(item.installmentsTotal) && Number(item.installmentsTotal) >= 1)) &&
    (item.purchaseId === undefined || Number.isInteger(item.purchaseId)) &&
    (item.invoiceMonth === undefined || (typeof item.invoiceMonth === "string" && /^\\d{4}-\\d{2}$/.test(item.invoiceMonth)))
  );
}

export function parseImportJson(raw: string): LocalTransaction[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isLocalTransaction)) {
    throw new Error("O arquivo não contém lançamentos válidos do Findash LVO.");
  }
  return parsed;
}

export function exportJson(transactions: LocalTransaction[]) {
  return JSON.stringify(
    {
      format: "findash-lvo-transactions",
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions,
    },
    null,
    2,
  );
}

export function parseBackupJson(raw: string): LocalTransaction[] {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { transactions?: unknown }).transactions)) {
    return parseImportJson(raw);
  }
  return parseImportJson(JSON.stringify((parsed as { transactions: unknown[] }).transactions));
}

type SpreadsheetRow = Record<string, unknown>;

function normalizeColumn(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function valueFromRow(row: SpreadsheetRow, aliases: string[]) {
  const entry = Object.entries(row).find(([key]) => aliases.includes(normalizeColumn(key)));
  return entry?.[1];
}

function parseSpreadsheetAmount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const raw = value.trim().replace(/R\$\s?/gi, "").replace(/\s/g, "");
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/[^0-9.-]/g, "");
  return Number(normalized);
}

function parseSpreadsheetDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12).toISOString();
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d, 12).toISOString();
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const brazilian = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brazilian) return new Date(Number(brazilian[3]), Number(brazilian[2]) - 1, Number(brazilian[1]), 12).toISOString();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12).toISOString();
}

function parseSpreadsheetType(value: unknown): LocalTransaction["type"] | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["entrada", "income", "receita"].includes(normalized)) return "income";
  if (["saída", "saida", "expense", "despesa"].includes(normalized)) return "expense";
  return null;
}

/** Converte a aba Lançamentos exportada pelo Findash, exigindo Data, Tipo, Descrição, Categoria e Valor. */
export function parseExcelTransactions(file: ArrayBuffer, userId: number | string, now = new Date()): LocalTransaction[] {
  const workbook = XLSX.read(file, { type: "array", cellDates: true });
  const matchingSheet = workbook.SheetNames.find(name => normalizeColumn(name) === "lancamentos")
    ?? workbook.SheetNames.find(name => {
      const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(workbook.Sheets[name], { defval: "", raw: true });
      return rows.some(row => valueFromRow(row, ["data"]) !== undefined && valueFromRow(row, ["tipo"]) !== undefined && valueFromRow(row, ["valor"]) !== undefined);
    });
  if (!matchingSheet) throw new Error('Não foi encontrada uma aba "Lançamentos" com as colunas Data, Tipo e Valor.');
  const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(workbook.Sheets[matchingSheet], { defval: "", raw: true });
  if (!rows.length) throw new Error("A planilha não possui lançamentos para importar.");
  const nowIso = now.toISOString();
  const errors: string[] = [];
  const imported = rows.map((row, index) => {
    const date = parseSpreadsheetDate(valueFromRow(row, ["data", "date"]));
    const type = parseSpreadsheetType(valueFromRow(row, ["tipo", "type"]));
    const description = String(valueFromRow(row, ["descricao", "descrição", "description"]) ?? "").trim();
    const category = String(valueFromRow(row, ["categoria", "category"]) ?? "").trim();
    const amount = parseSpreadsheetAmount(valueFromRow(row, ["valor", "value", "amount"]));
    if (!date || !type || !description || !category || !Number.isFinite(amount) || amount <= 0) {
      errors.push(`linha ${index + 2}`);
      return null;
    }
    return {
      id: index + 1,
      userId: Number(userId),
      type,
      description,
      amount: amount.toFixed(2),
      category,
      occurredAt: date,
      createdAt: nowIso,
      updatedAt: nowIso,
    } satisfies LocalTransaction;
  });
  if (errors.length) throw new Error(`Planilha inválida em ${errors.slice(0, 5).join(", ")}${errors.length > 5 ? "…" : ""}. Preencha Data, Tipo, Descrição, Categoria e Valor.`);
  return imported.filter((item): item is LocalTransaction => Boolean(item));
}
