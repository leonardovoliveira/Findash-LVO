import type { LocalTransaction } from "./localTransactions";

export function filterCalendarDayTransactions(transactions: LocalTransaction[], date: string): LocalTransaction[] {
  return transactions.filter(item => new Date(item.occurredAt).toISOString().slice(0, 10) === date);
}
