export type CreditCardType = "individual" | "shared";

export type CreditCardPurchase = {
  id: number;
  description: string;
  amount: string;
  purchasedAt: string;
  buyer: string;
};

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
  cardType?: CreditCardType;
  purchases?: CreditCardPurchase[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_PREFIX = "findash-lvo:credit-cards:";

export function creditCardStorageKey(userId: number | string) { return `${STORAGE_PREFIX}${userId}`; }

export function normalizeCreditCard(card: CreditCard): CreditCard {
  return {
    ...card,
    cardType: card.cardType === "shared" ? "shared" : "individual",
    purchases: Array.isArray(card.purchases) ? card.purchases : [],
  };
}

export function loadLocalCreditCards(userId: number | string): CreditCard[] {
  try {
    const raw = window.localStorage.getItem(creditCardStorageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isCreditCard).map(normalizeCreditCard) : [];
  } catch { return []; }
}

export function saveLocalCreditCards(userId: number | string, cards: CreditCard[]) {
  window.localStorage.setItem(creditCardStorageKey(userId), JSON.stringify(cards.map(normalizeCreditCard)));
}

export function updateLocalCreditCard(cards: CreditCard[], id: number, patch: Partial<Omit<CreditCard, "id" | "userId" | "createdAt">>, now = new Date()) {
  const updatedAt = now.toISOString();
  return cards.map(card => card.id === id ? normalizeCreditCard({ ...card, ...patch, updatedAt }) : card);
}

export function deleteLocalCreditCard(cards: CreditCard[], id: number) {
  return cards.filter(card => card.id !== id);
}

export function createLocalCreditCard(cards: CreditCard[], input: Omit<CreditCard, "id" | "createdAt" | "updatedAt">, now = new Date()) {
  const iso = now.toISOString();
  return [...cards, normalizeCreditCard({ ...input, id: cards.reduce((max, card) => Math.max(max, card.id), 0) + 1, createdAt: iso, updatedAt: iso })];
}

export function isCreditCard(value: unknown): value is CreditCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Record<string, unknown>;
  const dueDay = typeof card.dueDay === "number" ? card.dueDay : NaN;
  const validType = card.cardType === undefined || card.cardType === "individual" || card.cardType === "shared";
  const validPurchases = card.purchases === undefined || (Array.isArray(card.purchases) && card.purchases.every(purchase => {
    if (!purchase || typeof purchase !== "object") return false;
    const item = purchase as Record<string, unknown>;
    return Number.isInteger(item.id) && typeof item.description === "string" && Number(item.amount) >= 0 && typeof item.purchasedAt === "string" && typeof item.buyer === "string";
  }));
  return Number.isInteger(card.id) && typeof card.userId === "number" && typeof card.name === "string" && card.name.trim().length > 0 && typeof card.bank === "string" && typeof card.brand === "string" && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31 && typeof card.totalLimit === "string" && Number(card.totalLimit) >= 0 && typeof card.invoiceAmount === "string" && Number(card.invoiceAmount) >= 0 && typeof card.invoiceMonth === "string" && /^\d{4}-\d{2}$/.test(card.invoiceMonth) && typeof card.isPaid === "boolean" && validType && validPurchases && typeof card.createdAt === "string" && typeof card.updatedAt === "string";
}

export function creditCardInvoiceValue(card: Pick<CreditCard, "invoiceAmount" | "isPaid">) { return card.isPaid ? 0 : Number(card.invoiceAmount) || 0; }
