export type FinanceEntry = { type: "income" | "expense"; amount: number | string };

export function summarize(entries: FinanceEntry[]) {
  return entries.reduce((summary, entry) => {
    const amount = Number(entry.amount);
    if (entry.type === "income") summary.income += amount;
    else summary.expense += amount;
    summary.balance = summary.income - summary.expense;
    return summary;
  }, { income: 0, expense: 0, balance: 0 });
}
