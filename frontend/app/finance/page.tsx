"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, FinanceKind, FinanceTransaction } from "@/lib/api";
import { ui } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [kind, setKind] = useState<FinanceKind>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadTransactions() {
    const response = await fetch(`${API_URL}/finance/transactions?limit=20`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch finance transactions");
    setTransactions(await response.json());
  }

  useEffect(() => {
    loadTransactions().catch((err: Error) => setError(err.message));
  }, []);

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
      const response = await fetch(`${API_URL}/finance/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          amount: parsedAmount,
          category: category.trim(),
          note: note.trim() || null
        })
      });
      if (!response.ok) {
        setError("Failed to create finance transaction");
        toast.error("Failed to create transaction");
        return;
      }
      setAmount("");
      setCategory("");
      setNote("");
      toast.success("Transaction added");
      await loadTransactions();
    } catch {
      setError("Cannot connect to API. Please check backend server.");
      toast.error("Cannot connect to API");
    }
  }

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold">Finance</h1>
        <p className={ui.pageHint}>
          Track income and expenses in one place. Add transactions as they happen to keep your balance and analytics accurate.
        </p>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            transactions.length === 0 ? "mt-3 max-h-10 opacity-100" : "mt-0 max-h-0 opacity-0"
          }`}
        >
          <p className={ui.microHint}>Tip: add income/expense as soon as it happens</p>
        </div>

        <div className={ui.formCard}>
          <form onSubmit={onCreateTransaction} className={ui.formGrid}>
            <div className="grid gap-2">
              <label className={ui.formLabel}>Type</label>
              <select className={ui.inputClass} value={kind} onChange={(e) => setKind(e.target.value as FinanceKind)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className={ui.formLabel}>Amount</label>
              <input className={ui.inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100.00" />
            </div>
            <div className="grid gap-2">
              <label className={ui.formLabel}>Category</label>
              <input className={ui.inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Food, Salary, Transport..." />
            </div>
            <div className="grid gap-2">
              <label className={ui.formLabel}>Note</label>
              <input className={ui.inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional comment" />
            </div>

            <div className="mt-1 flex justify-end md:col-span-2">
              <Button
                className="h-11 rounded-xl bg-[#C6A36B] px-6 text-sm font-medium text-black shadow-[0_4px_20px_rgba(198,163,107,0.2)] hover:-translate-y-px hover:bg-[#A8844F] active:translate-y-0"
                type="submit"
              >
                ＋ Add transaction
              </Button>
            </div>
          </form>
        </div>

      {error && <p className="mt-4 text-[#f7b0a2]">{error}</p>}

        <div className="mt-6 space-y-3">
          {transactions.length === 0 && (
            <div className={ui.emptyState}>No transactions yet. Add your first income or expense above.</div>
          )}
          {transactions.map((t) => (
            <Card key={t.id} className={ui.card}>
            <p className={ui.cardTitle}>
              {t.kind === "income" ? "+" : "-"}
              {t.amount.toFixed(2)} ({t.category})
            </p>
            <p className={`text-sm ${ui.mutedText}`}>{t.note ?? "No note"}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

