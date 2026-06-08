"use client";

import Link from "next/link";
import { SessionStatusBadge } from "@/components/client/session-status-badge";
import { ClientPendingAssessmentBanner } from "@/components/client/assessment/client-pending-assessment-banner";
import { ClientPendingQuestionnaireBanner } from "@/components/client/questionnaires/client-pending-questionnaire-banner";
import { ClientHabitsHomeWidget } from "@/components/client/habits/client-habits-home-widget";
import { ReferralShareCard } from "@/components/client/referral/referral-share-card";
import { Button } from "@/components/ui/button";
import type { ClientHabitsSummary } from "@/lib/habits/types";
import type { ClientReferralInfo } from "@/lib/referrals/types";
import type { ClientSchedulePayload } from "@/lib/sessions/types";
import { cn } from "@/lib/utils";

type ClientHomeContentProps = {
  schedule: ClientSchedulePayload;
  habitsSummary?: ClientHabitsSummary | null;
  referral?: ClientReferralInfo | null;
};

export function ClientHomeContent({
  schedule,
  habitsSummary,
  referral,
}: ClientHomeContentProps) {
  const todayKey = [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, "0"),
    String(new Date().getDate()).padStart(2, "0"),
  ].join("-");

  const todaySession =
    schedule.sessions.find((session) => session.scheduledDateKey === todayKey) ??
    schedule.sessions.find((session) => session.status !== "completed");

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    return {
      date,
      key,
      sessions: schedule.sessions.filter(
        (session) => session.scheduledDateKey === key,
      ),
    };
  });

  const completedThisWeek = schedule.sessions.filter(
    (session) => session.status === "completed",
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <ClientPendingAssessmentBanner />
      <ClientPendingQuestionnaireBanner />

      {habitsSummary ? (
        <ClientHabitsHomeWidget summary={habitsSummary} />
      ) : null}

      {referral ? <ReferralShareCard referral={referral} /> : null}

      <header className="space-y-2">
        <p className="text-caption-uppercase text-primary tracking-widest uppercase">
          Aujourd&apos;hui
        </p>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          {schedule.assignment.program.name}
        </h1>
      </header>

      <section className="border-hairline bg-surface-card grid gap-6 rounded-lg border p-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {todaySession ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-title-lg text-on-dark font-bold">
                  {todaySession.name}
                </h2>
                <SessionStatusBadge status={todaySession.status} />
              </div>
              <p className="text-body-md text-muted">
                {todaySession.weekLabel} ·{" "}
                {new Date(todaySession.scheduledDate).toLocaleDateString(
                  "fr-FR",
                  { weekday: "long", day: "numeric", month: "long" },
                )}
              </p>
              <Button asChild className="h-10 w-full sm:w-auto">
                <Link
                  href={`/client/session/${todaySession.programSessionId}?scheduledDate=${todaySession.scheduledDateKey}`}
                >
                  {todaySession.status === "completed"
                    ? "Voir la séance"
                    : todaySession.status === "in_progress"
                      ? "Reprendre la séance"
                      : "Démarrer la séance"}
                </Link>
              </Button>
            </>
          ) : (
            <div>
              <h2 className="text-title-lg text-on-dark font-bold">
                Repos aujourd&apos;hui
              </h2>
              <p className="text-body-md text-muted mt-2">
                Aucune séance planifiée pour aujourd&apos;hui.
              </p>
            </div>
          )}
        </div>

        <div className="border-hairline bg-surface-elevated rounded-lg border p-5">
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            Cette semaine
          </p>
          <p className="text-primary text-stat-display font-bold">
            {completedThisWeek}
          </p>
          <p className="text-body-sm text-muted">séances complétées</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-title-md text-on-dark font-semibold">
            Semaine en cours
          </h2>
          <Link
            href="/client/program"
            className="text-primary text-sm font-medium hover:underline"
          >
            Calendrier complet
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const hasSession = day.sessions.length > 0;
            const status = day.sessions[0]?.status ?? "planned";
            const isToday = day.key === todayKey;

            return (
              <div
                key={day.key}
                className={cn(
                  "border-hairline bg-surface-card rounded-lg border p-2 text-center",
                  isToday && "ring-primary/40 ring-1",
                )}
              >
                <p className="text-caption text-muted">
                  {day.date.toLocaleDateString("fr-FR", { weekday: "narrow" })}
                </p>
                <p
                  className={cn(
                    "text-title-sm font-semibold",
                    isToday ? "text-primary" : "text-on-dark",
                  )}
                >
                  {day.date.getDate()}
                </p>
                {hasSession ? (
                  <SessionStatusBadge status={status} className="mt-2 w-full" />
                ) : (
                  <span className="text-caption text-muted-soft mt-2 block">
                    —
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
