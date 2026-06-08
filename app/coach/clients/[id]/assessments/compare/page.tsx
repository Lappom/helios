import { notFound } from "next/navigation";
import Link from "next/link";
import { AssessmentCompareView } from "@/components/coach/assessments/assessment-compare-view";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/org-context";
import { compareClientAssessments } from "@/lib/assessments/service";
import { getDb, runWithDbScope } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientAssessmentComparePage({ params }: PageProps) {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  const { id: clientId } = await params;

  const { client, compare } = await runWithDbScope(
    { organizationId: org.organizationId },
    async () => {
      const clientRow = await getDb().query.clients.findFirst({
        where: and(
          eq(clients.organizationId, org.organizationId),
          eq(clients.id, clientId),
        ),
      });

      if (!clientRow) {
        return { client: null, compare: null };
      }

      const compareData = await compareClientAssessments(
        org.organizationId,
        clientId,
      );
      return { client: clientRow, compare: compareData };
    },
  );

  if (!client || !compare) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/coach/clients/${clientId}`}>← Fiche client</Link>
        </Button>
        <h1 className="text-display-sm text-on-dark mt-4 font-bold tracking-tight">
          Comparaison bilans · {client.firstName} {client.lastName}
        </h1>
      </div>
      <AssessmentCompareView compare={compare} />
    </div>
  );
}
