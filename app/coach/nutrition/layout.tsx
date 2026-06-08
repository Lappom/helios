import { NutritionTabs } from "@/components/coach/nutrition/nutrition-tabs";

export default function CoachNutritionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          Nutrition
        </h1>
        <p className="text-body-md text-muted mt-2">
          Bibliothèque d&apos;aliments et programmes alimentaires.
        </p>
      </div>

      <NutritionTabs />

      {children}
    </div>
  );
}
