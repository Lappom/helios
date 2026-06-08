import {
  and,
  count,
  desc,
  eq,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import { foods } from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import type {
  CreateFoodInput,
  SearchFoodsQuery,
  UpdateFoodInput,
} from "@/lib/validators/foods";
import {
  fetchOffFoodByBarcode,
  fetchOffFoodByExternalId,
  searchOffFoods,
} from "./off-client";
import { hasCompleteMacros } from "./macros";
import {
  buildFoodSearchVector,
  type FoodDetail,
  type FoodListItem,
  type MacrosPer100g,
  type OffFoodInput,
} from "./types";

const OFF_REFRESH_STALE_DAYS = 7;
const OFF_SYNC_BATCH_SIZE = 200;
const LOCAL_SEARCH_MIN_FOR_OFF = 5;

function mapFoodRow(row: typeof foods.$inferSelect): FoodListItem {
  const per100g = extractMacrosFromRow(row);

  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    source: row.source,
    servingSize: row.servingSize,
    servingUnit: row.servingUnit,
    per100g,
    isPartialData: !hasCompleteMacros(per100g),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapFoodDetail(row: typeof foods.$inferSelect): FoodDetail {
  return {
    ...mapFoodRow(row),
    externalId: row.externalId,
    createdByClerkUserId: row.createdByClerkUserId,
    offSyncedAt: row.offSyncedAt,
  };
}

function extractMacrosFromRow(row: typeof foods.$inferSelect): MacrosPer100g {
  return {
    calories: row.caloriesPer100g,
    proteinG: row.proteinGPer100g,
    carbsG: row.carbsGPer100g,
    fatG: row.fatGPer100g,
    fiberG: row.fiberGPer100g,
    sugarG: row.sugarGPer100g,
  };
}

function buildVisibilityCondition(organizationId: string) {
  return or(
    and(eq(foods.source, "off"), isNull(foods.organizationId)),
    and(eq(foods.source, "custom"), eq(foods.organizationId, organizationId)),
  );
}

function buildSearchWhere(
  organizationId: string,
  options: SearchFoodsQuery,
) {
  const conditions = [buildVisibilityCondition(organizationId)];

  if (options.source === "off") {
    conditions.push(
      and(eq(foods.source, "off"), isNull(foods.organizationId))!,
    );
  }

  if (options.source === "custom") {
    conditions.push(
      and(
        eq(foods.source, "custom"),
        eq(foods.organizationId, organizationId),
      )!,
    );
  }

  if (options.q) {
    const term = options.q.trim().toLowerCase();
    conditions.push(
      sql`(
        ${foods.searchVector} % ${term}
        OR ${foods.searchVector} ILIKE ${`%${term}%`}
      )`,
    );
  }

  return and(...conditions);
}

function buildSearchOrder(options: SearchFoodsQuery) {
  if (!options.q) {
    return desc(foods.updatedAt);
  }

  const term = options.q.trim().toLowerCase();
  return sql`similarity(${foods.searchVector}, ${term}) DESC`;
}

async function upsertOffFood(input: OffFoodInput): Promise<string> {
  const now = new Date();
  const searchVector = buildFoodSearchVector(
    input.name,
    input.brand,
    input.barcode,
  );

  const [existing] = await getDb()
    .select({ id: foods.id })
    .from(foods)
    .where(
      and(eq(foods.source, "off"), eq(foods.externalId, input.externalId)),
    )
    .limit(1);

  const values = {
    organizationId: null,
    source: "off" as const,
    externalId: input.externalId,
    name: input.name,
    brand: input.brand ?? null,
    barcode: input.barcode ?? input.externalId,
    servingSize: input.servingSize,
    servingUnit: input.servingUnit,
    caloriesPer100g: input.per100g.calories,
    proteinGPer100g: input.per100g.proteinG,
    carbsGPer100g: input.per100g.carbsG,
    fatGPer100g: input.per100g.fatG,
    fiberGPer100g: input.per100g.fiberG ?? null,
    sugarGPer100g: input.per100g.sugarG ?? null,
    searchVector,
    offSyncedAt: now,
    updatedAt: now,
  };

  if (existing) {
    await getDb().update(foods).set(values).where(eq(foods.id, existing.id));
    return existing.id;
  }

  const [inserted] = await getDb()
    .insert(foods)
    .values(values)
    .returning({ id: foods.id });

  return inserted!.id;
}

async function cacheOffResults(results: OffFoodInput[]): Promise<void> {
  for (const result of results) {
    await upsertOffFood(result);
  }
}

export async function searchFoods(
  organizationId: string,
  options: SearchFoodsQuery,
): Promise<{ items: FoodListItem[]; total: number }> {
  if (options.q && options.q.length >= 2) {
    const preliminary = await queryLocalFoods(organizationId, {
      ...options,
      page: 1,
      limit: LOCAL_SEARCH_MIN_FOR_OFF,
      offset: 0,
    });

    if (preliminary.total < LOCAL_SEARCH_MIN_FOR_OFF) {
      const offResults = await searchOffFoods(options.q);
      await cacheOffResults(offResults);
    }
  }

  return queryLocalFoods(organizationId, options);
}

async function queryLocalFoods(
  organizationId: string,
  options: SearchFoodsQuery,
): Promise<{ items: FoodListItem[]; total: number }> {
  const where = buildSearchWhere(organizationId, options);
  const orderBy = buildSearchOrder(options);

  const [totalRow] = await getDb()
    .select({ total: count() })
    .from(foods)
    .where(where);

  const rows = await getDb()
    .select()
    .from(foods)
    .where(where)
    .orderBy(orderBy)
    .limit(options.limit)
    .offset(options.offset);

  return {
    items: rows.map(mapFoodRow),
    total: totalRow?.total ?? 0,
  };
}

export async function listCustomFoods(
  organizationId: string,
  options: SearchFoodsQuery,
): Promise<{ items: FoodListItem[]; total: number }> {
  return queryLocalFoods(organizationId, {
    ...options,
    source: "custom",
  });
}

export async function getFoodById(
  organizationId: string,
  id: string,
): Promise<FoodDetail> {
  const [row] = await getDb()
    .select()
    .from(foods)
    .where(and(eq(foods.id, id), buildVisibilityCondition(organizationId)))
    .limit(1);

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Food not found",
      status: 404,
    });
  }

  return mapFoodDetail(row);
}

export async function getFoodByBarcode(
  organizationId: string,
  barcode: string,
): Promise<FoodDetail> {
  const normalized = barcode.trim();
  if (!normalized) {
    throw problem({
      type: "validation-error",
      title: "Invalid barcode",
      status: 400,
    });
  }

  const [cached] = await getDb()
    .select()
    .from(foods)
    .where(
      and(
        eq(foods.barcode, normalized),
        buildVisibilityCondition(organizationId),
      ),
    )
    .limit(1);

  if (cached) {
    return mapFoodDetail(cached);
  }

  const offFood = await fetchOffFoodByBarcode(normalized);
  if (!offFood) {
    throw problem({
      type: "not-found",
      title: "Food not found for barcode",
      status: 404,
    });
  }

  const id = await upsertOffFood(offFood);
  return getFoodById(organizationId, id);
}

export async function createCustomFood(
  organizationId: string,
  clerkUserId: string,
  input: CreateFoodInput,
): Promise<FoodDetail> {
  const searchVector = buildFoodSearchVector(
    input.name,
    input.brand,
    input.barcode,
  );

  const [inserted] = await getDb()
    .insert(foods)
    .values({
      organizationId,
      source: "custom",
      name: input.name,
      brand: input.brand ?? null,
      barcode: input.barcode ?? null,
      servingSize: input.servingSize,
      servingUnit: input.servingUnit,
      caloriesPer100g: input.per100g.calories,
      proteinGPer100g: input.per100g.proteinG,
      carbsGPer100g: input.per100g.carbsG,
      fatGPer100g: input.per100g.fatG,
      fiberGPer100g: input.per100g.fiberG ?? null,
      sugarGPer100g: input.per100g.sugarG ?? null,
      searchVector,
      createdByClerkUserId: clerkUserId,
    })
    .returning();

  return mapFoodDetail(inserted!);
}

export async function updateCustomFood(
  organizationId: string,
  id: string,
  input: UpdateFoodInput,
): Promise<FoodDetail> {
  const [existing] = await getDb()
    .select()
    .from(foods)
    .where(
      and(
        eq(foods.id, id),
        eq(foods.source, "custom"),
        eq(foods.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw problem({
      type: "not-found",
      title: "Custom food not found",
      status: 404,
    });
  }

  const nextName = input.name ?? existing.name;
  const nextBrand = input.brand !== undefined ? input.brand : existing.brand;
  const nextBarcode =
    input.barcode !== undefined ? input.barcode : existing.barcode;
  const nextPer100g = {
    calories: input.per100g?.calories ?? existing.caloriesPer100g,
    proteinG: input.per100g?.proteinG ?? existing.proteinGPer100g,
    carbsG: input.per100g?.carbsG ?? existing.carbsGPer100g,
    fatG: input.per100g?.fatG ?? existing.fatGPer100g,
    fiberG:
      input.per100g?.fiberG !== undefined
        ? input.per100g.fiberG
        : existing.fiberGPer100g,
    sugarG:
      input.per100g?.sugarG !== undefined
        ? input.per100g.sugarG
        : existing.sugarGPer100g,
  };

  const [updated] = await getDb()
    .update(foods)
    .set({
      name: nextName,
      brand: nextBrand,
      barcode: nextBarcode,
      servingSize: input.servingSize ?? existing.servingSize,
      servingUnit: input.servingUnit ?? existing.servingUnit,
      caloriesPer100g: nextPer100g.calories,
      proteinGPer100g: nextPer100g.proteinG,
      carbsGPer100g: nextPer100g.carbsG,
      fatGPer100g: nextPer100g.fatG,
      fiberGPer100g: nextPer100g.fiberG ?? null,
      sugarGPer100g: nextPer100g.sugarG ?? null,
      searchVector: buildFoodSearchVector(nextName, nextBrand, nextBarcode),
    })
    .where(eq(foods.id, id))
    .returning();

  return mapFoodDetail(updated!);
}

export async function syncStaleOffFoods(): Promise<{ synced: number }> {
  const staleBefore = new Date();
  staleBefore.setDate(staleBefore.getDate() - OFF_REFRESH_STALE_DAYS);

  const staleRows = await getDb()
    .select({
      id: foods.id,
      externalId: foods.externalId,
    })
    .from(foods)
    .where(
      and(
        eq(foods.source, "off"),
        or(
          isNull(foods.offSyncedAt),
          lt(foods.offSyncedAt, staleBefore),
        )!,
      ),
    )
    .limit(OFF_SYNC_BATCH_SIZE);

  let synced = 0;

  for (const row of staleRows) {
    if (!row.externalId) {
      continue;
    }

    const refreshed = await fetchOffFoodByExternalId(row.externalId);
    if (refreshed) {
      await upsertOffFood(refreshed);
      synced += 1;
    }
  }

  return { synced };
}
