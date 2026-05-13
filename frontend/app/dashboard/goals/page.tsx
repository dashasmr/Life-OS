"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { describeFetchFailure } from "@/lib/api";
import {
  createGoal,
  deleteGoal,
  fetchGoalsForPeriod,
  formatGoalValue,
  goalProgressRatio,
  type Goal,
  type GoalCategory,
  type GoalPeriod,
  type GoalUnit
} from "@/lib/goals";
import { explainGoalStatus } from "@/lib/goals/explainStatus";
import { getLocalMonthRangeIso, getLocalWeekRangeIso } from "@/lib/datetime";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { cn } from "@/lib/utils";
import { PageSectionSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WhyMuted } from "@/components/explainability/WhyLine";
import { toast } from "sonner";

function defaultUnitForCategory(cat: GoalCategory): GoalUnit {
  if (cat === "finance") return "eur";
  if (cat === "home") return "percent";
  return "tasks";
}

function statusLabel(s: Goal["status"]): string {
  if (s === "completed") return "Completed";
  if (s === "at_risk") return "At risk";
  return "On track";
}

function statusClass(s: Goal["status"]): string {
  if (s === "completed") return "text-lifeos-success";
  if (s === "at_risk") return "text-lifeos-danger";
  return "text-lifeos-warning";
}

export default function DashboardGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const monthRange = useMemo(() => getLocalMonthRangeIso(new Date()), []);
  const weekRange = useMemo(() => getLocalWeekRangeIso(new Date()), []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [monthly, weekly] = await Promise.all([
        fetchGoalsForPeriod("monthly", monthRange.from, monthRange.to),
        fetchGoalsForPeriod("weekly", weekRange.from, weekRange.to)
      ]);
      setGoals([...monthly, ...weekly]);
    } catch (e: unknown) {
      setError(describeFetchFailure(e));
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [monthRange.from, monthRange.to, weekRange.from, weekRange.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GoalCategory>("productivity");
  const [targetValue, setTargetValue] = useState("20");
  const [unit, setUnit] = useState<GoalUnit>("tasks");
  const [period, setPeriod] = useState<GoalPeriod>("monthly");

  useEffect(() => {
    setUnit(defaultUnitForCategory(category));
  }, [category]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const target = parseFloat(targetValue);
    if (!title.trim()) {
      toast.error("Please enter a goal title.");
      return;
    }
    if (Number.isNaN(target) || target <= 0) {
      toast.error("Target must be greater than zero.");
      return;
    }
    const range = period === "monthly" ? monthRange : weekRange;
    setSaving(true);
    setError(null);
    try {
      await createGoal(
        { title: title.trim(), category, targetValue: target, unit, period },
        range.from,
        range.to
      );
      setTitle("");
      setTargetValue("20");
      await load();
    } catch (err: unknown) {
      setError(describeFetchFailure(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteGoal(id);
      await load();
    } catch (err: unknown) {
      setError(describeFetchFailure(err));
    }
  }

  const monthlyGoals = goals.filter((g) => g.period === "monthly");
  const weeklyGoals = goals.filter((g) => g.period === "weekly");

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-lifeos-display font-bold tracking-tight text-lifeos-fg">Goals</h1>
        <p className={ui.pageHint}>
          Targets tied to real data: tasks, focus minutes, savings (balance delta), or average home health in the
          window you choose.
        </p>

        {error && <p className="mt-4 text-sm text-lifeos-danger">{error}</p>}

        <form onSubmit={onCreate} className={cn(ds.card.secondary, "mt-ds-5")}>
          <h2 className="text-lifeos-card-title font-semibold tracking-tight text-lifeos-accent">New goal</h2>
          <div className={`mt-ds-4 ${ui.formGrid} lg:grid-cols-3`}>
            <FormField id="goal-title" label="Title" className="md:col-span-2">
              <Input
                id="goal-title"
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                placeholder="Complete 20 tasks"
                autoComplete="off"
                required
              />
            </FormField>

            <FormField id="goal-category" label="Category">
              <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
                <SelectTrigger id="goal-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField id="goal-target" label="Target">
              <Input
                id="goal-target"
                type="number"
                min={0.01}
                step={0.01}
                className="tabular-nums"
                value={targetValue}
                onChange={(ev) => setTargetValue(ev.target.value)}
                required
              />
            </FormField>

            <FormField
              id="goal-unit"
              label="Unit"
              hint={category === "finance" || category === "home" ? "Set by category" : undefined}
            >
              <Select
                value={unit}
                disabled={category === "finance" || category === "home"}
                onValueChange={(v) => setUnit(v as GoalUnit)}
              >
                <SelectTrigger id="goal-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {category === "productivity" ? (
                    <>
                      <SelectItem value="tasks">Tasks</SelectItem>
                      <SelectItem value="minutes">Focus minutes</SelectItem>
                    </>
                  ) : null}
                  {category === "finance" ? <SelectItem value="eur">€ saved (balance delta)</SelectItem> : null}
                  {category === "home" ? <SelectItem value="percent">Home health % (avg)</SelectItem> : null}
                </SelectContent>
              </Select>
            </FormField>

            <FormField id="goal-period" label="Period">
              <Select value={period} onValueChange={(v) => setPeriod(v as GoalPeriod)}>
                <SelectTrigger id="goal-period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <Button type="submit" variant="primary" size="md" disabled={saving} className="mt-ds-4">
            {saving ? "Saving…" : "Create goal"}
          </Button>
        </form>

        {loading && (
          <div className="mt-8">
            <PageSectionSkeleton />
          </div>
        )}

        {!loading && (
          <div className="mt-8 space-y-8">
            <GoalsSection
              label="Monthly goals"
              hint={`Window: local calendar month (same as finance summaries).`}
              items={monthlyGoals}
              onDelete={onDelete}
            />
            <GoalsSection
              label="Weekly goals"
              hint={`Window: local Mon–Sun week.`}
              items={weeklyGoals}
              onDelete={onDelete}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function GoalsSection({
  label,
  hint,
  items,
  onDelete
}: {
  label: string;
  hint: string;
  items: Goal[];
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-lifeos-fg">{label}</h2>
      <p className={`mt-1 text-sm ${ui.mutedText}`}>{hint}</p>
      {items.length === 0 ? (
        <div className={cn("mt-4", ds.surfaces.toneWell)}>
          <p className="font-medium text-lifeos-fg-secondary">No goals in this period yet.</p>
          <p className="mt-2">Create one above. Progress uses real data for the period you pick.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {items.map((g) => {
            const ratio = goalProgressRatio(g);
            const pct = Math.round(ratio * 100);
            return (
              <li key={g.id}>
                <Card className={cn(ui.card, "bg-lifeos-muted/25 p-5")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lifeos-caption font-medium text-lifeos-fg-muted">{g.category}</p>
                      <p className="mt-1 text-lg font-medium text-lifeos-fg">{g.title}</p>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="shrink-0"
                      onClick={() => void onDelete(g.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <p className="mt-3 text-sm tabular-nums text-lifeos-fg">
                    {formatGoalValue(g.currentValue, g.unit)} / {formatGoalValue(g.targetValue, g.unit)}
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-lifeos-muted">
                    <div
                      className="h-full rounded-full bg-lifeos-accent transition-[width] duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={`mt-2 text-sm ${ui.mutedText}`}>{pct}%</p>
                  <p className={`mt-3 text-sm font-medium ${statusClass(g.status)}`}>Status: {statusLabel(g.status)}</p>
                  <WhyMuted text={explainGoalStatus(g)} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
