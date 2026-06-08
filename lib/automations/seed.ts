import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { automationActions, automations } from "@/lib/db/schema";

const ONBOARDING_NAME = "Onboarding client (système)";

export async function seedSystemAutomations(
  organizationId: string,
  coachClerkUserId: string,
): Promise<void> {
  const existing = await db.query.automations.findFirst({
    where: and(
      eq(automations.organizationId, organizationId),
      eq(automations.isSystem, true),
      eq(automations.name, ONBOARDING_NAME),
    ),
    columns: { id: true },
  });

  if (existing) return;

  const [automation] = await db
    .insert(automations)
    .values({
      organizationId,
      name: ONBOARDING_NAME,
      description:
        "Workflow de référence : après un paiement reçu, assigne un programme, crée un bilan, envoie une notification et un message d'introduction. Complétez la configuration avant activation.",
      triggerType: "payment_received",
      triggerConfig: {},
      isActive: false,
      isSystem: true,
      createdByClerkUserId: coachClerkUserId,
    })
    .returning();

  await db.insert(automationActions).values([
    {
      organizationId,
      automationId: automation!.id,
      sortOrder: 0,
      actionType: "assign_program",
      actionConfig: { programId: "" },
    },
    {
      organizationId,
      automationId: automation!.id,
      sortOrder: 1,
      actionType: "create_assessment",
      actionConfig: { templateId: "" },
    },
    {
      organizationId,
      automationId: automation!.id,
      sortOrder: 2,
      actionType: "send_notification",
      actionConfig: {
        channel: "email",
        subject: "Bienvenue chez votre coach",
        content:
          "Bonjour {{clientName}},\n\nBienvenue ! Votre espace client est prêt.",
      },
    },
    {
      organizationId,
      automationId: automation!.id,
      sortOrder: 3,
      actionType: "send_message",
      actionConfig: {
        content:
          "Bonjour ! Je suis ravi de vous accompagner. N'hésitez pas à me contacter ici.",
      },
    },
  ]);
}
