import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  programMacrocycles,
  programMesocycles,
  programMicrocycles,
  programSessions,
  programs,
  programWeeks,
} from "@/lib/db/schema";
import type { ScheduleSessionInput } from "./schedule";

type LoadScheduleOptions = {
  startMesocycleId?: string | null;
};

export async function loadScheduleSessionInputs(
  organizationId: string,
  programId: string,
  options: LoadScheduleOptions = {},
): Promise<ScheduleSessionInput[]> {
  const program = await getDb().query.programs.findFirst({
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
                  weeks: {
                    orderBy: asc(programWeeks.sortOrder),
                    with: {
                      sessions: {
                        orderBy: asc(programSessions.sortOrder),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      weeks: {
        where: isNull(programWeeks.microcycleId),
        orderBy: asc(programWeeks.sortOrder),
        with: {
          sessions: {
            orderBy: asc(programSessions.sortOrder),
          },
        },
      },
    },
  });

  if (!program) return [];

  const inputs: ScheduleSessionInput[] = [];
  let globalWeekSortOrder = 0;
  let includeSessions = options.startMesocycleId == null;

  for (const mesocycle of program.mesocycles) {
    if (options.startMesocycleId && mesocycle.id === options.startMesocycleId) {
      includeSessions = true;
    }

    if (!includeSessions) {
      for (const macrocycle of mesocycle.macrocycles) {
        for (const microcycle of macrocycle.microcycles) {
          globalWeekSortOrder += microcycle.weeks.length;
        }
      }
      continue;
    }

    for (const macrocycle of mesocycle.macrocycles) {
      for (const microcycle of macrocycle.microcycles) {
        let weekIndexInMicrocycle = 0;
        for (const week of microcycle.weeks) {
          for (const session of week.sessions) {
            inputs.push({
              programSessionId: session.id,
              name: session.name,
              weekLabel: week.label,
              weekSortOrder: globalWeekSortOrder,
              sessionSortOrder: session.sortOrder,
              dayOfWeek: session.dayOfWeek,
              mesocycleId: mesocycle.id,
              mesocycleName: mesocycle.name,
              macrocycleId: macrocycle.id,
              macrocycleName: macrocycle.name,
              microcycleId: microcycle.id,
              microcycleName: microcycle.name,
              focus: microcycle.focus ?? mesocycle.focus,
              weekIndexInMicrocycle: weekIndexInMicrocycle + 1,
              weeksInMicrocycle: microcycle.weeks.length,
            });
          }
          weekIndexInMicrocycle += 1;
          globalWeekSortOrder += 1;
        }
      }
    }
  }

  for (const week of program.weeks) {
    for (const session of week.sessions) {
      inputs.push({
        programSessionId: session.id,
        name: session.name,
        weekLabel: week.label,
        weekSortOrder: globalWeekSortOrder,
        sessionSortOrder: session.sortOrder,
        dayOfWeek: session.dayOfWeek,
      });
    }
    globalWeekSortOrder += 1;
  }

  return inputs;
}
