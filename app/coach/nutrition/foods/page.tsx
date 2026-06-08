import { FoodsPageClient } from "@/components/coach/foods/foods-page-client";
import { requireRole } from "@/lib/auth/org-context";
import { searchFoods } from "@/lib/foods/service";

export default async function CoachFoodsPage() {
  const org = await requireRole(
    "org_owner",
    "org_admin",
    "coach",
    "assistant",
  );

  const { items, total } = await searchFoods(org.organizationId, {
    page: 1,
    limit: 24,
    offset: 0,
  });

  return <FoodsPageClient initialItems={items} initialTotal={total} />;
}
