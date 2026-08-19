import type { CreditCardPurchase } from "./localCreditCards";

/** Filtra compras da competência sem carregar bibliotecas de PDF ou planilha. */
export function filterCreditCardInvoicePurchases(purchases: CreditCardPurchase[], buyer: string) {
  return buyer === "all" ? purchases : purchases.filter(purchase => purchase.buyer === buyer);
}
