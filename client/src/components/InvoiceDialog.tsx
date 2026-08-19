import { useAuth } from "@/_core/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportCreditCardInvoicePdf, filterCreditCardInvoicePurchases } from "@/lib/financialExports";
import type { CreditCard } from "@/lib/localCreditCards";
import { creditCardAvailableLimit, creditCardFutureInstallmentCommitment, creditCardFutureInstallmentCount, creditCardInvoiceComparison, creditCardInvoiceMonthAfter, creditCardInvoiceMonths, creditCardIsInvoicePaid } from "@/lib/localCreditCards";
import { CheckCircle2, ChevronLeft, ChevronRight, Download, Mail, MessageCircle, Minus, ReceiptText, RotateCcw, Share2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function monthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, value - 1, 1));
}

function invoiceAmount(card: CreditCard, month: string) {
  const purchases = (card.purchases ?? []).filter(item => item.invoiceMonth === month).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return purchases || (month === card.invoiceMonth ? Number(card.invoiceAmount) || 0 : 0);
}

function Summary({ title, value, tone = "" }: { title: string; value: string; tone?: string }) {
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"><p className="text-[11px] leading-4 text-muted-foreground">{title}</p><p className={`mt-1 break-words text-base font-semibold sm:text-lg ${tone}`}>{value}</p></div>;
}

export default function InvoiceDialog({ card, month, onClose, onTogglePaid }: { card: CreditCard; month: string; onClose: () => void; onTogglePaid: (id: number, month: string) => void }) {
  const { user } = useAuth();
  const [viewMonth, setViewMonth] = useState(month);
  const [buyer, setBuyer] = useState("all");
  const [confirmReversal, setConfirmReversal] = useState(false);
  const purchases = (card.purchases ?? []).filter(item => item.invoiceMonth === viewMonth);
  const filteredPurchases = filterCreditCardInvoicePurchases(purchases, buyer);
  const buyers = Array.from(new Set(purchases.map(item => item.buyer?.trim()).filter((value): value is string => Boolean(value)))).sort();
  const amount = invoiceAmount(card, viewMonth);
  const exportAmount = buyer === "all" ? amount : filteredPurchases.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const futureAmount = creditCardFutureInstallmentCommitment(card, viewMonth);
  const futureCount = creditCardFutureInstallmentCount(card, viewMonth);
  const comparison = creditCardInvoiceComparison(card, viewMonth);
  const paid = creditCardIsInvoicePaid(card, viewMonth);
  const months = Array.from(new Set([...creditCardInvoiceMonths(card), viewMonth])).sort();
  const comparisonTone = comparison.difference > 0 ? "text-rose-300" : comparison.difference < 0 ? "text-emerald-300" : "text-muted-foreground";
  const ComparisonIcon = comparison.difference > 0 ? TrendingUp : comparison.difference < 0 ? TrendingDown : Minus;
  const selectMonth = (value: string) => { setViewMonth(value); setBuyer("all"); setConfirmReversal(false); };
  const buildPdf = (download = true) => exportCreditCardInvoicePdf({ card, month: viewMonth, purchases: filteredPurchases, invoiceAmount: exportAmount, isPaid: paid, futureInstallmentCount: futureCount, futureInstallmentAmount: futureAmount, userName: user?.name ?? "Usuário Findash", userEmail: user?.email ?? "", buyerFilterLabel: buyer === "all" ? "Todos os compradores" : buyer, download });
  const exportPdf = () => { buildPdf(); toast.success("PDF da fatura gerado"); };
  const share = async (channel: "email" | "whatsapp") => {
    const document = buildPdf(false);
    const title = `Fatura ${card.name} — ${monthLabel(viewMonth)}`;
    const text = `${title}\nValor: ${money.format(exportAmount)}\nVencimento: dia ${card.dueDay}.`;
    const file = new File([document.blob], document.filename, { type: "application/pdf" });
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) { await navigator.share({ title, text, files: [file] }); toast.success("Fatura compartilhada"); return; }
    } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    exportPdf();
    const url = channel === "email" ? `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\nO PDF foi baixado para você anexar.`)}` : `https://wa.me/?text=${encodeURIComponent(`${text}\n\nO PDF foi baixado para você anexar nesta conversa.`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.message(channel === "email" ? "PDF baixado e cliente de e-mail aberto" : "PDF baixado e WhatsApp aberto");
  };
  return <><Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="glass-modal max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-3xl overflow-y-auto border-white/15 p-3 sm:p-5"><div className="space-y-3 sm:space-y-4"><DialogHeader className="space-y-2 text-left"><div className="min-w-0 pr-8"><DialogTitle className="break-words text-lg leading-tight sm:text-2xl">Fatura de {card.name}</DialogTitle><DialogDescription className="mt-1 text-xs capitalize sm:text-sm">{monthLabel(viewMonth)} · vence dia {card.dueDay}</DialogDescription></div><div className="grid grid-cols-[38px_minmax(0,1fr)_38px] items-center gap-2"><Button variant="outline" size="icon" className="h-9 w-9" onClick={() => selectMonth(creditCardInvoiceMonthAfter(viewMonth, -1))} aria-label="Fatura anterior"><ChevronLeft className="h-4 w-4" /></Button><select aria-label="Selecionar competência da fatura" value={viewMonth} onChange={event => selectMonth(event.target.value)} className="h-9 min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-center text-sm font-medium capitalize outline-none focus:ring-2 focus:ring-primary">{months.map(option => <option key={option} value={option} className="bg-[#10131b]">{monthLabel(option)}</option>)}</select><Button variant="outline" size="icon" className="h-9 w-9" onClick={() => selectMonth(creditCardInvoiceMonthAfter(viewMonth, 1))} aria-label="Próxima fatura"><ChevronRight className="h-4 w-4" /></Button></div></DialogHeader><div className="grid grid-cols-2 gap-2 sm:gap-3"><Summary title="Fatura em aberto" value={money.format(paid ? 0 : amount)} /><Summary title="Limite disponível" value={money.format(creditCardAvailableLimit(card, viewMonth))} tone="text-emerald-300" /><Summary title="Vencimento" value={`Dia ${card.dueDay}`} /><div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"><p className="flex items-center gap-1 text-[11px] leading-4 text-muted-foreground"><ComparisonIcon className={`h-3.5 w-3.5 shrink-0 ${comparisonTone}`} />Comparação mensal</p><p className={`mt-1 break-words text-base font-semibold sm:text-lg ${comparisonTone}`}>{comparison.difference === 0 ? "Sem variação" : `${comparison.difference > 0 ? "+" : "−"}${money.format(Math.abs(comparison.difference))}`}</p><p className="mt-1 text-[10px] leading-3 text-muted-foreground">{comparison.percentage === null ? "Sem histórico anterior" : `${Math.abs(comparison.percentage).toFixed(1)}% vs. ${monthLabel(comparison.previousMonth)}`}</p></div></div><div className={`rounded-2xl border px-3 py-2.5 text-xs ${futureCount > 0 ? "border-amber-300/25 bg-amber-300/[0.07] text-amber-100" : "border-white/10 bg-white/[0.025] text-muted-foreground"}`}><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><span className="font-medium">Parcelas futuras</span><strong>{futureCount > 0 ? `${futureCount} parcela(s) · ${money.format(futureAmount)}` : "Nenhuma parcela futura"}</strong></div></div><section><div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">Lançamentos</p><span className="text-xs text-muted-foreground">{purchases.length} compra(s)</span></div><div className="max-h-48 space-y-1.5 overflow-y-auto pr-1 sm:max-h-60">{purchases.length ? purchases.map(purchase => <div key={purchase.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] px-2.5 py-2 text-xs"><ReceiptText className="h-3.5 w-3.5 text-primary" /><div className="min-w-0"><p className="truncate font-medium">{purchase.store ?? purchase.description}</p><p className="truncate text-[10px] text-muted-foreground">{purchase.product ?? purchase.description}{purchase.category ? ` · ${purchase.category}` : ""}{purchase.buyer ? ` · ${purchase.buyer}` : ""}</p></div><strong className="whitespace-nowrap">{money.format(Number(purchase.amount) || 0)}</strong></div>) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-xs text-muted-foreground">Nenhuma compra nesta fatura.</div>}</div></section><DialogFooter className="block border-t border-white/10 pt-3"><div className="grid gap-2"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><select aria-label="Filtrar compras por comprador para exportar" value={buyer} onChange={event => setBuyer(event.target.value)} className="h-9 min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-xs outline-none focus:ring-2 focus:ring-primary"><option value="all" className="bg-[#10131b]">Todos os compradores</option>{buyers.map(value => <option key={value} value={value} className="bg-[#10131b]">{value}</option>)}</select><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" className="h-9 px-3"><Share2 className="mr-1.5 h-4 w-4" />Compartilhar</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="glass-panel min-w-48 border-white/15"><DropdownMenuItem onClick={exportPdf}><Download className="h-4 w-4" />Exportar PDF</DropdownMenuItem><DropdownMenuItem onClick={() => share("email")}><Mail className="h-4 w-4" />Enviar por e-mail</DropdownMenuItem><DropdownMenuItem onClick={() => share("whatsapp")}><MessageCircle className="h-4 w-4" />Enviar por WhatsApp</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><div className="grid grid-cols-2 gap-2"><Button type="button" variant="ghost" className="h-9" onClick={onClose}>Fechar</Button>{paid ? <Button variant="secondary" className="h-9" onClick={() => setConfirmReversal(true)}><RotateCcw className="mr-1.5 h-4 w-4" />Desfazer</Button> : <Button className="h-9" onClick={() => { onTogglePaid(card.id, viewMonth); toast.success("Fatura baixada com sucesso"); }}><CheckCircle2 className="mr-1.5 h-4 w-4" />Dar baixa</Button>}</div></div><p className="mt-2 text-[10px] leading-3 text-muted-foreground">No celular, o PDF pode seguir como anexo; no desktop, será baixado para anexação.</p></DialogFooter></div></DialogContent></Dialog><AlertDialog open={confirmReversal} onOpenChange={setConfirmReversal}><AlertDialogContent className="glass-modal max-w-md border-white/15"><AlertDialogHeader><AlertDialogTitle>Desfazer a baixa?</AlertDialogTitle></AlertDialogHeader><p className="text-sm text-muted-foreground">A fatura de {monthLabel(viewMonth)} voltará a comprometer o limite disponível.</p><AlertDialogFooter><AlertDialogCancel>Manter baixa</AlertDialogCancel><AlertDialogAction onClick={() => { onTogglePaid(card.id, viewMonth); setConfirmReversal(false); toast.success("Baixa da fatura desfeita"); }} className="bg-rose-500 text-white hover:bg-rose-600">Desfazer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
