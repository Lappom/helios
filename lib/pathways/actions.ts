import { assignProgram } from "@/lib/programs/assignments";
import { createAssessment } from "@/lib/assessments/service";
import { findOrCreateDirectConversation, sendMessage } from "@/lib/messaging/service";
import type { PathwayStepDetail } from "./types";
import { validateStepConfig } from "@/lib/validators/pathways";

export type ExecutePathwayStepContext = {
  organizationId: string;
  clientId: string;
  coachClerkUserId: string;
  pathwayId: string;
  enrollmentId: string;
};

export async function executePathwayStep(
  step: PathwayStepDetail,
  context: ExecutePathwayStepContext,
): Promise<Record<string, unknown>> {
  if (step.stepType === "wait") {
    return { skipped: true };
  }

  validateStepConfig(step.stepType, step.stepConfig);

  const { organizationId, clientId, coachClerkUserId } = context;

  const stepType = step.stepType;

  switch (stepType) {
    case "program": {
      const programId = String(step.stepConfig.programId);
      const startDate = step.stepConfig.startDate
        ? new Date(String(step.stepConfig.startDate))
        : new Date();
      const startMesocycleId = step.stepConfig.startMesocycleId
        ? String(step.stepConfig.startMesocycleId)
        : undefined;
      const result = await assignProgram(
        organizationId,
        programId,
        coachClerkUserId,
        { clientIds: [clientId], startDate, startMesocycleId },
      );
      return {
        created: result.created.length,
        skipped: result.skipped,
      };
    }
    case "assessment": {
      const assessment = await createAssessment(
        organizationId,
        coachClerkUserId,
        {
          templateId: String(step.stepConfig.templateId),
          clientId,
          dueAt: step.stepConfig.dueAt
            ? String(step.stepConfig.dueAt)
            : undefined,
        },
        "manual",
      );
      return { assessmentId: assessment.id };
    }
    case "message": {
      const conversation = await findOrCreateDirectConversation(
        organizationId,
        clientId,
        coachClerkUserId,
      );
      const message = await sendMessage(
        organizationId,
        conversation.id,
        { role: "coach", organizationId, clerkUserId: coachClerkUserId },
        {
          type: "text",
          content: String(step.stepConfig.content),
        },
      );
      return { messageId: message.id, conversationId: conversation.id };
    }
  }
}
