import { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  Button,
  Card,
  Disclaimer,
  Loading,
  PageHeader,
  StatTile,
} from "../../components/ui";
import { api } from "../../lib/api";
import { chart, tooltipStyle } from "../../lib/chartTheme";
import type { DietPlan, NutritionLog } from "../../lib/types";

const MACRO_COLORS = chart.series;
const today = () => new Date().toISOString().slice(0, 10);

export function DietPage() {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [food, setFood] = useState("");
  const [kcal, setKcal] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<DietPlan>("/diet/plan").catch(() => null),
      api.get<NutritionLog[]>(`/nutrition/logs?date=${today()}`).catch(() => ({ data: [] })),
    ]).then(([planRes, logsRes]) => {
      if (cancelled) return;
      if (planRes) setPlan(planRes.data);
      setLogs(logsRes?.data ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const { data } = await api.post<DietPlan>("/diet/plan");
      setPlan(data);
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response
          ?.data?.error?.message;
      setError(detail ?? "Could not generate a plan. Complete your profile first.");
    } finally {
      setGenerating(false);
    }
  }

  async function addLog(e: React.FormEvent) {
    e.preventDefault();
    if (!food.trim()) return;
    const { data } = await api.post<NutritionLog>("/nutrition/logs", {
      date: today(),
      food: food.trim(),
      kcal: kcal ? Number(kcal) : null,
    });
    setLogs((prev) => [data, ...prev]);
    setFood("");
    setKcal("");
  }

  const loggedKcal = logs.reduce((sum, l) => sum + (l.kcal ?? 0), 0);
  const macroData = plan?.macros
    ? [
        { name: "Protein", value: plan.macros.protein_g },
        { name: "Carbs", value: plan.macros.carbs_g },
        { name: "Fat", value: plan.macros.fat_g },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="AI Dietician"
        subtitle="A BMI/TDEE-based plan with macros, meals, and a grocery list."
      />

      {loading ? (
        <Loading />
      ) : !plan ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-ink-3">
            No plan yet. Generate one from your profile.
          </p>
          {error && <p className="mt-2 text-sm text-hot">{error}</p>}
          <Button onClick={generate} disabled={generating} className="mt-5">
            {generating ? "Generating…" : "Generate plan"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Headline metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="BMI" value={`${plan.bmi ?? "—"}`} />
            <StatTile label="TDEE (kcal)" value={`${plan.tdee ?? "—"}`} />
            <StatTile label="Target (kcal)" value={`${plan.target_kcal ?? "—"}`} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Macro donut */}
            <Card>
              <h2 className="display text-lg text-ink">Macros (g/day)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={macroData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {macroData.map((_, i) => (
                      <Cell key={i} fill={MACRO_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-ink-3">
                {macroData.map((m, i) => (
                  <span key={m.name} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: MACRO_COLORS[i] }}
                    />
                    {m.name} {m.value}g
                  </span>
                ))}
              </div>
            </Card>

            {/* Meals */}
            <Card>
              <h2 className="display text-lg text-ink">Meals</h2>
              <ul className="mt-4 space-y-4">
                {plan.meals?.map((meal) => (
                  <li key={meal.name}>
                    <div className="flex justify-between">
                      <span className="font-semibold text-ink">{meal.name}</span>
                      <span className="text-sm text-ink-4">{meal.kcal} kcal</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-3">
                      {meal.items.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Grocery + log */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="display text-lg text-ink">Grocery list</h2>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-ink-3">
                {plan.grocery?.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="display text-lg text-ink">
                Today's log{" "}
                <span className="font-sans text-sm font-normal normal-case text-ink-4">
                  ({loggedKcal} kcal logged)
                </span>
              </h2>
              <form onSubmit={addLog} className="mt-4 flex gap-2">
                <input
                  value={food}
                  onChange={(e) => setFood(e.target.value)}
                  placeholder="Food"
                  className="auth-input flex-1"
                />
                <input
                  value={kcal}
                  onChange={(e) => setKcal(e.target.value)}
                  placeholder="kcal"
                  type="number"
                  className="auth-input w-24"
                />
                <Button>Add</Button>
              </form>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-3">
                {logs.length === 0 && (
                  <li className="text-ink-4">No meals logged today.</li>
                )}
                {logs.map((l) => (
                  <li key={l.id} className="flex justify-between">
                    <span>{l.food}</span>
                    <span className="text-ink-4">{l.kcal ?? "—"} kcal</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* Outside the plan branch so it also shows in the loading/empty states. */}
      <Disclaimer>
        Not medical or dietary advice — for general guidance only.
      </Disclaimer>
    </div>
  );
}
