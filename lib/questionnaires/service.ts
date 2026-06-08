import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  lt,
  type SQL,
} from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import {
  clients,
  questionnaireQuestions,
  questionnaireResponses,
  questionnaireSchedules,
  questionnaireSubmissions,
  questionnaires,
} from "@/lib/db/schema";
import {
  DEFAULT_ONBOARDING_QUESTIONS,
  DEFAULT_WEEKLY_QUESTIONS,
  MAX_QUESTIONNAIRE_QUESTIONS,
  ONBOARDING_QUESTIONNAIRE_NAME,
  WEEKLY_CHECKIN_QUESTIONNAIRE_NAME,
} from "./defaults";
import { getIsoWeekKey } from "./period";
import { dispatchQuestionnaireNotification } from "./reminders";
import type {
  ClientPendingQuestionnaire,
  QuestionnaireListItem,
  QuestionnaireQuestionDetail,
  QuestionnaireResponseDetail,
  QuestionnaireScheduleDetail,
  QuestionnaireSubmissionDetail,
  QuestionnaireSubmissionListItem,
  QuestionnaireSubmissionStats,
  QuestionnaireTree,
} from "./types";
import type {
  CreateQuestionnaireInput,
  CreateQuestionnaireQuestionInput,
  PatchQuestionnaireInput,
  PatchQuestionnaireQuestionInput,
  PatchQuestionnaireScheduleInput,
  SubmitQuestionnaireInput,
} from "@/lib/validators/questionnaires";

export type ListQuestionnairesOptions = {
  search?: string;
  type?: "onboarding" | "weekly_checkin" | "custom";
  page: number;
  limit: number;
  offset: number;
};

export type ListQuestionnaireSubmissionsOptions = {
  status?: "pending" | "submitted" | "overdue";
  questionnaireId?: string;
  clientId?: string;
  page: number;
  limit: number;
  offset: number;
};

function mapQuestion(
  row: typeof questionnaireQuestions.$inferSelect,
): QuestionnaireQuestionDetail {
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

function mapSchedule(
  row: typeof questionnaireSchedules.$inferSelect,
): QuestionnaireScheduleDetail {
  return {
    id: row.id,
    triggerType: row.triggerType,
    sendDayOfWeek: row.sendDayOfWeek,
    sendHourUtc: row.sendHourUtc,
    reminderDayOfWeek: row.reminderDayOfWeek,
    reminderHourUtc: row.reminderHourUtc,
    isActive: row.isActive,
  };
}

function clientDisplayName(client: {
  firstName: string;
  lastName: string;
}): string {
  return `${client.firstName} ${client.lastName}`.trim();
}

async function getQuestionnaireRowOrThrow(
  organizationId: string,
  questionnaireId: string,
) {
  const row = await getDb().query.questionnaires.findFirst({
    where: and(
      eq(questionnaires.organizationId, organizationId),
      eq(questionnaires.id, questionnaireId),
    ),
  });

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Questionnaire not found",
      status: 404,
      detail: `Questionnaire ${questionnaireId} was not found in this organization.`,
    });
  }

  return row;
}

async function loadQuestionnaireTree(
  organizationId: string,
  questionnaireId: string,
): Promise<QuestionnaireTree> {
  const row = await getDb().query.questionnaires.findFirst({
    where: and(
      eq(questionnaires.organizationId, organizationId),
      eq(questionnaires.id, questionnaireId),
    ),
    with: {
      questions: { orderBy: [asc(questionnaireQuestions.sortOrder)] },
      schedule: true,
    },
  });

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Questionnaire not found",
      status: 404,
      detail: `Questionnaire ${questionnaireId} was not found.`,
    });
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    isActive: row.isActive,
    isDefault: row.isDefault,
    questions: row.questions.map(mapQuestion),
    schedule: row.schedule ? mapSchedule(row.schedule) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function nextQuestionSortOrder(questionnaireId: string): Promise<number> {
  const last = await getDb().query.questionnaireQuestions.findFirst({
    where: eq(questionnaireQuestions.questionnaireId, questionnaireId),
    orderBy: [desc(questionnaireQuestions.sortOrder)],
    columns: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

async function insertQuestions(
  organizationId: string,
  questionnaireId: string,
  items: CreateQuestionnaireQuestionInput[],
) {
  if (items.length === 0) {
    return;
  }

  let sortOrder = await nextQuestionSortOrder(questionnaireId);
  await getDb().insert(questionnaireQuestions).values(
    items.map((item) => ({
      organizationId,
      questionnaireId,
      sortOrder: sortOrder++,
      type: item.type,
      label: item.label,
      required: item.required ?? false,
      options: item.options ?? null,
      config: item.config ?? null,
    })),
  );
}

async function insertSchedule(
  organizationId: string,
  questionnaireId: string,
  type: "onboarding" | "weekly_checkin" | "custom",
) {
  if (type === "onboarding") {
    await getDb().insert(questionnaireSchedules).values({
      organizationId,
      questionnaireId,
      triggerType: "on_client_created",
      isActive: true,
    });
    return;
  }

  if (type === "weekly_checkin") {
    await getDb().insert(questionnaireSchedules).values({
      organizationId,
      questionnaireId,
      triggerType: "weekly_cron",
      sendDayOfWeek: 0,
      sendHourUtc: 18,
      reminderDayOfWeek: 1,
      reminderHourUtc: 8,
      isActive: true,
    });
  }
}

export async function seedDefaultQuestionnairesIfMissing(
  organizationId: string,
  coachClerkUserId: string,
): Promise<void> {
  const existing = await getDb().query.questionnaires.findFirst({
    where: eq(questionnaires.organizationId, organizationId),
    columns: { id: true },
  });

  if (existing) {
    return;
  }

  const [onboarding] = await getDb()
    .insert(questionnaires)
    .values({
      organizationId,
      coachClerkUserId,
      name: ONBOARDING_QUESTIONNAIRE_NAME,
      type: "onboarding",
      isActive: true,
      isDefault: true,
    })
    .returning();

  if (onboarding) {
    await insertQuestions(
      organizationId,
      onboarding.id,
      DEFAULT_ONBOARDING_QUESTIONS,
    );
    await insertSchedule(organizationId, onboarding.id, "onboarding");
  }

  const [weekly] = await getDb()
    .insert(questionnaires)
    .values({
      organizationId,
      coachClerkUserId,
      name: WEEKLY_CHECKIN_QUESTIONNAIRE_NAME,
      type: "weekly_checkin",
      isActive: true,
      isDefault: false,
    })
    .returning();

  if (weekly) {
    await insertQuestions(organizationId, weekly.id, DEFAULT_WEEKLY_QUESTIONS);
    await insertSchedule(organizationId, weekly.id, "weekly_checkin");
  }
}

export async function listQuestionnaires(
  organizationId: string,
  options: ListQuestionnairesOptions,
): Promise<{ items: QuestionnaireListItem[]; total: number }> {
  const conditions: SQL[] = [eq(questionnaires.organizationId, organizationId)];

  if (options.type) {
    conditions.push(eq(questionnaires.type, options.type));
  }

  if (options.search) {
    conditions.push(ilike(questionnaires.name, `%${options.search}%`));
  }

  const where = and(...conditions);

  const [rows, totalRow] = await Promise.all([
    getDb().query.questionnaires.findMany({
      where,
      orderBy: [desc(questionnaires.updatedAt)],
      limit: options.limit,
      offset: options.offset,
      with: { questions: { columns: { id: true } } },
    }),
    getDb().select({ total: count() }).from(questionnaires).where(where),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      isActive: row.isActive,
      isDefault: row.isDefault,
      questionCount: row.questions.length,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    total: totalRow[0]?.total ?? 0,
  };
}

export async function createQuestionnaire(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateQuestionnaireInput,
): Promise<QuestionnaireTree> {
  const [created] = await getDb()
    .insert(questionnaires)
    .values({
      organizationId,
      coachClerkUserId,
      name: input.name,
      type: input.type,
      isActive: input.isActive,
      isDefault: input.isDefault,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create questionnaire");
  }

  if (input.type === "onboarding" || input.type === "weekly_checkin") {
    await insertSchedule(organizationId, created.id, input.type);
  }

  return loadQuestionnaireTree(organizationId, created.id);
}

export async function getQuestionnaireTree(
  organizationId: string,
  questionnaireId: string,
): Promise<QuestionnaireTree> {
  return loadQuestionnaireTree(organizationId, questionnaireId);
}

export async function patchQuestionnaire(
  organizationId: string,
  questionnaireId: string,
  input: PatchQuestionnaireInput,
): Promise<QuestionnaireTree> {
  await getQuestionnaireRowOrThrow(organizationId, questionnaireId);

  await getDb()
    .update(questionnaires)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    })
    .where(
      and(
        eq(questionnaires.organizationId, organizationId),
        eq(questionnaires.id, questionnaireId),
      ),
    );

  return loadQuestionnaireTree(organizationId, questionnaireId);
}

export async function deleteQuestionnaire(
  organizationId: string,
  questionnaireId: string,
): Promise<void> {
  await getQuestionnaireRowOrThrow(organizationId, questionnaireId);

  await getDb()
    .delete(questionnaires)
    .where(
      and(
        eq(questionnaires.organizationId, organizationId),
        eq(questionnaires.id, questionnaireId),
      ),
    );
}

export async function createQuestionnaireQuestion(
  organizationId: string,
  questionnaireId: string,
  input: CreateQuestionnaireQuestionInput,
): Promise<QuestionnaireTree> {
  const questionnaire = await getQuestionnaireRowOrThrow(
    organizationId,
    questionnaireId,
  );

  const questionCount = await getDb()
    .select({ total: count() })
    .from(questionnaireQuestions)
    .where(eq(questionnaireQuestions.questionnaireId, questionnaireId));

  if ((questionCount[0]?.total ?? 0) >= MAX_QUESTIONNAIRE_QUESTIONS) {
    throw problem({
      type: "validation-error",
      title: "Question limit reached",
      status: 400,
      detail: `Maximum ${MAX_QUESTIONNAIRE_QUESTIONS} questions per questionnaire.`,
    });
  }

  const sortOrder = await nextQuestionSortOrder(questionnaireId);

  await getDb().insert(questionnaireQuestions).values({
    organizationId,
    questionnaireId,
    sortOrder,
    type: input.type,
    label: input.label,
    required: input.required ?? false,
    options: input.options ?? null,
    config: input.config ?? null,
  });

  void questionnaire;
  return loadQuestionnaireTree(organizationId, questionnaireId);
}

export async function patchQuestionnaireQuestion(
  organizationId: string,
  questionnaireId: string,
  questionId: string,
  input: PatchQuestionnaireQuestionInput,
): Promise<QuestionnaireTree> {
  await getQuestionnaireRowOrThrow(organizationId, questionnaireId);

  const question = await getDb().query.questionnaireQuestions.findFirst({
    where: and(
      eq(questionnaireQuestions.organizationId, organizationId),
      eq(questionnaireQuestions.questionnaireId, questionnaireId),
      eq(questionnaireQuestions.id, questionId),
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

  await getDb()
    .update(questionnaireQuestions)
    .set({
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.required !== undefined ? { required: input.required } : {}),
      ...(input.options !== undefined ? { options: input.options } : {}),
      ...(input.config !== undefined ? { config: input.config } : {}),
    })
    .where(eq(questionnaireQuestions.id, questionId));

  return loadQuestionnaireTree(organizationId, questionnaireId);
}

export async function deleteQuestionnaireQuestion(
  organizationId: string,
  questionnaireId: string,
  questionId: string,
): Promise<QuestionnaireTree> {
  await getQuestionnaireRowOrThrow(organizationId, questionnaireId);

  await getDb()
    .delete(questionnaireQuestions)
    .where(
      and(
        eq(questionnaireQuestions.organizationId, organizationId),
        eq(questionnaireQuestions.questionnaireId, questionnaireId),
        eq(questionnaireQuestions.id, questionId),
      ),
    );

  const remaining = await getDb().query.questionnaireQuestions.findMany({
    where: eq(questionnaireQuestions.questionnaireId, questionnaireId),
    orderBy: [asc(questionnaireQuestions.sortOrder)],
  });

  await getDb().transaction(async (tx) => {
    for (let index = 0; index < remaining.length; index++) {
      await tx
        .update(questionnaireQuestions)
        .set({ sortOrder: index })
        .where(eq(questionnaireQuestions.id, remaining[index]!.id));
    }
  });

  return loadQuestionnaireTree(organizationId, questionnaireId);
}

export async function reorderQuestionnaireQuestions(
  organizationId: string,
  questionnaireId: string,
  questionIds: string[],
): Promise<QuestionnaireTree> {
  await getQuestionnaireRowOrThrow(organizationId, questionnaireId);

  const existing = await getDb().query.questionnaireQuestions.findMany({
    where: eq(questionnaireQuestions.questionnaireId, questionnaireId),
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

  await getDb().transaction(async (tx) => {
    for (let index = 0; index < questionIds.length; index++) {
      await tx
        .update(questionnaireQuestions)
        .set({ sortOrder: index })
        .where(eq(questionnaireQuestions.id, questionIds[index]!));
    }
  });

  return loadQuestionnaireTree(organizationId, questionnaireId);
}

export async function patchQuestionnaireSchedule(
  organizationId: string,
  questionnaireId: string,
  input: PatchQuestionnaireScheduleInput,
): Promise<QuestionnaireTree> {
  await getQuestionnaireRowOrThrow(organizationId, questionnaireId);

  const existing = await getDb().query.questionnaireSchedules.findFirst({
    where: eq(questionnaireSchedules.questionnaireId, questionnaireId),
  });

  if (existing) {
    await getDb()
      .update(questionnaireSchedules)
      .set({
        triggerType: input.triggerType,
        sendDayOfWeek: input.sendDayOfWeek ?? null,
        sendHourUtc: input.sendHourUtc ?? null,
        reminderDayOfWeek: input.reminderDayOfWeek ?? null,
        reminderHourUtc: input.reminderHourUtc ?? null,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      })
      .where(eq(questionnaireSchedules.id, existing.id));
  } else {
    await getDb().insert(questionnaireSchedules).values({
      organizationId,
      questionnaireId,
      triggerType: input.triggerType,
      sendDayOfWeek: input.sendDayOfWeek ?? null,
      sendHourUtc: input.sendHourUtc ?? null,
      reminderDayOfWeek: input.reminderDayOfWeek ?? null,
      reminderHourUtc: input.reminderHourUtc ?? null,
      isActive: input.isActive ?? true,
    });
  }

  return loadQuestionnaireTree(organizationId, questionnaireId);
}

export async function listQuestionnaireSubmissions(
  organizationId: string,
  options: ListQuestionnaireSubmissionsOptions,
): Promise<{ items: QuestionnaireSubmissionListItem[]; total: number }> {
  const conditions: SQL[] = [
    eq(questionnaireSubmissions.organizationId, organizationId),
  ];

  if (options.status) {
    conditions.push(eq(questionnaireSubmissions.status, options.status));
  }
  if (options.questionnaireId) {
    conditions.push(
      eq(questionnaireSubmissions.questionnaireId, options.questionnaireId),
    );
  }
  if (options.clientId) {
    conditions.push(eq(questionnaireSubmissions.clientId, options.clientId));
  }

  const where = and(...conditions);

  const [rows, totalRow] = await Promise.all([
    getDb().query.questionnaireSubmissions.findMany({
      where,
      orderBy: [desc(questionnaireSubmissions.createdAt)],
      limit: options.limit,
      offset: options.offset,
      with: {
        questionnaire: { columns: { name: true } },
        client: { columns: { firstName: true, lastName: true } },
      },
    }),
    getDb()
      .select({ total: count() })
      .from(questionnaireSubmissions)
      .where(where),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      questionnaireId: row.questionnaireId,
      questionnaireName: row.questionnaire.name,
      clientId: row.clientId,
      clientName: clientDisplayName(row.client),
      status: row.status,
      periodKey: row.periodKey,
      dueAt: row.dueAt?.toISOString() ?? null,
      remindedAt: row.remindedAt?.toISOString() ?? null,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    total: totalRow[0]?.total ?? 0,
  };
}

export async function getQuestionnaireSubmissionStats(
  organizationId: string,
): Promise<QuestionnaireSubmissionStats> {
  const periodKey = getIsoWeekKey(new Date());

  const [pendingRow, overdueRow, submittedRow, totalRow] = await Promise.all([
    getDb()
      .select({ total: count() })
      .from(questionnaireSubmissions)
      .where(
        and(
          eq(questionnaireSubmissions.organizationId, organizationId),
          eq(questionnaireSubmissions.status, "pending"),
          eq(questionnaireSubmissions.periodKey, periodKey),
        ),
      ),
    getDb()
      .select({ total: count() })
      .from(questionnaireSubmissions)
      .where(
        and(
          eq(questionnaireSubmissions.organizationId, organizationId),
          eq(questionnaireSubmissions.status, "overdue"),
          eq(questionnaireSubmissions.periodKey, periodKey),
        ),
      ),
    getDb()
      .select({ total: count() })
      .from(questionnaireSubmissions)
      .where(
        and(
          eq(questionnaireSubmissions.organizationId, organizationId),
          eq(questionnaireSubmissions.status, "submitted"),
          eq(questionnaireSubmissions.periodKey, periodKey),
        ),
      ),
    getDb()
      .select({ total: count() })
      .from(questionnaireSubmissions)
      .where(
        and(
          eq(questionnaireSubmissions.organizationId, organizationId),
          eq(questionnaireSubmissions.periodKey, periodKey),
        ),
      ),
  ]);

  const pendingCount = pendingRow[0]?.total ?? 0;
  const overdueCount = overdueRow[0]?.total ?? 0;
  const submittedThisWeek = submittedRow[0]?.total ?? 0;
  const total = totalRow[0]?.total ?? 0;
  const completionRate =
    total === 0 ? 0 : Math.round((submittedThisWeek / total) * 100);

  return {
    completionRate,
    pendingCount,
    overdueCount,
    submittedThisWeek,
  };
}

export async function getQuestionnaireSubmissionDetail(
  organizationId: string,
  submissionId: string,
  scopedClientId?: string,
): Promise<QuestionnaireSubmissionDetail> {
  const row = await getDb().query.questionnaireSubmissions.findFirst({
    where: and(
      eq(questionnaireSubmissions.organizationId, organizationId),
      eq(questionnaireSubmissions.id, submissionId),
    ),
    with: {
      questionnaire: {
        with: {
          questions: { orderBy: [asc(questionnaireQuestions.sortOrder)] },
        },
      },
      client: { columns: { id: true, firstName: true, lastName: true } },
      responses: true,
    },
  });

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Submission not found",
      status: 404,
      detail: `Submission ${submissionId} was not found.`,
    });
  }

  if (scopedClientId && row.clientId !== scopedClientId) {
    throw problem({
      type: "forbidden",
      title: "Forbidden",
      status: 403,
      detail: "You do not have access to this submission.",
    });
  }

  const responseMap = new Map(
    row.responses.map((response) => [response.questionId, response]),
  );

  const questions = row.questionnaire.questions.map(mapQuestion);
  const responses: QuestionnaireResponseDetail[] = questions.map((question) => {
    const response = responseMap.get(question.id);
    return {
      questionId: question.id,
      label: question.label,
      type: question.type,
      textValue: response?.textValue ?? null,
      numberValue: response?.numberValue ?? null,
      booleanValue: response?.booleanValue ?? null,
    };
  });

  return {
    id: row.id,
    questionnaireId: row.questionnaireId,
    questionnaireName: row.questionnaire.name,
    questionnaireType: row.questionnaire.type,
    clientId: row.clientId,
    clientName: clientDisplayName(row.client),
    status: row.status,
    periodKey: row.periodKey,
    dueAt: row.dueAt?.toISOString() ?? null,
    remindedAt: row.remindedAt?.toISOString() ?? null,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    questions,
    responses,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listPendingQuestionnairesForClient(
  organizationId: string,
  clientId: string,
): Promise<ClientPendingQuestionnaire[]> {
  const pending = await getDb().query.questionnaireSubmissions.findMany({
    where: and(
      eq(questionnaireSubmissions.organizationId, organizationId),
      eq(questionnaireSubmissions.clientId, clientId),
      inArray(questionnaireSubmissions.status, ["pending", "overdue"]),
    ),
    orderBy: [desc(questionnaireSubmissions.createdAt)],
    with: {
      questionnaire: { columns: { name: true, type: true, isActive: true } },
    },
  });

  return pending
    .filter((row) => row.questionnaire.isActive)
    .map((row) => ({
      id: row.id,
      questionnaireId: row.questionnaireId,
      questionnaireName: row.questionnaire.name,
      questionnaireType: row.questionnaire.type,
      periodKey: row.periodKey,
      dueAt: row.dueAt?.toISOString() ?? null,
    }));
}

export async function submitQuestionnaire(
  organizationId: string,
  clientId: string,
  submissionId: string,
  input: SubmitQuestionnaireInput,
): Promise<QuestionnaireSubmissionDetail> {
  const submission = await getDb().query.questionnaireSubmissions.findFirst({
    where: and(
      eq(questionnaireSubmissions.organizationId, organizationId),
      eq(questionnaireSubmissions.id, submissionId),
      eq(questionnaireSubmissions.clientId, clientId),
    ),
    with: {
      questionnaire: {
        with: { questions: true },
      },
    },
  });

  if (!submission) {
    throw problem({
      type: "not-found",
      title: "Submission not found",
      status: 404,
      detail: `Submission ${submissionId} was not found.`,
    });
  }

  if (submission.status === "submitted") {
    throw problem({
      type: "validation-error",
      title: "Already submitted",
      status: 400,
      detail: "This questionnaire has already been submitted.",
    });
  }

  const questionMap = new Map(
    submission.questionnaire.questions.map((q) => [q.id, q]),
  );

  for (const response of input.responses) {
    const question = questionMap.get(response.questionId);
    if (!question) {
      throw problem({
        type: "validation-error",
        title: "Invalid question",
        status: 400,
        detail: `Question ${response.questionId} is not part of this questionnaire.`,
      });
    }

    if (question.required) {
      const hasValue =
        (response.textValue !== undefined &&
          response.textValue !== null &&
          response.textValue.trim() !== "") ||
        response.numberValue !== undefined ||
        response.booleanValue !== undefined;

      if (!hasValue) {
        throw problem({
          type: "validation-error",
          title: "Missing required answer",
          status: 400,
          detail: `Question "${question.label}" is required.`,
        });
      }
    }
  }

  const now = new Date();

  await getDb().transaction(async (tx) => {
    await tx
      .update(questionnaireSubmissions)
      .set({ status: "submitted", submittedAt: now })
      .where(eq(questionnaireSubmissions.id, submissionId));

    for (const response of input.responses) {
      await tx.insert(questionnaireResponses).values({
        organizationId,
        submissionId,
        questionId: response.questionId,
        textValue: response.textValue ?? null,
        numberValue: response.numberValue ?? null,
        booleanValue: response.booleanValue ?? null,
      });
    }
  });

  return getQuestionnaireSubmissionDetail(organizationId, submissionId, clientId);
}

async function createSubmissionIfMissing(params: {
  organizationId: string;
  questionnaireId: string;
  scheduleId: string | null;
  clientId: string;
  periodKey: string;
  dueAt?: Date;
  sendDueNotification?: boolean;
  questionnaireName?: string;
}): Promise<boolean> {
  const existing = await getDb().query.questionnaireSubmissions.findFirst({
    where: and(
      eq(questionnaireSubmissions.questionnaireId, params.questionnaireId),
      eq(questionnaireSubmissions.clientId, params.clientId),
      eq(questionnaireSubmissions.periodKey, params.periodKey),
    ),
    columns: { id: true },
  });

  if (existing) {
    return false;
  }

  const [created] = await getDb()
    .insert(questionnaireSubmissions)
    .values({
      organizationId: params.organizationId,
      questionnaireId: params.questionnaireId,
      scheduleId: params.scheduleId,
      clientId: params.clientId,
      periodKey: params.periodKey,
      status: "pending",
      dueAt: params.dueAt ?? null,
    })
    .returning();

  if (created && params.sendDueNotification && params.questionnaireName) {
    await dispatchQuestionnaireNotification({
      organizationId: params.organizationId,
      clientId: params.clientId,
      submissionId: created.id,
      questionnaireName: params.questionnaireName,
      eventType: "questionnaire_due",
    });
  }

  return true;
}

export async function createOnboardingSubmissionForClient(
  organizationId: string,
  clientId: string,
): Promise<void> {
  const questionnaire = await getDb().query.questionnaires.findFirst({
    where: and(
      eq(questionnaires.organizationId, organizationId),
      eq(questionnaires.type, "onboarding"),
      eq(questionnaires.isActive, true),
    ),
    with: { schedule: true },
  });

  if (!questionnaire?.schedule?.isActive) {
    return;
  }

  await createSubmissionIfMissing({
    organizationId,
    questionnaireId: questionnaire.id,
    scheduleId: questionnaire.schedule.id,
    clientId,
    periodKey: "onboarding",
    sendDueNotification: true,
    questionnaireName: questionnaire.name,
  });
}

export async function processWeeklyQuestionnaireCreates(
  now: Date = new Date(),
): Promise<{ created: number }> {
  let created = 0;
  const periodKey = getIsoWeekKey(now);
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  const schedules = await getDb().query.questionnaireSchedules.findMany({
    where: and(
      eq(questionnaireSchedules.triggerType, "weekly_cron"),
      eq(questionnaireSchedules.isActive, true),
    ),
    with: {
      questionnaire: true,
    },
  });

  for (const schedule of schedules) {
    if (!schedule.questionnaire.isActive) {
      continue;
    }

    if (
      schedule.sendDayOfWeek !== day ||
      schedule.sendHourUtc !== hour
    ) {
      continue;
    }

    const activeClients = await getDb().query.clients.findMany({
      where: and(
        eq(clients.organizationId, schedule.organizationId),
        eq(clients.status, "ACTIVE"),
      ),
      columns: { id: true },
    });

    const dueAt = new Date(now);
    dueAt.setUTCDate(dueAt.getUTCDate() + 1);

    for (const client of activeClients) {
      const wasCreated = await createSubmissionIfMissing({
        organizationId: schedule.organizationId,
        questionnaireId: schedule.questionnaireId,
        scheduleId: schedule.id,
        clientId: client.id,
        periodKey,
        dueAt,
        sendDueNotification: true,
        questionnaireName: schedule.questionnaire.name,
      });
      if (wasCreated) {
        created++;
      }
    }
  }

  return { created };
}

export async function processWeeklyQuestionnaireReminders(
  now: Date = new Date(),
): Promise<{ reminded: number }> {
  let reminded = 0;
  const periodKey = getIsoWeekKey(now);
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  const schedules = await getDb().query.questionnaireSchedules.findMany({
    where: and(
      eq(questionnaireSchedules.triggerType, "weekly_cron"),
      eq(questionnaireSchedules.isActive, true),
    ),
    with: { questionnaire: true },
  });

  for (const schedule of schedules) {
    if (
      schedule.reminderDayOfWeek !== day ||
      schedule.reminderHourUtc !== hour
    ) {
      continue;
    }

    const pending = await getDb().query.questionnaireSubmissions.findMany({
      where: and(
        eq(questionnaireSubmissions.organizationId, schedule.organizationId),
        eq(questionnaireSubmissions.questionnaireId, schedule.questionnaireId),
        eq(questionnaireSubmissions.periodKey, periodKey),
        eq(questionnaireSubmissions.status, "pending"),
      ),
    });

    for (const submission of pending) {
      if (submission.remindedAt) {
        continue;
      }

      await dispatchQuestionnaireNotification({
        organizationId: submission.organizationId,
        clientId: submission.clientId,
        submissionId: submission.id,
        questionnaireName: schedule.questionnaire.name,
        eventType: "questionnaire_reminder",
      });

      await getDb()
        .update(questionnaireSubmissions)
        .set({ remindedAt: now })
        .where(eq(questionnaireSubmissions.id, submission.id));

      reminded++;
    }
  }

  return { reminded };
}

export async function markOverdueSubmissions(
  now: Date = new Date(),
): Promise<{ marked: number }> {
  const result = await getDb()
    .update(questionnaireSubmissions)
    .set({ status: "overdue" })
    .where(
      and(
        eq(questionnaireSubmissions.status, "pending"),
        isNotNull(questionnaireSubmissions.dueAt),
        lt(questionnaireSubmissions.dueAt, now),
      ),
    )
    .returning({ id: questionnaireSubmissions.id });

  return { marked: result.length };
}
