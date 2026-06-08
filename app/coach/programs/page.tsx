import { ProgramsPageClient } from "@/components/coach/programs/programs-page-client";
import { requireRole } from "@/lib/auth/org-context";
import { listPrograms } from "@/lib/programs/service";

export default async function CoachProgramsPage() {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  const { items } = await listPrograms(org.organizationId, {
    page: 1,
    limit: 100,
    offset: 0,
  });

  return <ProgramsPageClient initialPrograms={items} />;
}
