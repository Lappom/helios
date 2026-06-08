import { z } from "zod";

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date format.");

export const startSessionSchema = z.object({
  scheduledDate: dateKeySchema,
});

export const logSetSchema = z.object({
  sessionLogId: z.string().min(1),
  blockExerciseId: z.string().min(1),
  setPrescriptionId: z.string().min(1).optional(),
  setNumber: z.number().int().min(1).max(100),
  exerciseId: z.string().min(1),
  load: z.string().trim().max(100).optional(),
  reps: z.string().trim().max(100).optional(),
  rpe: z.number().min(1).max(10).optional(),
  durationSeconds: z.number().int().min(0).max(86400).optional(),
  skipped: z.boolean().optional().default(false),
});

export const completeSessionSchema = z.object({
  sessionLogId: z.string().min(1),
});

export const analyticsQuerySchema = z.object({
  clientId: z.string().min(1),
  groupBy: z.enum(["mesocycle"]).optional(),
});

export const scheduleQuerySchema = z.object({
  start: dateKeySchema.optional(),
  end: dateKeySchema.optional(),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type LogSetInput = z.infer<typeof logSetSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
