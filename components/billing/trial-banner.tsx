import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb, runWithDbScope } from "@/lib/db";
import { organizations, subscriptions } from "@/lib/db/schema";

export async function TrialBanner() {
  const { orgId } = await auth();

  if (!orgId) {
    return null;
  }

  const { org, sub } = await runWithDbScope({ bypass: true }, async () => {
    const organization = await getDb().query.organizations.findFirst({
      where: eq(organizations.clerkOrgId, orgId),
      columns: {
        id: true,
        trialEndsAt: true,
      },
    });

    if (!organization?.trialEndsAt) {
      return { org: null, sub: null };
    }

    const subscription = await getDb().query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organization.id),
      columns: { status: true },
    });

    return { org: organization, sub: subscription };
  });

  if (!org?.trialEndsAt) {
    return null;
  }

  const trialExpired = org.trialEndsAt < new Date();
  const hasActiveSubscription = sub?.status === "ACTIVE";

  if (!trialExpired || hasActiveSubscription) {
    return null;
  }

  return (
    <div
      role="status"
      className="rounded-lg border border-hairline bg-surface-card px-4 py-3"
    >
      <p className="text-sm text-on-dark">
        Votre essai gratuit est terminé. Passez à un abonnement pour conserver
        l&apos;accès à toutes les fonctionnalités.
      </p>
      <Link
        href="/tarifs"
        className="mt-2 inline-block text-sm font-semibold text-primary hover:text-primary/80"
      >
        Choisir un plan
      </Link>
    </div>
  );
}
