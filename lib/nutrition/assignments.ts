import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { clients, nutritionAssignments, nutritionPlans } from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import type { NutritionAssignmentItem, NutritionAssignmentWithPlan } from "@/lib/nutrition/types";
import type { AssignNutritionPlanInput } from "@/lib/validators/nutrition-plans";

const ASSIGNABLE_STATUSES = ["ACTIVE", "TRIAL"] as const;

async function getPlanOrThrow(organizationId: string, planId: string) {
  const plan = await db.query.nutritionPlans.findFirst({
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

  return plan;
}

function mapAssignmentRow(
  row: typeof nutritionAssignments.$inferSelect & {
    plan?: {
      id: string;
      name: string;
      status: string;
      targetCalories: number;
      targetProteinG: number;
      targetCarbsG: number;
      targetFatG: number;
    };
    client?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  },
): NutritionAssignmentItem {
  return {
    id: row.id,
    planId: row.planId,
    clientId: row.clientId,
    coachClerkUserId: row.coachClerkUserId,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    planName: row.plan?.name,
    clientFirstName: row.client?.firstName,
    clientLastName: row.client?.lastName,
    clientEmail: row.client?.email,
  };
}

export async function listNutritionAssignments(
  organizationId: string,
  planId: string,
): Promise<NutritionAssignmentItem[]> {
  await getPlanOrThrow(organizationId, planId);

  const rows = await db.query.nutritionAssignments.findMany({
    where: and(
      eq(nutritionAssignments.organizationId, organizationId),
      eq(nutritionAssignments.planId, planId),
    ),
    orderBy: [desc(nutritionAssignments.createdAt)],
    with: {
      plan: true,
      client: true,
    },
  });

  return rows.map(mapAssignmentRow);
}

export async function assignNutritionPlan(
  organizationId: string,
  planId: string,
  coachClerkUserId: string,
  input: AssignNutritionPlanInput,
): Promise<{
  created: NutritionAssignmentItem[];
  skipped: { clientId: string; reason: string }[];
}> {
  const plan = await getPlanOrThrow(organizationId, planId);

  if (plan.status !== "published") {
    throw problem({
      type: "forbidden",
      title: "Nutrition plan not published",
      status: 403,
      detail: "Only published nutrition plans can be assigned to clients.",
    });
  }

  const uniqueClientIds = [...new Set(input.clientIds)];
  const clientRows = await db.query.clients.findMany({
    where: and(
      eq(clients.organizationId, organizationId),
      inArray(clients.id, uniqueClientIds),
    ),
  });

  const clientMap = new Map(clientRows.map((row) => [row.id, row]));
  const created: NutritionAssignmentItem[] = [];
  const skipped: { clientId: string; reason: string }[] = [];

  const activeAssignments = await db.query.nutritionAssignments.findMany({
    where: and(
      eq(nutritionAssignments.organizationId, organizationId),
      eq(nutritionAssignments.status, "active"),
      inArray(nutritionAssignments.clientId, uniqueClientIds),
    ),
  });
  const activeClientIds = new Set(
    activeAssignments.map((row) => row.clientId),
  );

  for (const clientId of uniqueClientIds) {
    const client = clientMap.get(clientId);

    if (!client) {
      skipped.push({ clientId, reason: "Client not found in organization." });
      continue;
    }

    if (
      !ASSIGNABLE_STATUSES.includes(
        client.status as (typeof ASSIGNABLE_STATUSES)[number],
      )
    ) {
      skipped.push({
        clientId,
        reason: "Client must be ACTIVE or TRIAL to receive a nutrition plan.",
      });
      continue;
    }

    if (activeClientIds.has(clientId)) {
      skipped.push({
        clientId,
        reason: "Client already has an active nutrition assignment.",
      });
      continue;
    }

    const [inserted] = await db
      .insert(nutritionAssignments)
      .values({
        organizationId,
        planId,
        clientId,
        coachClerkUserId,
        startDate: input.startDate,
        status: "active",
      })
      .returning();

    if (inserted) {
      created.push(
        mapAssignmentRow({
          ...inserted,
          plan,
          client,
        }),
      );
      activeClientIds.add(clientId);
    }
  }

  return { created, skipped };
}

export async function getActiveClientNutrition(
  organizationId: string,
  clientId: string,
): Promise<NutritionAssignmentWithPlan | null> {
  const assignment = await db.query.nutritionAssignments.findFirst({
    where: and(
      eq(nutritionAssignments.organizationId, organizationId),
      eq(nutritionAssignments.clientId, clientId),
      eq(nutritionAssignments.status, "active"),
    ),
    with: {
      plan: true,
      client: true,
    },
  });

  if (!assignment || !assignment.plan) {
    return null;
  }

  return {
    ...mapAssignmentRow(assignment),
    plan: {
      id: assignment.plan.id,
      name: assignment.plan.name,
      status: assignment.plan.status,
      targetCalories: assignment.plan.targetCalories,
      targetProteinG: assignment.plan.targetProteinG,
      targetCarbsG: assignment.plan.targetCarbsG,
      targetFatG: assignment.plan.targetFatG,
    },
  };
}
