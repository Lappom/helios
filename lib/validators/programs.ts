import { z } from "zod";

export const PROGRAM_STATUSES = ["draft", "published", "archived"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];
export const programStatusSchema = z.enum(PROGRAM_STATUSES);

export const BLOCK_TYPES = [
  "single",
  "superset",
  "triset",
  "circuit",
  "amrap",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
export const blockTypeSchema = z.enum(BLOCK_TYPES);

export const createProgramSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
});

export const patchProgramSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    status: z.enum(["archived"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createWeekSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
});

export const patchWeekSchema = z
  .object({
    label: z.string().trim().min(1).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createSessionSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
});

export const patchSessionSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

const blockConfigBase = {
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
};

export const createBlockSchema = z
  .object({
    type: blockTypeSchema.default("single"),
    exerciseId: z.string().min(1).optional(),
    ...blockConfigBase,
  })
  .superRefine((value, ctx) => {
    if (value.type === "single" && !value.exerciseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "exerciseId is required for single blocks.",
        path: ["exerciseId"],
      });
    }
  });

export const patchBlockSchema = z
  .object({
    type: blockTypeSchema.optional(),
    ...blockConfigBase,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const setPrescriptionSchema = z.object({
  setNumber: z.number().int().min(1).max(50),
  load: z.string().trim().max(50).nullable().optional(),
  reps: z.string().trim().max(50).nullable().optional(),
  restSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  tempo: z.string().trim().max(20).nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  durationSeconds: z.number().int().min(1).max(86400).nullable().optional(),
});

export const patchBlockExerciseSchema = z
  .object({
    notes: z.string().trim().max(5000).nullable().optional(),
    prescriptions: z.array(setPrescriptionSchema).max(50).optional(),
    alternativeExerciseIds: z.array(z.string().min(1)).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});

export const addBlockExerciseSchema = z.object({
  exerciseId: z.string().min(1),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type PatchProgramInput = z.infer<typeof patchProgramSchema>;
export type CreateWeekInput = z.infer<typeof createWeekSchema>;
export type PatchWeekInput = z.infer<typeof patchWeekSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type PatchSessionInput = z.infer<typeof patchSessionSchema>;
export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type PatchBlockInput = z.infer<typeof patchBlockSchema>;
export type PatchBlockExerciseInput = z.infer<typeof patchBlockExerciseSchema>;
export type SetPrescriptionInput = z.infer<typeof setPrescriptionSchema>;

export function parseListProgramsQuery(
  searchParams: URLSearchParams,
  pagination: { page: number; limit: number; offset: number },
) {
  const statusRaw = searchParams.get("status");
  const status =
    statusRaw && PROGRAM_STATUSES.includes(statusRaw as ProgramStatus)
      ? (statusRaw as ProgramStatus)
      : undefined;

  return {
    status,
    search: searchParams.get("search")?.trim() || undefined,
    page: pagination.page,
    limit: pagination.limit,
    offset: pagination.offset,
  };
}
