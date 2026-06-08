import type { BlockType } from "@/lib/validators/programs";
import type {
  ProgramMacrocycleItem,
  ProgramMesocycleItem,
  ProgramMicrocycleItem,
  ProgramTree,
  ProgramWeekItem,
} from "./types";
import { mergeProgramTreeWeeks } from "./cycle-utils";

type RawExercise = {
  id: string;
  name: string;
};

type RawPrescription = {
  id: string;
  setNumber: number;
  load: string | null;
  reps: string | null;
  restSeconds: number | null;
  tempo: string | null;
  rpe: number | null;
  durationSeconds: number | null;
};

type RawBlockExercise = {
  id: string;
  exerciseId: string;
  sortOrder: number;
  notes: string | null;
  exercise: RawExercise;
  alternatives: Array<{
    id: string;
    exerciseId: string;
    sortOrder: number;
    exercise: RawExercise;
  }>;
  prescriptions: RawPrescription[];
};

type RawBlock = {
  id: string;
  sortOrder: number;
  type: BlockType;
  sharedRestSeconds: number | null;
  rounds: number | null;
  restBetweenRoundsSeconds: number | null;
  durationSeconds: number | null;
  targetRpe: number | null;
  exercises: RawBlockExercise[];
};

type RawSession = {
  id: string;
  sortOrder: number;
  name: string;
  dayOfWeek: number | null;
  scheduledDate: Date | null;
  blocks: RawBlock[];
};

export type RawWeek = {
  id: string;
  sortOrder: number;
  label: string;
  microcycleId?: string | null;
  sessions: RawSession[];
};

type RawMicrocycle = {
  id: string;
  sortOrder: number;
  name: string;
  description: string | null;
  focus: ProgramMesocycleItem["focus"];
  targetDurationWeeks: number | null;
  weeks: RawWeek[];
};

type RawMacrocycle = {
  id: string;
  sortOrder: number;
  name: string;
  description: string | null;
  focus: ProgramMesocycleItem["focus"];
  targetDurationWeeks: number | null;
  microcycles: RawMicrocycle[];
};

type RawMesocycle = {
  id: string;
  sortOrder: number;
  name: string;
  description: string | null;
  focus: ProgramMesocycleItem["focus"];
  targetDurationWeeks: number | null;
  macrocycles: RawMacrocycle[];
};

export type RawProgram = {
  id: string;
  name: string;
  description: string | null;
  status: ProgramTree["status"];
  coachClerkUserId: string;
  publishedAt: Date | null;
  clonedFromProgramId: string | null;
  createdAt: Date;
  updatedAt: Date;
  mesocycles?: RawMesocycle[];
  weeks: RawWeek[];
};

function mapSessions(sessions: RawSession[]) {
  return sessions.map((session) => ({
    id: session.id,
    sortOrder: session.sortOrder,
    name: session.name,
    dayOfWeek: session.dayOfWeek,
    scheduledDate: session.scheduledDate,
    blocks: session.blocks.map((block) => ({
      id: block.id,
      sortOrder: block.sortOrder,
      type: block.type,
      sharedRestSeconds: block.sharedRestSeconds,
      rounds: block.rounds,
      restBetweenRoundsSeconds: block.restBetweenRoundsSeconds,
      durationSeconds: block.durationSeconds,
      targetRpe: block.targetRpe,
      exercises: block.exercises.map((blockExercise) => ({
        id: blockExercise.id,
        exerciseId: blockExercise.exerciseId,
        exerciseName: blockExercise.exercise.name,
        sortOrder: blockExercise.sortOrder,
        notes: blockExercise.notes,
        alternatives: blockExercise.alternatives.map((alt) => ({
          id: alt.id,
          exerciseId: alt.exerciseId,
          exerciseName: alt.exercise.name,
          sortOrder: alt.sortOrder,
        })),
        prescriptions: blockExercise.prescriptions.map((prescription) => ({
          id: prescription.id,
          setNumber: prescription.setNumber,
          load: prescription.load,
          reps: prescription.reps,
          restSeconds: prescription.restSeconds,
          tempo: prescription.tempo,
          rpe: prescription.rpe,
          durationSeconds: prescription.durationSeconds,
        })),
      })),
    })),
  }));
}

function mapWeek(week: RawWeek, context?: {
  mesocycleId?: string;
  macrocycleId?: string;
  microcycleId?: string;
}): ProgramWeekItem {
  return {
    id: week.id,
    sortOrder: week.sortOrder,
    label: week.label,
    microcycleId: context?.microcycleId ?? week.microcycleId ?? null,
    macrocycleId: context?.macrocycleId ?? null,
    mesocycleId: context?.mesocycleId ?? null,
    sessions: mapSessions(week.sessions),
  };
}

function mapMicrocycle(
  microcycle: RawMicrocycle,
  mesocycleId: string,
  macrocycleId: string,
): ProgramMicrocycleItem {
  return {
    id: microcycle.id,
    sortOrder: microcycle.sortOrder,
    name: microcycle.name,
    description: microcycle.description,
    focus: microcycle.focus,
    targetDurationWeeks: microcycle.targetDurationWeeks,
    weeks: microcycle.weeks.map((week) =>
      mapWeek(week, { mesocycleId, macrocycleId, microcycleId: microcycle.id }),
    ),
  };
}

function mapMacrocycle(
  macrocycle: RawMacrocycle,
  mesocycleId: string,
): ProgramMacrocycleItem {
  return {
    id: macrocycle.id,
    sortOrder: macrocycle.sortOrder,
    name: macrocycle.name,
    description: macrocycle.description,
    focus: macrocycle.focus,
    targetDurationWeeks: macrocycle.targetDurationWeeks,
    microcycles: macrocycle.microcycles.map((microcycle) =>
      mapMicrocycle(microcycle, mesocycleId, macrocycle.id),
    ),
  };
}

function mapMesocycle(mesocycle: RawMesocycle): ProgramMesocycleItem {
  return {
    id: mesocycle.id,
    sortOrder: mesocycle.sortOrder,
    name: mesocycle.name,
    description: mesocycle.description,
    focus: mesocycle.focus,
    targetDurationWeeks: mesocycle.targetDurationWeeks,
    macrocycles: mesocycle.macrocycles.map((macrocycle) =>
      mapMacrocycle(macrocycle, mesocycle.id),
    ),
  };
}

export function mapProgramTree(raw: RawProgram): ProgramTree {
  const mesocycles = (raw.mesocycles ?? []).map(mapMesocycle);
  const flatWeeks = raw.weeks
    .filter((week) => !week.microcycleId)
    .map((week) => mapWeek(week));

  const tree: ProgramTree = {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    status: raw.status,
    coachClerkUserId: raw.coachClerkUserId,
    publishedAt: raw.publishedAt,
    clonedFromProgramId: raw.clonedFromProgramId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    mesocycles,
    weeks: flatWeeks,
  };

  return mergeProgramTreeWeeks(tree);
}
