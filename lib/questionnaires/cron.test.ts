import { describe, expect, it } from "vitest";
import { getIsoWeekKey } from "./period";
import {
  shouldCreateWeeklySubmission,
  shouldSendWeeklyReminder,
} from "./period";

describe("questionnaire cron idempotence", () => {
  it("creates weekly submission only on configured Sunday hour", () => {
    const sunday = new Date("2026-06-07T18:00:00Z");

    expect(
      shouldCreateWeeklySubmission({
        now: sunday,
        sendDayOfWeek: 0,
        sendHourUtc: 18,
        hasExistingForPeriod: false,
      }),
    ).toBe(true);

    expect(
      shouldCreateWeeklySubmission({
        now: sunday,
        sendDayOfWeek: 0,
        sendHourUtc: 18,
        hasExistingForPeriod: true,
      }),
    ).toBe(false);

    expect(
      shouldCreateWeeklySubmission({
        now: new Date("2026-06-07T17:00:00Z"),
        sendDayOfWeek: 0,
        sendHourUtc: 18,
        hasExistingForPeriod: false,
      }),
    ).toBe(false);
  });

  it("sends reminder only on Monday for pending submissions", () => {
    const monday = new Date("2026-06-08T08:00:00Z");

    expect(
      shouldSendWeeklyReminder({
        now: monday,
        reminderDayOfWeek: 1,
        reminderHourUtc: 8,
        alreadyReminded: false,
        status: "pending",
      }),
    ).toBe(true);

    expect(
      shouldSendWeeklyReminder({
        now: monday,
        reminderDayOfWeek: 1,
        reminderHourUtc: 8,
        alreadyReminded: true,
        status: "pending",
      }),
    ).toBe(false);

    expect(
      shouldSendWeeklyReminder({
        now: monday,
        reminderDayOfWeek: 1,
        reminderHourUtc: 8,
        alreadyReminded: false,
        status: "submitted",
      }),
    ).toBe(false);
  });

  it("builds stable ISO week keys", () => {
    expect(getIsoWeekKey(new Date("2026-06-08T12:00:00Z"))).toMatch(/^\d{4}-W\d{2}$/);
  });
});
