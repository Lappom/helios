import { and, eq } from "drizzle-orm";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { problem } from "@/lib/api/response";
import { resolveProgramDraft } from "@/lib/ai/exercise-resolver";
import { getAiGenerateModel } from "@/lib/ai/gateway";
import { buildGenerateProgramSystemPrompt } from "@/lib/ai/prompts/generate-program";
import {
  programDraftSchema,
  type ProgramDraft,
} from "@/lib/ai/schemas/program-draft";
import { listExercises } from "@/lib/exercises/service";
import { buildProgramFromAiDraft } from "@/lib/programs/ai-build";
import type { ProgramTree } from "@/lib/programs/types";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import type { AiGenerateProgramInput } from "@/lib/validators/ai";

export type GenerateProgramResult = {
  program: ProgramTree;
  unresolvedExercises: string[];
};

async function loadClientContext(
  organizationId: string,
  clientId: string,
): Promise<string | undefined> {
  const client = await db.query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
    columns: {
      firstName: true,
      lastName: true,
      status: true,
    },
  });

  if (!client) {
    return undefined;
  }

  return `${client.firstName} ${client.lastName} (statut : ${client.status})`;
}

export async function generateProgramFromPrompt(
  organizationId: string,
  coachClerkUserId: string,
  input: AiGenerateProgramInput,
): Promise<GenerateProgramResult> {
  let submittedDraft: ProgramDraft | null = null;

  const clientContext = input.clientId
    ? await loadClientContext(organizationId, input.clientId)
    : undefined;

  const system = buildGenerateProgramSystemPrompt({
    clientContext,
    durationWeeks: input.durationWeeks,
  });

  await generateText({
    model: getAiGenerateModel(),
    system,
    prompt: input.prompt,
    stopWhen: stepCountIs(12),
    tools: {
      searchExercises: tool({
        description:
          "Search exercises in the coach library by name or muscle group.",
        inputSchema: z.object({
          query: z.string().trim().min(1).max(200),
        }),
        execute: async ({ query }) => {
          const { items } = await listExercises(
            organizationId,
            coachClerkUserId,
            {
              search: query,
              page: 1,
              limit: 8,
              offset: 0,
            },
          );

          return items.map((item) => ({
            id: item.id,
            name: item.name,
            muscleGroups: item.muscleGroups,
            equipment: item.equipment,
          }));
        },
      }),
      submitProgramDraft: tool({
        description:
          "Submit the final structured training program draft. Call once when the program is complete.",
        inputSchema: programDraftSchema,
        execute: async (draft) => {
          submittedDraft = draft;
          const weekCount =
            draft.mesocycles?.reduce(
              (sum, meso) =>
                sum +
                meso.macrocycles.reduce(
                  (macroSum, macro) =>
                    macroSum +
                    macro.microcycles.reduce(
                      (microSum, micro) => microSum + micro.weeks.length,
                      0,
                    ),
                  0,
                ),
              0,
            ) ?? draft.weeks?.length ?? 0;
          return { accepted: true, weekCount };
        },
      }),
    },
  });

  if (!submittedDraft) {
    throw problem({
      type: "validation-error",
      title: "Program generation failed",
      status: 422,
      detail:
        "The AI assistant did not return a structured program draft. Try refining your prompt.",
    });
  }

  const resolved = await resolveProgramDraft(
    organizationId,
    coachClerkUserId,
    submittedDraft,
  );

  const program = await buildProgramFromAiDraft(
    organizationId,
    coachClerkUserId,
    resolved,
  );

  return {
    program,
    unresolvedExercises: resolved.unresolvedExercises,
  };
}
