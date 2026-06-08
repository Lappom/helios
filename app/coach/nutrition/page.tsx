import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CoachNutritionPage() {
  return (
    <div className="space-y-6">
      <div className="border-hairline bg-surface-card rounded-lg border p-8">
        <h2 className="text-title-lg text-on-dark font-bold">
          Plans nutrition
        </h2>
        <p className="text-body-md text-muted mt-2 max-w-2xl">
          Les programmes alimentaires arrivent en P2.3. Composez votre catalogue
          via la bibliothèque d&apos;aliments et vos recettes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/coach/nutrition/foods">
              Ouvrir la bibliothèque d&apos;aliments
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/coach/nutrition/recipes">Voir les recettes</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
