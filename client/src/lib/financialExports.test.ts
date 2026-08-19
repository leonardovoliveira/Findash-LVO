import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreditCard } from "./localCreditCards";
import type { LocalInvestment } from "./localInvestments";
import type { LocalTransaction } from "./localTransactions";

const writeFile = vi.fn();
const save = vi.fn();

vi.mock("xlsx", () => ({
  utils: {
    book_new: () => ({ SheetNames: [], Sheets: {} }),
    aoa_to_sheet: (rows: unknown[][]) => ({ rows }),
    json_to_sheet: (rows: unknown[]) => ({ rows }),
    book_append_sheet: vi.fn(),
  },
  writeFile,
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 210 } };
    setFillColor() {}
    rect() {}
    setTextColor() {}
    setFont() {}
    setFontSize() {}
    text() {}
    roundedRect() {}
    setDrawColor() {}
    setLineWidth() {}
    line() {}
    save = save;
  },
}));

const transaction: LocalTransaction = {
  id: 1,
  userId: 1,
  type: "income",
  description: "Salário",
  amount: "2500.00",
  category: "Trabalho",
  occurredAt: "2026-08-01T12:00:00.000Z",
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-01T12:00:00.000Z",
};
const investment = { id: 1, userId: 1, name: "B3", ticker: "B3SA3", category: "variable-income", institution: "Corretora", quantity: "1", averagePrice: "10", currentValue: "10", notes: "", createdAt: "2026-08-01T12:00:00.000Z", updatedAt: "2026-08-01T12:00:00.000Z" } as LocalInvestment;
const card = { id: 1, userId: 1, name: "Platinum", bank: "Banco", brand: "Visa", dueDay: 10, totalLimit: "5000", invoiceAmount: "300", invoiceMonth: "2026-08", isPaid: false, createdAt: "2026-08-01T12:00:00.000Z", updatedAt: "2026-08-01T12:00:00.000Z" } as CreditCard;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("document", { createElement: () => ({ click: vi.fn(), href: "", download: "" }) });
  vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: vi.fn() });
});

describe("financial exports", () => {
  it("creates a workbook with summary, transactions, investments and cards", async () => {
    const { exportFinancialWorkbook } = await import("./financialExports");
    exportFinancialWorkbook({ transactions: [transaction], investments: [investment], creditCards: [card], income: 2500, expense: 0 });
    expect(writeFile).toHaveBeenCalledOnce();
  });

  it("saves a PDF report", async () => {
    const { exportFinancialPdf } = await import("./financialExports");
    exportFinancialPdf({ transactions: [transaction], investments: [investment], creditCards: [card], income: 2500, expense: 0, performance: [{ month: "Ago", balance: 2500 }] });
    expect(save).toHaveBeenCalledOnce();
  });

  it("saves a styled credit card invoice PDF", async () => {
    const { exportCreditCardInvoicePdf } = await import("./financialExports");
    exportCreditCardInvoicePdf({ card, month: "2026-08", purchases: [], invoiceAmount: 300, isPaid: false, futureInstallmentCount: 2, futureInstallmentAmount: 120 });
    expect(save).toHaveBeenCalledWith("findash-lvo-fatura-platinum-2026-08.pdf");
  });
});
