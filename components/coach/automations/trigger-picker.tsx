"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUTOMATION_TRIGGER_TYPES,
  type AutomationTriggerType,
} from "@/lib/validators/automations";
import { SchedulePicker, SCHEDULE_PRESETS } from "../notifications/schedule-picker";

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  payment_received: "payment.received",
  client_created: "client.created",
  form_completed: "form.completed",
  session_completed: "session.completed",
  assessment_submitted: "assessment.submitted",
  schedule_cron: "schedule.cron",
  subscription_renewal_due: "subscription.renewal_due",
  mesocycle_completed: "mesocycle.completed",
};

type TriggerPickerProps = {
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  onChange: (
    triggerType: AutomationTriggerType,
    triggerConfig: Record<string, unknown>,
  ) => void;
  disabled?: boolean;
};

export function TriggerPicker({
  triggerType,
  triggerConfig,
  onChange,
  disabled,
}: TriggerPickerProps) {
  return (
    <div className="border-hairline bg-surface-elevated space-y-4 rounded-lg border p-5">
      <p className="text-caption-uppercase text-muted tracking-widest uppercase">
        Trigger
      </p>
      <p className="font-mono text-title-sm text-primary">
        {TRIGGER_LABELS[triggerType]}
      </p>
      <Select
        value={triggerType}
        onValueChange={(value) =>
          onChange(value as AutomationTriggerType, triggerConfig)
        }
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choisir un trigger" />
        </SelectTrigger>
        <SelectContent>
          {AUTOMATION_TRIGGER_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              <span className="font-mono">{TRIGGER_LABELS[type]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {triggerType === "schedule_cron" ? (
        <div className="space-y-2">
          <p className="text-body-sm text-muted">Planification cron</p>
          <SchedulePicker
            value={String(triggerConfig.cron ?? SCHEDULE_PRESETS[0].cron)}
            onChange={(cron) => onChange(triggerType, { ...triggerConfig, cron })}
          />
          <Input
            placeholder="Timezone (optionnel, ex. Europe/Paris)"
            value={String(triggerConfig.timezone ?? "")}
            onChange={(event) =>
              onChange(triggerType, {
                ...triggerConfig,
                timezone: event.target.value || undefined,
              })
            }
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}
