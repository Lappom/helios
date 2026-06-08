import type { BlockType, ProgramStatus } from "@/lib/validators/programs";

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  single: "Simple",
  superset: "Superset",
  triset: "Triset",
  circuit: "Circuit",
  amrap: "AMRAP",
};

export const DAY_LABELS = [
  "Dim",
  "Lun",
  "Mar",
  "Mer",
  "Jeu",
  "Ven",
  "Sam",
] as const;
