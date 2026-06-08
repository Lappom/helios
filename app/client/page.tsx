import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ClientHomeContent } from "@/components/client/home/client-home-content";
import { getOrgContext } from "@/lib/auth/org-context";
import { getClientIdForUser } from "@/lib/api/require-client";
import { hasFeature } from "@/lib/billing/access";
import { getClientHabitsSummary } from "@/lib/habits/service";
import { getClientReferralInfo } from "@/lib/referrals/service";
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

  const clientId = await getClientIdForUser(org.organizationId, userId);
  if (!clientId) {
    redirect("/sign-in");
  }

  let schedule;
  let habitsSummary = null;
  let referral = null;
  let hasActiveProgram = true;

  try {
    const weekStart = startOfWeekMonday(new Date());
    const weekEnd = addDays(weekStart, 6);
    weekEnd.setHours(23, 59, 59, 999);

    schedule = await getEnrichedSchedule(org.organizationId, clientId, {
      start: weekStart,
      end: weekEnd,
    });

    const [habitsEnabled, referralEnabled] = await Promise.all([
      hasFeature("habits"),
      hasFeature("referral_program"),
    ]);
    habitsSummary = habitsEnabled
      ? await getClientHabitsSummary(org.organizationId, clientId)
      : null;
    referral = referralEnabled
      ? await getClientReferralInfo(org.organizationId, clientId)
      : null;
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
    <ClientHomeContent
      schedule={schedule!}
      habitsSummary={habitsSummary}
      referral={referral}
    />
  );
}
