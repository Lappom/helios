import { and, eq } from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import { clients, coachTasks } from "@/lib/db/schema";

export type CreateCoachTaskInput = {
  clientId: string;
  title: string;
  description?: string;
  dueDate?: string;
  sourceAutomationId?: string;
  createdByClerkUserId?: string;
};

export async function createCoachTask(
  organizationId: string,
  input: CreateCoachTaskInput,
) {
  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, input.clientId),
    ),
    columns: { id: true },
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: "The client does not exist in this organization.",
    });
  }

  const [task] = await getDb()
    .insert(coachTasks)
    .values({
      organizationId,
      clientId: input.clientId,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      sourceAutomationId: input.sourceAutomationId ?? null,
      createdByClerkUserId: input.createdByClerkUserId ?? null,
      status: "open",
    })
    .returning();

  return task!;
}
