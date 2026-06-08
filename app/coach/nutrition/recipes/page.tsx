import { RecipesPageClient } from "@/components/coach/recipes/recipes-page-client";
import { requireRole } from "@/lib/auth/org-context";
import { listRecipes } from "@/lib/recipes/service";

export default async function CoachRecipesPage() {
  const org = await requireRole(
    "org_owner",
    "org_admin",
    "coach",
    "assistant",
  );

  const { items, total } = await listRecipes(org.organizationId, {
    page: 1,
    limit: 24,
    offset: 0,
  });

  return <RecipesPageClient initialItems={items} initialTotal={total} />;
}
