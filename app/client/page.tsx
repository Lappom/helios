import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ClientHabitsSection } from "@/components/client/home/client-habits-section";
import { ClientHomeContent } from "@/components/client/home/client-home-content";
import { ClientReferralSection } from "@/components/client/home/client-referral-section";
import { HomeSectionSkeleton } from "@/components/client/home/home-section-skeleton";
import { getOrgContext } from "@/lib/auth/org-context";
import { getClientIdForUser } from "@/lib/api/require-client";
import { addDays, startOfWeekMonday } from "@/lib/programs/schedule";
import { getEnrichedSchedule } from "@/lib/sessions/service";

export default async function ClientPortalPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const org = await getOrgContext();
  if (!org || org.role !== "client") {
    redirect("/coach");
  }

  const clientId =
    org.clientId ?? (await getClientIdForUser(org.organizationId, userId));
  if (!clientId) {
    redirect("/sign-in");
  }

  let schedule;
  let hasActiveProgram = true;

  try {
    const weekStart = startOfWeekMonday(new Date());
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);

    schedule = await getEnrichedSchedule(org.organizationId, clientId, {
      start: weekStart,
      end: weekEnd,
    });
  } catch {
    hasActiveProgram = false;
  }

  if (!hasActiveProgram) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          Accueil
        </h1>
        <p className="text-body-md text-muted">
          Aucun programme actif pour le moment. Votre coach vous assignera un
          plan prochainement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ClientHomeContent schedule={schedule!} />
      <div className="mx-auto max-w-4xl space-y-6">
        <Suspense fallback={<HomeSectionSkeleton />}>
          <ClientHabitsSection
            organizationId={org.organizationId}
            clientId={clientId}
          />
        </Suspense>
        <Suspense fallback={<HomeSectionSkeleton />}>
          <ClientReferralSection
            organizationId={org.organizationId}
            clientId={clientId}
          />
        </Suspense>
      </div>
    </div>
  );
}
