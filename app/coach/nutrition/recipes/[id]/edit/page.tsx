import { notFound } from "next/navigation";
import { RecipeEditorClient } from "@/components/coach/recipes/recipe-editor-client";
import { ApiProblemError } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/org-context";
import { getRecipeById } from "@/lib/recipes/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CoachRecipeEditPage({ params }: PageProps) {
  const org = await requireRole(
    "org_owner",
    "org_admin",
    "coach",
    "assistant",
  );
  const { id } = await params;

  try {
    const recipe = await getRecipeById(org.organizationId, id);
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-title-lg text-on-dark font-bold tracking-tight">
            {recipe.name}
          </h2>
          <p className="text-body-md text-muted mt-2">
            Modifiez les ingrédients, étapes et portions.
          </p>
        </div>
        <RecipeEditorClient recipe={recipe} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiProblemError && error.problem.status === 404) {
      notFound();
    }
    throw error;
  }
}
