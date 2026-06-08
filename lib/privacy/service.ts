import { clerkClient } from "@clerk/nextjs/server";
import { del } from "@vercel/blob";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit/service";
import type { AuditActor } from "@/lib/audit/types";
import { problem } from "@/lib/api/response";
import { reconcileActiveClientCount } from "@/lib/clients/quota-sync";
import { getClientOrThrow } from "@/lib/clients/service";
import { getDb } from "@/lib/db";
import {
  assessmentResponses,
  assessments,
  bookings,
  clientNotes,
  clientStatusEvents,
  clientTagAssignments,
  clients,
  conversations,
  driveFiles,
  driveShares,
  feedbackResponses,
  habitAssignments,
  habitLogs,
  mealLogItems,
  mealLogs,
  messages,
  nutritionAssignments,
  pathwayEnrollments,
  pathwayStepLogs,
  payments,
  programAssignments,
  pushSubscriptions,
  questionnaireResponses,
  questionnaireSubmissions,
  referralCodes,
  referralConversions,
  referralCreditBalances,
  referralCreditLedger,
  sessionFeedback,
  sessionLogs,
  setLogs,
  videoAccess,
} from "@/lib/db/schema";
import { logger } from "@/lib/api/logger";

export type ClientDataExport = {
  exportedAt: string;
  clientId: string;
  organizationId: string;
  profile: typeof clients.$inferSelect;
  notes: (typeof clientNotes.$inferSelect)[];
  statusEvents: (typeof clientStatusEvents.$inferSelect)[];
  tagAssignments: (typeof clientTagAssignments.$inferSelect)[];
  programAssignments: (typeof programAssignments.$inferSelect)[];
  sessionLogs: (typeof sessionLogs.$inferSelect)[];
  setLogs: (typeof setLogs.$inferSelect)[];
  nutritionAssignments: (typeof nutritionAssignments.$inferSelect)[];
  mealLogs: (typeof mealLogs.$inferSelect)[];
  mealLogItems: (typeof mealLogItems.$inferSelect)[];
  assessments: (typeof assessments.$inferSelect)[];
  assessmentResponses: (typeof assessmentResponses.$inferSelect)[];
  sessionFeedback: (typeof sessionFeedback.$inferSelect)[];
  feedbackResponses: (typeof feedbackResponses.$inferSelect)[];
  habitAssignments: (typeof habitAssignments.$inferSelect)[];
  habitLogs: (typeof habitLogs.$inferSelect)[];
  questionnaireSubmissions: (typeof questionnaireSubmissions.$inferSelect)[];
  questionnaireResponses: (typeof questionnaireResponses.$inferSelect)[];
  conversations: (typeof conversations.$inferSelect)[];
  messages: (typeof messages.$inferSelect)[];
  driveShares: (typeof driveShares.$inferSelect)[];
  driveFiles: (typeof driveFiles.$inferSelect)[];
  bookings: (typeof bookings.$inferSelect)[];
  payments: (typeof payments.$inferSelect)[];
  referralCodes: (typeof referralCodes.$inferSelect)[];
  referralConversions: (typeof referralConversions.$inferSelect)[];
  referralCreditBalances: (typeof referralCreditBalances.$inferSelect)[];
  referralCreditLedger: (typeof referralCreditLedger.$inferSelect)[];
  pathwayEnrollments: (typeof pathwayEnrollments.$inferSelect)[];
  pathwayStepLogs: (typeof pathwayStepLogs.$inferSelect)[];
  pushSubscriptions: (typeof pushSubscriptions.$inferSelect)[];
  videoAccess: (typeof videoAccess.$inferSelect)[];
  mediaManifest: Array<{ pathname: string; source: string }>;
};

async function loadClientExportData(
  organizationId: string,
  clientId: string,
): Promise<ClientDataExport> {
  const profile = await getClientOrThrow(organizationId, clientId);

  const [
    notes,
    statusEvents,
    tagAssignments,
    programAssignmentRows,
    sessionLogRows,
    nutritionAssignmentRows,
    mealLogRows,
    assessmentRows,
    sessionFeedbackRows,
    habitAssignmentRows,
    habitLogRows,
    questionnaireSubmissionRows,
    conversationRows,
    driveShareRows,
    bookingRows,
    paymentRows,
    referralCodeRows,
    referralConversionRows,
    referralBalanceRows,
    referralLedgerRows,
    pathwayEnrollmentRows,
    pushSubscriptionRows,
    videoAccessRows,
  ] = await Promise.all([
    getDb().query.clientNotes.findMany({
      where: and(
        eq(clientNotes.organizationId, organizationId),
        eq(clientNotes.clientId, clientId),
      ),
    }),
    getDb().query.clientStatusEvents.findMany({
      where: and(
        eq(clientStatusEvents.organizationId, organizationId),
        eq(clientStatusEvents.clientId, clientId),
      ),
    }),
    getDb().query.clientTagAssignments.findMany({
      where: and(
        eq(clientTagAssignments.organizationId, organizationId),
        eq(clientTagAssignments.clientId, clientId),
      ),
    }),
    getDb().query.programAssignments.findMany({
      where: and(
        eq(programAssignments.organizationId, organizationId),
        eq(programAssignments.clientId, clientId),
      ),
    }),
    getDb().query.sessionLogs.findMany({
      where: and(
        eq(sessionLogs.organizationId, organizationId),
        eq(sessionLogs.clientId, clientId),
      ),
    }),
    getDb().query.nutritionAssignments.findMany({
      where: and(
        eq(nutritionAssignments.organizationId, organizationId),
        eq(nutritionAssignments.clientId, clientId),
      ),
    }),
    getDb().query.mealLogs.findMany({
      where: and(
        eq(mealLogs.organizationId, organizationId),
        eq(mealLogs.clientId, clientId),
      ),
    }),
    getDb().query.assessments.findMany({
      where: and(
        eq(assessments.organizationId, organizationId),
        eq(assessments.clientId, clientId),
      ),
    }),
    getDb().query.sessionFeedback.findMany({
      where: and(
        eq(sessionFeedback.organizationId, organizationId),
        eq(sessionFeedback.clientId, clientId),
      ),
    }),
    getDb().query.habitAssignments.findMany({
      where: and(
        eq(habitAssignments.organizationId, organizationId),
        eq(habitAssignments.clientId, clientId),
      ),
    }),
    getDb().query.habitLogs.findMany({
      where: and(
        eq(habitLogs.organizationId, organizationId),
        eq(habitLogs.clientId, clientId),
      ),
    }),
    getDb().query.questionnaireSubmissions.findMany({
      where: and(
        eq(questionnaireSubmissions.organizationId, organizationId),
        eq(questionnaireSubmissions.clientId, clientId),
      ),
    }),
    getDb().query.conversations.findMany({
      where: and(
        eq(conversations.organizationId, organizationId),
        eq(conversations.clientId, clientId),
      ),
    }),
    getDb().query.driveShares.findMany({
      where: and(
        eq(driveShares.organizationId, organizationId),
        eq(driveShares.clientId, clientId),
      ),
    }),
    getDb().query.bookings.findMany({
      where: and(
        eq(bookings.organizationId, organizationId),
        or(
          eq(bookings.clientId, clientId),
          sql`lower(${bookings.prospectEmail}) = lower(${profile.email})`,
        ),
      ),
    }),
    getDb().query.payments.findMany({
      where: and(
        eq(payments.organizationId, organizationId),
        eq(payments.clientId, clientId),
      ),
    }),
    getDb().query.referralCodes.findMany({
      where: and(
        eq(referralCodes.organizationId, organizationId),
        eq(referralCodes.clientId, clientId),
      ),
    }),
    getDb().query.referralConversions.findMany({
      where: and(
        eq(referralConversions.organizationId, organizationId),
        or(
          eq(referralConversions.referrerClientId, clientId),
          eq(referralConversions.referredClientId, clientId),
        ),
      ),
    }),
    getDb().query.referralCreditBalances.findMany({
      where: and(
        eq(referralCreditBalances.organizationId, organizationId),
        eq(referralCreditBalances.clientId, clientId),
      ),
    }),
    getDb().query.referralCreditLedger.findMany({
      where: and(
        eq(referralCreditLedger.organizationId, organizationId),
        eq(referralCreditLedger.clientId, clientId),
      ),
    }),
    getDb().query.pathwayEnrollments.findMany({
      where: and(
        eq(pathwayEnrollments.organizationId, organizationId),
        eq(pathwayEnrollments.clientId, clientId),
      ),
    }),
    getDb().query.pushSubscriptions.findMany({
      where: and(
        eq(pushSubscriptions.organizationId, organizationId),
        eq(pushSubscriptions.clientId, clientId),
      ),
    }),
    getDb().query.videoAccess.findMany({
      where: and(
        eq(videoAccess.organizationId, organizationId),
        eq(videoAccess.clientId, clientId),
      ),
    }),
  ]);

  const sessionLogIds = sessionLogRows.map((row) => row.id);
  const mealLogIds = mealLogRows.map((row) => row.id);
  const assessmentIds = assessmentRows.map((row) => row.id);
  const sessionFeedbackIds = sessionFeedbackRows.map((row) => row.id);
  const questionnaireSubmissionIds = questionnaireSubmissionRows.map(
    (row) => row.id,
  );
  const conversationIds = conversationRows.map((row) => row.id);
  const driveFileIds = driveShareRows
    .map((row) => row.fileId)
    .filter((id): id is string => Boolean(id));
  const pathwayEnrollmentIds = pathwayEnrollmentRows.map((row) => row.id);

  const [
    setLogRows,
    mealLogItemRows,
    assessmentResponseRows,
    feedbackResponseRows,
    questionnaireResponseRows,
    messageRows,
    driveFileRows,
    pathwayStepLogRows,
  ] = await Promise.all([
    sessionLogIds.length > 0
      ? getDb().query.setLogs.findMany({
          where: and(
            eq(setLogs.organizationId, organizationId),
            inArray(setLogs.sessionLogId, sessionLogIds),
          ),
        })
      : Promise.resolve([]),
    mealLogIds.length > 0
      ? getDb().query.mealLogItems.findMany({
          where: and(
            eq(mealLogItems.organizationId, organizationId),
            inArray(mealLogItems.mealLogId, mealLogIds),
          ),
        })
      : Promise.resolve([]),
    assessmentIds.length > 0
      ? getDb().query.assessmentResponses.findMany({
          where: and(
            eq(assessmentResponses.organizationId, organizationId),
            inArray(assessmentResponses.assessmentId, assessmentIds),
          ),
        })
      : Promise.resolve([]),
    sessionFeedbackIds.length > 0
      ? getDb().query.feedbackResponses.findMany({
          where: and(
            eq(feedbackResponses.organizationId, organizationId),
            inArray(feedbackResponses.sessionFeedbackId, sessionFeedbackIds),
          ),
        })
      : Promise.resolve([]),
    questionnaireSubmissionIds.length > 0
      ? getDb().query.questionnaireResponses.findMany({
          where: and(
            eq(questionnaireResponses.organizationId, organizationId),
            inArray(
              questionnaireResponses.submissionId,
              questionnaireSubmissionIds,
            ),
          ),
        })
      : Promise.resolve([]),
    conversationIds.length > 0
      ? getDb().query.messages.findMany({
          where: and(
            eq(messages.organizationId, organizationId),
            inArray(messages.conversationId, conversationIds),
          ),
        })
      : Promise.resolve([]),
    driveFileIds.length > 0
      ? getDb().query.driveFiles.findMany({
          where: and(
            eq(driveFiles.organizationId, organizationId),
            inArray(driveFiles.id, driveFileIds),
          ),
        })
      : Promise.resolve([]),
    pathwayEnrollmentIds.length > 0
      ? getDb().query.pathwayStepLogs.findMany({
          where: and(
            eq(pathwayStepLogs.organizationId, organizationId),
            inArray(pathwayStepLogs.enrollmentId, pathwayEnrollmentIds),
          ),
        })
      : Promise.resolve([]),
  ]);

  const mediaManifest: ClientDataExport["mediaManifest"] = [];

  for (const response of assessmentResponseRows) {
    if (response.photoBlobPath) {
      mediaManifest.push({
        pathname: response.photoBlobPath,
        source: "assessment_photo",
      });
    }
  }

  for (const message of messageRows) {
    if (message.mediaPathname) {
      mediaManifest.push({
        pathname: message.mediaPathname,
        source: "message_media",
      });
    }
  }

  for (const file of driveFileRows) {
    mediaManifest.push({
      pathname: file.blobPathname,
      source: "drive_file",
    });
  }

  return {
    exportedAt: new Date().toISOString(),
    clientId,
    organizationId,
    profile,
    notes,
    statusEvents,
    tagAssignments,
    programAssignments: programAssignmentRows,
    sessionLogs: sessionLogRows,
    setLogs: setLogRows,
    nutritionAssignments: nutritionAssignmentRows,
    mealLogs: mealLogRows,
    mealLogItems: mealLogItemRows,
    assessments: assessmentRows,
    assessmentResponses: assessmentResponseRows,
    sessionFeedback: sessionFeedbackRows,
    feedbackResponses: feedbackResponseRows,
    habitAssignments: habitAssignmentRows,
    habitLogs: habitLogRows,
    questionnaireSubmissions: questionnaireSubmissionRows,
    questionnaireResponses: questionnaireResponseRows,
    conversations: conversationRows,
    messages: messageRows,
    driveShares: driveShareRows,
    driveFiles: driveFileRows,
    bookings: bookingRows,
    payments: paymentRows,
    referralCodes: referralCodeRows,
    referralConversions: referralConversionRows,
    referralCreditBalances: referralBalanceRows,
    referralCreditLedger: referralLedgerRows,
    pathwayEnrollments: pathwayEnrollmentRows,
    pathwayStepLogs: pathwayStepLogRows,
    pushSubscriptions: pushSubscriptionRows,
    videoAccess: videoAccessRows,
    mediaManifest,
  };
}

export async function exportClientData(
  organizationId: string,
  clientId: string,
): Promise<ClientDataExport> {
  return loadClientExportData(organizationId, clientId);
}

export function serializeClientExport(data: ClientDataExport): string {
  return JSON.stringify(data, null, 2);
}

async function collectBlobPathnames(
  organizationId: string,
  clientId: string,
): Promise<string[]> {
  const exportData = await loadClientExportData(organizationId, clientId);
  return [
    ...new Set(exportData.mediaManifest.map((entry) => entry.pathname)),
  ];
}

async function deleteClerkUser(clerkUserId: string | null): Promise<void> {
  if (!clerkUserId) {
    return;
  }

  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkUserId);
  } catch (error) {
    logger.warn("Failed to delete Clerk user during client erasure", {
      clerkUserId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function eraseClientData(
  organizationId: string,
  clientId: string,
  actor: AuditActor,
  options?: { request?: Request; skipClerkDeletion?: boolean },
): Promise<void> {
  const client = await getClientOrThrow(organizationId, clientId);
  const blobPathnames = await collectBlobPathnames(organizationId, clientId);

  for (const pathname of blobPathnames) {
    try {
      await del(pathname);
    } catch {
      // Blob may already be gone.
    }
  }

  await getDb()
    .update(bookings)
    .set({
      prospectEmail: "erased@privacy.local",
      prospectName: "Erased",
      notes: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(bookings.organizationId, organizationId),
        sql`lower(${bookings.prospectEmail}) = lower(${client.email})`,
      ),
    );

  const clerkUserId = client.clerkUserId;

  await getDb()
    .delete(clients)
    .where(
      and(eq(clients.organizationId, organizationId), eq(clients.id, clientId)),
    );

  if (!options?.skipClerkDeletion) {
    await deleteClerkUser(clerkUserId);
  }
  await reconcileActiveClientCount(organizationId);

  await logAuditEvent({
    organizationId,
    actor,
    action: "client.erase",
    resourceType: "client",
    resourceId: clientId,
    metadata: { blobCount: blobPathnames.length },
    request: options?.request,
  });
}

export function assertEraseEmailConfirmation(
  clientEmail: string,
  confirmEmail: string,
): void {
  if (clientEmail.toLowerCase() !== confirmEmail.toLowerCase()) {
    throw problem({
      type: "validation-error",
      title: "Email confirmation mismatch",
      status: 400,
      detail: "The confirmation email does not match the client record.",
    });
  }
}
