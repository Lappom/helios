"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AssignNutritionDialog } from "@/components/coach/nutrition/assign-nutrition-dialog";
import { ProgramStatusBadge } from "@/components/coach/programs/program-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  publishNutritionPlanRequest,
  unpublishNutritionPlanRequest,
} from "@/lib/nutrition/api-client";
import type { NutritionPlanTree } from "@/lib/nutrition/types";

type NutritionPublishBarProps = {
  plan: NutritionPlanTree;
  onPlanChange: (plan: NutritionPlanTree) => void;
  saving: boolean;
};

export function NutritionPublishBar({
  plan,
  onPlanChange,
  saving,
}: NutritionPublishBarProps) {
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePublish() {
    setLoading(true);
    try {
      const updated = await publishNutritionPlanRequest(plan.id);
      onPlanChange(updated);
      toast.success("Plan publié");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Publication impossible",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUnpublish() {
    setLoading(true);
    try {
      const updated = await unpublishNutritionPlanRequest(plan.id);
      onPlanChange(updated);
      setConfirmUnpublish(false);
      toast.success("Plan repassé en brouillon");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Action impossible",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="border-hairline bg-surface-card mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
        <div className="min-w-0 space-y-2">
          <Link
            href="/coach/nutrition"
            className="text-muted hover:text-on-dark text-sm transition-colors"
          >
            ← Plans nutrition
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-display-sm text-on-dark truncate font-bold tracking-tight">
              {plan.name}
            </h1>
            <ProgramStatusBadge status={plan.status} />
            {saving ? (
              <span className="text-muted text-xs">Enregistrement…</span>
            ) : null}
          </div>
          {plan.status === "published" ? (
            <p className="text-muted text-sm">
              Plan publié — structure verrouillée.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {plan.status === "draft" ? (
            <Button
              className="bg-primary text-on-primary hover:bg-primary-active font-semibold"
              disabled={loading}
              onClick={() => void handlePublish()}
            >
              Publier
            </Button>
          ) : plan.status === "published" ? (
            <>
              <Button
                variant="outline"
                className="border-hairline"
                asChild
              >
                <Link href={`/coach/nutrition/plans/${plan.id}/adherence`}>
                  Adhésion
                </Link>
              </Button>
              <Button
                className="bg-primary text-on-primary hover:bg-primary-active font-semibold"
                disabled={loading}
                onClick={() => setAssignOpen(true)}
              >
                Assigner
              </Button>
              <Button
                variant="outline"
                className="border-hairline"
                disabled={loading}
                onClick={() => setConfirmUnpublish(true)}
              >
                Repasser en brouillon
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Dialog open={confirmUnpublish} onOpenChange={setConfirmUnpublish}>
        <DialogContent className="border-hairline bg-surface-card">
          <DialogHeader>
            <DialogTitle className="text-on-dark">
              Repasser en brouillon ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-body-md text-muted">
            La structure redeviendra modifiable pour ce plan nutrition.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-hairline"
              onClick={() => setConfirmUnpublish(false)}
            >
              Annuler
            </Button>
            <Button
              className="bg-primary text-on-primary hover:bg-primary-active font-semibold"
              disabled={loading}
              onClick={() => void handleUnpublish()}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignNutritionDialog
        planId={plan.id}
        planName={plan.name}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />
    </>
  );
}
