"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { CreateProgramDialog } from "@/components/coach/programs/create-program-dialog";
import { ProgramStatusBadge } from "@/components/coach/programs/program-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  duplicateProgramRequest,
  patchProgramRequest,
} from "@/lib/programs/api-client";
import type { ProgramListItem } from "@/lib/programs/types";
import {
  PROGRAM_STATUSES,
  type ProgramStatus,
} from "@/lib/validators/programs";
import { PROGRAM_STATUS_LABELS } from "@/lib/programs/constants";
import { cn } from "@/lib/utils";

type ProgramsPageClientProps = {
  initialPrograms: ProgramListItem[];
};

export function ProgramsPageClient({
  initialPrograms,
}: ProgramsPageClientProps) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initialPrograms);
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return programs.filter((program) => {
      if (statusFilter !== "all" && program.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        return program.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [programs, search, statusFilter]);

  async function handleDuplicate(programId: string) {
    try {
      const copy = await duplicateProgramRequest(programId);
      setPrograms((prev) => [
        {
          id: copy.id,
          name: copy.name,
          description: copy.description,
          status: copy.status,
          coachClerkUserId: copy.coachClerkUserId,
          publishedAt: copy.publishedAt,
          clonedFromProgramId: copy.clonedFromProgramId,
          weekCount: copy.weeks.length,
          sessionCount: copy.weeks.reduce(
            (total, week) => total + week.sessions.length,
            0,
          ),
          createdAt: copy.createdAt,
          updatedAt: copy.updatedAt,
        },
        ...prev,
      ]);
      toast.success("Programme dupliqué");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Duplication impossible",
      );
    }
  }

  async function handleArchive(programId: string) {
    try {
      const updated = await patchProgramRequest(programId, {
        status: "archived",
      });
      setPrograms((prev) =>
        prev.map((program) =>
          program.id === programId
            ? { ...program, status: updated.status, updatedAt: updated.updatedAt }
            : program,
        ),
      );
      toast.success("Programme archivé");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Archivage impossible",
      );
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
            Programmes
          </h1>
          <p className="text-body-md text-muted mt-2">
            Créez, structurez et publiez vos plans d&apos;entraînement.
          </p>
        </div>
        <CreateProgramDialog />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un programme…"
          className="border-hairline bg-surface-card max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label="Tous"
          />
          {PROGRAM_STATUSES.map((status) => (
            <FilterChip
              key={status}
              active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              label={PROGRAM_STATUS_LABELS[status]}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border-hairline bg-surface-card text-muted rounded-lg border p-10 text-center">
          Aucun programme trouvé. Créez votre premier plan d&apos;entraînement.
        </div>
      ) : (
        <div className="border-hairline bg-surface-card overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="border-hairline hover:bg-transparent">
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Semaines</TableHead>
                <TableHead>Séances</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((program) => (
                <TableRow key={program.id} className="border-hairline">
                  <TableCell>
                    <Link
                      href={`/coach/programs/${program.id}/edit`}
                      className="text-on-dark hover:text-primary font-medium transition-colors"
                    >
                      {program.name}
                    </Link>
                    {program.description ? (
                      <p className="text-muted mt-1 line-clamp-1 text-xs">
                        {program.description}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <ProgramStatusBadge status={program.status} />
                  </TableCell>
                  <TableCell className="text-muted">{program.weekCount}</TableCell>
                  <TableCell className="text-muted">
                    {program.sessionCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-hairline"
                        onClick={() =>
                          router.push(`/coach/programs/${program.id}/edit`)
                        }
                      >
                        <Pencil className="size-3.5" />
                        Éditer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-hairline"
                        onClick={() => void handleDuplicate(program.id)}
                      >
                        <Copy className="size-3.5" />
                        Dupliquer
                      </Button>
                      {program.status !== "archived" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-hairline text-muted"
                          onClick={() => void handleArchive(program.id)}
                        >
                          Archiver
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-hairline text-muted hover:text-on-dark",
      )}
    >
      {label}
    </button>
  );
}
