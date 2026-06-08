import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { clients } from "./clients";
import { videoSourceEnum, videoVisibilityEnum } from "./enums";
import { organizations } from "./organization";

export const videoCategories = pgTable(
  "video_categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("video_categories_org_idx").on(t.organizationId),
    index("video_categories_org_sort_idx").on(t.organizationId, t.sortOrder),
  ],
);

export const videos = pgTable(
  "videos",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    categoryId: text("category_id").references(() => videoCategories.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    source: videoSourceEnum("source").notNull(),
    youtubeId: text("youtube_id"),
    blobPathname: text("blob_pathname"),
    thumbnailPathname: text("thumbnail_pathname"),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    durationSeconds: integer("duration_seconds"),
    visibility: videoVisibilityEnum("visibility")
      .notNull()
      .default("all_clients"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("videos_org_idx").on(t.organizationId),
    index("videos_org_category_idx").on(t.organizationId, t.categoryId),
    index("videos_org_visibility_idx").on(t.organizationId, t.visibility),
  ],
);

export const videoAccess = pgTable(
  "video_access",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("video_access_video_client_idx").on(t.videoId, t.clientId),
    index("video_access_org_client_idx").on(t.organizationId, t.clientId),
    index("video_access_org_video_idx").on(t.organizationId, t.videoId),
  ],
);
