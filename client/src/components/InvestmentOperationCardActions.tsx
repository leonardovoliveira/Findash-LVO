import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fixedIncomeContributions, type InvestmentOperationType, type LocalInvestment } from "@/lib/localInvestments";
import { Pencil, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Operation = { id: number; type: InvestmentOperationType; quantity: string; price: string; date: string; institution?: string };
type ActiveOperation = { investment: LocalInvestment; operation: Operation };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function operationRows(investments: LocalInvestment[]) {
  if (typeof document === "undefined") return [] as Array<{ target: HTMLElement; active: ActiveOperation }>;
  const rows: Array<{ target: HTMLElement; active: ActiveOperation }> = [];
  for (const investment of investments) {
    const label = investment.ticker || investment.name || "Ativo";
    const article = Array.from(document.querySelectorAll("article")).find(node => node.textContent?.includes(label));
    const list = article?.querySelector("div.mt-2.space-y-2");
    const movements = [...(investment.operations ?? [])].filter(operation => Number(operation.quantity) > 0 && Number(operation.price) >= 0).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const movementElements = list ? Array.from(list.children).filter(element => !element.hasAttribute("data-investment-operation-actions")) : [];
    if (!list || movementElements.length !== movements.length) continue;
    movements.forEach((operation, index) => { const target = movementElements[index]; if (target instanceof HTMLElement) rows.push({ target, active: { investment, operation } }); });
  }
  return rows;
}

function contributionTargets(investments: LocalInvestment[]) {
  if (typeof document === "undefined") return [] as Array<{ target: HTMLElement; investment: LocalInvestment }>;
  return investments.filter(investment => investment.category === "fixed-income" && (investment.operations?.length ?? 0) > 0).flatMap(investment => {
    const label = investment.ticker || investment.name || "Ativo";
    const article = Array.from(document.querySelectorAll("article")).find(node => node.textContent?.includes(label));
    const target = article?.querySelector("div.mt-2.space-y-2");
    return target instanceof HTMLElement ? [{ target, investment }] : [];
  });
}

function OperationEditDialog({ editing, onClose }: { editing: ActiveOperation; onClose: () => void }) {
  const fixedIncome = editing.investment.category === "fixed-income";
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="glass-modal max-w-md border-white/15"><DialogHeader><DialogTitle>Editar movimentação</DialogTitle><DialogDescription>{editing.investment.ticker || editing.investment.name || "Ativo"} · {editing.operation.type === "buy" ? "Aplicação" : "Resgate"}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const quantity = fixedIncome ? "1" : String(form.get("quantity") ?? ""); const price = String(form.get("price") ?? ""); const date = String(form.get("date") ?? ""); const institution = String(form.get("institution") ?? "").trim(); if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || !Number.isFinite(Number(price)) || Number(price) < 0 || !date || !institution) return; window.dispatchEvent(new CustomEvent("findash:investment-operation-update", { detail: { investmentId: editing.investment.id, operation: { ...editing.operation, quantity, price, date, institution } } })); toast.success("Movimentação atualizada"); onClose(); }}><div className="grid gap-3 sm:grid-cols-2">{!fixedIncome && <div className="space-y-2"><Label>Quantidade</Label><Input name="quantity" type="number" min="0" step="any" defaultValue={editing.operation.quantity} /></div>}<div className={`space-y-2 ${fixedIncome ? "sm:col-span-2" : ""}`}><Label>{fixedIncome ? "Valor aplicado" : "Preço por unidade"}</Label><Input name="price" type="number" min="0" step="0.01" defaultValue={editing.operation.price} /></div><div className="space-y-2 sm:col-span-2"><Label>Instituição</Label><Input name="institution" defaultValue={editing.operation.institution ?? editing.investment.institution} placeholder="Ex.: C6, Inter ou Nomad" /></div><div className="space-y-2 sm:col-span-2"><Label>Data</Label><Input name="date" type="date" defaultValue={editing.operation.date} /></div></div><p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-muted-foreground">{fixedIncome ? "Valor da movimentação" : "Total recalculado"}: <strong className="text-foreground">{money.format(Number(editing.operation.quantity) * Number(editing.operation.price))}</strong></p><DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit">Salvar movimentação</Button></DialogFooter></form></DialogContent></Dialog>;
}

export default function InvestmentOperationCardActions({ investments }: { investments: LocalInvestment[] }) {
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<ActiveOperation | null>(null);
  const rows = useMemo(() => operationRows(investments), [investments, revision]);
  const contributionPanels = useMemo(() => contributionTargets(investments), [investments, revision]);
  useEffect(() => { setRevision(value => value + 1); }, [investments]);
  useEffect(() => { const observer = new MutationObserver(() => setRevision(value => value + 1)); observer.observe(document.body, { childList: true, subtree: true }); return () => observer.disconnect(); }, []);
  return <>{rows.map(({ target, active }) => createPortal(<div data-investment-operation-actions className="ml-auto flex shrink-0 items-center gap-1"><Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Editar movimentação" onClick={() => setEditing(active)}><Pencil className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-400" aria-label="Excluir movimentação" onClick={() => { if (window.confirm("Excluir esta movimentação?")) { window.dispatchEvent(new CustomEvent("findash:investment-operation-delete", { detail: { investmentId: active.investment.id, operationId: active.operation.id } })); toast.success("Movimentação excluída"); } }}><Trash2 className="h-3.5 w-3.5" /></Button></div>, target, `${active.investment.id}-${active.operation.id}`))}{contributionPanels.map(({ target, investment }) => { const contributions = fixedIncomeContributions(investment); return createPortal(<div data-investment-operation-actions className="mt-3 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] p-3"><p className="text-xs font-semibold text-violet-200">Rendimento acumulado por aporte</p><div className="mt-2 space-y-2">{contributions.map(contribution => <div key={contribution.id} className="flex items-center justify-between gap-3 text-xs"><div><p className="font-medium text-foreground">{contribution.institution} · {new Date(`${contribution.date}T12:00:00`).toLocaleDateString("pt-BR")}</p><p className="text-muted-foreground">Aplicado {money.format(contribution.appliedValue)} · Principal atual {money.format(contribution.remainingPrincipal)}</p></div><div className="text-right"><p className="font-semibold text-emerald-300">+{money.format(contribution.profit)}</p><p className="text-muted-foreground">Atual {money.format(contribution.currentValue)}</p></div></div>)}</div></div>, target, `contributions-${investment.id}`); })}{editing && <OperationEditDialog editing={editing} onClose={() => setEditing(null)} />}</>;
}
