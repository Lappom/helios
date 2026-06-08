import { NutritionPlansPageClient } from "@/components/coach/nutrition/nutrition-plans-page-client";
import { requireRole } from "@/lib/auth/org-context";
import { listNutritionPlans } from "@/lib/nutrition/service";

export default async function CoachNutritionPage() {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  const { items } = await listNutritionPlans(org.organizationId, {
    page: 1,
    limit: 100,
    offset: 0,
  });

  return <NutritionPlansPageClient initialPlans={items} />;
}
