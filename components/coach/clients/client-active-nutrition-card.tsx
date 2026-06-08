"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { NutritionAssignmentWithPlan } from "@/lib/nutrition/types";
import { fetchActiveClientNutrition } from "@/lib/nutrition/api-client";

type ClientActiveNutritionCardProps = {
  clientId: string;
};

export function ClientActiveNutritionCard({
  clientId,
}: ClientActiveNutritionCardProps) {
  const [assignment, setAssignment] =
    useState<NutritionAssignmentWithPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setLoading(true);
    setMissing(false);

    fetchActiveClientNutrition(clientId)
      .then((payload) => {
        setAssignment(payload);
      })
      .catch(() => {
        setAssignment(null);
        setMissing(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clientId]);

  return (
    <section className="border-hairline bg-surface-card space-y-4 rounded-lg border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title-lg text-on-dark font-bold">
          Plan nutrition actif
        </h2>
        {assignment ? (
          <Link
            href={`/coach/nutrition/plans/${assignment.planId}/adherence`}
            className="text-primary text-sm font-medium hover:underline"
          >
            Voir l&apos;adhésion
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Chargement…</p>
      ) : missing || !assignment ? (
        <p className="text-muted text-sm">
          Aucun plan nutrition actif pour ce client.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-on-dark text-lg font-semibold">
            {assignment.plan.name}
          </p>
          <p className="text-muted text-sm">
            Depuis le{" "}
            {new Date(assignment.startDate).toLocaleDateString("fr-FR")}
          </p>
          <p className="text-body-sm text-muted">
            {Math.round(assignment.plan.targetCalories)} kcal · P{" "}
            {assignment.plan.targetProteinG} · G {assignment.plan.targetCarbsG}{" "}
            · L {assignment.plan.targetFatG}
          </p>
        </div>
      )}
    </section>
  );
}
