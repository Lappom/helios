"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MacroRingsPanel } from "@/components/client/nutrition/macro-ring";
import { MealLogDialog } from "@/components/client/nutrition/meal-log-dialog";
import { PlannedMealsList } from "@/components/client/nutrition/planned-meals-list";
import { Button } from "@/components/ui/button";
import { fetchMyNutrition } from "@/lib/nutrition/client-api";
import type { ClientNutritionPayload } from "@/lib/nutrition/types";

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function ClientNutritionDashboard() {
  const [anchorDate, setAnchorDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [payload, setPayload] = useState<ClientNutritionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [logMealId, setLogMealId] = useState<string | null>(null);
  const [logMealName, setLogMealName] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyNutrition(formatDayKey(anchorDate));
      setPayload(data);
    } catch {
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [anchorDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function shiftDay(delta: number) {
    setAnchorDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  function openLogDialog(mealId?: string) {
    if (mealId) {
      const meal = payload?.summary.plannedMeals.find(
        (entry) => entry.id === mealId,
      );
      setLogMealId(mealId);
      setLogMealName(meal?.name ?? null);
    } else {
      setLogMealId(null);
      setLogMealName(null);
    }
    setLogOpen(true);
  }

  if (loading) {
    return <p className="text-muted text-sm">Chargement de votre nutrition…</p>;
  }

  if (!payload) {
    return (
      <div className="border-hairline bg-surface-card rounded-lg border p-8 text-center">
        <h1 className="text-title-lg text-on-dark font-bold">Nutrition</h1>
        <p className="text-muted mt-2">
          Aucun plan nutrition actif pour le moment.
        </p>
      </div>
    );
  }

  const { assignment, summary } = payload;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
            Nutrition
          </h1>
          <p className="text-muted mt-1">
            {assignment.plan.name} ·{" "}
            {anchorDate.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="border-hairline"
            onClick={() => shiftDay(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="border-hairline"
            onClick={() => shiftDay(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            className="bg-primary text-on-primary hover:bg-primary-active font-semibold"
            onClick={() => openLogDialog()}
          >
            <Plus className="mr-2 size-4" />
            Logger un repas
          </Button>
        </div>
      </div>

      <MacroRingsPanel
        consumed={summary.consumed}
        targets={summary.targets}
        remaining={summary.remaining}
        inGreenZone={summary.inGreenZone}
      />

      <PlannedMealsList
        meals={summary.plannedMeals}
        onLogMeal={(mealId) => openLogDialog(mealId)}
      />

      {summary.logs.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-title-md text-on-dark font-semibold">
            Repas loggés
          </h2>
          {summary.logs.map((log) => (
            <article
              key={log.id}
              className="border-hairline bg-surface-card rounded-lg border p-4"
            >
              <p className="text-on-dark font-medium">
                {log.mealName ?? "Repas libre"}
              </p>
              <p className="text-muted text-sm">
                {Math.round(log.macros.calories)} kcal · P {log.macros.proteinG}{" "}
                · G {log.macros.carbsG} · L {log.macros.fatG}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      <MealLogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        date={formatDayKey(anchorDate)}
        mealId={logMealId}
        mealName={logMealName}
        onLogged={() => void loadData()}
      />
    </div>
  );
}
