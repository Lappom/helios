import { RecipeEditorClient } from "@/components/coach/recipes/recipe-editor-client";

export default function CoachNewRecipePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-title-lg text-on-dark font-bold tracking-tight">
          Nouvelle recette
        </h2>
        <p className="text-body-md text-muted mt-2">
          Composez une recette à partir de votre bibliothèque d&apos;aliments.
        </p>
      </div>
      <RecipeEditorClient />
    </div>
  );
}
