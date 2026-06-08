import type { ClientCreatedPayload } from "@/lib/events/types";
import { createOnboardingSubmissionForClient } from "./service";

export async function handleQuestionnaireClientCreated(
  payload: ClientCreatedPayload,
): Promise<void> {
  await createOnboardingSubmissionForClient(
    payload.organizationId,
    payload.clientId,
  );
}
