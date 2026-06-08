import type { ScheduledSession } from "@/lib/programs/schedule";
import type {
  ExerciseBlockItem,
  ProgramAssignmentWithProgram,
} from "@/lib/programs/types";

export type SessionScheduleStatus = "planned" | "in_progress" | "completed";

export type EnrichedScheduledSession = Omit<ScheduledSession, "status"> & {
  status: SessionScheduleStatus;
  sessionLogId?: string;
  scheduledDateKey: string;
};

export type SetLogItem = {
  id: string;
  blockExerciseId: string;
  setPrescriptionId: string | null;
  setNumber: number;
  exerciseId: string;
  load: string | null;
  reps: string | null;
  rpe: number | null;
  durationSeconds: number | null;
  skipped: boolean;
};

export type SessionLogItem = {
  id: string;
  assignmentId: string;
  programSessionId: string;
  scheduledDate: Date;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: Date;
  completedAt: Date | null;
};

export type SessionExecutionDetail = {
  assignment: ProgramAssignmentWithProgram;
  sessionLog: SessionLogItem | null;
  setLogs: SetLogItem[];
  programSessionId: string;
  sessionName: string;
  weekLabel: string;
  scheduledDate: Date;
  blocks: ExerciseBlockItem[];
};

export type SessionRecap = {
  sessionLogId: string;
  durationSeconds: number;
  setsCompleted: number;
  setsSkipped: number;
  exercisesCompleted: number;
  exercisesTotal: number;
};

export type VolumeBySessionPoint = {
  sessionLogId: string;
  sessionName: string;
  completedAt: string;
  volume: number;
};

export type LoadProgressionPoint = {
  sessionLogId: string;
  completedAt: string;
  exerciseId: string;
  exerciseName: string;
  maxLoad: number | null;
};

export type MesocycleAnalyticsPoint = {
  mesocycleId: string;
  mesocycleName: string;
  completedSessionsCount: number;
  totalVolume: number;
};

export type ProgramAnalytics = {
  programId: string;
  clientId: string;
  completedSessionsCount: number;
  volumeBySession: VolumeBySessionPoint[];
  loadProgression: LoadProgressionPoint[];
  volumeByMesocycle?: MesocycleAnalyticsPoint[];
};

export type ClientSchedulePayload = {
  assignment: ProgramAssignmentWithProgram;
  sessions: EnrichedScheduledSession[];
};
