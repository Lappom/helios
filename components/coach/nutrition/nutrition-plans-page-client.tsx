"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BarChart3, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AssignNutritionDialog } from "@/components/coach/nutrition/assign-nutrition-dialog";
import { ProgramStatusBadge } from "@/components/coach/programs/program-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createNutritionPlanRequest } from "@/lib/nutrition/api-client";
import type { NutritionPlanListItem } from "@/lib/nutrition/types";
import {
  NUTRITION_PLAN_STATUSES,
  type NutritionPlanStatus,
} from "@/lib/validators/nutrition-plans";
import { PROGRAM_STATUS_LABELS } from "@/lib/programs/constants";
import { cn } from "@/lib/utils";

type NutritionPlansPageClientProps = {
  initialPlans: NutritionPlanListItem[];
};

export function NutritionPlansPageClient({
  initialPlans,
}: NutritionPlansPageClientProps) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [statusFilter, setStatusFilter] = useState<NutritionPlanStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [assignPlan, setAssignPlan] = useState<NutritionPlanListItem | null>(
    null,
  );

  const filtered = useMemo(() => {
    return plans.filter((plan) => {
      if (statusFilter !== "all" && plan.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        return plan.name.toLowerCase().includes(search.trim().toLowerCase());
      }
      return true;
    });
  }, [plans, search, statusFilter]);

  async function handleCreate() {
    setCreating(true);
    try {
      const plan = await createNutritionPlanRequest({
        name: "Nouveau plan nutrition",
      });
      setPlans((prev) => [
        {
          id: plan.id,
          name: plan.name,
          status: plan.status,
          coachClerkUserId: plan.coachClerkUserId,
          targetCalories: plan.targetCalories,
          targetProteinG: plan.targetProteinG,
          targetCarbsG: plan.targetCarbsG,
          targetFatG: plan.targetFatG,
          publishedAt: plan.publishedAt,
          mealCount: plan.meals.length,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        },
        ...prev,
      ]);
      router.push(`/coach/nutrition/plans/${plan.id}/edit`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Création impossible",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
            Plans nutrition
          </h1>
          <p className="text-body-md text-muted mt-1">
            Composez des programmes alimentaires et suivez l&apos;adhésion.
          </p>
        </div>
        <Button
          className="bg-primary text-on-primary hover:bg-primary-active font-semibold"
          disabled={creating}
          onClick={() => void handleCreate()}
        >
          Nouveau plan
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un plan…"
          className="border-hairline bg-surface-card text-on-dark max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-semibold",
              statusFilter === "all"
                ? "bg-primary text-on-primary"
                : "text-muted hover:bg-surface-card hover:text-on-dark",
            )}
          >
            Tous
          </button>
          {NUTRITION_PLAN_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold",
                statusFilter === status
                  ? "bg-primary text-on-primary"
                  : "text-muted hover:bg-surface-card hover:text-on-dark",
              )}
            >
              {PROGRAM_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border-hairline bg-surface-card rounded-lg border p-8 text-center">
          <p className="text-muted">Aucun plan nutrition pour le moment.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((plan) => (
            <article
              key={plan.id}
              className="border-hairline bg-surface-card flex flex-col rounded-lg border p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-title-md text-on-dark truncate font-semibold">
                    {plan.name}
                  </h2>
                  <ProgramStatusBadge
                    status={plan.status}
                    className="mt-2"
                  />
                </div>
                <span className="text-caption-uppercase text-muted">
                  {plan.mealCount} repas
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="bg-surface-yellow-band rounded-md px-3 py-2">
                  <p className="text-caption-uppercase text-on-yellow">kcal</p>
                  <p className="text-on-yellow font-bold">
                    {Math.round(plan.targetCalories)}
                  </p>
                </div>
                <div className="bg-surface-elevated rounded-md px-3 py-2">
                  <p className="text-caption-uppercase text-muted">P / G / L</p>
                  <p className="text-on-dark font-semibold">
                    {plan.targetProteinG} / {plan.targetCarbsG} /{" "}
                    {plan.targetFatG}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-hairline"
                  asChild
                >
                  <Link href={`/coach/nutrition/plans/${plan.id}/edit`}>
                    <Pencil className="mr-2 size-4" />
                    Éditer
                  </Link>
                </Button>
                {plan.status === "published" ? (
                  <>
                    <Button
                      variant="outline"
                      className="border-hairline"
                      onClick={() => setAssignPlan(plan)}
                    >
                      <UserPlus className="mr-2 size-4" />
                      Assigner
                    </Button>
                    <Button
                      variant="outline"
                      className="border-hairline"
                      asChild
                    >
                      <Link
                        href={`/coach/nutrition/plans/${plan.id}/adherence`}
                      >
                        <BarChart3 className="mr-2 size-4" />
                        Adhésion
                      </Link>
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {assignPlan ? (
        <AssignNutritionDialog
          planId={assignPlan.id}
          planName={assignPlan.name}
          open={Boolean(assignPlan)}
          onOpenChange={(open) => {
            if (!open) {
              setAssignPlan(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
