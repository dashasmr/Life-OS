"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { API_URL, FinanceKind, FinanceRangeSummary, FinanceTransaction } from "@/lib/api";
import { formatEurPlain } from "@/lib/commandCenter";
import { getLocalMonthRangeIso } from "@/lib/datetime";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { FormField } from "@/components/ui/FormField";
import { BodyText, MetricLabel, MetricValue, MutedText, PageTitle } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendWithOfflineQueue } from "@/services/offlineQueue";
import { useLifeOsRealtimeEpoch } from "@/services/realtime";

export type FinanceTabVariant = "full" | "dashboard" | "transactions";

export default function FinancePageClient({ variant = "full" }: { variant?: FinanceTabVariant }) {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [kind, setKind] = useState<FinanceKind>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [monthTotals, setMonthTotals] = useState<FinanceRangeSummary | null>(null);
  const realtimeEpoch = useLifeOsRealtimeEpoch();

  const loadTransactions = useCallback(async () => {
    const response = await fetch(`${API_URL}/finance/transactions?limit=80`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch finance transactions");
    setTransactions(await response.json());
  }, []);

  const loadMonthTotals = useCallback(async () => {
    const { from, to } = getLocalMonthRangeIso();
    const response = await fetch(
      `${API_URL}/finance/summary/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { cache: "no-store" }
    );
    if (!response.ok) throw new Error("Failed to fetch monthly finance summary");
    setMonthTotals(await response.json());
  }, []);

  useEffect(() => {
    const loaders =
      variant === "dashboard"
        ? [loadMonthTotals()]
        : variant === "transactions"
          ? [loadTransactions()]
          : [loadTransactions(), loadMonthTotals()];
    Promise.all(loaders).catch((err: Error) => setError(err.message));
  }, [variant, loadTransactions, loadMonthTotals]);

  useEffect(() => {
    if (realtimeEpoch === 0) return;
    const loaders =
      variant === "dashboard"
        ? [loadMonthTotals()]
        : variant === "transactions"
          ? [loadTransactions()]
          : [loadTransactions(), loadMonthTotals()];
    Promise.all(loaders).catch((err: Error) => setError(err.message));
  }, [realtimeEpoch, variant, loadTransactions, loadMonthTotals]);

  async function onCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number");
      toast.error("Amount must be a positive number");
      return;
    }
    if (!category.trim()) {
      setError("Category is required");
      toast.error("Category is required");
      return;
    }
    try {
      const txBody = {
        kind,
        amount: parsedAmount,
        category: category.trim(),
        note: note.trim() || null
      };
      const result = await sendWithOfflineQueue({ kind: "post_finance_transaction", body: txBody }, () =>
        fetch(`${API_URL}/finance/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(txBody)
        })
      );
      if (result.mode === "queued") {
        toast.info("Pending sync", { description: "Transaction saved locally — will upload when online." });
        setAmount("");
        setCategory("");
        setNote("");
        await Promise.all([loadTransactions(), loadMonthTotals()]);
        return;
      }
      if (!result.response.ok) {
        setError("Failed to create finance transaction");
        toast.error("Failed to create transaction");
        return;
      }
      setAmount("");
      setCategory("");
      setNote("");
      toast.success("Transaction added");
      await Promise.all([loadTransactions(), loadMonthTotals()]);
    } catch {
      setError("Cannot connect to API. Please check backend server.");
      toast.error("Cannot connect to API");
    }
  }

  const monthSummary = monthTotals ?? { income_total: 0, expense_total: 0, balance_delta: 0 };
  const monthHasNoTransactions = monthSummary.income_total === 0 && monthSummary.expense_total === 0;

  const monthMetricStrip = (
    <div className={cn(ds.surfaces.metricBand, variant === "full" ? "mt-ds-3" : "mt-ds-4")}>
      <div className="grid grid-cols-1 gap-x-ds-6 gap-y-ds-4 sm:grid-cols-3">
        <div className="min-w-0 space-y-ds-1">
          <MetricLabel>Income this month</MetricLabel>
          <MetricValue>{formatEurPlain(monthSummary.income_total)}</MetricValue>
        </div>
        <div className="min-w-0 space-y-ds-1">
          <MetricLabel>Expenses this month</MetricLabel>
          <MetricValue>{formatEurPlain(monthSummary.expense_total)}</MetricValue>
        </div>
        <div className="min-w-0 space-y-ds-1">
          <MetricLabel>Monthly balance</MetricLabel>
          <MetricValue
            className={monthSummary.balance_delta >= 0 ? "text-lifeos-success" : "text-lifeos-danger"}
          >
            {formatEurPlain(monthSummary.balance_delta)}
          </MetricValue>
        </div>
      </div>
    </div>
  );

  const monthFootnote = (
    <BodyText as="p" className={cn("mt-ds-2", ds.typography.bodyMuted)}>
      Totals include every transaction in your local calendar month (server aggregate), not only the list below.
    </BodyText>
  );

  const emptyMonthHint =
    monthHasNoTransactions ? (
      <BodyText
        as="p"
        className={cn("mt-ds-3 rounded-ds-card bg-lifeos-muted/35 px-ds-3 py-ds-2 shadow-inner", ds.typography.bodySecondary)}
      >
        <span className="font-semibold text-lifeos-fg">No finance activity this month yet.</span> Add a row when
        something moves.
      </BodyText>
    ) : null;

  const quickAddForm = (
    <div className={cn(ui.formCard, "!mt-0")}>
      <p className={cn(ds.typography.sectionEyebrow, "mb-ds-3")}>Quick add</p>
      <form onSubmit={onCreateTransaction} className={cn(ui.formGrid, "gap-ds-2")}>
        <FormField id="tx-kind" label="Type">
          <Select value={kind} onValueChange={(v) => setKind(v as FinanceKind)}>
            <SelectTrigger id="tx-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="tx-amount" label="Amount">
          <Input
            id="tx-amount"
            className="tabular-nums"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="120.50"
            inputMode="decimal"
          />
        </FormField>
        <FormField id="tx-category" label="Category">
          <Input
            id="tx-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Food, rent, salary"
            autoComplete="off"
          />
        </FormField>
        <FormField id="tx-note" label="Note" optional>
          <Input id="tx-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Client dinner" autoComplete="off" />
        </FormField>
        <div className="flex justify-end md:col-span-2">
          <Button className="h-10 rounded-ds-button" type="submit" variant="primary" size="md">
            ＋ Add
          </Button>
        </div>
      </form>
    </div>
  );

  const transactionsList = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-ds-2">
        <h2 className={ds.typography.sectionTitle}>Recent movement</h2>
        <span className={cn(ds.typography.caption, "tabular-nums text-lifeos-fg-muted")}>{transactions.length} rows</span>
      </div>
      <div className="mt-ds-3 space-y-ds-2">
        {transactions.length === 0 && (
          <div className={cn(ui.emptyState, "py-ds-4 text-sm")}>No transactions yet.</div>
        )}
        {transactions.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-baseline justify-between gap-x-ds-4 gap-y-ds-1 rounded-ds-input bg-lifeos-muted/25 px-ds-3 py-ds-2 shadow-inner"
          >
            <p className={cn(ds.typography.body, "font-medium tabular-nums text-lifeos-fg")}>
              {t.kind === "income" ? "+" : "-"}
              {t.amount.toFixed(2)}{" "}
              <span className="font-normal text-lifeos-fg-secondary">({t.category})</span>
            </p>
            <p className={cn(ds.typography.bodyMuted, "min-w-0 flex-1 text-right")}>{t.note ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (variant === "dashboard") {
    return (
      <div className={ui.contentClass}>
        <section className={cn(ui.panelClass, "space-y-ds-3")}>
          <div>
            <PageTitle>Finance dashboard</PageTitle>
            <MutedText className="mt-ds-2 max-w-[62ch]">Month-to-date totals from the server.</MutedText>
          </div>
          {error && <p className="text-sm text-lifeos-danger">{error}</p>}
          {monthMetricStrip}
          {emptyMonthHint}
          {monthFootnote}
        </section>
      </div>
    );
  }

  if (variant === "transactions") {
    return (
      <div className={ui.contentClass}>
        <section className={cn(ui.panelClass, "space-y-ds-4")}>
          <div>
            <PageTitle>Transactions</PageTitle>
            <MutedText className="mt-ds-2 max-w-[62ch]">Add entries and scan recent movement.</MutedText>
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              transactions.length === 0 ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <p className={ui.microHint}>Tip: add income or expense as soon as it happens</p>
          </div>
          <div className="grid gap-ds-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,34%)] lg:items-start">
            <div className="min-w-0 lg:pt-ds-1">{transactionsList}</div>
            {quickAddForm}
          </div>
          {error && <p className="text-sm text-lifeos-danger">{error}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className={ui.contentClass}>
      <section className={cn(ui.panelClass, "space-y-ds-4")}>
        <div>
          <PageTitle>Finance</PageTitle>
          <MutedText className="mt-ds-2 max-w-[62ch]">
            Track income and expenses. Add rows as they happen so analytics stay accurate.
          </MutedText>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            transactions.length === 0 ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <p className={ui.microHint}>Tip: add income or expense as soon as it happens</p>
        </div>

        <div className="grid gap-ds-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,32%)] lg:items-start">
          <div className="min-w-0 space-y-ds-3">
            {monthMetricStrip}
            {emptyMonthHint}
            {monthFootnote}
            {transactionsList}
          </div>
          <aside className="min-w-0 lg:sticky lg:top-4">{quickAddForm}</aside>
        </div>
        {error && <p className="text-sm text-lifeos-danger">{error}</p>}
      </section>
    </div>
  );
}
