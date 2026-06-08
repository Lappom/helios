import type { PlanTier } from "@/lib/auth/types";
import { createClient } from "@/lib/clients/service";
import { emitHeliosEvent } from "@/lib/events/emit-event";
import { assignProgram } from "@/lib/programs/assignments";
import type {
  AssignProgramViaIntegrationInput,
  CreateClientViaIntegrationInput,
} from "@/lib/validators/integrations";

export async function createClientViaIntegration(
  organizationId: string,
  planTier: PlanTier,
  input: CreateClientViaIntegrationInput,
) {
  const client = await createClient(organizationId, planTier, input);

  emitHeliosEvent("client.created", {
    organizationId,
    clientId: client.id,
    source: "import",
  });

  return {
    id: client.id,
    email: client.email,
    firstName: client.firstName,
    lastName: client.lastName,
    status: client.status,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

export async function assignProgramViaIntegration(
  organizationId: string,
  programId: string,
  input: AssignProgramViaIntegrationInput,
) {
  const startDate = input.startDate ?? new Date();

  const result = await assignProgram(
    organizationId,
    programId,
    "api_integration",
    {
      clientIds: [input.clientId],
      startDate,
    },
  );

  return {
    created: result.created.map((assignment) => ({
      id: assignment.id,
      programId: assignment.programId,
      clientId: assignment.clientId,
      status: assignment.status,
      startDate: assignment.startDate,
    })),
    skipped: result.skipped,
  };
}
