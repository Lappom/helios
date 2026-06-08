import {
  and,
  count,
  desc,
  eq,
  isNull,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  exerciseAliases,
  exerciseCategories,
  exerciseFavorites,
  exerciseHidden,
  exercises,
} from "@/lib/db/schema";
import type { ExerciseMedia } from "@/lib/db/schema/exercises";
import { problem } from "@/lib/api/response";
import type {
  CreateCategoryInput,
  CreateExerciseInput,
  ListExercisesQuery,
  SetExerciseAliasInput,
  UpdateExerciseInput,
} from "@/lib/validators/exercises";
import {
  buildExerciseSearchVector,
  type ExerciseCategoryItem,
  type ExerciseListItem,
} from "./types";

function mapExerciseRow(
  row: {
    id: string;
    name: string;
    description: string | null;
    instructions: string | null;
    muscleGroups: string[];
    equipment: string[];
    type: ExerciseListItem["type"];
    source: ExerciseListItem["source"];
    media: ExerciseMedia;
    categoryId: string | null;
    categoryName: string | null;
    alias: string | null;
    isFavorite: boolean;
    isHidden: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
): ExerciseListItem {
  return {
    id: row.id,
    name: row.alias ?? row.name,
    alias: row.alias,
    description: row.description,
    instructions: row.instructions,
    muscleGroups: row.muscleGroups,
    equipment: row.equipment,
    type: row.type,
    source: row.source,
    media: row.media ?? {},
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    isFavorite: row.isFavorite,
    isHidden: row.isHidden,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildVisibilityCondition(organizationId: string) {
  return or(
    and(eq(exercises.source, "system"), isNull(exercises.organizationId)),
    and(
      eq(exercises.source, "custom"),
      eq(exercises.organizationId, organizationId),
    ),
  );
}

function buildListWhere(
  organizationId: string,
  clerkUserId: string,
  options: ListExercisesQuery,
  hiddenExerciseIds: string[],
) {
  const conditions = [buildVisibilityCondition(organizationId)];

  if (hiddenExerciseIds.length > 0) {
    conditions.push(notInArray(exercises.id, hiddenExerciseIds));
  }

  if (options.source === "system") {
    conditions.push(
      and(eq(exercises.source, "system"), isNull(exercises.organizationId))!,
    );
  }

  if (options.source === "custom") {
    conditions.push(
      and(
        eq(exercises.source, "custom"),
        eq(exercises.organizationId, organizationId),
      )!,
    );
  }

  if (options.type) {
    conditions.push(eq(exercises.type, options.type));
  }

  if (options.categoryId) {
    conditions.push(eq(exercises.categoryId, options.categoryId));
  }

  if (options.muscle) {
    conditions.push(
      sql`${options.muscle} = ANY(${exercises.muscleGroups})`,
    );
  }

  if (options.equipment) {
    conditions.push(sql`${options.equipment} = ANY(${exercises.equipment})`);
  }

  if (options.search) {
    const term = options.search.trim().toLowerCase();
    conditions.push(
      sql`(
        ${exercises.searchVector} % ${term}
        OR ${exercises.searchVector} ILIKE ${`%${term}%`}
      )`,
    );
  }

  if (options.favorite === true) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${exerciseFavorites}
        WHERE ${exerciseFavorites.exerciseId} = ${exercises.id}
          AND ${exerciseFavorites.organizationId} = ${organizationId}
          AND ${exerciseFavorites.clerkUserId} = ${clerkUserId}
      )`,
    );
  }

  return and(...conditions);
}

async function loadHiddenExerciseIds(
  organizationId: string,
): Promise<string[]> {
  const rows = await getDb()
    .select({ exerciseId: exerciseHidden.exerciseId })
    .from(exerciseHidden)
    .where(eq(exerciseHidden.organizationId, organizationId));

  return rows.map((row) => row.exerciseId);
}

export async function listExercises(
  organizationId: string,
  clerkUserId: string,
  options: ListExercisesQuery,
): Promise<{ items: ExerciseListItem[]; total: number }> {
  const hiddenExerciseIds = await loadHiddenExerciseIds(organizationId);
  const where = buildListWhere(
    organizationId,
    clerkUserId,
    options,
    hiddenExerciseIds,
  );

  const [totalRow] = await getDb()
    .select({ total: count() })
    .from(exercises)
    .where(where);

  const rows = await getDb()
    .select({
      id: exercises.id,
      name: exercises.name,
      description: exercises.description,
      instructions: exercises.instructions,
      muscleGroups: exercises.muscleGroups,
      equipment: exercises.equipment,
      type: exercises.type,
      source: exercises.source,
      media: exercises.media,
      categoryId: exercises.categoryId,
      categoryName: exerciseCategories.name,
      alias: exerciseAliases.alias,
      isFavorite: sql<boolean>`EXISTS (
        SELECT 1 FROM ${exerciseFavorites}
        WHERE ${exerciseFavorites.exerciseId} = ${exercises.id}
          AND ${exerciseFavorites.organizationId} = ${organizationId}
          AND ${exerciseFavorites.clerkUserId} = ${clerkUserId}
      )`,
      isHidden: sql<boolean>`false`,
      createdAt: exercises.createdAt,
      updatedAt: exercises.updatedAt,
    })
    .from(exercises)
    .leftJoin(
      exerciseCategories,
      eq(exercises.categoryId, exerciseCategories.id),
    )
    .leftJoin(
      exerciseAliases,
      and(
        eq(exerciseAliases.exerciseId, exercises.id),
        eq(exerciseAliases.organizationId, organizationId),
      ),
    )
    .where(where)
    .orderBy(
      options.search
        ? sql`similarity(${exercises.searchVector}, ${options.search.trim().toLowerCase()}) DESC`
        : desc(exercises.createdAt),
      desc(exercises.name),
    )
    .limit(options.limit)
    .offset(options.offset);

  return {
    items: rows.map(mapExerciseRow),
    total: Number(totalRow?.total ?? 0),
  };
}

export async function getExerciseById(
  organizationId: string,
  clerkUserId: string,
  exerciseId: string,
): Promise<ExerciseListItem> {
  const hiddenExerciseIds = await loadHiddenExerciseIds(organizationId);

  if (hiddenExerciseIds.includes(exerciseId)) {
    throw problem({
      type: "not-found",
      title: "Exercise not found",
      status: 404,
      detail: "Exercise is hidden for this organization.",
    });
  }

  const [row] = await getDb()
    .select({
      id: exercises.id,
      name: exercises.name,
      description: exercises.description,
      instructions: exercises.instructions,
      muscleGroups: exercises.muscleGroups,
      equipment: exercises.equipment,
      type: exercises.type,
      source: exercises.source,
      media: exercises.media,
      categoryId: exercises.categoryId,
      categoryName: exerciseCategories.name,
      alias: exerciseAliases.alias,
      isFavorite: sql<boolean>`EXISTS (
        SELECT 1 FROM ${exerciseFavorites}
        WHERE ${exerciseFavorites.exerciseId} = ${exercises.id}
          AND ${exerciseFavorites.organizationId} = ${organizationId}
          AND ${exerciseFavorites.clerkUserId} = ${clerkUserId}
      )`,
      isHidden: sql<boolean>`false`,
      createdAt: exercises.createdAt,
      updatedAt: exercises.updatedAt,
    })
    .from(exercises)
    .leftJoin(
      exerciseCategories,
      eq(exercises.categoryId, exerciseCategories.id),
    )
    .leftJoin(
      exerciseAliases,
      and(
        eq(exerciseAliases.exerciseId, exercises.id),
        eq(exerciseAliases.organizationId, organizationId),
      ),
    )
    .where(
      and(
        eq(exercises.id, exerciseId),
        buildVisibilityCondition(organizationId),
      ),
    )
    .limit(1);

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Exercise not found",
      status: 404,
    });
  }

  return mapExerciseRow(row);
}

async function assertCustomExercise(
  organizationId: string,
  exerciseId: string,
) {
  const [row] = await getDb()
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      and(
        eq(exercises.id, exerciseId),
        eq(exercises.organizationId, organizationId),
        eq(exercises.source, "custom"),
      ),
    )
    .limit(1);

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Exercise not found",
      status: 404,
      detail: "Custom exercise not found for this organization.",
    });
  }
}

async function assertAccessibleExercise(
  organizationId: string,
  exerciseId: string,
) {
  const [row] = await getDb()
    .select({ id: exercises.id, source: exercises.source })
    .from(exercises)
    .where(
      and(eq(exercises.id, exerciseId), buildVisibilityCondition(organizationId)),
    )
    .limit(1);

  if (!row) {
    throw problem({
      type: "not-found",
      title: "Exercise not found",
      status: 404,
    });
  }

  return row;
}

export async function createCustomExercise(
  organizationId: string,
  clerkUserId: string,
  input: CreateExerciseInput,
): Promise<ExerciseListItem> {
  if (input.categoryId) {
    const [category] = await getDb()
      .select({ id: exerciseCategories.id })
      .from(exerciseCategories)
      .where(
        and(
          eq(exerciseCategories.id, input.categoryId),
          eq(exerciseCategories.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!category) {
      throw problem({
        type: "validation-error",
        title: "Invalid category",
        status: 400,
        detail: "Category does not belong to this organization.",
      });
    }
  }

  const [created] = await getDb()
    .insert(exercises)
    .values({
      organizationId,
      name: input.name,
      description: input.description ?? null,
      instructions: input.instructions ?? null,
      muscleGroups: [...input.muscleGroups],
      equipment: [...input.equipment],
      type: input.type,
      source: "custom",
      media: input.media ?? {},
      categoryId: input.categoryId ?? null,
      createdByClerkUserId: clerkUserId,
      searchVector: buildExerciseSearchVector(
        input.name,
        input.muscleGroups,
        input.equipment,
      ),
    })
    .returning({ id: exercises.id });

  return getExerciseById(organizationId, clerkUserId, created!.id);
}

export async function updateCustomExercise(
  organizationId: string,
  clerkUserId: string,
  exerciseId: string,
  input: UpdateExerciseInput,
): Promise<ExerciseListItem> {
  await assertCustomExercise(organizationId, exerciseId);

  const [existing] = await getDb()
    .select({
      name: exercises.name,
      muscleGroups: exercises.muscleGroups,
      equipment: exercises.equipment,
    })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);

  const nextName = input.name ?? existing!.name;
  const nextMuscleGroups = input.muscleGroups ?? existing!.muscleGroups;
  const nextEquipment = input.equipment ?? existing!.equipment;

  await getDb()
    .update(exercises)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.instructions !== undefined
        ? { instructions: input.instructions }
        : {}),
      ...(input.muscleGroups !== undefined
        ? { muscleGroups: [...input.muscleGroups] }
        : {}),
      ...(input.equipment !== undefined
        ? { equipment: [...input.equipment] }
        : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.categoryId !== undefined
        ? { categoryId: input.categoryId }
        : {}),
      ...(input.media !== undefined ? { media: input.media } : {}),
      searchVector: buildExerciseSearchVector(
        nextName,
        nextMuscleGroups,
        nextEquipment,
      ),
    })
    .where(eq(exercises.id, exerciseId));

  return getExerciseById(organizationId, clerkUserId, exerciseId);
}

export async function deleteCustomExercise(
  organizationId: string,
  exerciseId: string,
): Promise<void> {
  await assertCustomExercise(organizationId, exerciseId);

  const deleted = await getDb()
    .delete(exercises)
    .where(
      and(
        eq(exercises.id, exerciseId),
        eq(exercises.organizationId, organizationId),
        eq(exercises.source, "custom"),
      ),
    )
    .returning({ id: exercises.id });

  if (deleted.length === 0) {
    throw problem({
      type: "not-found",
      title: "Exercise not found",
      status: 404,
    });
  }
}

export async function toggleFavorite(
  organizationId: string,
  clerkUserId: string,
  exerciseId: string,
): Promise<{ isFavorite: boolean }> {
  await assertAccessibleExercise(organizationId, exerciseId);

  const [existing] = await getDb()
    .select({ id: exerciseFavorites.id })
    .from(exerciseFavorites)
    .where(
      and(
        eq(exerciseFavorites.organizationId, organizationId),
        eq(exerciseFavorites.clerkUserId, clerkUserId),
        eq(exerciseFavorites.exerciseId, exerciseId),
      ),
    )
    .limit(1);

  if (existing) {
    await getDb()
      .delete(exerciseFavorites)
      .where(eq(exerciseFavorites.id, existing.id));
    return { isFavorite: false };
  }

  await getDb().insert(exerciseFavorites).values({
    organizationId,
    clerkUserId,
    exerciseId,
  });

  return { isFavorite: true };
}

export async function setExerciseAlias(
  organizationId: string,
  exerciseId: string,
  input: SetExerciseAliasInput,
): Promise<{ alias: string }> {
  const exercise = await assertAccessibleExercise(organizationId, exerciseId);

  if (exercise.source !== "system") {
    throw problem({
      type: "validation-error",
      title: "Alias not allowed",
      status: 400,
      detail: "Only system exercises can be aliased.",
    });
  }

  await getDb()
    .insert(exerciseAliases)
    .values({
      organizationId,
      exerciseId,
      alias: input.alias,
    })
    .onConflictDoUpdate({
      target: [exerciseAliases.organizationId, exerciseAliases.exerciseId],
      set: { alias: input.alias },
    });

  return { alias: input.alias };
}

export async function setExerciseHidden(
  organizationId: string,
  exerciseId: string,
  hidden: boolean,
): Promise<{ hidden: boolean }> {
  const exercise = await assertAccessibleExercise(organizationId, exerciseId);

  if (exercise.source !== "system") {
    throw problem({
      type: "validation-error",
      title: "Hide not allowed",
      status: 400,
      detail: "Only system exercises can be hidden.",
    });
  }

  if (hidden) {
    await getDb()
      .insert(exerciseHidden)
      .values({ organizationId, exerciseId })
      .onConflictDoNothing();
    return { hidden: true };
  }

  await getDb()
    .delete(exerciseHidden)
    .where(
      and(
        eq(exerciseHidden.organizationId, organizationId),
        eq(exerciseHidden.exerciseId, exerciseId),
      ),
    );

  return { hidden: false };
}

export async function listCategories(
  organizationId: string,
): Promise<ExerciseCategoryItem[]> {
  return getDb()
    .select({
      id: exerciseCategories.id,
      name: exerciseCategories.name,
      createdAt: exerciseCategories.createdAt,
    })
    .from(exerciseCategories)
    .where(eq(exerciseCategories.organizationId, organizationId))
    .orderBy(exerciseCategories.name);
}

export async function createCategory(
  organizationId: string,
  input: CreateCategoryInput,
): Promise<ExerciseCategoryItem> {
  try {
    const [created] = await getDb()
      .insert(exerciseCategories)
      .values({
        organizationId,
        name: input.name,
      })
      .returning({
        id: exerciseCategories.id,
        name: exerciseCategories.name,
        createdAt: exerciseCategories.createdAt,
      });

    return created!;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("exercise_categories_org_name_idx")
    ) {
      throw problem({
        type: "validation-error",
        title: "Category already exists",
        status: 409,
        detail: "A category with this name already exists.",
      });
    }

    throw error;
  }
}

export async function seedSystemExercise(input: {
  slug: string;
  name: string;
  description?: string;
  instructions?: string;
  muscleGroups: string[];
  equipment: string[];
  type: ExerciseListItem["type"];
  media?: ExerciseMedia;
}) {
  const [existing] = await getDb()
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.slug, input.slug), eq(exercises.source, "system")))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await getDb()
    .insert(exercises)
    .values({
      organizationId: null,
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      instructions: input.instructions ?? null,
      muscleGroups: input.muscleGroups,
      equipment: input.equipment,
      type: input.type,
      source: "system",
      media: input.media ?? {},
      searchVector: buildExerciseSearchVector(
        input.name,
        input.muscleGroups,
        input.equipment,
      ),
    })
    .returning({ id: exercises.id });

  return created!.id;
}

export { slugifyExerciseName } from "./types";
export { assertNotSystemDelete } from "./rules";
