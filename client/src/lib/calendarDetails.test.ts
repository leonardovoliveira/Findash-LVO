import { describe, expect, it } from "vitest";
import { filterCalendarDayTransactions } from "./calendarDetails";
import type { LocalTransaction } from "./localTransactions";

const transaction = (id: number, occurredAt: string): LocalTransaction => ({ id, userId: 1, type: "expense", description: "Compra", amount: "10", category: "Alimentação", occurredAt, createdAt: occurredAt, updatedAt: occurredAt });

describe("calendar details", () => {
  it("returns only the transactions registered on the selected day", () => {
    const transactions = [transaction(1, "2026-08-19T12:00:00.000Z"), transaction(2, "2026-08-20T12:00:00.000Z")];
    expect(filterCalendarDayTransactions(transactions, "2026-08-19")).toEqual([transactions[0]]);
  });

  it("returns an empty list for a day with no transactions", () => {
    expect(filterCalendarDayTransactions([transaction(1, "2026-08-19T12:00:00.000Z")], "2026-08-21")).toEqual([]);
  });
});
