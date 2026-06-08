"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
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
  duplicateProgramRequest,
  publishProgramRequest,
  unpublishProgramRequest,
} from "@/lib/programs/api-client";
import type { ProgramTree } from "@/lib/programs/types";

type ProgramPublishBarProps = {
  program: ProgramTree;
  onProgramChange: (program: ProgramTree) => void;
  saving: boolean;
};

export function ProgramPublishBar({
  program,
  onProgramChange,
  saving,
}: ProgramPublishBarProps) {
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const isLocked = program.status === "published";

  async function handlePublish() {
    setLoading(true);
    try {
      const updated = await publishProgramRequest(program.id);
      onProgramChange(updated);
      toast.success("Programme publié");
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
      const updated = await unpublishProgramRequest(program.id);
      onProgramChange(updated);
      setConfirmUnpublish(false);
      toast.success("Programme repassé en brouillon");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Action impossible",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate() {
    setLoading(true);
    try {
      const copy = await duplicateProgramRequest(program.id);
      toast.success("Copie créée");
      window.location.href = `/coach/programs/${copy.id}/edit`;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Duplication impossible",
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
            href="/coach/programs"
            className="text-muted hover:text-on-dark text-sm transition-colors"
          >
            ← Programmes
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-display-sm text-on-dark truncate font-bold tracking-tight">
              {program.name}
            </h1>
            <ProgramStatusBadge status={program.status} />
            {saving ? (
              <span className="text-muted text-xs">Enregistrement…</span>
            ) : null}
          </div>
          {isLocked ? (
            <p className="text-muted text-sm">
              Programme publié — structure verrouillée. Repassez en brouillon pour
              modifier.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-hairline"
            disabled={loading}
            onClick={() => void handleDuplicate()}
          >
            Dupliquer
          </Button>
          {program.status === "draft" ? (
            <Button
              className="bg-primary text-on-primary hover:bg-primary-active font-semibold"
              disabled={loading}
              onClick={() => void handlePublish()}
            >
              Publier
            </Button>
          ) : program.status === "published" ? (
            <Button
              variant="outline"
              className="border-hairline"
              disabled={loading}
              onClick={() => setConfirmUnpublish(true)}
            >
              Repasser en brouillon
            </Button>
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
            La structure redeviendra modifiable. Les clients assignés (P1.4)
            pourront voir des changements après republication.
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
    </>
  );
}
