export type CreditCard = {
  id: number;
  userId: number;
  name: string;
  bank: string;
  brand: string;
  dueDay: number;
  totalLimit: string;
  invoiceAmount: string;
  invoiceMonth: string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_PREFIX = "findash-lvo:credit-cards:";

export function creditCardStorageKey(userId: number | string) { return `${STORAGE_PREFIX}${userId}`; }

export function loadLocalCreditCards(userId: number | string): CreditCard[] {
  try {
    const raw = window.localStorage.getItem(creditCardStorageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isCreditCard) : [];
  } catch { return []; }
}

export function saveLocalCreditCards(userId: number | string, cards: CreditCard[]) {
  window.localStorage.setItem(creditCardStorageKey(userId), JSON.stringify(cards));
}

export function createLocalCreditCard(cards: CreditCard[], input: Omit<CreditCard, "id" | "createdAt" | "updatedAt">, now = new Date()) {
  const iso = now.toISOString();
  return [...cards, { ...input, id: cards.reduce((max, card) => Math.max(max, card.id), 0) + 1, createdAt: iso, updatedAt: iso }];
}

export function isCreditCard(value: unknown): value is CreditCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Record<string, unknown>;
  const dueDay = typeof card.dueDay === "number" ? card.dueDay : NaN;
  return Number.isInteger(card.id) && typeof card.userId === "number" && typeof card.name === "string" && card.name.trim().length > 0 && typeof card.bank === "string" && typeof card.brand === "string" && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31 && typeof card.totalLimit === "string" && Number(card.totalLimit) >= 0 && typeof card.invoiceAmount === "string" && Number(card.invoiceAmount) >= 0 && typeof card.invoiceMonth === "string" && /^\d{4}-\d{2}$/.test(card.invoiceMonth) && typeof card.isPaid === "boolean" && typeof card.createdAt === "string" && typeof card.updatedAt === "string";
}

export function creditCardInvoiceValue(card: Pick<CreditCard, "invoiceAmount" | "isPaid">) { return card.isPaid ? 0 : Number(card.invoiceAmount) || 0; }
