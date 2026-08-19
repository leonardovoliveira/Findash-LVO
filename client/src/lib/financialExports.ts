import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { LocalTransaction } from "./localTransactions";
import type { LocalInvestment } from "./localInvestments";
import type { CreditCard, CreditCardPurchase } from "./localCreditCards";

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

function invoiceMonthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, value - 1, 1));
}

function pdfSafeText(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, Math.max(0, limit - 1))}…` : value;
}

export function filterCreditCardInvoicePurchases(purchases: CreditCardPurchase[], buyer: string) {
  return buyer === "all" ? purchases : purchases.filter(purchase => purchase.buyer === buyer);
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
  futureInstallmentCount,
  futureInstallmentAmount,
  userName,
  userEmail,
  buyerFilterLabel = "Todos os compradores",
  download = true,
}: {
  card: Pick<CreditCard, "name" | "bank" | "bankAddress" | "brand" | "dueDay" | "totalLimit">;
  month: string;
  purchases: CreditCardPurchase[];
  invoiceAmount: number;
  isPaid: boolean;
  futureInstallmentCount: number;
  futureInstallmentAmount: number;
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
  const bankMonogram = (card.bank || "Banco").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase().slice(0, 2) || "BK";
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
    doc.text(`Titular: ${pdfSafeText(userName || "Usuário Findash", 42)}`, margin, 34);
    if (userEmail) doc.text(pdfSafeText(userEmail, 44), margin, 39);
    doc.setFillColor(31, 28, 43);
    doc.roundedRect(pageWidth - margin - 53, 31, 53, 16, 3, 3, "F");
    doc.setFillColor(139, 92, 246);
    doc.roundedRect(pageWidth - margin - 49, 34, 10, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text(bankMonogram, pageWidth - margin - 44, 40.5, { align: "center" });
    doc.setTextColor(236, 232, 255);
    doc.setFontSize(7.5);
    doc.text(pdfSafeText(card.bank || "Banco emissor", 18), pageWidth - margin - 5, 38, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(171, 166, 188);
    doc.setFontSize(5.8);
    doc.text(pdfSafeText(card.bankAddress?.trim() || "Endereço do banco não informado", 38), pageWidth - margin - 5, 42.5, { align: "right" });
  };
  paintPage();
  heading();
  doc.setFillColor(31, 28, 43);
  doc.roundedRect(margin, 47, pageWidth - margin * 2, 31, 5, 5, "F");
  doc.setTextColor(245, 243, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Fatura de ${pdfSafeText(card.name, 34)}`, margin + 7, 59);
  doc.setTextColor(177, 169, 202);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${card.bank} · ${card.brand} · competência ${invoiceMonthLabel(month)}`, margin + 7, 67);
  doc.text(`Vencimento dia ${card.dueDay}`, pageWidth - margin - 7, 59, { align: "right" });
  doc.setTextColor(isPaid ? 110 : 250, isPaid ? 231 : 204, isPaid ? 183 : 21);
  doc.setFont("helvetica", "bold");
  doc.text(isPaid ? "FATURA PAGA" : "EM ABERTO", pageWidth - margin - 7, 67, { align: "right" });

  const summary = [
    ["Valor da fatura", brl.format(invoiceAmount), [245, 243, 255] as const],
    ["Parcelas futuras", `${futureInstallmentCount} · ${brl.format(futureInstallmentAmount)}`, [251, 191, 36] as const],
    ["Limite total", brl.format(Number(card.totalLimit) || 0), purple],
  ];
  summary.forEach(([label, value, color], index) => {
    const width = (pageWidth - margin * 2 - 8) / 3;
    const x = margin + index * (width + 4);
    doc.setFillColor(27, 25, 38);
    doc.roundedRect(x, 86, width, 25, 4, 4, "F");
    doc.setTextColor(166, 158, 185);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(String(label), x + 4, 94);
    doc.setTextColor(...(color as [number, number, number]));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(pdfSafeText(String(value), 22), x + 4, 104);
  });

  doc.setFillColor(27, 25, 38);
  doc.roundedRect(margin, 119, pageWidth - margin * 2, 49, 4, 4, "F");
  doc.setTextColor(245, 243, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Distribuição por categoria", margin + 5, 128);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(171, 166, 188);
  doc.setFontSize(7.5);
  doc.text(`Filtro aplicado: ${buyerFilterLabel}`, pageWidth - margin - 5, 128, { align: "right" });
  const chartItems = drawInvoiceCategoryPie(doc, categories, margin + 25, 147, 14);
  if (!chartItems.length) {
    doc.setTextColor(171, 166, 188);
    doc.setFontSize(8);
    doc.text("Sem gastos por categoria para esta seleção.", margin + 52, 150);
  } else {
    chartItems.forEach((item, index) => {
      const row = index % 3;
      const column = index < 3 ? 0 : 1;
      const x = margin + 52 + column * 67;
      const y = 139 + row * 9;
      doc.setFillColor(...item.color);
      doc.roundedRect(x, y - 3, 3, 3, 0.5, 0.5, "F");
      doc.setTextColor(215, 210, 229);
      doc.setFontSize(7);
      doc.text(pdfSafeText(item.category, 16), x + 5, y);
      doc.text(brl.format(item.value), x + 62, y, { align: "right" });
    });
  }

  let y = 181;
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
