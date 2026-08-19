import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { LocalTransaction } from "./localTransactions";
import { investmentCost, investmentMarketValue, type LocalInvestment } from "./localInvestments";
import type { CreditCard, CreditCardPurchase } from "./localCreditCards";
export { filterCreditCardInvoicePurchases } from "./invoiceFilters";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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

export function exportInvestmentInstitutionPdf({ investments, institution }: { investments: LocalInvestment[]; institution: string }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const totalMarketValue = investments.reduce((sum, item) => sum + investmentMarketValue(item), 0);
  const totalCost = investments.reduce((sum, item) => sum + investmentCost(item), 0);
  let y = 76;
  const page = () => {
    doc.setFillColor(10, 11, 18);
    doc.rect(0, 0, pageWidth, 297, "F");
    doc.setTextColor(245, 243, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Findash LVO", margin, 24);
    doc.setFontSize(11);
    doc.setTextColor(190, 171, 255);
    doc.text("EXTRATO DE INVESTIMENTOS", margin, 31);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(178, 170, 205);
    doc.text(`Instituição: ${pdfSafeText(institution, 42)}`, margin, 38);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, 31, { align: "right" });
  };
  page();
  const cards = [["Posições", String(investments.length)], ["Valor de mercado", brl.format(totalMarketValue)], ["Custo consolidado", brl.format(totalCost)]];
  cards.forEach(([label, value], index) => {
    const width = (pageWidth - margin * 2 - 8) / 3;
    const x = margin + index * (width + 4);
    doc.setFillColor(27, 25, 38);
    doc.roundedRect(x, 47, width, 20, 4, 4, "F");
    doc.setTextColor(166, 158, 185);
    doc.setFontSize(8);
    doc.text(String(label), x + 4, 54);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(245, 243, 255);
    doc.text(pdfSafeText(String(value), 22), x + 4, 62);
  });
  for (const item of investments) {
    const operations = [...(item.operations ?? [])].filter(operation => Number(operation.quantity) > 0 && Number(operation.price) >= 0).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const requiredHeight = 28 + Math.max(1, operations.length) * 6;
    if (y + requiredHeight > 278) { doc.addPage(); page(); y = 50; }
    doc.setFillColor(27, 25, 38);
    doc.roundedRect(margin, y, pageWidth - margin * 2, requiredHeight, 4, 4, "F");
    doc.setTextColor(245, 243, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(pdfSafeText(item.ticker || item.name || "Ativo", 34), margin + 5, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(178, 170, 205);
    doc.text(`${pdfSafeText(item.institution || institution, 28)} · ${pdfSafeText(item.category, 24)}`, margin + 5, y + 14);
    doc.text(`Mercado: ${brl.format(investmentMarketValue(item))}`, pageWidth - margin - 5, y + 8, { align: "right" });
    doc.text(`Custo: ${brl.format(investmentCost(item))}`, pageWidth - margin - 5, y + 14, { align: "right" });
    doc.setFontSize(7.5);
    const rows = operations.length ? operations : [{ id: 0, type: "buy" as const, date: item.createdAt.slice(0, 10), quantity: item.quantity, price: item.averagePrice }];
    rows.forEach((operation, index) => {
      const rowY = y + 21 + index * 6;
      doc.setTextColor(operation.type === "buy" ? 110 : 251, operation.type === "buy" ? 231 : 113, operation.type === "buy" ? 183 : 133);
      doc.text(operation.type === "buy" ? "Aplicação" : "Resgate", margin + 5, rowY);
      doc.setTextColor(190, 184, 204);
      doc.text(`${new Date(`${operation.date}T12:00:00`).toLocaleDateString("pt-BR")} · ${Number(operation.quantity).toLocaleString("pt-BR")} × ${brl.format(Number(operation.price))}`, margin + 32, rowY);
      doc.text(brl.format(Number(operation.quantity) * Number(operation.price)), pageWidth - margin - 5, rowY, { align: "right" });
    });
    y += requiredHeight + 5;
  }
  doc.setTextColor(130, 122, 150);
  doc.setFontSize(7);
  doc.text("Extrato gerado a partir das posições e movimentações cadastradas no Findash LVO.", margin, 287);
  downloadPdf(doc, `findash-lvo-extrato-${institution.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-") || "investimentos"}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function invoiceMonthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, value - 1, 1));
}

function pdfSafeText(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, Math.max(0, limit - 1))}…` : value;
}

function invoiceCategorySummary(purchases: CreditCardPurchase[]) {
  const totals = new Map<string, number>();
  purchases.forEach(purchase => {
    const category = purchase.category?.trim() || "Sem categoria";
    totals.set(category, (totals.get(category) ?? 0) + (Number(purchase.amount) || 0));
  });
  return Array.from(totals.entries()).map(([category, value]) => ({ category, value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
}

function drawInvoiceCategoryPie(doc: jsPDF, items: Array<{ category: string; value: number }>, centerX: number, centerY: number, radius: number) {
  const palette = [[139, 92, 246], [34, 211, 238], [52, 211, 153], [251, 191, 36], [251, 113, 133], [96, 165, 250]] as const;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return [] as Array<{ category: string; value: number; color: readonly [number, number, number] }>;
  let angle = -Math.PI / 2;
  return items.slice(0, 6).map((item, index) => {
    const color = palette[index % palette.length];
    const nextAngle = angle + (item.value / total) * Math.PI * 2;
    const steps = Math.max(6, Math.ceil(Math.abs(nextAngle - angle) * 16));
    const segments: number[][] = [];
    let lastX = centerX;
    let lastY = centerY;
    for (let step = 0; step <= steps; step += 1) {
      const currentAngle = angle + ((nextAngle - angle) * step) / steps;
      const x = centerX + Math.cos(currentAngle) * radius;
      const y = centerY + Math.sin(currentAngle) * radius;
      segments.push([x - lastX, y - lastY]);
      lastX = x;
      lastY = y;
    }
    segments.push([centerX - lastX, centerY - lastY]);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.lines(segments, centerX, centerY, [1, 1], "F", true);
    angle = nextAngle;
    return { ...item, color };
  });
}

export function exportCreditCardInvoicePdf({
  card,
  month,
  purchases,
  invoiceAmount,
  isPaid,
  buyerFilterLabel = "Todos os compradores",
  download = true,
}: {
  card: Pick<CreditCard, "name" | "brand" | "dueDay">;
  month: string;
  purchases: CreditCardPurchase[];
  invoiceAmount: number;
  isPaid: boolean;
  /** Campos aceitos somente para compatibilidade com fluxos antigos; não são exibidos no PDF individual. */
  futureInstallmentCount?: number;
  futureInstallmentAmount?: number;
  userName?: string;
  userEmail?: string;
  buyerFilterLabel?: string;
  download?: boolean;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = 297;
  const margin = 14;
  const purple = [139, 92, 246] as const;
  const categories = invoiceCategorySummary(purchases);
  const safeCardName = card.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "");
  const filename = `findash-lvo-fatura-${safeCardName || "cartao"}-${month}.pdf`;
  const paintPage = () => {
    doc.setFillColor(13, 14, 21);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
  };
  const heading = () => {
    doc.setTextColor(236, 232, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(21);
    doc.text("Findash LVO", margin, 21);
    doc.setTextColor(...purple);
    doc.setFontSize(9);
    doc.text("FATURA DE CARTÃO", margin, 28);
    doc.setTextColor(171, 166, 188);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, 21, { align: "right" });
    doc.setTextColor(171, 166, 188);
    doc.setFontSize(8);
    doc.text(`Comprador: ${pdfSafeText(buyerFilterLabel, 42)}`, margin, 34);
  };
  paintPage();
  heading();
  doc.setFillColor(31, 28, 43);
  doc.roundedRect(margin, 43, pageWidth - margin * 2, 31, 5, 5, "F");
  doc.setTextColor(245, 243, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Fatura de ${pdfSafeText(buyerFilterLabel, 34)}`, margin + 7, 55);
  doc.setTextColor(177, 169, 202);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${pdfSafeText(card.name, 20)} · ${card.brand} · competência ${invoiceMonthLabel(month)}`, margin + 7, 63);
  doc.text(`Vencimento dia ${card.dueDay}`, pageWidth - margin - 7, 55, { align: "right" });
  doc.setTextColor(isPaid ? 110 : 250, isPaid ? 231 : 204, isPaid ? 183 : 21);
  doc.setFont("helvetica", "bold");
  doc.text(isPaid ? "FATURA PAGA" : "EM ABERTO", pageWidth - margin - 7, 63, { align: "right" });

  doc.setFillColor(27, 25, 38);
  doc.roundedRect(margin, 82, pageWidth - margin * 2, 25, 4, 4, "F");
  doc.setTextColor(166, 158, 185);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Total da fatura — ${pdfSafeText(buyerFilterLabel, 28)}`, margin + 5, 91);
  doc.setTextColor(245, 243, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(brl.format(invoiceAmount), margin + 5, 101);

  doc.setFillColor(27, 25, 38);
  doc.roundedRect(margin, 115, pageWidth - margin * 2, 49, 4, 4, "F");
  doc.setTextColor(245, 243, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Distribuição por categoria", margin + 5, 124);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(171, 166, 188);
  doc.setFontSize(7.5);
  doc.text(`Comprador: ${buyerFilterLabel}`, pageWidth - margin - 5, 124, { align: "right" });
  const chartItems = drawInvoiceCategoryPie(doc, categories, margin + 25, 143, 14);
  if (!chartItems.length) {
    doc.setTextColor(171, 166, 188);
    doc.setFontSize(8);
    doc.text("Sem gastos por categoria para esta seleção.", margin + 52, 146);
  } else {
    chartItems.forEach((item, index) => {
      const row = index % 3;
      const column = index < 3 ? 0 : 1;
      const x = margin + 52 + column * 67;
      const y = 135 + row * 9;
      doc.setFillColor(...item.color);
      doc.roundedRect(x, y - 3, 3, 3, 0.5, 0.5, "F");
      doc.setTextColor(215, 210, 229);
      doc.setFontSize(7);
      doc.text(pdfSafeText(item.category, 16), x + 5, y);
      doc.text(brl.format(item.value), x + 62, y, { align: "right" });
    });
  }

  let y = 177;
  const rowHeader = () => {
    doc.setTextColor(245, 243, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Lançamentos da fatura", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(164, 156, 185);
    doc.setFontSize(8);
    doc.text(`${purchases.length} compra(s)`, pageWidth - margin, y, { align: "right" });
    y += 8;
    doc.setFillColor(37, 34, 51);
    doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 7, 2, 2, "F");
    doc.setTextColor(187, 181, 203);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("DATA", margin + 3, y);
    doc.text("ESTABELECIMENTO / PRODUTO", margin + 24, y);
    doc.text("PARCELA", pageWidth - 62, y);
    doc.text("VALOR", pageWidth - margin - 3, y, { align: "right" });
    y += 7;
  };
  rowHeader();
  if (!purchases.length) {
    doc.setFillColor(26, 24, 36);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 4, 4, "F");
    doc.setTextColor(185, 178, 203);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Nenhuma compra foi registrada nesta competência.", pageWidth / 2, y + 13, { align: "center" });
    doc.setFontSize(8);
    doc.text("Consulte outra competência para visualizar os lançamentos do cartão.", pageWidth / 2, y + 19, { align: "center" });
  } else {
    purchases.forEach((purchase, index) => {
      if (y > 274) {
        doc.addPage();
        paintPage();
        heading();
        y = 48;
        rowHeader();
      }
      if (index % 2 === 0) {
        doc.setFillColor(25, 23, 34);
        doc.roundedRect(margin, y - 4.5, pageWidth - margin * 2, 7, 1.5, 1.5, "F");
      }
      const date = purchase.purchasedAt ? new Date(purchase.purchasedAt).toLocaleDateString("pt-BR") : "—";
      const title = pdfSafeText(purchase.store ?? purchase.description, 34);
      const product = purchase.product ? ` · ${pdfSafeText(purchase.product, 25)}` : "";
      doc.setTextColor(197, 191, 211);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(date, margin + 3, y);
      doc.text(`${title}${product}`, margin + 24, y);
      doc.text(`${purchase.installmentIndex ?? 1}/${purchase.installmentsTotal ?? 1}`, pageWidth - 60, y);
      doc.setTextColor(245, 243, 255);
      doc.setFont("helvetica", "bold");
      doc.text(brl.format(Number(purchase.amount) || 0), pageWidth - margin - 3, y, { align: "right" });
      y += 8;
    });
  }
  doc.setTextColor(138, 132, 156);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Documento gerado pelo Findash LVO para conferência pessoal.", margin, pageHeight - 12);
  const blob = doc.output("blob") as Blob;
  if (download) downloadPdf(doc, filename);
  return { filename, blob };
}
