import { and, asc, eq, isNull } from "drizzle-orm";
import { getOrSet } from "@/lib/cache/get-or-set";
import { cacheKeys } from "@/lib/cache/keys";
import { getDb } from "@/lib/db";
import {
  blockExerciseAlternatives,
  blockExercises,
  exerciseBlocks,
  programMacrocycles,
  programMesocycles,
  programMicrocycles,
  programSessions,
  programs,
  programWeeks,
  setPrescriptions,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import { mapProgramTree } from "./tree-mapper";
import type { ProgramTree } from "./types";

const weekSessionsInclude = {
  orderBy: asc(programWeeks.sortOrder),
  with: {
    sessions: {
      orderBy: asc(programSessions.sortOrder),
      with: {
        blocks: {
          orderBy: asc(exerciseBlocks.sortOrder),
          with: {
            exercises: {
              orderBy: asc(blockExercises.sortOrder),
              with: {
                exercise: true,
                alternatives: {
                  orderBy: asc(blockExerciseAlternatives.sortOrder),
                  with: { exercise: true },
                },
                prescriptions: {
                  orderBy: asc(setPrescriptions.setNumber),
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export async function getProgramRowOrThrow(
  organizationId: string,
  programId: string,
) {
  const program = await getDb().query.programs.findFirst({
    where: and(
      eq(programs.organizationId, organizationId),
      eq(programs.id, programId),
    ),
  });

  if (!program) {
    throw problem({
      type: "not-found",
      title: "Program not found",
      status: 404,
      detail: `Program ${programId} was not found in this organization.`,
    });
  }

  return program;
}

export function assertProgramStructureEditable(program: { status: string }) {
  if (program.status !== "draft") {
    throw problem({
      type: "forbidden",
      title: "Program is locked",
      status: 403,
      detail:
        "Published or archived programs cannot be modified structurally. Unpublish to edit.",
    });
  }
}

export async function fetchProgramRaw(
  organizationId: string,
  programId: string,
) {
  return getDb().query.programs.findFirst({
    where: and(
      eq(programs.organizationId, organizationId),
      eq(programs.id, programId),
    ),
    with: {
      mesocycles: {
        orderBy: asc(programMesocycles.sortOrder),
        with: {
          macrocycles: {
            orderBy: asc(programMacrocycles.sortOrder),
            with: {
              microcycles: {
                orderBy: asc(programMicrocycles.sortOrder),
                with: {
                  weeks: weekSessionsInclude,
                },
              },
            },
          },
        },
      },
      weeks: {
        where: isNull(programWeeks.microcycleId),
        orderBy: asc(programWeeks.sortOrder),
        with: weekSessionsInclude.with,
      },
    },
  });
}

const PROGRAM_TREE_TTL_SECONDS = 30 * 60;

async function fetchProgramTreeUncached(
  organizationId: string,
  programId: string,
): Promise<ProgramTree> {
  const raw = await fetchProgramRaw(organizationId, programId);

  if (!raw) {
    throw problem({
      type: "not-found",
      title: "Program not found",
      status: 404,
      detail: `Program ${programId} was not found in this organization.`,
    });
  }

  return mapProgramTree(raw);
}

export async function getProgramTree(
  organizationId: string,
  programId: string,
  options?: { skipCache?: boolean },
): Promise<ProgramTree> {
  if (options?.skipCache) {
    return fetchProgramTreeUncached(organizationId, programId);
  }

  return getOrSet(
    cacheKeys.programTree(organizationId, programId),
    PROGRAM_TREE_TTL_SECONDS,
    () => fetchProgramTreeUncached(organizationId, programId),
  );
}
