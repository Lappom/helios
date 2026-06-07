import { relations } from "drizzle-orm";
import {
  clients,
  organizations,
  subscriptions,
  teamMembers,
} from "./organization";

export * from "./enums";
export * from "./organization";

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [organizations.id],
    references: [subscriptions.organizationId],
  }),
  clients: many(clients),
  teamMembers: many(teamMembers),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [teamMembers.organizationId],
    references: [organizations.id],
  }),
}));
