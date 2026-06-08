import type { NutritionPlanStatus } from "@/lib/validators/nutrition-plans";
import type { MealItemType } from "@/lib/validators/nutrition-plans";
import type { RecipeMacros } from "@/lib/recipes/macros";

export type MacroTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type NutritionPlanListItem = {
  id: string;
  name: string;
  status: NutritionPlanStatus;
  coachClerkUserId: string;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  publishedAt: Date | null;
  mealCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MealItemDetail = {
  id: string;
  itemType: MealItemType;
  foodId: string | null;
  recipeId: string | null;
  foodName: string | null;
  recipeName: string | null;
  quantity: number;
  unit: string;
  sortOrder: number;
  macros: MacroTotals;
};

export type MealDetail = {
  id: string;
  sortOrder: number;
  name: string;
  timeSlot: string | null;
  items: MealItemDetail[];
  macros: MacroTotals;
};

export type NutritionPlanTree = {
  id: string;
  name: string;
  status: NutritionPlanStatus;
  coachClerkUserId: string;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  publishedAt: Date | null;
  clonedFromPlanId: string | null;
  createdAt: Date;
  updatedAt: Date;
  meals: MealDetail[];
  plannedMacros: MacroTotals;
};

export type NutritionAssignmentItem = {
  id: string;
  planId: string;
  clientId: string;
  coachClerkUserId: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  planName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
};

export type NutritionAssignmentWithPlan = NutritionAssignmentItem & {
  plan: {
    id: string;
    name: string;
    status: NutritionPlanStatus;
    targetCalories: number;
    targetProteinG: number;
    targetCarbsG: number;
    targetFatG: number;
  };
};

export type MealLogItemDetail = {
  id: string;
  itemType: MealItemType;
  foodId: string | null;
  recipeId: string | null;
  foodName: string | null;
  recipeName: string | null;
  quantity: number;
  unit: string;
  macros: MacroTotals;
};

export type MealLogDetail = {
  id: string;
  mealId: string | null;
  mealName: string | null;
  loggedDate: string;
  notes: string | null;
  items: MealLogItemDetail[];
  macros: MacroTotals;
};

export type DailyNutritionSummary = {
  date: string;
  targets: MacroTotals;
  consumed: MacroTotals;
  remaining: MacroTotals;
  inGreenZone: boolean;
  macroDeltas: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  plannedMeals: MealDetail[];
  logs: MealLogDetail[];
};

export type AdherenceDay = {
  date: string;
  adherencePercent: number;
  inGreenZone: boolean;
  consumed: MacroTotals;
  targets: MacroTotals;
  clientId?: string;
  clientName?: string;
};

export type PlanAdherenceReport = {
  planId: string;
  start: string;
  end: string;
  averageAdherencePercent: number;
  greenZoneDays: number;
  totalDays: number;
  days: AdherenceDay[];
};

export type ClientNutritionPayload = {
  assignment: NutritionAssignmentWithPlan;
  summary: DailyNutritionSummary;
};

export type { RecipeMacros };
