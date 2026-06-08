import { NutritionPlanEditorClient } from "@/components/coach/nutrition/nutrition-plan-editor-client";
import { requireRole } from "@/lib/auth/org-context";
import { getNutritionPlanTree } from "@/lib/nutrition/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditNutritionPlanPage({ params }: PageProps) {
  const { id } = await params;
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  const plan = await getNutritionPlanTree(org.organizationId, id);

  return <NutritionPlanEditorClient initialPlan={plan} />;
}
