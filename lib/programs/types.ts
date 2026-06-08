import type { BlockType, ProgramStatus } from "@/lib/validators/programs";

export type ProgramListItem = {
  id: string;
  name: string;
  description: string | null;
  status: ProgramStatus;
  coachClerkUserId: string;
  publishedAt: Date | null;
  clonedFromProgramId: string | null;
  weekCount: number;
  sessionCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SetPrescriptionItem = {
  id: string;
  setNumber: number;
  load: string | null;
  reps: string | null;
  restSeconds: number | null;
  tempo: string | null;
  rpe: number | null;
  durationSeconds: number | null;
};

export type BlockExerciseAlternativeItem = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sortOrder: number;
};

export type BlockExerciseItem = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sortOrder: number;
  notes: string | null;
  alternatives: BlockExerciseAlternativeItem[];
  prescriptions: SetPrescriptionItem[];
};

export type ExerciseBlockItem = {
  id: string;
  sortOrder: number;
  type: BlockType;
  sharedRestSeconds: number | null;
  rounds: number | null;
  restBetweenRoundsSeconds: number | null;
  durationSeconds: number | null;
  targetRpe: number | null;
  exercises: BlockExerciseItem[];
};

export type ProgramSessionItem = {
  id: string;
  sortOrder: number;
  name: string;
  dayOfWeek: number | null;
  scheduledDate: Date | null;
  blocks: ExerciseBlockItem[];
};

export type ProgramWeekItem = {
  id: string;
  sortOrder: number;
  label: string;
  sessions: ProgramSessionItem[];
};

export type ProgramTree = {
  id: string;
  name: string;
  description: string | null;
  status: ProgramStatus;
  coachClerkUserId: string;
  publishedAt: Date | null;
  clonedFromProgramId: string | null;
  createdAt: Date;
  updatedAt: Date;
  weeks: ProgramWeekItem[];
};
