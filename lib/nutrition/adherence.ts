import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  mealLogs,
  nutritionAssignments,
  nutritionPlans,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import {
  computeAdherencePercent,
  isWithinAllMacroTolerance,
  sumMacros,
} from "@/lib/nutrition/macros";
import type { AdherenceDay, PlanAdherenceReport } from "@/lib/nutrition/types";
import type { AdherenceQueryInput } from "@/lib/validators/nutrition-plans";

function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);

  while (cursor <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export async function getPlanAdherence(
  organizationId: string,
  planId: string,
  input: AdherenceQueryInput,
): Promise<PlanAdherenceReport> {
  const plan = await getDb().query.nutritionPlans.findFirst({
    where: and(
      eq(nutritionPlans.organizationId, organizationId),
      eq(nutritionPlans.id, planId),
    ),
  });

  if (!plan) {
    throw problem({
      type: "not-found",
      title: "Nutrition plan not found",
      status: 404,
      detail: `Nutrition plan ${planId} was not found in this organization.`,
    });
  }

  const assignmentFilters = [
    eq(nutritionAssignments.organizationId, organizationId),
    eq(nutritionAssignments.planId, planId),
    eq(nutritionAssignments.status, "active"),
  ];

  if (input.clientId) {
    assignmentFilters.push(eq(nutritionAssignments.clientId, input.clientId));
  }

  const assignments = await getDb().query.nutritionAssignments.findMany({
    where: and(...assignmentFilters),
    with: {
      client: true,
    },
  });

  if (assignments.length === 0) {
    return {
      planId,
      start: input.start,
      end: input.end,
      averageAdherencePercent: 0,
      greenZoneDays: 0,
      totalDays: 0,
      days: [],
    };
  }

  const assignmentIds = assignments.map((row) => row.id);
  const dates = enumerateDates(input.start, input.end);

  const logRows = await getDb().query.mealLogs.findMany({
    where: and(
      eq(mealLogs.organizationId, organizationId),
      inArray(mealLogs.assignmentId, assignmentIds),
      gte(mealLogs.loggedDate, input.start),
      lte(mealLogs.loggedDate, input.end),
    ),
    with: {
      items: true,
    },
  });

  const targets = {
    calories: plan.targetCalories,
    proteinG: plan.targetProteinG,
    carbsG: plan.targetCarbsG,
    fatG: plan.targetFatG,
  };

  const days: AdherenceDay[] = [];

  for (const date of dates) {
    for (const assignment of assignments) {
      const dayLogs = logRows.filter(
        (log) =>
          log.assignmentId === assignment.id && log.loggedDate === date,
      );

      const consumed = sumMacros(
        dayLogs.map((log) =>
          sumMacros(
            log.items.map((item) => ({
              calories: item.calories ?? 0,
              proteinG: item.proteinG ?? 0,
              carbsG: item.carbsG ?? 0,
              fatG: item.fatG ?? 0,
            })),
          ),
        ),
      );

      const adherencePercent = computeAdherencePercent(consumed, targets);
      const inGreenZone = isWithinAllMacroTolerance(consumed, targets);

      days.push({
        date,
        adherencePercent,
        inGreenZone,
        consumed,
        targets,
        clientId: assignment.clientId,
        clientName: `${assignment.client.firstName} ${assignment.client.lastName}`,
      });
    }
  }

  const greenZoneDays = days.filter((day) => day.inGreenZone).length;
  const averageAdherencePercent =
    days.length > 0
      ? Math.round(
          (days.reduce((sum, day) => sum + day.adherencePercent, 0) /
            days.length) *
            10,
        ) / 10
      : 0;

  return {
    planId,
    start: input.start,
    end: input.end,
    averageAdherencePercent,
    greenZoneDays,
    totalDays: days.length,
    days,
  };
}
