import Link from "next/link";
import { NutritionAdherenceDashboard } from "@/components/coach/nutrition/nutrition-adherence-dashboard";
import { requireRole } from "@/lib/auth/org-context";
import { getNutritionPlanTree } from "@/lib/nutrition/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NutritionAdherencePage({ params }: PageProps) {
  const { id } = await params;
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  const plan = await getNutritionPlanTree(org.organizationId, id);

  return (
    <div className="space-y-4">
      <Link
        href={`/coach/nutrition/plans/${plan.id}/edit`}
        className="text-muted hover:text-on-dark text-sm transition-colors"
      >
        ← Retour à l&apos;éditeur
      </Link>
      <NutritionAdherenceDashboard planId={plan.id} planName={plan.name} />
    </div>
  );
}
