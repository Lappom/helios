import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { detectCriticalResponses } from "@/lib/assessments/critical";
import type {
  AssessmentCompareResult,
  AssessmentDetail,
  AssessmentFieldDetail,
  AssessmentListItem,
  AssessmentTemplateListItem,
  AssessmentTemplateTree,
  ClientPendingAssessment,
  FieldConfig,
  MeasurementDelta,
  PhotoPair,
  WeightDataPoint,
} from "@/lib/assessments/types";
import { problem } from "@/lib/api/response";
import { db } from "@/lib/db";
import {
  assessmentFields,
  assessmentResponses,
  assessmentTemplates,
  assessments,
  clients,
  programAssignments,
} from "@/lib/db/schema";
import type {
  CreateAssessmentFieldInput,
  CreateAssessmentInput,
  CreateAssessmentTemplateInput,
  PatchAssessmentFieldInput,
  PatchAssessmentTemplateInput,
  ReviewAssessmentInput,
  SubmitAssessmentInput,
} from "@/lib/validators/assessments";

const MEASUREMENT_LABELS: Record<string, string> = {
  weight: "Poids (kg)",
  bodyFat: "Masse grasse (%)",
  chest: "Poitrine (cm)",
  waist: "Taille (cm)",
  hips: "Hanches (cm)",
  arms: "Bras (cm)",
  thighs: "Cuisses (cm)",
};

export type ListAssessmentTemplatesOptions = {
  search?: string;
  page: number;
  limit: number;
  offset: number;
};

export type ListAssessmentsOptions = {
  status?: "pending" | "submitted" | "reviewed";
  clientId?: string;
  templateId?: string;
  criticalOnly?: boolean;
  page: number;
  limit: number;
  offset: number;
};

function mapField(row: typeof assessmentFields.$inferSelect): AssessmentFieldDetail {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    type: row.type,
    label: row.label,
    required: row.required,
    options: row.options,
    config: (row.config as FieldConfig | null) ?? null,
  };
}

function clientDisplayName(client: {
  firstName: string;
  lastName: string;
}): string {
  return `${client.firstName} ${client.lastName}`.trim();
}

async function getTemplateRowOrThrow(organizationId: string, templateId: string) {
  const template = await db.query.assessmentTemplates.findFirst({
    where: and(
      eq(assessmentTemplates.organizationId, organizationId),
      eq(assessmentTemplates.id, templateId),
    ),
  });

  if (!template) {
    throw problem({
      type: "not-found",
      title: "Assessment template not found",
      status: 404,
      detail: `Template ${templateId} was not found in this organization.`,
    });
  }

  return template;
}

async function getAssessmentRowOrThrow(
  organizationId: string,
  assessmentId: string,
) {
  const assessment = await db.query.assessments.findFirst({
    where: and(
      eq(assessments.organizationId, organizationId),
      eq(assessments.id, assessmentId),
    ),
  });

  if (!assessment) {
    throw problem({
      type: "not-found",
      title: "Assessment not found",
      status: 404,
      detail: `Assessment ${assessmentId} was not found in this organization.`,
    });
  }

  return assessment;
}

async function clearDefaultTemplate(organizationId: string, exceptId?: string) {
  const conditions: SQL[] = [
    eq(assessmentTemplates.organizationId, organizationId),
    eq(assessmentTemplates.isDefault, true),
  ];
  if (exceptId) {
    conditions.push(sql`${assessmentTemplates.id} <> ${exceptId}`);
  }

  await db
    .update(assessmentTemplates)
    .set({ isDefault: false })
    .where(and(...conditions));
}

export async function listAssessmentTemplates(
  organizationId: string,
  options: ListAssessmentTemplatesOptions,
): Promise<{ items: AssessmentTemplateListItem[]; total: number }> {
  const filters: SQL[] = [eq(assessmentTemplates.organizationId, organizationId)];

  if (options.search) {
    filters.push(ilike(assessmentTemplates.name, `%${options.search}%`));
  }

  const where = and(...filters);

  const [rows, totalRow] = await Promise.all([
    db.query.assessmentTemplates.findMany({
      where,
      orderBy: [desc(assessmentTemplates.updatedAt)],
      limit: options.limit,
      offset: options.offset,
      with: { fields: { columns: { id: true } } },
    }),
    db.select({ total: count() }).from(assessmentTemplates).where(where),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      frequency: row.frequency,
      autoAssignOnProgramStart: row.autoAssignOnProgramStart,
      daysAfterProgramStart: row.daysAfterProgramStart,
      isDefault: row.isDefault,
      fieldCount: row.fields.length,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    total: totalRow[0]?.total ?? 0,
  };
}

export async function createAssessmentTemplate(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateAssessmentTemplateInput,
): Promise<AssessmentTemplateTree> {
  if (input.isDefault) {
    await clearDefaultTemplate(organizationId);
  }

  const [template] = await db
    .insert(assessmentTemplates)
    .values({
      organizationId,
      coachClerkUserId,
      name: input.name,
      frequency: input.frequency,
      autoAssignOnProgramStart: input.autoAssignOnProgramStart,
      daysAfterProgramStart: input.daysAfterProgramStart,
      isDefault: input.isDefault,
    })
    .returning();

  return getAssessmentTemplateTree(organizationId, template.id);
}

export async function getAssessmentTemplateTree(
  organizationId: string,
  templateId: string,
): Promise<AssessmentTemplateTree> {
  const template = await db.query.assessmentTemplates.findFirst({
    where: and(
      eq(assessmentTemplates.organizationId, organizationId),
      eq(assessmentTemplates.id, templateId),
    ),
    with: {
      fields: {
        orderBy: [asc(assessmentFields.sortOrder)],
      },
    },
  });

  if (!template) {
    throw problem({
      type: "not-found",
      title: "Assessment template not found",
      status: 404,
      detail: `Template ${templateId} was not found.`,
    });
  }

  return {
    id: template.id,
    name: template.name,
    frequency: template.frequency,
    autoAssignOnProgramStart: template.autoAssignOnProgramStart,
    daysAfterProgramStart: template.daysAfterProgramStart,
    isDefault: template.isDefault,
    fields: template.fields.map(mapField),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export async function patchAssessmentTemplate(
  organizationId: string,
  templateId: string,
  input: PatchAssessmentTemplateInput,
): Promise<AssessmentTemplateTree> {
  await getTemplateRowOrThrow(organizationId, templateId);

  if (input.isDefault) {
    await clearDefaultTemplate(organizationId, templateId);
  }

  await db
    .update(assessmentTemplates)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(input.autoAssignOnProgramStart !== undefined
        ? { autoAssignOnProgramStart: input.autoAssignOnProgramStart }
        : {}),
      ...(input.daysAfterProgramStart !== undefined
        ? { daysAfterProgramStart: input.daysAfterProgramStart }
        : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    })
    .where(
      and(
        eq(assessmentTemplates.organizationId, organizationId),
        eq(assessmentTemplates.id, templateId),
      ),
    );

  return getAssessmentTemplateTree(organizationId, templateId);
}

export async function deleteAssessmentTemplate(
  organizationId: string,
  templateId: string,
): Promise<void> {
  await getTemplateRowOrThrow(organizationId, templateId);

  const inUse = await db.query.assessments.findFirst({
    where: and(
      eq(assessments.organizationId, organizationId),
      eq(assessments.templateId, templateId),
    ),
    columns: { id: true },
  });

  if (inUse) {
    throw problem({
      type: "validation-error",
      title: "Template in use",
      status: 409,
      detail: "Cannot delete a template that has assessments linked to it.",
    });
  }

  await db
    .delete(assessmentTemplates)
    .where(
      and(
        eq(assessmentTemplates.organizationId, organizationId),
        eq(assessmentTemplates.id, templateId),
      ),
    );
}

async function getNextFieldSortOrder(templateId: string): Promise<number> {
  const row = await db.query.assessmentFields.findFirst({
    where: eq(assessmentFields.templateId, templateId),
    orderBy: [desc(assessmentFields.sortOrder)],
    columns: { sortOrder: true },
  });
  return (row?.sortOrder ?? -1) + 1;
}

export async function createAssessmentField(
  organizationId: string,
  templateId: string,
  input: CreateAssessmentFieldInput,
): Promise<AssessmentTemplateTree> {
  await getTemplateRowOrThrow(organizationId, templateId);
  const sortOrder = await getNextFieldSortOrder(templateId);

  await db.insert(assessmentFields).values({
    organizationId,
    templateId,
    sortOrder,
    type: input.type,
    label: input.label,
    required: input.required ?? false,
    options: input.options ?? null,
    config: input.config ?? null,
  });

  return getAssessmentTemplateTree(organizationId, templateId);
}

export async function patchAssessmentField(
  organizationId: string,
  templateId: string,
  fieldId: string,
  input: PatchAssessmentFieldInput,
): Promise<AssessmentTemplateTree> {
  await getTemplateRowOrThrow(organizationId, templateId);

  const field = await db.query.assessmentFields.findFirst({
    where: and(
      eq(assessmentFields.organizationId, organizationId),
      eq(assessmentFields.templateId, templateId),
      eq(assessmentFields.id, fieldId),
    ),
  });

  if (!field) {
    throw problem({
      type: "not-found",
      title: "Field not found",
      status: 404,
      detail: `Field ${fieldId} was not found.`,
    });
  }

  await db
    .update(assessmentFields)
    .set({
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.required !== undefined ? { required: input.required } : {}),
      ...(input.options !== undefined ? { options: input.options } : {}),
      ...(input.config !== undefined ? { config: input.config } : {}),
    })
    .where(eq(assessmentFields.id, fieldId));

  return getAssessmentTemplateTree(organizationId, templateId);
}

export async function deleteAssessmentField(
  organizationId: string,
  templateId: string,
  fieldId: string,
): Promise<AssessmentTemplateTree> {
  await getTemplateRowOrThrow(organizationId, templateId);

  await db
    .delete(assessmentFields)
    .where(
      and(
        eq(assessmentFields.organizationId, organizationId),
        eq(assessmentFields.templateId, templateId),
        eq(assessmentFields.id, fieldId),
      ),
    );

  const remaining = await db.query.assessmentFields.findMany({
    where: eq(assessmentFields.templateId, templateId),
    orderBy: [asc(assessmentFields.sortOrder)],
  });

  await Promise.all(
    remaining.map((field, index) =>
      db
        .update(assessmentFields)
        .set({ sortOrder: index })
        .where(eq(assessmentFields.id, field.id)),
    ),
  );

  return getAssessmentTemplateTree(organizationId, templateId);
}

export async function reorderAssessmentFields(
  organizationId: string,
  templateId: string,
  fieldIds: string[],
): Promise<AssessmentTemplateTree> {
  await getTemplateRowOrThrow(organizationId, templateId);

  const existing = await db.query.assessmentFields.findMany({
    where: and(
      eq(assessmentFields.organizationId, organizationId),
      eq(assessmentFields.templateId, templateId),
    ),
  });

  if (existing.length !== fieldIds.length) {
    throw problem({
      type: "validation-error",
      title: "Invalid field order",
      status: 400,
      detail: "fieldIds must include every field exactly once.",
    });
  }

  const existingIds = new Set(existing.map((field) => field.id));
  if (!fieldIds.every((id) => existingIds.has(id))) {
    throw problem({
      type: "validation-error",
      title: "Invalid field order",
      status: 400,
      detail: "fieldIds contains unknown field ids.",
    });
  }

  await Promise.all(
    fieldIds.map((id, index) =>
      db
        .update(assessmentFields)
        .set({ sortOrder: index })
        .where(eq(assessmentFields.id, id)),
    ),
  );

  return getAssessmentTemplateTree(organizationId, templateId);
}

export async function createAssessment(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateAssessmentInput,
  source: "manual" | "cron" = "manual",
): Promise<AssessmentDetail> {
  await getTemplateRowOrThrow(organizationId, input.templateId);

  const client = await db.query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, input.clientId),
    ),
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: `Client ${input.clientId} was not found.`,
    });
  }

  const dueAt = input.dueAt
    ? new Date(input.dueAt)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [assessment] = await db
    .insert(assessments)
    .values({
      organizationId,
      templateId: input.templateId,
      clientId: input.clientId,
      coachClerkUserId,
      programAssignmentId: input.programAssignmentId ?? null,
      status: "pending",
      source,
      dueAt,
    })
    .returning();

  return getAssessmentDetail(organizationId, assessment.id);
}

export async function listAssessments(
  organizationId: string,
  options: ListAssessmentsOptions,
): Promise<{ items: AssessmentListItem[]; total: number }> {
  const filters: SQL[] = [eq(assessments.organizationId, organizationId)];

  if (options.status) {
    filters.push(eq(assessments.status, options.status));
  }
  if (options.clientId) {
    filters.push(eq(assessments.clientId, options.clientId));
  }
  if (options.templateId) {
    filters.push(eq(assessments.templateId, options.templateId));
  }
  if (options.criticalOnly) {
    filters.push(eq(assessments.hasCriticalAlert, true));
  }

  const where = and(...filters);

  const rows = await db.query.assessments.findMany({
    where,
    orderBy: [desc(assessments.updatedAt)],
    limit: options.limit,
    offset: options.offset,
    with: {
      template: { columns: { name: true } },
      client: { columns: { firstName: true, lastName: true } },
    },
  });

  const totalRow = await db
    .select({ total: count() })
    .from(assessments)
    .where(where);

  return {
    items: rows.map((row) => ({
      id: row.id,
      templateId: row.templateId,
      templateName: row.template.name,
      clientId: row.clientId,
      clientName: clientDisplayName(row.client),
      status: row.status,
      source: row.source,
      dueAt: row.dueAt?.toISOString() ?? null,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      hasCriticalAlert: row.hasCriticalAlert,
      criticalSummary: row.criticalSummary,
      createdAt: row.createdAt.toISOString(),
    })),
    total: totalRow[0]?.total ?? 0,
  };
}

export async function getAssessmentDetail(
  organizationId: string,
  assessmentId: string,
): Promise<AssessmentDetail> {
  const assessment = await db.query.assessments.findFirst({
    where: and(
      eq(assessments.organizationId, organizationId),
      eq(assessments.id, assessmentId),
    ),
    with: {
      template: {
        with: {
          fields: { orderBy: [asc(assessmentFields.sortOrder)] },
        },
      },
      client: { columns: { firstName: true, lastName: true } },
      responses: true,
    },
  });

  if (!assessment) {
    throw problem({
      type: "not-found",
      title: "Assessment not found",
      status: 404,
      detail: `Assessment ${assessmentId} was not found.`,
    });
  }

  const fieldMap = new Map(
    assessment.template.fields.map((field) => [field.id, mapField(field)]),
  );

  return {
    id: assessment.id,
    templateId: assessment.templateId,
    templateName: assessment.template.name,
    clientId: assessment.clientId,
    clientName: clientDisplayName(assessment.client),
    status: assessment.status,
    source: assessment.source,
    dueAt: assessment.dueAt?.toISOString() ?? null,
    submittedAt: assessment.submittedAt?.toISOString() ?? null,
    reviewedAt: assessment.reviewedAt?.toISOString() ?? null,
    hasCriticalAlert: assessment.hasCriticalAlert,
    criticalSummary: assessment.criticalSummary,
    coachNotes: assessment.coachNotes,
    fields: assessment.template.fields.map(mapField),
    responses: assessment.responses.map((response) => ({
      id: response.id,
      fieldId: response.fieldId,
      textValue: response.textValue,
      numberValue: response.numberValue,
      jsonValue: response.jsonValue,
      photoBlobPath: response.photoBlobPath,
      field: fieldMap.get(response.fieldId) ?? {
        id: response.fieldId,
        sortOrder: 0,
        type: "text",
        label: "Unknown",
        required: false,
        options: null,
        config: null,
      },
    })),
    createdAt: assessment.createdAt.toISOString(),
    updatedAt: assessment.updatedAt.toISOString(),
  };
}

function validateSubmitResponses(
  fields: AssessmentFieldDetail[],
  input: SubmitAssessmentInput,
): void {
  const byFieldId = new Map(input.responses.map((r) => [r.fieldId, r]));

  for (const field of fields) {
    const response = byFieldId.get(field.id);
    if (field.required && !response) {
      throw problem({
        type: "validation-error",
        title: "Missing required field",
        status: 400,
        detail: `Field "${field.label}" is required.`,
      });
    }
    if (!response) {
      continue;
    }

    if (field.type === "photo" && !response.photoBlobPath) {
      throw problem({
        type: "validation-error",
        title: "Missing photo",
        status: 400,
        detail: `Photo required for "${field.label}".`,
      });
    }
    if (field.type === "text" && field.required && !response.textValue?.trim()) {
      throw problem({
        type: "validation-error",
        title: "Missing text",
        status: 400,
        detail: `Text required for "${field.label}".`,
      });
    }
    if (
      field.type === "number" &&
      field.required &&
      response.numberValue === null
    ) {
      throw problem({
        type: "validation-error",
        title: "Missing number",
        status: 400,
        detail: `Number required for "${field.label}".`,
      });
    }
    if (field.type === "measurement" && field.required) {
      const keys = field.config?.measurementKeys ?? ["weight"];
      const values = response.jsonValue ?? {};
      const missing = keys.some((key) => values[key] === undefined);
      if (missing) {
        throw problem({
          type: "validation-error",
          title: "Missing measurement",
          status: 400,
          detail: `Measurements required for "${field.label}".`,
        });
      }
    }
  }
}

export async function submitAssessment(
  organizationId: string,
  clientId: string,
  assessmentId: string,
  input: SubmitAssessmentInput,
): Promise<AssessmentDetail> {
  const assessment = await getAssessmentRowOrThrow(organizationId, assessmentId);

  if (assessment.clientId !== clientId) {
    throw problem({
      type: "forbidden",
      title: "Not your assessment",
      status: 403,
      detail: "This assessment belongs to another client.",
    });
  }

  if (assessment.status !== "pending") {
    throw problem({
      type: "validation-error",
      title: "Assessment already submitted",
      status: 409,
      detail: "Only pending assessments can be submitted.",
    });
  }

  const template = await getAssessmentTemplateTree(
    organizationId,
    assessment.templateId,
  );
  validateSubmitResponses(template.fields, input);

  const critical = detectCriticalResponses(
    template.fields,
    input.responses.map((r) => ({
      fieldId: r.fieldId,
      textValue: r.textValue ?? null,
      numberValue: r.numberValue ?? null,
      jsonValue: r.jsonValue ?? null,
    })),
  );

  await db
    .delete(assessmentResponses)
    .where(eq(assessmentResponses.assessmentId, assessmentId));

  if (input.responses.length > 0) {
    await db.insert(assessmentResponses).values(
      input.responses.map((response) => ({
        organizationId,
        assessmentId,
        fieldId: response.fieldId,
        textValue: response.textValue ?? null,
        numberValue: response.numberValue ?? null,
        jsonValue: response.jsonValue ?? null,
        photoBlobPath: response.photoBlobPath ?? null,
      })),
    );
  }

  await db
    .update(assessments)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      hasCriticalAlert: critical.hasCriticalAlert,
      criticalSummary: critical.criticalSummary,
    })
    .where(eq(assessments.id, assessmentId));

  const { emitHeliosEvent } = await import("@/lib/events/emit-event");
  emitHeliosEvent("assessment.submitted", {
    organizationId,
    assessmentId,
    clientId: assessment.clientId,
  });

  return getAssessmentDetail(organizationId, assessmentId);
}

export async function reviewAssessment(
  organizationId: string,
  assessmentId: string,
  input: ReviewAssessmentInput,
): Promise<AssessmentDetail> {
  const assessment = await getAssessmentRowOrThrow(organizationId, assessmentId);

  if (assessment.status !== "submitted") {
    throw problem({
      type: "validation-error",
      title: "Assessment not ready for review",
      status: 409,
      detail: "Only submitted assessments can be marked as reviewed.",
    });
  }

  await db
    .update(assessments)
    .set({
      status: "reviewed",
      reviewedAt: new Date(),
      coachNotes: input.coachNotes ?? null,
    })
    .where(eq(assessments.id, assessmentId));

  return getAssessmentDetail(organizationId, assessmentId);
}

export async function upsertAssessmentPhotoResponse(
  organizationId: string,
  clientId: string,
  assessmentId: string,
  fieldId: string,
  photoBlobPath: string,
): Promise<void> {
  const assessment = await getAssessmentRowOrThrow(organizationId, assessmentId);

  if (assessment.clientId !== clientId || assessment.status !== "pending") {
    throw problem({
      type: "forbidden",
      title: "Cannot upload photo",
      status: 403,
      detail: "Photos can only be uploaded for your pending assessments.",
    });
  }

  const field = await db.query.assessmentFields.findFirst({
    where: and(
      eq(assessmentFields.organizationId, organizationId),
      eq(assessmentFields.templateId, assessment.templateId),
      eq(assessmentFields.id, fieldId),
      eq(assessmentFields.type, "photo"),
    ),
  });

  if (!field) {
    throw problem({
      type: "not-found",
      title: "Photo field not found",
      status: 404,
      detail: `Photo field ${fieldId} was not found.`,
    });
  }

  const existing = await db.query.assessmentResponses.findFirst({
    where: and(
      eq(assessmentResponses.assessmentId, assessmentId),
      eq(assessmentResponses.fieldId, fieldId),
    ),
  });

  if (existing) {
    await db
      .update(assessmentResponses)
      .set({ photoBlobPath })
      .where(eq(assessmentResponses.id, existing.id));
  } else {
    await db.insert(assessmentResponses).values({
      organizationId,
      assessmentId,
      fieldId,
      photoBlobPath,
    });
  }
}

function extractWeight(
  detail: AssessmentDetail | null,
): { date: string; weight: number } | null {
  if (!detail?.submittedAt) {
    return null;
  }

  for (const response of detail.responses) {
    if (response.field.type === "measurement" && response.jsonValue?.weight) {
      return {
        date: detail.submittedAt,
        weight: response.jsonValue.weight,
      };
    }
    if (
      response.field.type === "number" &&
      response.field.label.toLowerCase().includes("poids") &&
      response.numberValue !== null
    ) {
      return { date: detail.submittedAt, weight: response.numberValue };
    }
  }

  return null;
}

function buildMeasurementDeltas(
  current: AssessmentDetail | null,
  previous: AssessmentDetail | null,
): MeasurementDelta[] {
  if (!current || !previous) {
    return [];
  }

  const deltas: MeasurementDelta[] = [];
  const prevMap = new Map<string, number>();

  for (const response of previous.responses) {
    if (response.field.type === "measurement" && response.jsonValue) {
      for (const [key, value] of Object.entries(response.jsonValue)) {
        prevMap.set(`${response.fieldId}:${key}`, value);
      }
    }
    if (response.field.type === "number" && response.numberValue !== null) {
      prevMap.set(response.fieldId, response.numberValue);
    }
  }

  for (const response of current.responses) {
    if (response.field.type === "measurement" && response.jsonValue) {
      for (const [key, value] of Object.entries(response.jsonValue)) {
        const prev = prevMap.get(`${response.fieldId}:${key}`) ?? null;
        deltas.push({
          key,
          label: MEASUREMENT_LABELS[key] ?? key,
          previous: prev,
          current: value,
          delta: prev !== null ? value - prev : null,
        });
      }
    }
    if (response.field.type === "number" && response.numberValue !== null) {
      const prev = prevMap.get(response.fieldId) ?? null;
      deltas.push({
        key: response.fieldId,
        label: response.field.label,
        previous: prev,
        current: response.numberValue,
        delta:
          prev !== null ? response.numberValue - prev : null,
      });
    }
  }

  return deltas;
}

function buildPhotoPairs(
  current: AssessmentDetail | null,
  previous: AssessmentDetail | null,
): PhotoPair[] {
  if (!current) {
    return [];
  }

  const prevPhotos = new Map<string, string>();
  if (previous) {
    for (const response of previous.responses) {
      if (response.field.type === "photo" && response.photoBlobPath) {
        prevPhotos.set(response.fieldId, response.photoBlobPath);
      }
    }
  }

  return current.responses
    .filter((response) => response.field.type === "photo")
    .map((response) => ({
      fieldId: response.fieldId,
      label: response.field.label,
      previousPath: prevPhotos.get(response.fieldId) ?? null,
      currentPath: response.photoBlobPath,
    }));
}

export async function compareClientAssessments(
  organizationId: string,
  clientId: string,
  assessmentIdA?: string,
  assessmentIdB?: string,
): Promise<AssessmentCompareResult> {
  const client = await db.query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: `Client ${clientId} was not found.`,
    });
  }

  let current: AssessmentDetail | null = null;
  let previous: AssessmentDetail | null = null;

  if (assessmentIdA && assessmentIdB) {
    current = await getAssessmentDetail(organizationId, assessmentIdA);
    previous = await getAssessmentDetail(organizationId, assessmentIdB);
  } else {
    const reviewed = await db.query.assessments.findMany({
      where: and(
        eq(assessments.organizationId, organizationId),
        eq(assessments.clientId, clientId),
        inArray(assessments.status, ["submitted", "reviewed"]),
      ),
      orderBy: [desc(assessments.submittedAt)],
      limit: 2,
    });

    if (reviewed[0]) {
      current = await getAssessmentDetail(organizationId, reviewed[0].id);
    }
    if (reviewed[1]) {
      previous = await getAssessmentDetail(organizationId, reviewed[1].id);
    }
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const historyRows = await db.query.assessments.findMany({
    where: and(
      eq(assessments.organizationId, organizationId),
      eq(assessments.clientId, clientId),
      inArray(assessments.status, ["submitted", "reviewed"]),
      gte(assessments.submittedAt, sixMonthsAgo),
    ),
    orderBy: [asc(assessments.submittedAt)],
    with: { responses: true, template: { with: { fields: true } } },
  });

  const weightHistory: WeightDataPoint[] = [];
  for (const row of historyRows) {
    const detail = await getAssessmentDetail(organizationId, row.id);
    const point = extractWeight(detail);
    if (point) {
      weightHistory.push(point);
    }
  }

  return {
    clientId,
    clientName: clientDisplayName(client),
    current,
    previous,
    measurementDeltas: buildMeasurementDeltas(current, previous),
    photoPairs: buildPhotoPairs(current, previous),
    weightHistory,
  };
}

export async function listClientPendingAssessments(
  organizationId: string,
  clientId: string,
): Promise<ClientPendingAssessment[]> {
  const rows = await db.query.assessments.findMany({
    where: and(
      eq(assessments.organizationId, organizationId),
      eq(assessments.clientId, clientId),
      eq(assessments.status, "pending"),
    ),
    orderBy: [asc(assessments.dueAt)],
    with: { template: { columns: { name: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    templateName: row.template.name,
    dueAt: row.dueAt?.toISOString() ?? null,
    status: row.status,
  }));
}

export async function getDefaultTemplateForOrg(organizationId: string) {
  const template = await db.query.assessmentTemplates.findFirst({
    where: and(
      eq(assessmentTemplates.organizationId, organizationId),
      eq(assessmentTemplates.isDefault, true),
    ),
  });

  if (template) {
    return template;
  }

  return db.query.assessmentTemplates.findFirst({
    where: and(
      eq(assessmentTemplates.organizationId, organizationId),
      eq(assessmentTemplates.autoAssignOnProgramStart, true),
    ),
    orderBy: [desc(assessmentTemplates.createdAt)],
  });
}

function monthWindowKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

export async function createDueAssessments(): Promise<{ created: number }> {
  const now = new Date();
  let created = 0;

  const activeAssignments = await db.query.programAssignments.findMany({
    where: eq(programAssignments.status, "active"),
    with: {
      client: { columns: { id: true, organizationId: true } },
    },
  });

  for (const assignment of activeAssignments) {
    const organizationId = assignment.organizationId;
    const template = await getDefaultTemplateForOrg(organizationId);

    if (!template?.autoAssignOnProgramStart) {
      continue;
    }

    const triggerDate = new Date(assignment.startDate);
    triggerDate.setDate(
      triggerDate.getDate() + template.daysAfterProgramStart,
    );

    if (triggerDate > now) {
      continue;
    }

    const windowKey = monthWindowKey(now);

    const existing = await db.query.assessments.findFirst({
      where: and(
        eq(assessments.organizationId, organizationId),
        eq(assessments.clientId, assignment.clientId),
        eq(assessments.templateId, template.id),
        or(eq(assessments.status, "pending"), eq(assessments.status, "submitted")),
        gte(assessments.createdAt, startOfMonth(now)),
        lte(assessments.createdAt, endOfMonth(now)),
      ),
    });

    if (existing) {
      continue;
    }

    if (template.frequency === "monthly") {
      const reviewedThisMonth = await db.query.assessments.findFirst({
        where: and(
          eq(assessments.organizationId, organizationId),
          eq(assessments.clientId, assignment.clientId),
          eq(assessments.templateId, template.id),
          gte(assessments.createdAt, startOfMonth(now)),
          lte(assessments.createdAt, endOfMonth(now)),
        ),
      });

      if (reviewedThisMonth) {
        continue;
      }
    }

    void windowKey;

    await createAssessment(
      organizationId,
      assignment.coachClerkUserId,
      {
        clientId: assignment.clientId,
        templateId: template.id,
        programAssignmentId: assignment.id,
      },
      "cron",
    );
    created += 1;
  }

  return { created };
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

export async function seedDefaultTemplateIfMissing(
  organizationId: string,
  coachClerkUserId: string,
): Promise<void> {
  const existing = await db.query.assessmentTemplates.findFirst({
    where: eq(assessmentTemplates.organizationId, organizationId),
    columns: { id: true },
  });

  if (existing) {
    return;
  }

  const template = await createAssessmentTemplate(organizationId, coachClerkUserId, {
    name: "Bilan mensuel",
    frequency: "monthly",
    autoAssignOnProgramStart: true,
    daysAfterProgramStart: 30,
    isDefault: true,
  });

  const fields: CreateAssessmentFieldInput[] = [
    {
      type: "measurement",
      label: "Mesures corporelles",
      required: true,
      config: {
        measurementKeys: ["weight", "chest", "waist", "hips", "arms"],
      },
    },
    {
      type: "photo",
      label: "Photo face",
      required: true,
      config: { photoPose: "face" },
    },
    {
      type: "photo",
      label: "Photo profil",
      required: true,
      config: { photoPose: "side" },
    },
    {
      type: "photo",
      label: "Photo dos",
      required: false,
      config: { photoPose: "back" },
    },
    {
      type: "number",
      label: "Douleur (0-10)",
      required: true,
      config: { criticalWhen: { op: "gte", value: 7 } },
    },
    {
      type: "text",
      label: "Commentaires",
      required: false,
    },
  ];

  for (const field of fields) {
    await createAssessmentField(organizationId, template.id, field);
  }
}
