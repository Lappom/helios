"use client";

import Link from "next/link";
import { AiCreditsQuotaBar } from "@/components/coach/billing/ai-credits-quota-bar";
import { Button } from "@/components/ui/button";
import type { QuotaCheckResult } from "@/lib/billing/access";
import type { PlanTier } from "@/lib/auth/types";

const PLAN_LABELS: Record<PlanTier, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  BUSINESS: "Business",
  TEAM: "Team",
};

type CoachSettingsClientProps = {
  planTier: PlanTier;
  aiQuota: QuotaCheckResult;
};

export function CoachSettingsClient({
  planTier,
  aiQuota,
}: CoachSettingsClientProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          Paramètres
        </h1>
        <p className="text-body-md text-muted mt-2">
          Usage et limites de votre organisation.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-title-md text-on-dark font-semibold">
          Abonnement
        </h2>
        <div className="border-hairline bg-surface-card rounded-lg border p-6">
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            Plan actuel
          </p>
          <p className="text-display-sm text-on-dark mt-2 font-bold tracking-tight">
            {PLAN_LABELS[planTier]}
          </p>
          <Button
            asChild
            variant="outline"
            className="border-hairline-strong text-on-dark hover:bg-surface-elevated mt-4 font-semibold"
          >
            <Link href="/tarifs">Gérer l&apos;abonnement</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-title-md text-on-dark font-semibold">
          Intégrations
        </h2>
        <div className="border-hairline bg-surface-card rounded-lg border p-6">
          <p className="text-body-sm text-muted">
            Clés API, webhooks sortants et connexion Zapier / Make (Business+).
          </p>
          <Button
            asChild
            variant="outline"
            className="border-hairline-strong text-on-dark hover:bg-surface-elevated mt-4 font-semibold"
          >
            <Link href="/coach/settings/integrations">
              Gérer les intégrations
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-title-md text-on-dark font-semibold">
          Profil public
        </h2>
        <div className="border-hairline bg-surface-card rounded-lg border p-6">
          <p className="text-body-sm text-muted">
            Bio, photo, prestations et visibilité dans l&apos;annuaire Helios.
          </p>
          <Button
            asChild
            variant="outline"
            className="border-hairline-strong text-on-dark hover:bg-surface-elevated mt-4 font-semibold"
          >
            <Link href="/coach/settings/profile">Éditer mon profil</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="border-hairline bg-surface-card rounded-lg border p-6">
          <p className="text-body-sm text-muted">
            Personnalisez les questions posées à vos clients après chaque
            séance (Pro+).
          </p>
          <Button
            asChild
            variant="outline"
            className="border-hairline-strong text-on-dark hover:bg-surface-elevated mt-4 font-semibold"
          >
            <Link href="/coach/settings/feedback-template">
              Configurer le template
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-title-md text-on-dark font-semibold">
          Crédits IA
        </h2>
        <AiCreditsQuotaBar quota={aiQuota} />
        <p className="text-body-sm text-muted">
          Les crédits se réinitialisent le 1er de chaque mois. La génération de
          programme complet consomme plus de crédits qu&apos;un message chat.
        </p>
      </section>
    </div>
  );
}
