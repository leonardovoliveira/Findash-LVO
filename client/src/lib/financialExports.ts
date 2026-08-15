import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { LocalTransaction } from "./localTransactions";
import type { LocalInvestment } from "./localInvestments";
import type { CreditCard } from "./localCreditCards";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function exportFinancialWorkbook({
  transactions,
  investments,
  creditCards,
  income,
  expense,
}: {
  transactions: LocalTransaction[];
  investments: LocalInvestment[];
  creditCards: CreditCard[];
  income: number;
  expense: number;
}) {
  const workbook = XLSX.utils.book_new();
  const summary = [
    ["Findash LVO — Resumo financeiro"],
    ["Gerado em", new Date().toLocaleString("pt-BR")],
    ["Entradas", income],
    ["Saídas", expense],
    ["Saldo", income - expense],
    ["Lançamentos", transactions.length],
    ["Investimentos", investments.length],
    ["Cartões", creditCards.length],
  ];
  const transactionRows = transactions.map(item => ({
    Data: new Date(item.occurredAt).toLocaleDateString("pt-BR"),
    Tipo: item.type === "income" ? "Entrada" : "Saída",
    Descrição: item.description,
    Categoria: item.category,
    Valor: Number(item.amount),
  }));
  const investmentRows = investments.map(item => ({
    Ativo: item.name,
    Ticker: item.ticker || "—",
    Categoria: item.category,
    Instituição: item.institution || "—",
    Quantidade: Number(item.quantity || 0),
    "Preço médio": Number(item.averagePrice || 0),
    "Preço atual": item.marketPrice == null ? "—" : Number(item.marketPrice),
    "Valor de mercado": item.currentValue == null ? "—" : Number(item.currentValue),
    "Atualizado em": item.quoteFetchedAt ? new Date(item.quoteFetchedAt).toLocaleString("pt-BR") : "—",
  }));
  const cardRows = creditCards.map(card => ({
    Cartão: card.name,
    Banco: card.bank,
    Bandeira: card.brand,
    Vencimento: card.dueDay,
    Limite: Number(card.totalLimit),
    Fatura: Number(card.invoiceAmount),
    Status: card.isPaid ? "Paga" : "Em aberto",
  }));

  const append = (rows: unknown[][] | Record<string, unknown>[], name: string) => {
    const sheet = Array.isArray(rows) && rows.length && Array.isArray(rows[0])
      ? XLSX.utils.aoa_to_sheet(rows as unknown[][])
      : XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]);
    sheet["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 28 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  };

  append(summary, "Resumo");
  append(transactionRows, "Lançamentos");
  append(investmentRows, "Investimentos");
  append(cardRows, "Cartões");
  XLSX.writeFile(workbook, `findash-lvo-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportFinancialPdf({
  transactions,
  investments,
  creditCards,
  income,
  expense,
  performance,
}: {
  transactions: LocalTransaction[];
  investments: LocalInvestment[];
  creditCards: CreditCard[];
  income: number;
  expense: number;
  performance: Array<{ month: string; balance: number }>;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const purple = [124, 58, 237] as const;
  doc.setFillColor(10, 11, 18);
  doc.rect(0, 0, pageWidth, 297, "F");
  doc.setTextColor(245, 243, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Findash LVO", margin, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(178, 170, 205);
  doc.text("Relatório financeiro pessoal", margin, 31);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, 31, { align: "right" });

  const cards = [
    ["Entradas", income, [16, 185, 129] as const],
    ["Saídas", expense, [244, 114, 182] as const],
    ["Saldo", income - expense, purple],
  ];
  cards.forEach(([label, value, color], index) => {
    const x = margin + index * 59;
    doc.setFillColor(25, 22, 36);
    doc.roundedRect(x, 43, 52, 25, 4, 4, "F");
    doc.setTextColor(166, 158, 185);
    doc.setFontSize(9);
    doc.text(String(label), x + 5, 51);
    doc.setTextColor(...(color as [number, number, number]));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(brl.format(Number(value)), x + 5, 61);
    doc.setFont("helvetica", "normal");
  });

  let y = 82;
  doc.setTextColor(245, 243, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Performance acumulada", margin, y);
  y += 8;
  const chartX = margin;
  const chartY = y;
  const chartW = pageWidth - margin * 2;
  const chartH = 48;
  doc.setDrawColor(65, 58, 85);
  doc.roundedRect(chartX, chartY, chartW, chartH, 3, 3, "S");
  if (performance.length) {
    const values = performance.map(point => point.balance);
    const min = Math.min(0, ...values);
    const max = Math.max(1, ...values);
    const step = chartW / Math.max(1, performance.length - 1);
    doc.setDrawColor(...purple);
    doc.setLineWidth(1.2);
    performance.forEach((point, index) => {
      const px = chartX + index * step;
      const py = chartY + chartH - ((point.balance - min) / (max - min)) * chartH;
      if (index > 0) {
        const previous = performance[index - 1];
        const previousY = chartY + chartH - ((previous.balance - min) / (max - min)) * chartH;
        doc.line(chartX + (index - 1) * step, previousY, px, py);
      }
    });
  }
  y += chartH + 14;
  doc.setTextColor(245, 243, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Maiores gastos", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(190, 184, 204);
  transactions.filter(item => item.type === "expense").sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5).forEach(item => {
    doc.text(`${item.description} · ${item.category}`, margin, y);
    doc.text(brl.format(Number(item.amount)), pageWidth - margin, y, { align: "right" });
    y += 5;
  });
  y += 5;
  doc.setTextColor(245, 243, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Patrimônio e cartões", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(190, 184, 204);
  doc.text(`Posições de investimento: ${investments.length}`, margin, y);
  y += 5;
  doc.text(`Cartões cadastrados: ${creditCards.length}`, margin, y);
  y += 5;
  doc.text(`Faturas em aberto: ${brl.format(creditCards.filter(card => !card.isPaid).reduce((sum, card) => sum + Number(card.invoiceAmount), 0))}`, margin, y);
  y += 12;
  doc.setTextColor(130, 122, 150);
  doc.setFontSize(8);
  doc.text("Os dados deste relatório foram gerados a partir do armazenamento local deste navegador.", margin, y);
  downloadPdf(doc, `findash-lvo-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
}
