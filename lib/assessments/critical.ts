import type { FieldConfig } from "@/lib/assessments/types";

type FieldLike = {
  id: string;
  label: string;
  type: string;
  config: FieldConfig | null;
};

type ResponseLike = {
  fieldId: string;
  textValue: string | null;
  numberValue: number | null;
  jsonValue: Record<string, number> | null;
};

function getNumericValue(
  field: FieldLike,
  response: ResponseLike,
): number | null {
  if (field.type === "number" && response.numberValue !== null) {
    return response.numberValue;
  }
  if (field.type === "measurement" && response.jsonValue) {
    const keys =
      field.config?.measurementKeys ?? Object.keys(response.jsonValue);
    const firstKey = keys[0];
    if (firstKey && response.jsonValue[firstKey] !== undefined) {
      return response.jsonValue[firstKey];
    }
  }
  return null;
}

function isCritical(
  config: FieldConfig,
  field: FieldLike,
  response: ResponseLike,
): boolean {
  const rule = config.criticalWhen;
  if (!rule) {
    return false;
  }

  if (field.type === "select" && response.textValue !== null) {
    return String(response.textValue) === String(rule.value);
  }

  const numeric = getNumericValue(field, response);
  if (numeric === null) {
    return false;
  }

  const threshold =
    typeof rule.value === "number" ? rule.value : Number(rule.value);

  if (Number.isNaN(threshold)) {
    return false;
  }

  switch (rule.op) {
    case "gte":
      return numeric >= threshold;
    case "lte":
      return numeric <= threshold;
    case "eq":
      return numeric === threshold;
    default:
      return false;
  }
}

export function detectCriticalResponses(
  fields: FieldLike[],
  responses: ResponseLike[],
): { hasCriticalAlert: boolean; criticalSummary: string | null } {
  const alerts: string[] = [];

  for (const response of responses) {
    const field = fields.find((entry) => entry.id === response.fieldId);
    if (!field?.config?.criticalWhen) {
      continue;
    }
    if (isCritical(field.config, field, response)) {
      alerts.push(field.label);
    }
  }

  if (alerts.length === 0) {
    return { hasCriticalAlert: false, criticalSummary: null };
  }

  return {
    hasCriticalAlert: true,
    criticalSummary: `Alerte critique : ${alerts.join(", ")}`,
  };
}
