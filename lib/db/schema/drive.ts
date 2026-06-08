import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../id";
import { clients } from "./clients";
import { driveSharePermissionEnum } from "./enums";
import { organizations } from "./organization";

export const driveFolders = pgTable(
  "drive_folders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    coachClerkUserId: text("coach_clerk_user_id").notNull(),
    parentId: text("parent_id"),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("drive_folders_org_parent_idx").on(t.organizationId, t.parentId),
    index("drive_folders_org_idx").on(t.organizationId),
  ],
);

export const driveFiles = pgTable(
  "drive_files",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    folderId: text("folder_id").references(() => driveFolders.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    blobPathname: text("blob_pathname").notNull(),
    uploadedByClerkUserId: text("uploaded_by_clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("drive_files_org_folder_idx").on(t.organizationId, t.folderId),
    index("drive_files_org_idx").on(t.organizationId),
  ],
);

export const driveShares = pgTable(
  "drive_shares",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fileId: text("file_id").references(() => driveFiles.id, {
      onDelete: "cascade",
    }),
    folderId: text("folder_id").references(() => driveFolders.id, {
      onDelete: "cascade",
    }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    permission: driveSharePermissionEnum("permission")
      .notNull()
      .default("read"),
    sharedByClerkUserId: text("shared_by_clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("drive_shares_file_client_idx")
      .on(t.fileId, t.clientId)
      .where(sql`${t.fileId} IS NOT NULL`),
    uniqueIndex("drive_shares_folder_client_idx")
      .on(t.folderId, t.clientId)
      .where(sql`${t.folderId} IS NOT NULL`),
    index("drive_shares_org_client_idx").on(t.organizationId, t.clientId),
    index("drive_shares_org_file_idx").on(t.organizationId, t.fileId),
    index("drive_shares_org_folder_idx").on(t.organizationId, t.folderId),
  ],
);
