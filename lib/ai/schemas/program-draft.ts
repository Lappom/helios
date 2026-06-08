import { z } from "zod";
import {
  blockTypeSchema,
  trainingPhaseFocusSchema,
} from "@/lib/validators/programs";

const prescriptionDraftSchema = z.object({
  setNumber: z.number().int().min(1).max(50),
  load: z.string().trim().max(50).nullable().optional(),
  reps: z.string().trim().max(50).nullable().optional(),
  restSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  tempo: z.string().trim().max(20).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  durationSeconds: z.number().int().min(1).max(86400).nullable().optional(),
});

const blockExerciseDraftSchema = z.object({
  exerciseQuery: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).nullable().optional(),
  prescriptions: z.array(prescriptionDraftSchema).min(1).max(50),
});

const blockDraftSchema = z.object({
  type: blockTypeSchema.default("single"),
  sharedRestSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  rounds: z.number().int().min(1).max(100).nullable().optional(),
  restBetweenRoundsSeconds: z
    .number()
    .int()
    .min(0)
    .max(3600)
    .nullable()
    .optional(),
  durationSeconds: z.number().int().min(1).max(86400).nullable().optional(),
  targetRpe: z.number().min(1).max(10).nullable().optional(),
  exercises: z.array(blockExerciseDraftSchema).min(1).max(10),
});

const sessionDraftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  blocks: z.array(blockDraftSchema).min(1).max(50),
});

const weekDraftSchema = z.object({
  label: z.string().trim().min(1).max(100),
  sessions: z.array(sessionDraftSchema).min(1).max(14),
});

const microcycleDraftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  focus: trainingPhaseFocusSchema.nullable().optional(),
  targetDurationWeeks: z.number().int().min(1).max(52).nullable().optional(),
  weeks: z.array(weekDraftSchema).min(1).max(12),
});

const macrocycleDraftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  focus: trainingPhaseFocusSchema.nullable().optional(),
  targetDurationWeeks: z.number().int().min(1).max(52).nullable().optional(),
  microcycles: z.array(microcycleDraftSchema).min(1).max(12),
});

const mesocycleDraftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  focus: trainingPhaseFocusSchema.nullable().optional(),
  targetDurationWeeks: z.number().int().min(1).max(52).nullable().optional(),
  macrocycles: z.array(macrocycleDraftSchema).min(1).max(12),
});

export const programDraftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  mesocycles: z.array(mesocycleDraftSchema).min(1).max(12).optional(),
  weeks: z.array(weekDraftSchema).min(1).max(52).optional(),
}).superRefine((value, ctx) => {
  if (!value.mesocycles?.length && !value.weeks?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either mesocycles or weeks must be provided.",
      path: ["weeks"],
    });
  }
});

export type ProgramDraft = z.infer<typeof programDraftSchema>;
export type ResolvedExerciseDraft = {
  exerciseId: string;
  exerciseName: string;
  notes: string | null;
  prescriptions: z.infer<typeof prescriptionDraftSchema>[];
};

export type ResolvedBlockDraft = {
  type: z.infer<typeof blockTypeSchema>;
  sharedRestSeconds: number | null;
  rounds: number | null;
  restBetweenRoundsSeconds: number | null;
  durationSeconds: number | null;
  targetRpe: number | null;
  exercises: ResolvedExerciseDraft[];
};

type ResolvedWeekDraft = {
  label: string;
  sessions: Array<{
    name: string;
    dayOfWeek: number | null;
    blocks: ResolvedBlockDraft[];
  }>;
};

export type ResolvedProgramDraft = {
  name: string;
  description: string | null;
  mesocycles?: Array<{
    name: string;
    focus?: z.infer<typeof trainingPhaseFocusSchema> | null;
    targetDurationWeeks?: number | null;
    macrocycles: Array<{
      name: string;
      focus?: z.infer<typeof trainingPhaseFocusSchema> | null;
      targetDurationWeeks?: number | null;
      microcycles: Array<{
        name: string;
        focus?: z.infer<typeof trainingPhaseFocusSchema> | null;
        targetDurationWeeks?: number | null;
        weeks: ResolvedWeekDraft[];
      }>;
    }>;
  }>;
  weeks: ResolvedWeekDraft[];
  unresolvedExercises: string[];
};
