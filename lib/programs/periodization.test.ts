import { describe, expect, it } from "vitest";
import {
  countWeeksInMesocycle,
  countWeeksInMicrocycle,
  flattenWeeksFromMesocycles,
} from "./cycle-utils";
import type {
  ProgramMesocycleItem,
  ProgramMicrocycleItem,
} from "./types";
import { createMesocycleSchema, patchWeekSchema } from "@/lib/validators/programs";
import { buildAssignmentSchedule, daysBetween } from "./schedule";

const microcycle = (
  id: string,
  weeks: ProgramMicrocycleItem["weeks"],
): ProgramMicrocycleItem => ({
  id,
  sortOrder: 0,
  name: "Force",
  description: null,
  focus: "strength",
  targetDurationWeeks: 3,
  weeks,
});

const mesocycleFixture: ProgramMesocycleItem[] = [
  {
    id: "meso-1",
    sortOrder: 0,
    name: "M1",
    description: null,
    focus: null,
    targetDurationWeeks: 4,
    macrocycles: [
      {
        id: "macro-1",
        sortOrder: 0,
        name: "Macro",
        description: null,
        focus: null,
        targetDurationWeeks: null,
        microcycles: [
          microcycle("micro-1", [
            {
              id: "w1",
              sortOrder: 0,
              label: "S1",
              sessions: [],
            },
            {
              id: "w2",
              sortOrder: 1,
              label: "S2",
              sessions: [],
            },
          ]),
        ],
      },
    ],
  },
];

describe("periodization validators", () => {
  it("accepts mesocycle create payload", () => {
    const parsed = createMesocycleSchema.parse({
      name: "Bloc force",
      focus: "strength",
      targetDurationWeeks: 4,
    });
    expect(parsed.name).toBe("Bloc force");
  });

  it("accepts week move payload", () => {
    const parsed = patchWeekSchema.parse({ microcycleId: "micro-1" });
    expect(parsed.microcycleId).toBe("micro-1");
  });
});

describe("cycle utils", () => {
  it("flattens weeks with global sort order", () => {
    const flat = flattenWeeksFromMesocycles(mesocycleFixture);
    expect(flat).toHaveLength(2);
    expect(flat[0]?.sortOrder).toBe(0);
    expect(flat[1]?.sortOrder).toBe(1);
    expect(flat[0]?.microcycleId).toBe("micro-1");
  });

  it("counts weeks in blocks", () => {
    expect(countWeeksInMicrocycle(mesocycleFixture[0]!.macrocycles[0]!.microcycles[0]!)).toBe(2);
    expect(countWeeksInMesocycle(mesocycleFixture[0]!)).toBe(2);
  });
});

describe("assignment schedule with mesocycle offset", () => {
  it("skips earlier mesocycle weeks via global sort order", () => {
    const startDate = new Date(2026, 0, 5);
    startDate.setHours(0, 0, 0, 0);
    const schedule = buildAssignmentSchedule(startDate, [
      {
        programSessionId: "s1",
        name: "A",
        weekLabel: "S1",
        weekSortOrder: 2,
        sessionSortOrder: 0,
        dayOfWeek: 0,
      },
    ]);

    expect(daysBetween(startDate, schedule[0]!.scheduledDate)).toBe(14);
  });
});
