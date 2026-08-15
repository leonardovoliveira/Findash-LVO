import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  exportJson,
  createLocalTransaction,
  filterLocalTransactions,
  loadLocalTransactions,
  parseBackupJson,
  saveLocalTransactions,
  type LocalTransaction,
} from "@/lib/localTransactions";
import { applyInvestmentQuote, createLocalInvestment, investmentCategories, investmentCost, investmentMarketValue, investmentValue, loadLocalInvestments, saveLocalInvestments, type InvestmentCategory, type LocalInvestment } from "@/lib/localInvestments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, BarChart3, BriefcaseBusiness, CalendarDays, ChevronDown, CircleArrowDown, CircleArrowUp, Coins, Landmark, LayoutDashboard, LogOut, Pencil, Plus, ReceiptText, Sparkles, Trash2, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type FormState = { id?: number; type: "income" | "expense"; description: string; amount: string; category: string; occurredAt: string; icon?: string };
type InvestmentFormState = { id?: number; name: string; ticker: string; category: InvestmentCategory; institution: string; quantity: string; averagePrice: string; currentValue: string; notes: string };
const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const defaultYears = Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - index);
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });


function initialForm(type: "income" | "expense" = "income"): FormState { return { type, description: "", amount: "", category: "", occurredAt: new Date().toISOString().slice(0, 10), icon: type === "income" ? "↗" : "◒" }; }
function initialInvestmentForm(): InvestmentFormState { return { name: "", ticker: "", category: "fixed-income", institution: "", quantity: "", averagePrice: "", currentValue: "", notes: "" }; }

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [form, setForm] = useState<FormState | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [performanceRange, setPerformanceRange] = useState<"week" | "month" | "year">("year");
  const [investmentForm, setInvestmentForm] = useState<InvestmentFormState | null>(null);
  const [investments, setInvestments] = useState<LocalInvestment[]>([]);
  const [hydratedInvestmentsId, setHydratedInvestmentsId] = useState<number | string | null>(null);
  const quoteItems = useMemo(() => investments.filter(item => item.ticker.trim()).map(item => ({ ticker: item.ticker.trim().toUpperCase(), category: item.category })), [investments]);
  const quoteQuery = trpc.quotes.brapiBatch.useQuery({ items: quoteItems }, { enabled: Boolean(user) && quoteItems.length > 0, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false });
  const isTransactions = location === "/lancamentos";
  const isInvestments = location === "/investimentos";
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [hydratedStorageId, setHydratedStorageId] = useState<number | string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const userStorageId = user?.id ?? "default";

  useEffect(() => {
    if (user) {
      setInvestments(loadLocalInvestments(userStorageId));
      setHydratedInvestmentsId(userStorageId);
    }
  }, [user, userStorageId]);

  useEffect(() => {
    if (user && hydratedInvestmentsId === userStorageId) saveLocalInvestments(userStorageId, investments);
  }, [investments, user, userStorageId, hydratedInvestmentsId]);

  useEffect(() => {
    if (!quoteQuery.data?.length) return;
    setInvestments(current => {
      let changed = false;
      const next = current.map(item => {
        const quote = quoteQuery.data.find(result => result.ticker.toUpperCase() === item.ticker.trim().toUpperCase());
        if (!quote) return item;
        const nextItem = applyInvestmentQuote(item, quote);
        if (nextItem.marketPrice === item.marketPrice && nextItem.currentValue === item.currentValue && nextItem.quoteFetchedAt === item.quoteFetchedAt && nextItem.quoteSource === item.quoteSource && nextItem.quoteError === item.quoteError) return item;
        changed = true;
        return nextItem;
      });
      return changed ? next : current;
    });
  }, [quoteQuery.data]);

  useEffect(() => {
    setSelectedDate(`${year}-${String(month).padStart(2, "0")}-01`);
  }, [month, year]);

  useEffect(() => {
    if (user) {
      setTransactions(loadLocalTransactions(userStorageId));
      setHydratedStorageId(userStorageId);
    }
  }, [user, userStorageId]);

  useEffect(() => {
    if (user && hydratedStorageId === userStorageId) saveLocalTransactions(userStorageId, transactions);
  }, [transactions, user, userStorageId, hydratedStorageId]);

  const saving = false;
  const refreshQuotes = () => quoteQuery.refetch();
  const visibleTransactions = useMemo(() => filterLocalTransactions(transactions, month, year), [transactions, month, year]);
  const summary = useMemo(() => visibleTransactions.reduce((acc, item) => { const value = Number(item.amount); item.type === "income" ? acc.income += value : acc.expense += value; return acc; }, { income: 0, expense: 0 }), [visibleTransactions]);
  const yearOptions = useMemo(() => Array.from(new Set([...defaultYears, ...transactions.map(item => new Date(item.occurredAt).getFullYear())])).sort((a, b) => b - a), [transactions]);
  const chartData = useMemo(() => { const buckets = new Map<number, { month: string; income: number; expense: number }>(); for (const item of visibleTransactions) { const m = new Date(item.occurredAt).getMonth(); const current = buckets.get(m) ?? { month: monthNames[m], income: 0, expense: 0 }; current[item.type] += Number(item.amount); buckets.set(m, current); } return Array.from(buckets.values()).sort((a, b) => monthNames.indexOf(a.month) - monthNames.indexOf(b.month)); }, [visibleTransactions]);

  if (loading) return <div className="min-h-screen grid place-items-center"><div className="animate-pulse text-muted-foreground">Carregando seu espaço financeiro...</div></div>;
  if (!user) return <Landing onLogin={startLogin} />;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !user) return;
    const amount = Number(form.amount);
    if (!form.description.trim() || !form.category.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Preencha descrição, valor e categoria");
      return;
    }
    const nowIso = new Date().toISOString();
    if (form.id) {
      setTransactions(current => current.map(item => item.id === form.id ? {
        ...item,
        type: form.type,
        description: form.description.trim(),
        amount: amount.toFixed(2),
        category: form.category.trim(),
        icon: form.icon,
        occurredAt: new Date(`${form.occurredAt}T12:00:00`).toISOString(),
        updatedAt: nowIso,
      } : item));
      toast.success("Lançamento atualizado");
    } else {
      setTransactions(current => createLocalTransaction(current, {
        userId: Number(user.id),
        type: form.type,
        description: form.description.trim(),
        amount: amount.toFixed(2),
        category: form.category.trim(),
        icon: form.icon,
        occurredAt: new Date(`${form.occurredAt}T12:00:00`).toISOString(),
      }));
      toast.success("Lançamento adicionado");
    }
    setForm(null);
  };
  const remove = (id: number) => {
    setTransactions(current => current.filter(item => item.id !== id));
    toast.success("Lançamento excluído");
  };
  const downloadBackup = () => {
    const blob = new Blob([exportJson(transactions)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `findash-lvo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado");
  };
  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseBackupJson(await file.text());
      setTransactions(imported.map((item, index) => ({ ...item, id: index + 1, userId: Number(user?.id ?? 1) })));
      toast.success(`${imported.length} lançamento(s) importado(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar o backup");
    }
  };
  const grouped = { income: visibleTransactions.filter(t => t.type === "income"), expense: visibleTransactions.filter(t => t.type === "expense") };

  return <div className="app-shell min-h-screen text-foreground">
    <aside className="glass-sidebar fixed inset-y-0 left-0 hidden w-64 border-r px-5 py-6 lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-2"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Sparkles className="h-5 w-5" /></div><div><p className="font-semibold tracking-tight">Findash LVO</p><p className="text-xs text-muted-foreground">Seu dinheiro, claro.</p></div></div>
      <nav className="mt-12 space-y-2"><NavItem icon={LayoutDashboard} label="Visão geral" active={!isTransactions && !isInvestments} onClick={() => setLocation("/")} /><NavItem icon={ReceiptText} label="Lançamentos" active={isTransactions} onClick={() => setLocation("/lancamentos")} /><NavItem icon={BriefcaseBusiness} label="Investimentos" active={isInvestments} onClick={() => setLocation("/investimentos")} /></nav>
      <div className="mt-auto rounded-2xl border border-white/8 bg-white/[0.03] p-3"><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarImage src={(user as any).avatarUrl ?? undefined} /><AvatarFallback>{user.name?.slice(0, 1).toUpperCase() ?? "U"}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name ?? "Usuário"}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div></div><Button variant="ghost" size="sm" className="mt-3 w-full justify-start text-muted-foreground" onClick={logout}><LogOut className="mr-2 h-4 w-4" /> Sair</Button></div>
    </aside>
    <main className="lg:pl-64"><header className="glass-header sticky top-0 z-20 border-b px-4 py-4 backdrop-blur-xl sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{isTransactions ? "Controle" : isInvestments ? "Patrimônio" : "Resumo financeiro"}</p><h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{isTransactions ? "Seus lançamentos" : isInvestments ? "Sua carteira de investimentos" : `Olá, ${user.name?.split(" ")[0] ?? "bem-vindo"}.`}</h1></div><div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 sm:flex"><CalendarDays className="h-4 w-4 text-muted-foreground" /><select className="bg-transparent text-sm outline-none" value={month} onChange={e => setMonth(Number(e.target.value))}>{monthNames.map((m, i) => <option className="bg-[#10131b]" key={m} value={i + 1}>{m}</option>)}</select><select className="bg-transparent text-sm outline-none" value={year} onChange={e => setYear(Number(e.target.value))}>{yearOptions.map(option => <option className="bg-[#10131b]" key={option} value={option}>{option}</option>)}</select></div><div className="hidden items-center gap-1 md:flex"><Button variant="ghost" size="sm" onClick={downloadBackup}>Exportar JSON</Button><Button variant="ghost" size="sm" onClick={() => importInputRef.current?.click()}>Importar JSON</Button></div><input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importBackup} /><Button size="icon" className="rounded-xl" onClick={() => setForm(initialForm())}><Plus className="h-5 w-5" /></Button></div></div></header>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8"><div className="grid grid-cols-3 gap-2 sm:hidden"><Button className="w-full px-2 text-xs" variant={!isTransactions && !isInvestments ? "secondary" : "ghost"} onClick={() => setLocation("/")}><LayoutDashboard className="mr-1.5 h-4 w-4 shrink-0" />Resumo</Button><Button className="w-full px-2 text-xs" variant={isTransactions ? "secondary" : "ghost"} onClick={() => setLocation("/lancamentos")}><ReceiptText className="mr-1.5 h-4 w-4 shrink-0" />Lançamentos</Button><Button className="w-full px-2 text-xs" variant={isInvestments ? "secondary" : "ghost"} onClick={() => setLocation("/investimentos")}><BriefcaseBusiness className="mr-1.5 h-4 w-4 shrink-0" />Investimentos</Button></div><div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3 sm:hidden"><CalendarDays className="h-4 w-4 text-muted-foreground" /><select className="flex-1 bg-transparent text-sm outline-none" value={month} onChange={e => setMonth(Number(e.target.value))}>{monthNames.map((m, i) => <option className="bg-[#10131b]" key={m} value={i + 1}>{m}</option>)}</select><span className="text-muted-foreground">/</span><select className="bg-transparent text-sm outline-none" value={year} onChange={e => setYear(Number(e.target.value))}>{yearOptions.map(option => <option className="bg-[#10131b]" key={option} value={option}>{option}</option>)}</select></div><div className="flex gap-2 md:hidden"><Button variant="secondary" size="sm" onClick={downloadBackup}>Exportar JSON</Button><Button variant="secondary" size="sm" onClick={() => importInputRef.current?.click()}>Importar JSON</Button></div>{isTransactions ? <TransactionsPage grouped={grouped} onEdit={(item: any) => setForm({ id: item.id, type: item.type, description: item.description, amount: String(item.amount), category: item.category, icon: item.icon, occurredAt: new Date(item.occurredAt).toISOString().slice(0, 10) })} onDelete={remove} /> : isInvestments ? <InvestmentsPage investments={investments} onAdd={() => setInvestmentForm(initialInvestmentForm())} onRefreshQuotes={refreshQuotes} quotesLoading={quoteQuery.isFetching} onEdit={(item: LocalInvestment) => setInvestmentForm({ id: item.id, name: item.name, ticker: item.ticker, category: item.category, institution: item.institution, quantity: item.quantity, averagePrice: item.averagePrice, currentValue: item.currentValue, notes: item.notes })} onDelete={(id: number) => setInvestments(current => current.filter(item => item.id !== id))} /> : <Dashboard summary={summary} transactions={visibleTransactions} allTransactions={transactions} month={month} year={year} selectedDate={selectedDate} performanceRange={performanceRange} onPerformanceRange={setPerformanceRange} onSelectDate={setSelectedDate} onAdd={() => setForm(initialForm())} investments={investments} onAddInvestment={() => setInvestmentForm(initialInvestmentForm())} onRefreshQuotes={refreshQuotes} quotesLoading={quoteQuery.isFetching} />}</div>
    </main>
    {form && <TransactionModal form={form} setForm={setForm} onSubmit={submit} saving={saving} onClose={() => setForm(null)} />}
    {investmentForm && <InvestmentModal form={investmentForm} setForm={setInvestmentForm} onClose={() => setInvestmentForm(null)} onSubmit={(event: React.FormEvent) => { event.preventDefault(); const quantity = Number(investmentForm.quantity || 0); const averagePrice = Number(investmentForm.averagePrice || 0); const cost = quantity * averagePrice; if (!investmentForm.name.trim() || !Number.isFinite(cost) || cost < 0) { toast.error("Preencha nome, quantidade e preço médio válidos"); return; } const nowIso = new Date().toISOString(); if (investmentForm.id) { setInvestments(current => current.map(item => item.id === investmentForm.id ? { ...item, ...investmentForm, currentValue: String(cost), updatedAt: nowIso } : item)); toast.success("Posição atualizada; atualize a cotação para recalcular o valor de mercado"); } else { setInvestments(current => createLocalInvestment(current, { ...investmentForm, userId: Number(user.id), currentValue: String(cost) })); toast.success("Posição adicionada; buscando cotação automaticamente"); } setInvestmentForm(null); }} />}
  </div>;
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>; }
function Landing({ onLogin }: { onLogin: () => void }) { return <div className="grid min-h-screen place-items-center bg-[#0b0d12] p-6"><div className="w-full max-w-md text-center"><div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-2xl shadow-primary/25"><Wallet className="h-8 w-8" /></div><p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-primary">Findash LVO</p><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Finanças sem ruído.</h1><p className="mx-auto mt-5 max-w-sm text-muted-foreground">Organize entradas, saídas e decisões em um painel simples, visual e feito para você.</p><Button onClick={onLogin} size="lg" className="mt-8 h-12 w-full rounded-xl">Entrar com Google</Button><p className="mt-4 text-xs text-muted-foreground">A autenticação segura carrega seu perfil automaticamente.</p></div></div>; }
function Dashboard({ summary, transactions, allTransactions, month, year, selectedDate, performanceRange, onPerformanceRange, onSelectDate, onAdd, investments, onAddInvestment, onRefreshQuotes, quotesLoading }: any) {
  const biggestExpenses = [...transactions].filter(item => item.type === "expense").sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);
  const biggestIncome = [...transactions].filter(item => item.type === "income").sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);
  const selectedTransactions = allTransactions.filter((item: LocalTransaction) => new Date(item.occurredAt).toISOString().slice(0, 10) === selectedDate);
    const performance = buildPerformanceData(allTransactions, year, month, performanceRange, selectedDate);
  return <div className="space-y-6">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">Painel financeiro</p><h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Uma visão clara do seu dinheiro</h2></div><p className="text-sm text-muted-foreground">{monthNames[month - 1]} de {year}</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div className="space-y-4"><Metric title="Saldo no período" value={money.format(summary.income - summary.expense)} icon={Wallet} accent="text-primary" helper="Resultado líquido" /><CalendarCard compact allTransactions={allTransactions} month={month} year={year} selectedDate={selectedDate} onSelectDate={onSelectDate} /></div>
      <div className="space-y-4"><RankingCard title="Maiores gastos" items={biggestExpenses} empty="Nenhuma saída registrada" tone="expense" /><RankingCard title="Maiores entradas" items={biggestIncome} empty="Nenhuma entrada registrada" tone="income" /></div>
      <InvestmentCard investments={investments} onAdd={onAddInvestment} onRefreshQuotes={onRefreshQuotes} quotesLoading={quotesLoading} />
    </div>
    <div className="grid gap-4 xl:grid-cols-2"><SelectedDayCard date={selectedDate} transactions={selectedTransactions} onAdd={onAdd} /><section className="glass-panel rounded-3xl border p-5"><p className="text-sm font-medium">Resumo do período</p><p className="mt-1 text-xs text-muted-foreground">Use os filtros no cabeçalho para navegar entre meses e anos.</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-emerald-400/8 p-4"><p className="text-xs text-muted-foreground">Entradas</p><p className="mt-2 text-lg font-semibold text-emerald-300">{money.format(summary.income)}</p></div><div className="rounded-2xl bg-rose-400/8 p-4"><p className="text-xs text-muted-foreground">Saídas</p><p className="mt-2 text-lg font-semibold text-rose-300">{money.format(summary.expense)}</p></div></div></section></div>
    <PerformanceCard data={performance} range={performanceRange} onRangeChange={onPerformanceRange} />
  </div>;
}

function RankingCard({ title, items, empty, tone }: any) { return <section className="glass-panel dashboard-card rounded-3xl border p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">No período selecionado</p></div>{tone === "income" ? <ArrowUpRight className="h-5 w-5 text-emerald-400" /> : <ArrowDownRight className="h-5 w-5 text-rose-400" />}</div><div className="mt-5 space-y-3">{items.length ? items.map((item: LocalTransaction, index: number) => <div className="flex items-center gap-3" key={item.id}><span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold ${tone === "income" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm">{item.description}</p><p className="truncate text-xs text-muted-foreground">{item.category}</p></div><strong className={`text-sm ${tone === "income" ? "text-emerald-300" : "text-rose-300"}`}>{money.format(Number(item.amount))}</strong></div>) : <p className="py-4 text-sm text-muted-foreground">{empty}</p>}</div></section>; }

function InvestmentCard({ investments, onAdd, onRefreshQuotes, quotesLoading }: any) { const total = investments.reduce((sum: number, item: LocalInvestment) => sum + investmentMarketValue(item), 0); const cost = investments.reduce((sum: number, item: LocalInvestment) => sum + investmentCost(item), 0); const latestQuote = [...investments].filter(item => item.quoteFetchedAt).sort((a, b) => String(b.quoteFetchedAt).localeCompare(String(a.quoteFetchedAt)))[0]; return <section className="glass-panel dashboard-card relative overflow-hidden rounded-3xl border p-5"><div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" /><div className="flex items-start justify-between"><div><p className="text-sm font-medium">Carteira de investimentos</p><p className="mt-1 text-xs text-muted-foreground">Valor de mercado acompanhado</p></div><BriefcaseBusiness className="h-5 w-5 text-primary" /></div><div className="mt-6"><p className="text-2xl font-semibold">{investments.length ? money.format(total) : "—"}</p><p className="mt-1 text-xs text-muted-foreground">Custo total: {investments.length ? money.format(cost) : "—"}</p><p className="mt-1 text-xs text-muted-foreground">{investments.length ? `${investments.length} posição(ões)` : "Nenhuma posição cadastrada"}</p><p className="mt-2 text-[11px] text-muted-foreground">{latestQuote?.quoteFetchedAt ? `Última cotação: ${new Date(latestQuote.quoteFetchedAt).toLocaleString("pt-BR")} · ${latestQuote.quoteSource ?? "brapi.dev"}` : "Última cotação: ainda não atualizada"}</p></div><div className="mt-5 grid grid-cols-2 gap-2"><Button variant="secondary" size="sm" className="rounded-xl" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Cadastrar</Button><Button variant="ghost" size="sm" className="rounded-xl" onClick={onRefreshQuotes} disabled={quotesLoading || !investments.some((item: LocalInvestment) => item.ticker)}>{quotesLoading ? "Atualizando…" : "Atualizar"}</Button></div></section>; }

function CalendarCard({ allTransactions, month, year, selectedDate, onSelectDate, compact = false }: any) { const daysInMonth = new Date(year, month, 0).getDate(); const firstDay = (new Date(year, month - 1, 1).getDay() + 6) % 7; const byDate = new Map<string, LocalTransaction[]>(); allTransactions.forEach((item: LocalTransaction) => { const key = new Date(item.occurredAt).toISOString().slice(0, 10); byDate.set(key, [...(byDate.get(key) ?? []), item]); }); return <section className={`glass-panel rounded-3xl border ${compact ? "p-4" : "p-5 sm:p-6"}`}><div className="flex items-start justify-between"><div><p className="text-sm font-medium">Calendário financeiro</p><p className="mt-1 text-xs text-muted-foreground">Clique em um dia</p></div><CalendarDays className="h-5 w-5 text-primary" /></div><div className={`${compact ? "mt-3 gap-0.5" : "mt-5 gap-1"} grid grid-cols-7 text-center text-[11px] text-muted-foreground`}>{["S", "T", "Q", "Q", "S", "S", "D"].map((label, index) => <span key={`${label}-${index}`} className="py-1">{label}</span>)}{Array.from({ length: firstDay }).map((_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => index + 1).map(day => { const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const entries = byDate.get(key) ?? []; const active = selectedDate === key; return <button key={key} onClick={() => onSelectDate(key)} className={`relative grid aspect-square place-items-center rounded-xl ${compact ? "text-xs" : "text-sm"} transition ${active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-white/8"}`}>{day}{entries.length > 0 && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${entries.some(item => item.type === "income") ? "bg-emerald-400" : "bg-rose-400"}`} />}</button>; })}</div><div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Entradas</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-rose-400" />Saídas</span></div></section>; }

function SelectedDayCard({ date, transactions, onAdd }: any) { return <section className="glass-panel rounded-3xl border p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-medium">Lançamentos do dia</p><p className="mt-1 text-xs text-muted-foreground">{new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p></div><Button variant="ghost" size="icon" onClick={onAdd}><Plus className="h-4 w-4" /></Button></div><div className="mt-5 space-y-2">{transactions.length ? transactions.map((item: LocalTransaction) => <TransactionRow key={item.id} item={item} />) : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">Nenhum lançamento nesta data.</div>}</div></section>; }

function buildPerformanceData(transactions: LocalTransaction[], year: number, month: number, range: "week" | "month" | "year", selectedDate: string) { const points = range === "year" ? monthNames.map((label, index) => ({ label, start: new Date(year, index, 1), end: new Date(year, index + 1, 0, 23, 59, 59) })) : range === "month" ? Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => ({ label: String(index + 1), start: new Date(year, month - 1, index + 1), end: new Date(year, month - 1, index + 1, 23, 59, 59) })) : Array.from({ length: 7 }, (_, index) => { const end = new Date(`${selectedDate}T12:00:00`); end.setDate(end.getDate() - (6 - index)); return { label: end.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), start: new Date(end.getFullYear(), end.getMonth(), end.getDate()), end: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59) }; }); let balance = 0; return points.map(point => { transactions.filter(item => { const date = new Date(item.occurredAt); return date >= point.start && date <= point.end; }).forEach(item => { balance += item.type === "income" ? Number(item.amount) : -Number(item.amount); }); return { month: point.label, balance }; }); }

function PerformanceCard({ data, range, onRangeChange }: any) { return <section className="glass-panel rounded-3xl border p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium">Performance financeira</p><p className="mt-1 text-xs text-muted-foreground">Evolução acumulada em diferentes escalas</p></div><div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1">{([["week", "Semanal"], ["month", "Mensal"], ["year", "Anual"]] as const).map(([value, label]) => <button key={value} onClick={() => onRangeChange(value)} className={`rounded-lg px-2.5 py-1.5 text-xs transition ${range === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}</div></div><div className="mt-6 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c084fc" stopOpacity={0.38} /><stop offset="100%" stopColor="#c084fc" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8a91a4", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8a91a4", fontSize: 11 }} tickFormatter={value => `R$${Math.round(value / 1000)}k`} /><Tooltip contentStyle={{ background: "#17131f", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14 }} formatter={(value: number) => money.format(value)} /><Area type="monotone" dataKey="balance" stroke="#d19aff" strokeWidth={3} fill="url(#performanceFill)" /></AreaChart></ResponsiveContainer></div></section>; }
function Metric({ title, value, icon: Icon, accent }: any) { return <div className="glass-panel rounded-3xl border p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{title}</p><Icon className={`h-5 w-5 ${accent}`} /></div><p className="mt-5 text-2xl font-semibold tracking-tight">{value}</p></div>; }
function TransactionsPage({ grouped, onEdit, onDelete }: any) { return <div className="space-y-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-semibold">Entradas e saídas</h2><p className="mt-1 text-sm text-muted-foreground">Gerencie cada movimento do seu mês.</p></div><p className="text-sm text-muted-foreground">{grouped.income.length + grouped.expense.length} registros</p></div><div className="grid gap-6 xl:grid-cols-2"><TransactionColumn title="Entradas" subtitle="Receitas, salários e ganhos" items={grouped.income} tone="income" onEdit={onEdit} onDelete={onDelete} /><TransactionColumn title="Saídas" subtitle="Despesas e compromissos" items={grouped.expense} tone="expense" onEdit={onEdit} onDelete={onDelete} /></div></div>; }
function TransactionColumn({ title, subtitle, items, tone, onEdit, onDelete }: any) { return <section className="glass-panel rounded-3xl border p-5 sm:p-6"><div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-2xl ${tone === "income" ? "bg-emerald-400/12 text-emerald-400" : "bg-rose-400/12 text-rose-400"}`}>{tone === "income" ? <CircleArrowUp className="h-5 w-5" /> : <CircleArrowDown className="h-5 w-5" />}</div><div><h3 className="font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></div></div><div className="mt-5 space-y-2">{items.length ? items.map((item: any) => <TransactionRow key={item.id} item={item} actions onEdit={onEdit} onDelete={onDelete} />) : <p className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-muted-foreground">Nenhum registro aqui.</p>}</div></section>; }
function TransactionRow({ item, actions, onEdit, onDelete }: any) { return <div className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/[0.04]"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.type === "income" ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}><span className="text-sm">{item.icon || (item.type === "income" ? "↗" : "◒")}</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.description}</p><p className="text-xs text-muted-foreground">{item.category} · {new Date(item.occurredAt).toLocaleDateString("pt-BR")}</p></div><p className={`text-sm font-semibold ${item.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>{item.type === "income" ? "+" : "−"}{money.format(Number(item.amount))}</p>{actions && <div className="hidden gap-1 group-hover:flex"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}><ChevronDown className="h-4 w-4 rotate-[-90deg]" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button></div>}</div>; }
function EmptyState({ text, onClick }: any) { return <div className="grid h-full place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center"><div><p className="text-sm text-muted-foreground">{text}</p><Button variant="secondary" className="mt-4" onClick={onClick}><Plus className="mr-2 h-4 w-4" />Adicionar lançamento</Button></div></div>; }
function TransactionModal({ form, setForm, onSubmit, saving, onClose }: any) { return <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-md sm:place-items-center sm:p-4"><div className="glass-modal w-full max-w-lg rounded-t-3xl border p-5 shadow-2xl sm:rounded-3xl sm:p-6"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Novo movimento</p><h2 className="mt-1 text-xl font-semibold">{form.id ? "Editar lançamento" : "Adicionar lançamento"}</h2></div><Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button></div><form onSubmit={onSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-2">{(["income", "expense"] as const).map(type => <button type="button" key={type} onClick={() => setForm({ ...form, type })} className={`rounded-xl border px-3 py-3 text-sm font-medium ${form.type === type ? (type === "income" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" : "border-rose-400/40 bg-rose-400/10 text-rose-400") : "border-white/10 text-muted-foreground"}`}>{type === "income" ? "Entrada" : "Saída"}</button>)}</div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Salário, aluguel..." /></div><div className="space-y-2"><Label>Valor</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0,00" /></div><div className="space-y-2 sm:col-span-2"><Label>Categoria e ícone</Label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ label: "Moradia", icon: "⌂" }, { label: "Alimentação", icon: "◒" }, { label: "Transporte", icon: "↗" }, { label: "Lazer", icon: "✦" }, { label: "Salário", icon: "↙" }, { label: "Investimentos", icon: "◈" }].map(option => <button type="button" key={option.label} onClick={() => setForm({ ...form, category: option.label, icon: option.icon })} className={`rounded-xl border p-2.5 text-left transition ${form.category === option.label ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}><span className="mr-2 text-primary">{option.icon}</span><span className="text-xs">{option.label}</span></button>)}</div><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value, icon: "✦" })} placeholder="Ou digite uma categoria personalizada" /></div><div className="space-y-2 sm:col-span-2"><Label>Data</Label><Input type="date" value={form.occurredAt} onChange={e => setForm({ ...form, occurredAt: e.target.value })} /></div></div><Button type="submit" disabled={saving} className="h-11 w-full rounded-xl">{saving ? "Salvando..." : form.id ? "Salvar alterações" : "Adicionar lançamento"}</Button></form></div></div>; }

function InvestmentsPage({ investments, onAdd, onRefreshQuotes, quotesLoading, onEdit, onDelete }: { investments: LocalInvestment[]; onAdd: () => void; onRefreshQuotes: () => void; quotesLoading: boolean; onEdit: (item: LocalInvestment) => void; onDelete: (id: number) => void }) { const total = investments.reduce((sum, item) => sum + investmentMarketValue(item), 0); const cost = investments.reduce((sum, item) => sum + investmentCost(item), 0); return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">Patrimônio pessoal</p><h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Sua carteira de investimentos</h2><p className="mt-2 text-sm text-muted-foreground">Cadastre e acompanhe suas posições no armazenamento local.</p>{(() => { const latest = [...investments].filter(item => item.quoteFetchedAt).sort((a, b) => String(b.quoteFetchedAt).localeCompare(String(a.quoteFetchedAt)))[0]; return <p className="mt-2 text-xs text-muted-foreground">{latest?.quoteFetchedAt ? `Última atualização: ${new Date(latest.quoteFetchedAt).toLocaleString("pt-BR")} · ${latest.quoteSource ?? "brapi.dev"}` : "Última atualização: ainda não realizada"}</p>; })()}</div><div className="flex gap-2"><Button variant="secondary" onClick={onRefreshQuotes} disabled={quotesLoading || !investments.some(item => item.ticker)} className="rounded-xl">{quotesLoading ? "Atualizando…" : "Atualizar cotações"}</Button><Button onClick={onAdd} className="rounded-xl"><Plus className="mr-2 h-4 w-4" />Nova posição</Button></div></div><div className="grid gap-4 sm:grid-cols-3"><Metric title="Valor de mercado" value={investments.length ? money.format(total) : "—"} icon={BriefcaseBusiness} accent="text-primary" /><Metric title="Custo total (q × PM)" value={investments.length ? money.format(cost) : "—"} icon={Wallet} accent="text-violet-300" /><Metric title="Posições" value={String(investments.length)} icon={Landmark} accent="text-emerald-400" /><Metric title="Categorias usadas" value={String(new Set(investments.map(item => item.category)).size)} icon={Coins} accent="text-amber-300" /></div><section className="glass-panel rounded-3xl border p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold">Ativos cadastrados</h3><p className="mt-1 text-xs text-muted-foreground">Renda fixa, variável, fundos, dólar e cripto.</p></div><Button variant="secondary" size="sm" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Adicionar</Button></div>{investments.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{investments.map(item => { const category = investmentCategories.find(option => option.value === item.category); return <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.ticker || "Sem ticker"} · {category?.label}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400" onClick={() => onDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></div><p className="mt-5 text-xl font-semibold">{money.format(investmentMarketValue(item))}</p><p className="mt-1 text-xs text-muted-foreground">Custo q × PM: {money.format(investmentCost(item))}</p><p className="mt-1 text-xs text-muted-foreground">{item.quoteFetchedAt ? `Cotação ${item.quoteSource ?? "externa"} · ${new Date(item.quoteFetchedAt).toLocaleString("pt-BR")}` : item.quoteError ? item.quoteError : "Sem cotação automática"}</p><p className="mt-1 text-xs text-muted-foreground">{item.institution || "Instituição não informada"}</p></article>; })}</div> : <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center"><BriefcaseBusiness className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Sua carteira ainda está vazia.</p><Button variant="secondary" className="mt-4" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Cadastrar primeiro ativo</Button></div>}</section></div>; }

function InvestmentModal({ form, setForm, onSubmit, onClose }: any) { return <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-md sm:place-items-center sm:p-4"><div className="glass-modal max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border p-5 shadow-2xl sm:rounded-3xl sm:p-6"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Carteira</p><h2 className="mt-1 text-xl font-semibold">{form.id ? "Editar posição" : "Cadastrar investimento"}</h2></div><Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button></div><form onSubmit={onSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Nome do ativo</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Tesouro Selic 2029" /></div><div className="space-y-2"><Label>Ticker ou código</Label><Input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder="Ex.: BOVA11, CDB" /></div><div className="space-y-2"><Label>Instituição</Label><Input value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} placeholder="Ex.: Banco ou corretora" /></div><div className="space-y-2 sm:col-span-2"><Label>Categoria</Label><div className="grid gap-2 sm:grid-cols-2">{investmentCategories.map(option => <button type="button" key={option.value} onClick={() => setForm({ ...form, category: option.value })} className={`rounded-xl border p-3 text-left transition ${form.category === option.value ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}><p className="text-sm font-medium">{option.label}</p><p className="mt-1 text-xs text-muted-foreground">{option.detail}</p></button>)}</div></div><div className="space-y-2"><Label>Quantidade</Label><Input type="number" min="0" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" /></div><div className="space-y-2"><Label>Preço médio</Label><Input type="number" min="0" step="0.01" value={form.averagePrice} onChange={e => setForm({ ...form, averagePrice: e.target.value })} placeholder="0,00" /></div><div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3 text-xs text-muted-foreground"><p className="font-medium text-foreground">Valor atual automático</p><p className="mt-1">Será buscado pela brapi.dev usando o ticker. O custo da posição é calculado automaticamente por quantidade × preço médio.</p></div><div className="space-y-2"><Label>Observações</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Opcional" /></div></div><Button type="submit" className="h-11 w-full rounded-xl">{form.id ? "Salvar posição" : "Cadastrar posição"}</Button></form></div></div>; }
