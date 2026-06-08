import type {
  BlockType,
  ProgramStatus,
  TrainingPhaseFocus,
} from "@/lib/validators/programs";

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

export type CycleBlockBase = {
  id: string;
  sortOrder: number;
  name: string;
  description: string | null;
  focus: TrainingPhaseFocus | null;
  targetDurationWeeks: number | null;
};

export type ProgramWeekItem = {
  id: string;
  sortOrder: number;
  label: string;
  microcycleId?: string | null;
  macrocycleId?: string | null;
  mesocycleId?: string | null;
  sessions: ProgramSessionItem[];
};

export type ProgramMicrocycleItem = CycleBlockBase & {
  weeks: ProgramWeekItem[];
};

export type ProgramMacrocycleItem = CycleBlockBase & {
  microcycles: ProgramMicrocycleItem[];
};

export type ProgramMesocycleItem = CycleBlockBase & {
  macrocycles: ProgramMacrocycleItem[];
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
  mesocycles: ProgramMesocycleItem[];
  weeks: ProgramWeekItem[];
};

export type ProgramAssignmentStatus =
  | "active"
  | "completed"
  | "paused"
  | "cancelled";

export type ProgramAssignmentItem = {
  id: string;
  programId: string;
  clientId: string;
  coachClerkUserId: string;
  startMesocycleId: string | null;
  startDate: Date;
  endDate: Date | null;
  status: ProgramAssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
  programName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
};

export type ProgramAssignmentWithProgram = ProgramAssignmentItem & {
  program: {
    id: string;
    name: string;
    description: string | null;
    status: ProgramStatus;
  };
};

export type { ScheduledSession } from "./schedule";
