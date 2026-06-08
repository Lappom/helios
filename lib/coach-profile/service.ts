import {
  and,
  asc,
  count,
  eq,
  ilike,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { getOrSet } from "@/lib/cache/get-or-set";
import { cacheKeys, hashQuery } from "@/lib/cache/keys";
import { invalidatePublicCoach } from "@/lib/cache/invalidate";
import { getDb } from "@/lib/db";
import {
  coachProfiles,
  coachServices,
  type CoachSocialLinks,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import { slugifyName } from "@/lib/utils/slug";
import type {
  CreateCoachServiceInput,
  ListPublicCoachesQuery,
  PatchCoachProfileInput,
  PatchCoachServiceInput,
} from "@/lib/validators/coach-profile";

export type CoachProfileDto = {
  id: string;
  organizationId: string;
  clerkUserId: string;
  slug: string;
  displayName: string;
  bio: string | null;
  photoUrl: string | null;
  certifications: string[];
  specialties: string[];
  languages: string[];
  location: string | null;
  socialLinks: CoachSocialLinks;
  isPublished: boolean;
  isInDirectory: boolean;
  timezone: string;
  cancellationHoursBefore: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CoachServiceDto = {
  id: string;
  profileId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  type: "assessment" | "coaching" | "call";
  isOnline: boolean;
  bookingEnabled: boolean;
  paymentInstructions: string | null;
  defaultProgramId: string | null;
  sortOrder: number;
};

export type PublicCoachDto = CoachProfileDto & {
  services: CoachServiceDto[];
};

export type PublicCoachListItem = {
  slug: string;
  displayName: string;
  bio: string | null;
  photoUrl: string | null;
  specialties: string[];
  location: string | null;
  languages: string[];
};

function mapProfile(row: typeof coachProfiles.$inferSelect): CoachProfileDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    clerkUserId: row.clerkUserId,
    slug: row.slug,
    displayName: row.displayName,
    bio: row.bio,
    photoUrl: row.photoUrl,
    certifications: row.certifications ?? [],
    specialties: row.specialties ?? [],
    languages: row.languages ?? [],
    location: row.location,
    socialLinks: row.socialLinks ?? {},
    isPublished: row.isPublished,
    isInDirectory: row.isInDirectory,
    timezone: row.timezone,
    cancellationHoursBefore: row.cancellationHoursBefore,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapService(row: typeof coachServices.$inferSelect): CoachServiceDto {
  return {
    id: row.id,
    profileId: row.profileId,
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
    priceCents: row.priceCents,
    currency: row.currency,
    type: row.type,
    isOnline: row.isOnline,
    bookingEnabled: row.bookingEnabled,
    paymentInstructions: row.paymentInstructions,
    defaultProgramId: row.defaultProgramId,
    sortOrder: row.sortOrder,
  };
}

function defaultSlugForUser(clerkUserId: string): string {
  return `coach-${clerkUserId.slice(-8).toLowerCase()}`;
}

async function assertSlugAvailable(
  slug: string,
  excludeProfileId?: string,
): Promise<void> {
  const existing = await getDb().query.coachProfiles.findFirst({
    where: excludeProfileId
      ? and(eq(coachProfiles.slug, slug), ne(coachProfiles.id, excludeProfileId))
      : eq(coachProfiles.slug, slug),
  });

  if (existing) {
    throw problem({
      type: "validation-error",
      title: "Slug already taken",
      status: 409,
      detail: `The slug "${slug}" is already in use.`,
    });
  }
}

function assertPublishable(profile: {
  slug: string;
  displayName: string;
  isPublished?: boolean;
}): void {
  if (!profile.isPublished) return;

  if (!profile.displayName.trim()) {
    throw problem({
      type: "validation-error",
      title: "Profile incomplete",
      status: 400,
      detail: "Display name is required to publish a profile.",
    });
  }

  if (!profile.slug.trim()) {
    throw problem({
      type: "validation-error",
      title: "Profile incomplete",
      status: 400,
      detail: "Slug is required to publish a profile.",
    });
  }
}

export async function getOrCreateProfile(
  organizationId: string,
  clerkUserId: string,
): Promise<CoachProfileDto> {
  const existing = await getDb().query.coachProfiles.findFirst({
    where: and(
      eq(coachProfiles.organizationId, organizationId),
      eq(coachProfiles.clerkUserId, clerkUserId),
    ),
  });

  if (existing) {
    return mapProfile(existing);
  }

  let slug = defaultSlugForUser(clerkUserId);
  const slugTaken = await getDb().query.coachProfiles.findFirst({
    where: eq(coachProfiles.slug, slug),
  });
  if (slugTaken) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const [created] = await getDb()
    .insert(coachProfiles)
    .values({
      organizationId,
      clerkUserId,
      slug,
      displayName: "",
    })
    .returning();

  return mapProfile(created);
}

export async function getProfileForCoach(
  organizationId: string,
  clerkUserId: string,
): Promise<CoachProfileDto> {
  return getOrCreateProfile(organizationId, clerkUserId);
}

export async function patchProfile(
  organizationId: string,
  clerkUserId: string,
  input: PatchCoachProfileInput,
): Promise<CoachProfileDto> {
  const profile = await getOrCreateProfile(organizationId, clerkUserId);

  if (input.slug && input.slug !== profile.slug) {
    await assertSlugAvailable(input.slug, profile.id);
  }

  const nextDisplayName = input.displayName ?? profile.displayName;
  const nextSlug = input.slug ?? profile.slug;
  const nextIsPublished = input.isPublished ?? profile.isPublished;

  assertPublishable({
    slug: nextSlug,
    displayName: nextDisplayName,
    isPublished: nextIsPublished,
  });

  if (nextIsPublished && input.slug) {
    await assertSlugAvailable(input.slug, profile.id);
  }

  const socialLinks =
    input.socialLinks !== undefined
      ? {
          instagram: input.socialLinks.instagram || undefined,
          website: input.socialLinks.website || undefined,
          youtube: input.socialLinks.youtube || undefined,
        }
      : undefined;

  const [updated] = await getDb()
    .update(coachProfiles)
    .set({
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.displayName !== undefined
        ? { displayName: input.displayName }
        : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
      ...(input.certifications !== undefined
        ? { certifications: input.certifications }
        : {}),
      ...(input.specialties !== undefined
        ? { specialties: input.specialties }
        : {}),
      ...(input.languages !== undefined ? { languages: input.languages } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(socialLinks !== undefined ? { socialLinks } : {}),
      ...(input.isPublished !== undefined
        ? { isPublished: input.isPublished }
        : {}),
      ...(input.isInDirectory !== undefined
        ? { isInDirectory: input.isInDirectory }
        : {}),
    })
    .where(
      and(
        eq(coachProfiles.id, profile.id),
        eq(coachProfiles.organizationId, organizationId),
      ),
    )
    .returning();

  await invalidatePublicCoach(profile.slug);
  if (input.slug && input.slug !== profile.slug) {
    await invalidatePublicCoach(input.slug);
  }

  return mapProfile(updated!);
}

export async function updateProfilePhoto(
  organizationId: string,
  clerkUserId: string,
  photoUrl: string,
): Promise<CoachProfileDto> {
  const profile = await getOrCreateProfile(organizationId, clerkUserId);

  const [updated] = await getDb()
    .update(coachProfiles)
    .set({ photoUrl })
    .where(
      and(
        eq(coachProfiles.id, profile.id),
        eq(coachProfiles.organizationId, organizationId),
      ),
    )
    .returning();

  await invalidatePublicCoach(profile.slug);
  return mapProfile(updated!);
}

export function suggestSlugFromDisplayName(displayName: string): string {
  const base = slugifyName(displayName);
  return base.length >= 3 ? base : "";
}

const PUBLIC_COACH_TTL_SECONDS = 60 * 60;

async function fetchPublicCoaches(
  query: ListPublicCoachesQuery,
): Promise<{ items: PublicCoachListItem[]; total: number }> {
  const conditions = [
    eq(coachProfiles.isPublished, true),
    eq(coachProfiles.isInDirectory, true),
  ];

  if (query.search) {
    const pattern = `%${query.search}%`;
    conditions.push(
      or(
        ilike(coachProfiles.displayName, pattern),
        ilike(coachProfiles.bio, pattern),
      )!,
    );
  }

  if (query.location) {
    conditions.push(ilike(coachProfiles.location, `%${query.location}%`));
  }

  if (query.specialty) {
    conditions.push(
      sql`${coachProfiles.specialties} @> ${JSON.stringify([query.specialty])}::jsonb`,
    );
  }

  if (query.language) {
    conditions.push(
      sql`${coachProfiles.languages} @> ${JSON.stringify([query.language])}::jsonb`,
    );
  }

  const whereClause = and(...conditions);

  const [totalRow] = await getDb()
    .select({ total: count() })
    .from(coachProfiles)
    .where(whereClause);

  const rows = await getDb().query.coachProfiles.findMany({
    where: whereClause,
    orderBy: [asc(coachProfiles.displayName)],
    limit: query.limit,
    offset: query.offset,
  });

  return {
    items: rows.map((row) => ({
      slug: row.slug,
      displayName: row.displayName,
      bio: row.bio,
      photoUrl: row.photoUrl,
      specialties: row.specialties ?? [],
      location: row.location,
      languages: row.languages ?? [],
    })),
    total: totalRow?.total ?? 0,
  };
}

export async function listPublicCoaches(
  query: ListPublicCoachesQuery,
): Promise<{ items: PublicCoachListItem[]; total: number }> {
  const queryHash = hashQuery(query as Record<string, unknown>);
  return getOrSet(
    cacheKeys.publicCoaches(queryHash),
    PUBLIC_COACH_TTL_SECONDS,
    () => fetchPublicCoaches(query),
  );
}

export type PublicServiceCheckoutContext = {
  service: CoachServiceDto;
  coachName: string;
  coachSlug: string;
};

export async function getPublicServiceById(
  serviceId: string,
): Promise<PublicServiceCheckoutContext> {
  const service = await getDb().query.coachServices.findFirst({
    where: eq(coachServices.id, serviceId),
    with: { profile: true },
  });

  if (!service?.profile?.isPublished) {
    throw problem({
      type: "not-found",
      title: "Service not found",
      status: 404,
      detail: `No published service found for id "${serviceId}".`,
    });
  }

  return {
    service: mapService(service),
    coachName: service.profile.displayName,
    coachSlug: service.profile.slug,
  };
}

async function fetchPublicCoachBySlug(slug: string): Promise<PublicCoachDto> {
  const profile = await getDb().query.coachProfiles.findFirst({
    where: and(
      eq(coachProfiles.slug, slug),
      eq(coachProfiles.isPublished, true),
    ),
    with: {
      services: {
        orderBy: [asc(coachServices.sortOrder), asc(coachServices.name)],
      },
    },
  });

  if (!profile) {
    throw problem({
      type: "not-found",
      title: "Coach not found",
      status: 404,
      detail: `No published coach profile found for slug "${slug}".`,
    });
  }

  return {
    ...mapProfile(profile),
    services: (profile.services ?? []).map(mapService),
  };
}

export async function getPublicCoachBySlug(
  slug: string,
): Promise<PublicCoachDto> {
  return getOrSet(
    cacheKeys.publicCoach(slug),
    PUBLIC_COACH_TTL_SECONDS,
    () => fetchPublicCoachBySlug(slug),
  );
}

async function getProfileForOrgOrThrow(
  organizationId: string,
  clerkUserId: string,
) {
  const profile = await getDb().query.coachProfiles.findFirst({
    where: and(
      eq(coachProfiles.organizationId, organizationId),
      eq(coachProfiles.clerkUserId, clerkUserId),
    ),
  });

  if (!profile) {
    throw problem({
      type: "not-found",
      title: "Profile not found",
      status: 404,
      detail: "Coach profile not found. Create one first.",
    });
  }

  return profile;
}

export async function listServicesForCoach(
  organizationId: string,
  clerkUserId: string,
): Promise<CoachServiceDto[]> {
  const profile = await getOrCreateProfile(organizationId, clerkUserId);

  const rows = await getDb().query.coachServices.findMany({
    where: and(
      eq(coachServices.profileId, profile.id),
      eq(coachServices.organizationId, organizationId),
    ),
    orderBy: [asc(coachServices.sortOrder), asc(coachServices.name)],
  });

  return rows.map(mapService);
}

export async function createService(
  organizationId: string,
  clerkUserId: string,
  input: CreateCoachServiceInput,
): Promise<CoachServiceDto> {
  const profile = await getOrCreateProfile(organizationId, clerkUserId);

  const [created] = await getDb()
    .insert(coachServices)
    .values({
      organizationId,
      profileId: profile.id,
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      currency: input.currency ?? "EUR",
      type: input.type ?? "coaching",
      isOnline: input.isOnline ?? false,
      bookingEnabled: input.bookingEnabled ?? false,
      paymentInstructions: input.paymentInstructions ?? null,
      defaultProgramId: input.defaultProgramId ?? null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  return mapService(created);
}

async function getServiceForOrgOrThrow(
  organizationId: string,
  serviceId: string,
) {
  const service = await getDb().query.coachServices.findFirst({
    where: and(
      eq(coachServices.id, serviceId),
      eq(coachServices.organizationId, organizationId),
    ),
  });

  if (!service) {
    throw problem({
      type: "not-found",
      title: "Service not found",
      status: 404,
      detail: `Service ${serviceId} was not found in this organization.`,
    });
  }

  return service;
}

export async function patchService(
  organizationId: string,
  clerkUserId: string,
  serviceId: string,
  input: PatchCoachServiceInput,
): Promise<CoachServiceDto> {
  await getProfileForOrgOrThrow(organizationId, clerkUserId);
  await getServiceForOrgOrThrow(organizationId, serviceId);

  const [updated] = await getDb()
    .update(coachServices)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.durationMinutes !== undefined
        ? { durationMinutes: input.durationMinutes }
        : {}),
      ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.isOnline !== undefined ? { isOnline: input.isOnline } : {}),
      ...(input.bookingEnabled !== undefined
        ? { bookingEnabled: input.bookingEnabled }
        : {}),
      ...(input.paymentInstructions !== undefined
        ? { paymentInstructions: input.paymentInstructions }
        : {}),
      ...(input.defaultProgramId !== undefined
        ? { defaultProgramId: input.defaultProgramId }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    })
    .where(
      and(
        eq(coachServices.id, serviceId),
        eq(coachServices.organizationId, organizationId),
      ),
    )
    .returning();

  return mapService(updated);
}

export async function deleteService(
  organizationId: string,
  clerkUserId: string,
  serviceId: string,
): Promise<void> {
  await getProfileForOrgOrThrow(organizationId, clerkUserId);
  await getServiceForOrgOrThrow(organizationId, serviceId);

  await getDb()
    .delete(coachServices)
    .where(
      and(
        eq(coachServices.id, serviceId),
        eq(coachServices.organizationId, organizationId),
      ),
    );
}

export async function countPublicCoaches(): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(coachProfiles)
    .where(
      and(
        eq(coachProfiles.isPublished, true),
        eq(coachProfiles.isInDirectory, true),
      ),
    );

  return row?.total ?? 0;
}
