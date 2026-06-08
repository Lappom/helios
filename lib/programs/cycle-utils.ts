import type {
  ProgramMacrocycleItem,
  ProgramMesocycleItem,
  ProgramMicrocycleItem,
  ProgramTree,
  ProgramWeekItem,
} from "./types";

export function flattenWeeksFromMesocycles(
  mesocycles: ProgramMesocycleItem[],
): ProgramWeekItem[] {
  const weeks: ProgramWeekItem[] = [];
  let globalSortOrder = 0;

  for (const mesocycle of mesocycles) {
    for (const macrocycle of mesocycle.macrocycles) {
      for (const microcycle of macrocycle.microcycles) {
        for (const week of microcycle.weeks) {
          weeks.push({
            ...week,
            sortOrder: globalSortOrder,
            microcycleId: microcycle.id,
            mesocycleId: mesocycle.id,
            macrocycleId: macrocycle.id,
          });
          globalSortOrder += 1;
        }
      }
    }
  }

  return weeks;
}

export function countWeeksInMicrocycle(microcycle: ProgramMicrocycleItem): number {
  return microcycle.weeks.length;
}

export function countWeeksInMesocycle(mesocycle: ProgramMesocycleItem): number {
  return mesocycle.macrocycles.reduce(
    (sum, macro) =>
      sum + macro.microcycles.reduce((mSum, micro) => mSum + micro.weeks.length, 0),
    0,
  );
}

export function mergeProgramTreeWeeks(tree: ProgramTree): ProgramTree {
  const mesocycleWeeks = flattenWeeksFromMesocycles(tree.mesocycles);
  const flatWeeks = tree.weeks.filter((week) => !week.microcycleId);
  return {
    ...tree,
    weeks: [...mesocycleWeeks, ...flatWeeks].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    ),
  };
}
