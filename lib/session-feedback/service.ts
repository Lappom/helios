import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { db } from "@/lib/db";
import {
  clients,
  feedbackQuestions,
  feedbackResponses,
  sessionFeedback,
  sessionFeedbackTemplates,
  sessionLogs,
  teamMembers,
} from "@/lib/db/schema";
import { DEFAULT_FEEDBACK_TEMPLATE_NAME, MAX_CUSTOM_QUESTIONS } from "./defaults";
import type {
  ClientFeedbacksSummary,
  FeedbackAlertItem,
  FeedbackQuestionDetail,
  FeedbackTemplateListItem,
  FeedbackTemplateTree,
  SessionFeedbackDetail,
  SessionFeedbackListItem,
} from "./types";
import type {
  CreateFeedbackQuestionInput,
  CreateFeedbackTemplateInput,
  PatchFeedbackQuestionInput,
  PatchFeedbackTemplateInput,
  SubmitSessionFeedbackInput,
} from "@/lib/validators/session-feedback";

export type ListFeedbackTemplatesOptions = {
  page: number;
  limit: number;
  offset: number;
};

export type ListClientFeedbacksOptions = {
  page: number;
  limit: number;
  offset: number;
};

export type ListFeedbackAlertsOptions = {
  page: number;
  limit: number;
  offset: number;
};

function mapQuestion(
  row: typeof feedbackQuestions.$inferSelect,
): FeedbackQuestionDetail {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    type: row.type,
    label: row.label,
    required: row.required,
    options: row.options,
    config: row.config,
  };
}

function clientDisplayName(client: {
  firstName: string;
  lastName: string;
}): string {
  return `${client.firstName} ${client.lastName}`.trim();
}

async function getTemplateRowOrThrow(organizationId: string, templateId: string) {
  const template = await db.query.sessionFeedbackTemplates.findFirst({
    where: and(
      eq(sessionFeedbackTemplates.organizationId, organizationId),
      eq(sessionFeedbackTemplates.id, templateId),
    ),
  });

  if (!template) {
    throw problem({
      type: "not-found",
      title: "Feedback template not found",
      status: 404,
      detail: `Template ${templateId} was not found in this organization.`,
    });
  }

  return template;
}

async function clearDefaultTemplate(organizationId: string, exceptId?: string) {
  const conditions: SQL[] = [
    eq(sessionFeedbackTemplates.organizationId, organizationId),
    eq(sessionFeedbackTemplates.isDefault, true),
  ];
  if (exceptId) {
    conditions.push(sql`${sessionFeedbackTemplates.id} <> ${exceptId}`);
  }

  await db
    .update(sessionFeedbackTemplates)
    .set({ isDefault: false })
    .where(and(...conditions));
}

async function resolveSeedCoachClerkUserId(
  organizationId: string,
  fallbackClerkUserId: string,
): Promise<string> {
  const member = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.organizationId, organizationId),
    columns: { clerkUserId: true },
    orderBy: [asc(teamMembers.createdAt)],
  });

  return member?.clerkUserId ?? fallbackClerkUserId;
}

export async function seedDefaultFeedbackTemplateIfMissing(
  organizationId: string,
  coachClerkUserId: string,
): Promise<void> {
  const existing = await db.query.sessionFeedbackTemplates.findFirst({
    where: eq(sessionFeedbackTemplates.organizationId, organizationId),
    columns: { id: true },
  });

  if (existing) {
    return;
  }

  await db.insert(sessionFeedbackTemplates).values({
    organizationId,
    coachClerkUserId,
    name: DEFAULT_FEEDBACK_TEMPLATE_NAME,
    isDefault: true,
  });
}

export async function getDefaultFeedbackTemplateTree(
  organizationId: string,
): Promise<FeedbackTemplateTree | null> {
  const template = await db.query.sessionFeedbackTemplates.findFirst({
    where: and(
      eq(sessionFeedbackTemplates.organizationId, organizationId),
      eq(sessionFeedbackTemplates.isDefault, true),
    ),
    with: {
      questions: {
        orderBy: [asc(feedbackQuestions.sortOrder)],
      },
    },
  });

  if (!template) {
    return null;
  }

  return {
    id: template.id,
    name: template.name,
    isDefault: template.isDefault,
    questions: template.questions.map(mapQuestion),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export async function listFeedbackTemplates(
  organizationId: string,
  options: ListFeedbackTemplatesOptions,
): Promise<{ items: FeedbackTemplateListItem[]; total: number }> {
  const where = eq(sessionFeedbackTemplates.organizationId, organizationId);

  const [rows, totalRow] = await Promise.all([
    db.query.sessionFeedbackTemplates.findMany({
      where,
      orderBy: [desc(sessionFeedbackTemplates.updatedAt)],
      limit: options.limit,
      offset: options.offset,
      with: { questions: { columns: { id: true } } },
    }),
    db
      .select({ total: count() })
      .from(sessionFeedbackTemplates)
      .where(where),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      isDefault: row.isDefault,
      questionCount: row.questions.length,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    total: totalRow[0]?.total ?? 0,
  };
}

export async function getFeedbackTemplateTree(
  organizationId: string,
  templateId: string,
): Promise<FeedbackTemplateTree> {
  const template = await db.query.sessionFeedbackTemplates.findFirst({
    where: and(
      eq(sessionFeedbackTemplates.organizationId, organizationId),
      eq(sessionFeedbackTemplates.id, templateId),
    ),
    with: {
      questions: {
        orderBy: [asc(feedbackQuestions.sortOrder)],
      },
    },
  });

  if (!template) {
    throw problem({
      type: "not-found",
      title: "Feedback template not found",
      status: 404,
      detail: `Template ${templateId} was not found.`,
    });
  }

  return {
    id: template.id,
    name: template.name,
    isDefault: template.isDefault,
    questions: template.questions.map(mapQuestion),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export async function createFeedbackTemplate(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateFeedbackTemplateInput,
): Promise<FeedbackTemplateTree> {
  if (input.isDefault) {
    await clearDefaultTemplate(organizationId);
  }

  const [template] = await db
    .insert(sessionFeedbackTemplates)
    .values({
      organizationId,
      coachClerkUserId,
      name: input.name,
      isDefault: input.isDefault,
    })
    .returning();

  return getFeedbackTemplateTree(organizationId, template.id);
}

export async function patchFeedbackTemplate(
  organizationId: string,
  templateId: string,
  input: PatchFeedbackTemplateInput,
): Promise<FeedbackTemplateTree> {
  await getTemplateRowOrThrow(organizationId, templateId);

  if (input.isDefault) {
    await clearDefaultTemplate(organizationId, templateId);
  }

  await db
    .update(sessionFeedbackTemplates)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    })
    .where(
      and(
        eq(sessionFeedbackTemplates.organizationId, organizationId),
        eq(sessionFeedbackTemplates.id, templateId),
      ),
    );

  return getFeedbackTemplateTree(organizationId, templateId);
}

export async function deleteFeedbackTemplate(
  organizationId: string,
  templateId: string,
): Promise<void> {
  const template = await getTemplateRowOrThrow(organizationId, templateId);

  if (template.isDefault) {
    throw problem({
      type: "validation-error",
      title: "Cannot delete default template",
      status: 409,
      detail: "The default feedback template cannot be deleted.",
    });
  }

  const inUse = await db.query.sessionFeedback.findFirst({
    where: and(
      eq(sessionFeedback.organizationId, organizationId),
      eq(sessionFeedback.templateId, templateId),
    ),
    columns: { id: true },
  });

  if (inUse) {
    throw problem({
      type: "validation-error",
      title: "Template in use",
      status: 409,
      detail: "Cannot delete a template that has feedback linked to it.",
    });
  }

  await db
    .delete(sessionFeedbackTemplates)
    .where(
      and(
        eq(sessionFeedbackTemplates.organizationId, organizationId),
        eq(sessionFeedbackTemplates.id, templateId),
      ),
    );
}

async function getNextQuestionSortOrder(templateId: string): Promise<number> {
  const row = await db.query.feedbackQuestions.findFirst({
    where: eq(feedbackQuestions.templateId, templateId),
    orderBy: [desc(feedbackQuestions.sortOrder)],
    columns: { sortOrder: true },
  });
  return (row?.sortOrder ?? -1) + 1;
}

async function assertQuestionLimit(templateId: string): Promise<void> {
  const countRow = await db
    .select({ total: count() })
    .from(feedbackQuestions)
    .where(eq(feedbackQuestions.templateId, templateId));

  if ((countRow[0]?.total ?? 0) >= MAX_CUSTOM_QUESTIONS) {
    throw problem({
      type: "validation-error",
      title: "Question limit reached",
      status: 409,
      detail: `A feedback template can have at most ${MAX_CUSTOM_QUESTIONS} custom questions.`,
    });
  }
}

export async function createFeedbackQuestion(
  organizationId: string,
  templateId: string,
  input: CreateFeedbackQuestionInput,
): Promise<FeedbackTemplateTree> {
  await getTemplateRowOrThrow(organizationId, templateId);
  await assertQuestionLimit(templateId);
  const sortOrder = await getNextQuestionSortOrder(templateId);

  await db.insert(feedbackQuestions).values({
    organizationId,
    templateId,
    sortOrder,
    type: input.type,
    label: input.label,
    required: input.required ?? false,
    options: input.options ?? null,
    config: input.config ?? null,
  });

  return getFeedbackTemplateTree(organizationId, templateId);
}

export async function patchFeedbackQuestion(
  organizationId: string,
  templateId: string,
  questionId: string,
  input: PatchFeedbackQuestionInput,
): Promise<FeedbackTemplateTree> {
  await getTemplateRowOrThrow(organizationId, templateId);

  const question = await db.query.feedbackQuestions.findFirst({
    where: and(
      eq(feedbackQuestions.organizationId, organizationId),
      eq(feedbackQuestions.templateId, templateId),
      eq(feedbackQuestions.id, questionId),
    ),
  });

  if (!question) {
    throw problem({
      type: "not-found",
      title: "Question not found",
      status: 404,
      detail: `Question ${questionId} was not found.`,
    });
  }

  await db
    .update(feedbackQuestions)
    .set({
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.required !== undefined ? { required: input.required } : {}),
      ...(input.options !== undefined ? { options: input.options } : {}),
      ...(input.config !== undefined ? { config: input.config } : {}),
    })
    .where(eq(feedbackQuestions.id, questionId));

  return getFeedbackTemplateTree(organizationId, templateId);
}

export async function deleteFeedbackQuestion(
  organizationId: string,
  templateId: string,
  questionId: string,
): Promise<FeedbackTemplateTree> {
  await getTemplateRowOrThrow(organizationId, templateId);

  await db
    .delete(feedbackQuestions)
    .where(
      and(
        eq(feedbackQuestions.organizationId, organizationId),
        eq(feedbackQuestions.templateId, templateId),
        eq(feedbackQuestions.id, questionId),
      ),
    );

  return getFeedbackTemplateTree(organizationId, templateId);
}

export async function reorderFeedbackQuestions(
  organizationId: string,
  templateId: string,
  questionIds: string[],
): Promise<FeedbackTemplateTree> {
  await getTemplateRowOrThrow(organizationId, templateId);

  const existing = await db.query.feedbackQuestions.findMany({
    where: and(
      eq(feedbackQuestions.organizationId, organizationId),
      eq(feedbackQuestions.templateId, templateId),
    ),
    columns: { id: true },
  });

  const existingIds = new Set(existing.map((row) => row.id));
  if (
    questionIds.length !== existing.length ||
    questionIds.some((id) => !existingIds.has(id))
  ) {
    throw problem({
      type: "validation-error",
      title: "Invalid question order",
      status: 400,
      detail: "questionIds must include every question exactly once.",
    });
  }

  await db.transaction(async (tx) => {
    for (let index = 0; index < questionIds.length; index += 1) {
      await tx
        .update(feedbackQuestions)
        .set({ sortOrder: index })
        .where(eq(feedbackQuestions.id, questionIds[index]!));
    }
  });

  return getFeedbackTemplateTree(organizationId, templateId);
}

function validateCustomResponses(
  questions: FeedbackQuestionDetail[],
  responses: SubmitSessionFeedbackInput["customResponses"],
): void {
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  for (const response of responses) {
    const question = questionMap.get(response.questionId);
    if (!question) {
      throw problem({
        type: "validation-error",
        title: "Unknown question",
        status: 400,
        detail: `Question ${response.questionId} is not part of the active template.`,
      });
    }

    if (question.type === "scale") {
      if (
        response.numberValue === null ||
        response.numberValue === undefined ||
        response.numberValue < 1 ||
        response.numberValue > 10
      ) {
        throw problem({
          type: "validation-error",
          title: "Invalid scale response",
          status: 400,
          detail: `Question "${question.label}" requires a value between 1 and 10.`,
        });
      }
    } else if (question.type === "text") {
      if (
        question.required &&
        (!response.textValue || response.textValue.trim().length === 0)
      ) {
        throw problem({
          type: "validation-error",
          title: "Missing text response",
          status: 400,
          detail: `Question "${question.label}" is required.`,
        });
      }
    } else if (question.type === "boolean") {
      if (
        question.required &&
        (response.booleanValue === null || response.booleanValue === undefined)
      ) {
        throw problem({
          type: "validation-error",
          title: "Missing boolean response",
          status: 400,
          detail: `Question "${question.label}" is required.`,
        });
      }
    }
  }

  for (const question of questions) {
    if (!question.required) {
      continue;
    }
    const response = responses.find((r) => r.questionId === question.id);
    if (!response) {
      throw problem({
        type: "validation-error",
        title: "Missing required response",
        status: 400,
        detail: `Question "${question.label}" is required.`,
      });
    }
  }
}

function mapFeedbackRow(
  row: typeof sessionFeedback.$inferSelect & {
    sessionLog: {
      scheduledDate: Date;
      programSession: { name: string } | null;
    };
    responses: Array<{
      questionId: string;
      textValue: string | null;
      numberValue: number | null;
      booleanValue: boolean | null;
      question: { label: string } | null;
    }>;
  },
): SessionFeedbackListItem {
  return {
    id: row.id,
    sessionLogId: row.sessionLogId,
    sessionName: row.sessionLog.programSession?.name ?? null,
    scheduledDate: row.sessionLog.scheduledDate.toISOString(),
    feeling: row.feeling,
    difficulty: row.difficulty,
    fatigue: row.fatigue,
    motivation: row.motivation,
    painReported: row.painReported,
    painDetails: row.painDetails,
    comment: row.comment,
    submittedAt: row.submittedAt.toISOString(),
    customResponses: row.responses.map((response) => ({
      questionId: response.questionId,
      label: response.question?.label ?? "",
      textValue: response.textValue,
      numberValue: response.numberValue,
      booleanValue: response.booleanValue,
    })),
  };
}

export async function submitSessionFeedback(
  organizationId: string,
  clientId: string,
  sessionLogId: string,
  input: SubmitSessionFeedbackInput,
): Promise<SessionFeedbackDetail> {
  const sessionLog = await db.query.sessionLogs.findFirst({
    where: and(
      eq(sessionLogs.organizationId, organizationId),
      eq(sessionLogs.id, sessionLogId),
    ),
    with: {
      programSession: { columns: { name: true } },
    },
  });

  if (!sessionLog) {
    throw problem({
      type: "not-found",
      title: "Session log not found",
      status: 404,
      detail: `Session log ${sessionLogId} was not found.`,
    });
  }

  if (sessionLog.clientId !== clientId) {
    throw problem({
      type: "forbidden",
      title: "Not your session",
      status: 403,
      detail: "This session belongs to another client.",
    });
  }

  if (sessionLog.status !== "completed") {
    throw problem({
      type: "validation-error",
      title: "Session not completed",
      status: 400,
      detail: "Feedback can only be submitted for completed sessions.",
    });
  }

  const existing = await db.query.sessionFeedback.findFirst({
    where: eq(sessionFeedback.sessionLogId, sessionLogId),
    columns: { id: true },
  });

  if (existing) {
    throw problem({
      type: "validation-error",
      title: "Feedback already submitted",
      status: 409,
      detail: "Feedback has already been submitted for this session.",
    });
  }

  const template = await getDefaultFeedbackTemplateTree(organizationId);
  const questions = template?.questions ?? [];
  validateCustomResponses(questions, input.customResponses);

  const [created] = await db
    .insert(sessionFeedback)
    .values({
      organizationId,
      sessionLogId,
      clientId,
      templateId: template?.id ?? null,
      feeling: input.feeling,
      difficulty: input.difficulty,
      fatigue: input.fatigue,
      motivation: input.motivation,
      painReported: input.painReported,
      painDetails: input.painDetails ?? null,
      comment: input.comment ?? null,
    })
    .returning();

  if (input.customResponses.length > 0) {
    await db.insert(feedbackResponses).values(
      input.customResponses.map((response) => ({
        organizationId,
        sessionFeedbackId: created.id,
        questionId: response.questionId,
        textValue: response.textValue ?? null,
        numberValue: response.numberValue ?? null,
        booleanValue: response.booleanValue ?? null,
      })),
    );
  }

  const detail = await db.query.sessionFeedback.findFirst({
    where: eq(sessionFeedback.id, created.id),
    with: {
      sessionLog: {
        with: {
          programSession: { columns: { name: true } },
        },
      },
      responses: {
        with: {
          question: { columns: { label: true } },
        },
      },
    },
  });

  if (!detail) {
    throw problem({
      type: "not-found",
      title: "Feedback not found",
      status: 404,
      detail: "Created feedback could not be loaded.",
    });
  }

  return mapFeedbackRow(detail);
}

export async function getClientFeedbacksSummary(
  organizationId: string,
  clientId: string,
  options: ListClientFeedbacksOptions,
): Promise<ClientFeedbacksSummary> {
  const client = await db.query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
    columns: { id: true },
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: `Client ${clientId} was not found.`,
    });
  }

  const where = and(
    eq(sessionFeedback.organizationId, organizationId),
    eq(sessionFeedback.clientId, clientId),
  );

  const [rows, totalRow, lastFour] = await Promise.all([
    db.query.sessionFeedback.findMany({
      where,
      orderBy: [desc(sessionFeedback.submittedAt)],
      limit: options.limit,
      offset: options.offset,
      with: {
        sessionLog: {
          with: {
            programSession: { columns: { name: true } },
          },
        },
        responses: {
          with: {
            question: { columns: { label: true } },
          },
        },
      },
    }),
    db.select({ total: count() }).from(sessionFeedback).where(where),
    db.query.sessionFeedback.findMany({
      where,
      orderBy: [desc(sessionFeedback.submittedAt)],
      limit: 4,
      columns: { feeling: true },
    }),
  ]);

  const feelingAverageLast4 =
    lastFour.length > 0
      ? Math.round(
          (lastFour.reduce((sum, row) => sum + row.feeling, 0) / lastFour.length) *
            10,
        ) / 10
      : null;

  const items = rows.map((row) => mapFeedbackRow(row));

  return {
    feelingAverageLast4,
    items,
    total: totalRow[0]?.total ?? 0,
  };
}

export async function listFeedbackAlerts(
  organizationId: string,
  options: ListFeedbackAlertsOptions,
): Promise<{ items: FeedbackAlertItem[]; total: number }> {
  const where = and(
    eq(sessionFeedback.organizationId, organizationId),
    eq(sessionFeedback.painReported, true),
  );

  const [rows, totalRow] = await Promise.all([
    db.query.sessionFeedback.findMany({
      where,
      orderBy: [desc(sessionFeedback.submittedAt)],
      limit: options.limit,
      offset: options.offset,
      with: {
        client: { columns: { firstName: true, lastName: true } },
        sessionLog: {
          with: {
            programSession: { columns: { name: true } },
          },
        },
      },
    }),
    db.select({ total: count() }).from(sessionFeedback).where(where),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      clientId: row.clientId,
      clientName: clientDisplayName(row.client),
      sessionLogId: row.sessionLogId,
      sessionName: row.sessionLog.programSession?.name ?? null,
      scheduledDate: row.sessionLog.scheduledDate.toISOString(),
      painDetails: row.painDetails,
      feeling: row.feeling,
      submittedAt: row.submittedAt.toISOString(),
    })),
    total: totalRow[0]?.total ?? 0,
  };
}

export async function getActiveFeedbackTemplateForClient(
  organizationId: string,
  fallbackClerkUserId: string,
): Promise<FeedbackTemplateTree> {
  const coachClerkUserId = await resolveSeedCoachClerkUserId(
    organizationId,
    fallbackClerkUserId,
  );
  await seedDefaultFeedbackTemplateIfMissing(organizationId, coachClerkUserId);
  const template = await getDefaultFeedbackTemplateTree(organizationId);

  if (!template) {
    throw problem({
      type: "not-found",
      title: "Feedback template not found",
      status: 404,
      detail: "No default feedback template exists for this organization.",
    });
  }

  return template;
}
