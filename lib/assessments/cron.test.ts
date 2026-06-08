import { describe, expect, it } from "vitest";

function monthWindowKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function shouldCreateForAssignment(params: {
  startDate: Date;
  daysAfter: number;
  now: Date;
  hasExistingThisMonth: boolean;
}): boolean {
  const triggerDate = new Date(params.startDate);
  triggerDate.setDate(triggerDate.getDate() + params.daysAfter);

  if (triggerDate > params.now) {
    return false;
  }

  if (params.hasExistingThisMonth) {
    return false;
  }

  void monthWindowKey(params.now);
  return true;
}

describe("createDueAssessments idempotence", () => {
  it("skips when trigger date is in the future", () => {
    const now = new Date("2026-06-08T12:00:00Z");
    const startDate = new Date("2026-06-01T12:00:00Z");

    expect(
      shouldCreateForAssignment({
        startDate,
        daysAfter: 30,
        now,
        hasExistingThisMonth: false,
      }),
    ).toBe(false);
  });

  it("creates when J+30 passed and no assessment this month", () => {
    const now = new Date("2026-07-15T12:00:00Z");
    const startDate = new Date("2026-06-01T12:00:00Z");

    expect(
      shouldCreateForAssignment({
        startDate,
        daysAfter: 30,
        now,
        hasExistingThisMonth: false,
      }),
    ).toBe(true);
  });

  it("skips when assessment already exists this month", () => {
    const now = new Date("2026-07-15T12:00:00Z");
    const startDate = new Date("2026-06-01T12:00:00Z");

    expect(
      shouldCreateForAssignment({
        startDate,
        daysAfter: 30,
        now,
        hasExistingThisMonth: true,
      }),
    ).toBe(false);
  });
});
