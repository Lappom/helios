import { relations } from "drizzle-orm";
import {
  clientNotes,
  clients,
  clientStatusEvents,
  clientTagAssignments,
  clientTags,
} from "./clients";
import {
  exerciseAliases,
  exerciseCategories,
  exerciseFavorites,
  exerciseHidden,
  exercises,
} from "./exercises";
import {
  organizations,
  subscriptions,
  teamMembers,
} from "./organization";
import {
  assignmentSessionOverrides,
  blockExerciseAlternatives,
  blockExercises,
  exerciseBlocks,
  programAssignments,
  programSessions,
  programs,
  programWeeks,
  setPrescriptions,
} from "./programs";
import { foods } from "./foods";
import { recipeIngredients, recipes } from "./recipes";
import { sessionLogs, setLogs } from "./session-logs";

export * from "./enums";
export * from "./organization";
export * from "./clients";
export * from "./exercises";
export * from "./foods";
export * from "./programs";
export * from "./recipes";
export * from "./session-logs";

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    subscription: one(subscriptions, {
      fields: [organizations.id],
      references: [subscriptions.organizationId],
    }),
    clients: many(clients),
    teamMembers: many(teamMembers),
    clientTags: many(clientTags),
    exerciseCategories: many(exerciseCategories),
    exercises: many(exercises),
    foods: many(foods),
    recipes: many(recipes),
    programs: many(programs),
  }),
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
  notes: many(clientNotes),
  tagAssignments: many(clientTagAssignments),
  statusEvents: many(clientStatusEvents),
  programAssignments: many(programAssignments),
  sessionLogs: many(sessionLogs),
}));

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  organization: one(organizations, {
    fields: [clientNotes.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [clientNotes.clientId],
    references: [clients.id],
  }),
}));

export const clientTagsRelations = relations(clientTags, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clientTags.organizationId],
    references: [organizations.id],
  }),
  assignments: many(clientTagAssignments),
}));

export const clientTagAssignmentsRelations = relations(
  clientTagAssignments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [clientTagAssignments.organizationId],
      references: [organizations.id],
    }),
    client: one(clients, {
      fields: [clientTagAssignments.clientId],
      references: [clients.id],
    }),
    tag: one(clientTags, {
      fields: [clientTagAssignments.tagId],
      references: [clientTags.id],
    }),
  }),
);

export const clientStatusEventsRelations = relations(
  clientStatusEvents,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [clientStatusEvents.organizationId],
      references: [organizations.id],
    }),
    client: one(clients, {
      fields: [clientStatusEvents.clientId],
      references: [clients.id],
    }),
  }),
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [teamMembers.organizationId],
    references: [organizations.id],
  }),
}));

export const exerciseCategoriesRelations = relations(
  exerciseCategories,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [exerciseCategories.organizationId],
      references: [organizations.id],
    }),
    exercises: many(exercises),
  }),
);

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [exercises.organizationId],
    references: [organizations.id],
  }),
  category: one(exerciseCategories, {
    fields: [exercises.categoryId],
    references: [exerciseCategories.id],
  }),
  favorites: many(exerciseFavorites),
  aliases: many(exerciseAliases),
  hidden: many(exerciseHidden),
  blockExercises: many(blockExercises),
  blockExerciseAlternatives: many(blockExerciseAlternatives),
}));

export const exerciseFavoritesRelations = relations(
  exerciseFavorites,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [exerciseFavorites.organizationId],
      references: [organizations.id],
    }),
    exercise: one(exercises, {
      fields: [exerciseFavorites.exerciseId],
      references: [exercises.id],
    }),
  }),
);

export const exerciseAliasesRelations = relations(
  exerciseAliases,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [exerciseAliases.organizationId],
      references: [organizations.id],
    }),
    exercise: one(exercises, {
      fields: [exerciseAliases.exerciseId],
      references: [exercises.id],
    }),
  }),
);

export const exerciseHiddenRelations = relations(exerciseHidden, ({ one }) => ({
  organization: one(organizations, {
    fields: [exerciseHidden.organizationId],
    references: [organizations.id],
  }),
  exercise: one(exercises, {
    fields: [exerciseHidden.exerciseId],
    references: [exercises.id],
  }),
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [programs.organizationId],
    references: [organizations.id],
  }),
  clonedFrom: one(programs, {
    fields: [programs.clonedFromProgramId],
    references: [programs.id],
    relationName: "programClones",
  }),
  weeks: many(programWeeks),
  assignments: many(programAssignments),
}));

export const programWeeksRelations = relations(
  programWeeks,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [programWeeks.organizationId],
      references: [organizations.id],
    }),
    program: one(programs, {
      fields: [programWeeks.programId],
      references: [programs.id],
    }),
    sessions: many(programSessions),
  }),
);

export const programSessionsRelations = relations(
  programSessions,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [programSessions.organizationId],
      references: [organizations.id],
    }),
    week: one(programWeeks, {
      fields: [programSessions.programWeekId],
      references: [programWeeks.id],
    }),
    blocks: many(exerciseBlocks),
    scheduleOverrides: many(assignmentSessionOverrides),
    sessionLogs: many(sessionLogs),
  }),
);

export const exerciseBlocksRelations = relations(
  exerciseBlocks,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [exerciseBlocks.organizationId],
      references: [organizations.id],
    }),
    session: one(programSessions, {
      fields: [exerciseBlocks.programSessionId],
      references: [programSessions.id],
    }),
    exercises: many(blockExercises),
  }),
);

export const blockExercisesRelations = relations(
  blockExercises,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [blockExercises.organizationId],
      references: [organizations.id],
    }),
    block: one(exerciseBlocks, {
      fields: [blockExercises.exerciseBlockId],
      references: [exerciseBlocks.id],
    }),
    exercise: one(exercises, {
      fields: [blockExercises.exerciseId],
      references: [exercises.id],
    }),
    alternatives: many(blockExerciseAlternatives),
    prescriptions: many(setPrescriptions),
  }),
);

export const blockExerciseAlternativesRelations = relations(
  blockExerciseAlternatives,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [blockExerciseAlternatives.organizationId],
      references: [organizations.id],
    }),
    blockExercise: one(blockExercises, {
      fields: [blockExerciseAlternatives.blockExerciseId],
      references: [blockExercises.id],
    }),
    exercise: one(exercises, {
      fields: [blockExerciseAlternatives.exerciseId],
      references: [exercises.id],
    }),
  }),
);

export const setPrescriptionsRelations = relations(
  setPrescriptions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [setPrescriptions.organizationId],
      references: [organizations.id],
    }),
    blockExercise: one(blockExercises, {
      fields: [setPrescriptions.blockExerciseId],
      references: [blockExercises.id],
    }),
  }),
);

export const programAssignmentsRelations = relations(
  programAssignments,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [programAssignments.organizationId],
      references: [organizations.id],
    }),
    program: one(programs, {
      fields: [programAssignments.programId],
      references: [programs.id],
    }),
    client: one(clients, {
      fields: [programAssignments.clientId],
      references: [clients.id],
    }),
    sessionOverrides: many(assignmentSessionOverrides),
    sessionLogs: many(sessionLogs),
  }),
);

export const sessionLogsRelations = relations(sessionLogs, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [sessionLogs.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [sessionLogs.clientId],
    references: [clients.id],
  }),
  assignment: one(programAssignments, {
    fields: [sessionLogs.assignmentId],
    references: [programAssignments.id],
  }),
  programSession: one(programSessions, {
    fields: [sessionLogs.programSessionId],
    references: [programSessions.id],
  }),
  setLogs: many(setLogs),
}));

export const setLogsRelations = relations(setLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [setLogs.organizationId],
    references: [organizations.id],
  }),
  sessionLog: one(sessionLogs, {
    fields: [setLogs.sessionLogId],
    references: [sessionLogs.id],
  }),
  blockExercise: one(blockExercises, {
    fields: [setLogs.blockExerciseId],
    references: [blockExercises.id],
  }),
  setPrescription: one(setPrescriptions, {
    fields: [setLogs.setPrescriptionId],
    references: [setPrescriptions.id],
  }),
  exercise: one(exercises, {
    fields: [setLogs.exerciseId],
    references: [exercises.id],
  }),
}));

export const foodsRelations = relations(foods, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [foods.organizationId],
    references: [organizations.id],
  }),
  recipeIngredients: many(recipeIngredients),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [recipes.organizationId],
    references: [organizations.id],
  }),
  ingredients: many(recipeIngredients),
}));

export const recipeIngredientsRelations = relations(
  recipeIngredients,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [recipeIngredients.organizationId],
      references: [organizations.id],
    }),
    recipe: one(recipes, {
      fields: [recipeIngredients.recipeId],
      references: [recipes.id],
    }),
    food: one(foods, {
      fields: [recipeIngredients.foodId],
      references: [foods.id],
    }),
  }),
);

export const assignmentSessionOverridesRelations = relations(
  assignmentSessionOverrides,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [assignmentSessionOverrides.organizationId],
      references: [organizations.id],
    }),
    assignment: one(programAssignments, {
      fields: [assignmentSessionOverrides.assignmentId],
      references: [programAssignments.id],
    }),
    programSession: one(programSessions, {
      fields: [assignmentSessionOverrides.programSessionId],
      references: [programSessions.id],
    }),
  }),
);
