import { notFound } from "next/navigation";
import { ProgramEditorClient } from "@/components/coach/programs/program-editor-client";
import { ApiProblemError } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/org-context";
import { getProgramTree } from "@/lib/programs/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CoachProgramEditPage({ params }: PageProps) {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  const { id } = await params;

  try {
    const program = await getProgramTree(org.organizationId, id);
    return <ProgramEditorClient initialProgram={program} />;
  } catch (error) {
    if (error instanceof ApiProblemError && error.problem.status === 404) {
      notFound();
    }
    throw error;
  }
}
