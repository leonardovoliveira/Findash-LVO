export type CreditCardType = "individual" | "shared";

export type CreditCardPurchase = {
  id: number;
  description: string;
  store?: string;
  product?: string;
  category?: string;
  amount: string;
  purchasedAt: string;
  buyer: string;
  purchaseId?: number;
  installmentIndex?: number;
  installmentsTotal?: number;
  invoiceMonth?: string;
};

export type CreditCard = {
  id: number;
  userId: number;
  name: string;
  bank: string;
  brand: string;
  dueDay: number;
  /** Dia do mês em que a fatura fecha; compras nesse dia já entram na próxima competência. */
  closingDay: number;
  totalLimit: string;
  invoiceAmount: string;
  invoiceMonth: string;
  isPaid: boolean;
  /** Estado de pagamento por competência no formato YYYY-MM. */
  paidInvoices?: Record<string, boolean>;
  cardType?: CreditCardType;
  purchases?: CreditCardPurchase[];
  invoices?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_PREFIX = "findash-lvo:credit-cards:";

export function creditCardStorageKey(userId: number | string) { return `${STORAGE_PREFIX}${userId}`; }

export function normalizeCreditCard(card: CreditCard): CreditCard {
  return {
    ...card,
    cardType: card.cardType === "shared" ? "shared" : "individual",
    closingDay: Number.isInteger(card.closingDay) && card.closingDay >= 1 && card.closingDay <= 31 ? card.closingDay : Math.max(1, Math.min(31, card.dueDay - 6)),
    purchases: Array.isArray(card.purchases) ? card.purchases : [],
    invoices: card.invoices && typeof card.invoices === "object" ? card.invoices : {},
    ...(card.paidInvoices && typeof card.paidInvoices === "object" ? { paidInvoices: card.paidInvoices } : {}),
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
  const closingDay = typeof card.closingDay === "number" ? card.closingDay : NaN;
  return Number.isInteger(card.id) && typeof card.userId === "number" && typeof card.name === "string" && card.name.trim().length > 0 && typeof card.bank === "string" && typeof card.brand === "string" && Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31 && (card.closingDay === undefined || (Number.isInteger(closingDay) && closingDay >= 1 && closingDay <= 31)) && typeof card.totalLimit === "string" && Number(card.totalLimit) >= 0 && typeof card.invoiceAmount === "string" && Number(card.invoiceAmount) >= 0 && typeof card.invoiceMonth === "string" && /^\d{4}-\d{2}$/.test(card.invoiceMonth) && typeof card.isPaid === "boolean" && validType && validPurchases && (card.invoices === undefined || (typeof card.invoices === "object" && card.invoices !== null)) && typeof card.createdAt === "string" && typeof card.updatedAt === "string";
}

export function creditCardInvoiceAmount(card: Pick<CreditCard, "invoiceAmount" | "invoiceMonth" | "invoices">) {
  const derived = card.invoices?.[card.invoiceMonth];
  return derived !== undefined ? Number(derived) || 0 : Number(card.invoiceAmount) || 0;
}

export function creditCardInvoiceValue(card: Pick<CreditCard, "invoiceAmount" | "invoiceMonth" | "invoices" | "isPaid" | "paidInvoices">) { return creditCardIsInvoicePaid(card, card.invoiceMonth) ? 0 : creditCardInvoiceAmount(card); }


export function creditCardInvoiceMonths(card: Pick<CreditCard, "invoiceMonth" | "invoices" | "purchases">) {
  const months = new Set<string>([card.invoiceMonth]);
  Object.keys(card.invoices ?? {}).forEach(month => months.add(month));
  (card.purchases ?? []).forEach(purchase => purchase.invoiceMonth && months.add(purchase.invoiceMonth));
  return Array.from(months).filter(month => /^\d{4}-\d{2}$/.test(month)).sort();
}

export function creditCardIsInvoicePaid(card: Pick<CreditCard, "isPaid" | "paidInvoices">, month: string) {
  return card.paidInvoices?.[month] ?? (month === (card as CreditCard).invoiceMonth ? card.isPaid : false);
}

export function creditCardFutureCommitment(card: Pick<CreditCard, "invoiceAmount" | "invoiceMonth" | "invoices" | "isPaid" | "paidInvoices">, _fromMonth: string) {
  const invoiceMonths = new Set(Object.keys(card.invoices ?? {}));
  invoiceMonths.add(card.invoiceMonth);
  return Array.from(invoiceMonths).filter(month => !creditCardIsInvoicePaid(card, month)).reduce((sum, month) => {
    const amount = card.invoices?.[month] !== undefined ? Number(card.invoices[month]) || 0 : month === card.invoiceMonth ? Number(card.invoiceAmount) || 0 : 0;
    return sum + Math.max(0, amount);
  }, 0);
}

export function creditCardAvailableLimit(card: Pick<CreditCard, "totalLimit" | "invoiceAmount" | "invoiceMonth" | "invoices" | "isPaid" | "paidInvoices">, month: string) {
  const totalLimit = Math.max(0, Number(card.totalLimit) || 0);
  return Math.max(0, totalLimit - creditCardFutureCommitment(card, month));
}

export function creditCardLimitUsagePercent(card: Pick<CreditCard, "totalLimit" | "invoiceAmount" | "invoiceMonth" | "invoices" | "isPaid" | "paidInvoices">, month: string) {
  const totalLimit = Number(card.totalLimit) || 0;
  if (totalLimit <= 0) return 0;
  return Math.min(100, Math.max(0, (creditCardFutureCommitment(card, month) / totalLimit) * 100));
}

export function setCreditCardInvoicePaid(cards: CreditCard[], cardId: number, month: string, paid: boolean) {
  return cards.map(card => {
    if (card.id !== cardId) return card;
    const paidInvoices = { ...(card.paidInvoices ?? {}), [month]: paid };
    return { ...card, paidInvoices, isPaid: month === card.invoiceMonth ? paid : card.isPaid, updatedAt: new Date().toISOString() };
  });
}

export function creditCardPurchaseInvoiceMonth(card: Pick<CreditCard, "closingDay">, purchasedAt: string) {
  const month = purchasedAt.slice(0, 7);
  const day = Number(purchasedAt.slice(8, 10));
  if (!/^\d{4}-\d{2}$/.test(month) || !Number.isInteger(day) || day < 1) return month;
  return addMonths(month, day >= card.closingDay ? 1 : 0);
}

function addMonths(month: string, offset: number) {
  const [year, currentMonth] = month.split("-").map(Number);
  const date = new Date(year, currentMonth - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function withoutCreditPurchase(cards: CreditCard[], cardId: number, purchaseId: number) {
  return cards.map(card => {
    if (card.id !== cardId) return card;
    const purchases = (card.purchases ?? []).filter(purchase => (purchase.purchaseId ?? purchase.id) !== purchaseId);
    const invoices: Record<string, string> = {};
    for (const purchase of purchases) {
      if (!purchase.invoiceMonth) continue;
      invoices[purchase.invoiceMonth] = ((Number(invoices[purchase.invoiceMonth]) || 0) + (Number(purchase.amount) || 0)).toFixed(2);
    }
    return { ...card, purchases, invoices, invoiceAmount: invoices[card.invoiceMonth] ?? "0.00", isPaid: false, updatedAt: new Date().toISOString() };
  });
}

export function removeCreditPurchase(cards: CreditCard[], purchaseId: number) {
  return cards.map(card => {
    const next = withoutCreditPurchase([card], card.id, purchaseId)[0];
    return next ? { ...next, paidInvoices: {}, isPaid: false } : card;
  });
}

export function updateCreditPurchase(cards: CreditCard[], input: { cardId: number; purchaseId: number; description: string; store?: string; product?: string; category?: string; buyer?: string; total: number; purchasedAt: string; installments: number }) {
  return applyCreditPurchase(withoutCreditPurchase(cards, input.cardId, input.purchaseId), input);
}

export function applyCreditPurchase(cards: CreditCard[], input: { cardId: number; purchaseId: number; description: string; store?: string; product?: string; category?: string; buyer?: string; total: number; purchasedAt: string; installments: number }) {
  const card = cards.find(item => item.id === input.cardId);
  if (!card) return cards;
  const count = Math.max(1, Math.floor(input.installments));
  const base = Math.floor((input.total / count) * 100) / 100;
  const purchases = [...(card.purchases ?? [])];
  const invoices = { ...(card.invoices ?? {}) };
  const startMonth = creditCardPurchaseInvoiceMonth(card, input.purchasedAt);
  for (let index = 0; index < count; index += 1) {
    const amount = index === count - 1 ? Number((input.total - base * (count - 1)).toFixed(2)) : Number(base.toFixed(2));
    const invoiceMonth = addMonths(startMonth, index);
    purchases.push({ id: input.purchaseId + index, purchaseId: input.purchaseId, description: `${input.description} (${index + 1}/${count})`, store: input.store, product: input.product, category: input.category, amount: amount.toFixed(2), purchasedAt: input.purchasedAt, buyer: input.buyer ?? "", installmentIndex: index + 1, installmentsTotal: count, invoiceMonth });
    invoices[invoiceMonth] = ((Number(invoices[invoiceMonth]) || 0) + amount).toFixed(2);
  }
  return cards.map(item => item.id === input.cardId ? { ...item, purchases, invoices, paidInvoices: { ...(item.paidInvoices ?? {}), [startMonth]: false }, invoiceAmount: invoices[item.invoiceMonth] ?? item.invoiceAmount, isPaid: false, updatedAt: new Date().toISOString() } : item);
}
