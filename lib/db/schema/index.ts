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
  programMacrocycles,
  programMesocycles,
  programMicrocycles,
  programSessions,
  programs,
  programWeeks,
  setPrescriptions,
} from "./programs";
import { foods } from "./foods";
import {
  mealItems,
  mealLogItems,
  mealLogs,
  meals,
  nutritionAssignments,
  nutritionPlans,
} from "./nutrition";
import { recipeIngredients, recipes } from "./recipes";
import { sessionLogs, setLogs } from "./session-logs";
import {
  assessmentFields,
  assessmentResponses,
  assessmentTemplates,
  assessments,
} from "./assessments";
import {
  feedbackQuestions,
  feedbackResponses,
  sessionFeedback,
  sessionFeedbackTemplates,
} from "./session-feedback";
import { habitAssignments, habitLogs, habits } from "./habits";
import { coachProfiles, coachServices } from "./coach-profiles";
import {
  availabilityRules,
  blockedDates,
  bookings,
} from "./bookings";
import { promoCodes } from "./promo-codes";
import {
  referralCodes,
  referralConversions,
  referralCreditBalances,
  referralCreditLedger,
  referralPrograms,
} from "./referrals";
import { payments, revenueSnapshots } from "./payments";
import {
  notificationLogs,
  notificationTemplates,
  pushSubscriptions,
} from "./notifications";
import {
  conversationParticipants,
  conversations,
  messages,
} from "./messaging";
import { driveFiles, driveFolders, driveShares } from "./drive";
import { videoAccess, videoCategories, videos } from "./videos";
import {
  actionLogs,
  automationActions,
  automationExecutions,
  automations,
} from "./automations";
import { coachTasks } from "./coach-tasks";
import {
  questionnaireQuestions,
  questionnaireResponses,
  questionnaireSchedules,
  questionnaireSubmissions,
  questionnaires,
} from "./questionnaires";
import {
  coachingPathways,
  pathwayEnrollments,
  pathwayStepLogs,
  pathwaySteps,
} from "./pathways";
import { auditLogs } from "./audit";

export * from "./enums";
export * from "./organization";
export * from "./clients";
export * from "./exercises";
export * from "./foods";
export * from "./nutrition";
export * from "./programs";
export * from "./recipes";
export * from "./session-logs";
export * from "./assessments";
export * from "./session-feedback";
export * from "./habits";
export * from "./coach-profiles";
export * from "./bookings";
export * from "./promo-codes";
export * from "./payments";
export * from "./notifications";
export * from "./messaging";
export * from "./drive";
export * from "./videos";
export * from "./automations";
export * from "./coach-tasks";
export * from "./questionnaires";
export * from "./pathways";
export * from "./integrations";
export * from "./referrals";
export * from "./audit";

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
    nutritionPlans: many(nutritionPlans),
    assessmentTemplates: many(assessmentTemplates),
    assessments: many(assessments),
    sessionFeedbackTemplates: many(sessionFeedbackTemplates),
    sessionFeedback: many(sessionFeedback),
    habits: many(habits),
    habitAssignments: many(habitAssignments),
    habitLogs: many(habitLogs),
    coachProfiles: many(coachProfiles),
    coachServices: many(coachServices),
    availabilityRules: many(availabilityRules),
    blockedDates: many(blockedDates),
    bookings: many(bookings),
    promoCodes: many(promoCodes),
    referralPrograms: many(referralPrograms),
    referralCodes: many(referralCodes),
    referralConversions: many(referralConversions),
    referralCreditBalances: many(referralCreditBalances),
    referralCreditLedger: many(referralCreditLedger),
    payments: many(payments),
    revenueSnapshots: many(revenueSnapshots),
    notificationTemplates: many(notificationTemplates),
    notificationLogs: many(notificationLogs),
    pushSubscriptions: many(pushSubscriptions),
    conversations: many(conversations),
    conversationParticipants: many(conversationParticipants),
    messages: many(messages),
    driveFolders: many(driveFolders),
    driveFiles: many(driveFiles),
    driveShares: many(driveShares),
    videoCategories: many(videoCategories),
    videos: many(videos),
    videoAccess: many(videoAccess),
    automations: many(automations),
    automationActions: many(automationActions),
    automationExecutions: many(automationExecutions),
    actionLogs: many(actionLogs),
    coachTasks: many(coachTasks),
    questionnaires: many(questionnaires),
    questionnaireQuestions: many(questionnaireQuestions),
    questionnaireSchedules: many(questionnaireSchedules),
    questionnaireSubmissions: many(questionnaireSubmissions),
    questionnaireResponses: many(questionnaireResponses),
    coachingPathways: many(coachingPathways),
    pathwaySteps: many(pathwaySteps),
    pathwayEnrollments: many(pathwayEnrollments),
    pathwayStepLogs: many(pathwayStepLogs),
    auditLogs: many(auditLogs),
  }),
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}));

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
  nutritionAssignments: many(nutritionAssignments),
  sessionLogs: many(sessionLogs),
  mealLogs: many(mealLogs),
  assessments: many(assessments),
  habitAssignments: many(habitAssignments),
  habitLogs: many(habitLogs),
  notificationLogs: many(notificationLogs),
  pushSubscriptions: many(pushSubscriptions),
  conversations: many(conversations),
  conversationParticipants: many(conversationParticipants),
  driveShares: many(driveShares),
  videoAccess: many(videoAccess),
  questionnaireSubmissions: many(questionnaireSubmissions),
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
  mesocycles: many(programMesocycles),
  weeks: many(programWeeks),
  assignments: many(programAssignments),
}));

export const programMesocyclesRelations = relations(
  programMesocycles,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [programMesocycles.organizationId],
      references: [organizations.id],
    }),
    program: one(programs, {
      fields: [programMesocycles.programId],
      references: [programs.id],
    }),
    macrocycles: many(programMacrocycles),
  }),
);

export const programMacrocyclesRelations = relations(
  programMacrocycles,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [programMacrocycles.organizationId],
      references: [organizations.id],
    }),
    mesocycle: one(programMesocycles, {
      fields: [programMacrocycles.mesocycleId],
      references: [programMesocycles.id],
    }),
    microcycles: many(programMicrocycles),
  }),
);

export const programMicrocyclesRelations = relations(
  programMicrocycles,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [programMicrocycles.organizationId],
      references: [organizations.id],
    }),
    macrocycle: one(programMacrocycles, {
      fields: [programMicrocycles.macrocycleId],
      references: [programMacrocycles.id],
    }),
    weeks: many(programWeeks),
  }),
);

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
    microcycle: one(programMicrocycles, {
      fields: [programWeeks.microcycleId],
      references: [programMicrocycles.id],
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
    startMesocycle: one(programMesocycles, {
      fields: [programAssignments.startMesocycleId],
      references: [programMesocycles.id],
    }),
    sessionOverrides: many(assignmentSessionOverrides),
    sessionLogs: many(sessionLogs),
    assessments: many(assessments),
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
  sessionFeedback: one(sessionFeedback, {
    fields: [sessionLogs.id],
    references: [sessionFeedback.sessionLogId],
  }),
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
  mealItems: many(mealItems),
  mealLogItems: many(mealLogItems),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [recipes.organizationId],
    references: [organizations.id],
  }),
  ingredients: many(recipeIngredients),
  mealItems: many(mealItems),
  mealLogItems: many(mealLogItems),
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

export const nutritionPlansRelations = relations(
  nutritionPlans,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [nutritionPlans.organizationId],
      references: [organizations.id],
    }),
    clonedFrom: one(nutritionPlans, {
      fields: [nutritionPlans.clonedFromPlanId],
      references: [nutritionPlans.id],
      relationName: "nutritionPlanClones",
    }),
    meals: many(meals),
    assignments: many(nutritionAssignments),
  }),
);

export const mealsRelations = relations(meals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [meals.organizationId],
    references: [organizations.id],
  }),
  plan: one(nutritionPlans, {
    fields: [meals.planId],
    references: [nutritionPlans.id],
  }),
  items: many(mealItems),
  mealLogs: many(mealLogs),
}));

export const mealItemsRelations = relations(mealItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [mealItems.organizationId],
    references: [organizations.id],
  }),
  meal: one(meals, {
    fields: [mealItems.mealId],
    references: [meals.id],
  }),
  food: one(foods, {
    fields: [mealItems.foodId],
    references: [foods.id],
  }),
  recipe: one(recipes, {
    fields: [mealItems.recipeId],
    references: [recipes.id],
  }),
}));

export const nutritionAssignmentsRelations = relations(
  nutritionAssignments,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [nutritionAssignments.organizationId],
      references: [organizations.id],
    }),
    plan: one(nutritionPlans, {
      fields: [nutritionAssignments.planId],
      references: [nutritionPlans.id],
    }),
    client: one(clients, {
      fields: [nutritionAssignments.clientId],
      references: [clients.id],
    }),
    mealLogs: many(mealLogs),
  }),
);

export const mealLogsRelations = relations(mealLogs, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [mealLogs.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [mealLogs.clientId],
    references: [clients.id],
  }),
  assignment: one(nutritionAssignments, {
    fields: [mealLogs.assignmentId],
    references: [nutritionAssignments.id],
  }),
  meal: one(meals, {
    fields: [mealLogs.mealId],
    references: [meals.id],
  }),
  items: many(mealLogItems),
}));

export const mealLogItemsRelations = relations(mealLogItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [mealLogItems.organizationId],
    references: [organizations.id],
  }),
  mealLog: one(mealLogs, {
    fields: [mealLogItems.mealLogId],
    references: [mealLogs.id],
  }),
  food: one(foods, {
    fields: [mealLogItems.foodId],
    references: [foods.id],
  }),
  recipe: one(recipes, {
    fields: [mealLogItems.recipeId],
    references: [recipes.id],
  }),
}));

export const assessmentTemplatesRelations = relations(
  assessmentTemplates,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [assessmentTemplates.organizationId],
      references: [organizations.id],
    }),
    fields: many(assessmentFields),
    assessments: many(assessments),
  }),
);

export const assessmentFieldsRelations = relations(
  assessmentFields,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [assessmentFields.organizationId],
      references: [organizations.id],
    }),
    template: one(assessmentTemplates, {
      fields: [assessmentFields.templateId],
      references: [assessmentTemplates.id],
    }),
    responses: many(assessmentResponses),
  }),
);

export const assessmentsRelations = relations(
  assessments,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [assessments.organizationId],
      references: [organizations.id],
    }),
    template: one(assessmentTemplates, {
      fields: [assessments.templateId],
      references: [assessmentTemplates.id],
    }),
    client: one(clients, {
      fields: [assessments.clientId],
      references: [clients.id],
    }),
    programAssignment: one(programAssignments, {
      fields: [assessments.programAssignmentId],
      references: [programAssignments.id],
    }),
    responses: many(assessmentResponses),
  }),
);

export const assessmentResponsesRelations = relations(
  assessmentResponses,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [assessmentResponses.organizationId],
      references: [organizations.id],
    }),
    assessment: one(assessments, {
      fields: [assessmentResponses.assessmentId],
      references: [assessments.id],
    }),
    field: one(assessmentFields, {
      fields: [assessmentResponses.fieldId],
      references: [assessmentFields.id],
    }),
  }),
);

export const sessionFeedbackTemplatesRelations = relations(
  sessionFeedbackTemplates,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [sessionFeedbackTemplates.organizationId],
      references: [organizations.id],
    }),
    questions: many(feedbackQuestions),
    sessionFeedback: many(sessionFeedback),
  }),
);

export const feedbackQuestionsRelations = relations(
  feedbackQuestions,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [feedbackQuestions.organizationId],
      references: [organizations.id],
    }),
    template: one(sessionFeedbackTemplates, {
      fields: [feedbackQuestions.templateId],
      references: [sessionFeedbackTemplates.id],
    }),
    responses: many(feedbackResponses),
  }),
);

export const sessionFeedbackRelations = relations(
  sessionFeedback,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [sessionFeedback.organizationId],
      references: [organizations.id],
    }),
    sessionLog: one(sessionLogs, {
      fields: [sessionFeedback.sessionLogId],
      references: [sessionLogs.id],
    }),
    client: one(clients, {
      fields: [sessionFeedback.clientId],
      references: [clients.id],
    }),
    template: one(sessionFeedbackTemplates, {
      fields: [sessionFeedback.templateId],
      references: [sessionFeedbackTemplates.id],
    }),
    responses: many(feedbackResponses),
  }),
);

export const feedbackResponsesRelations = relations(
  feedbackResponses,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [feedbackResponses.organizationId],
      references: [organizations.id],
    }),
    sessionFeedback: one(sessionFeedback, {
      fields: [feedbackResponses.sessionFeedbackId],
      references: [sessionFeedback.id],
    }),
    question: one(feedbackQuestions, {
      fields: [feedbackResponses.questionId],
      references: [feedbackQuestions.id],
    }),
  }),
);

export const habitsRelations = relations(habits, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [habits.organizationId],
    references: [organizations.id],
  }),
  assignments: many(habitAssignments),
}));

export const habitAssignmentsRelations = relations(
  habitAssignments,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [habitAssignments.organizationId],
      references: [organizations.id],
    }),
    habit: one(habits, {
      fields: [habitAssignments.habitId],
      references: [habits.id],
    }),
    client: one(clients, {
      fields: [habitAssignments.clientId],
      references: [clients.id],
    }),
    logs: many(habitLogs),
  }),
);

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [habitLogs.organizationId],
    references: [organizations.id],
  }),
  assignment: one(habitAssignments, {
    fields: [habitLogs.assignmentId],
    references: [habitAssignments.id],
  }),
  client: one(clients, {
    fields: [habitLogs.clientId],
    references: [clients.id],
  }),
}));

export const coachProfilesRelations = relations(
  coachProfiles,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [coachProfiles.organizationId],
      references: [organizations.id],
    }),
    services: many(coachServices),
  }),
);

export const coachServicesRelations = relations(coachServices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [coachServices.organizationId],
    references: [organizations.id],
  }),
  profile: one(coachProfiles, {
    fields: [coachServices.profileId],
    references: [coachProfiles.id],
  }),
  defaultProgram: one(programs, {
    fields: [coachServices.defaultProgramId],
    references: [programs.id],
  }),
  bookings: many(bookings),
}));

export const availabilityRulesRelations = relations(
  availabilityRules,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [availabilityRules.organizationId],
      references: [organizations.id],
    }),
  }),
);

export const blockedDatesRelations = relations(blockedDates, ({ one }) => ({
  organization: one(organizations, {
    fields: [blockedDates.organizationId],
    references: [organizations.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  organization: one(organizations, {
    fields: [bookings.organizationId],
    references: [organizations.id],
  }),
  service: one(coachServices, {
    fields: [bookings.serviceId],
    references: [coachServices.id],
  }),
  client: one(clients, {
    fields: [bookings.clientId],
    references: [clients.id],
  }),
  promoCode: one(promoCodes, {
    fields: [bookings.promoCodeId],
    references: [promoCodes.id],
  }),
  referralCode: one(referralCodes, {
    fields: [bookings.referralCodeId],
    references: [referralCodes.id],
  }),
}));

export const promoCodesRelations = relations(promoCodes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [promoCodes.organizationId],
    references: [organizations.id],
  }),
  bookings: many(bookings),
}));

export const referralProgramsRelations = relations(
  referralPrograms,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [referralPrograms.organizationId],
      references: [organizations.id],
    }),
    codes: many(referralCodes),
  }),
);

export const referralCodesRelations = relations(
  referralCodes,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [referralCodes.organizationId],
      references: [organizations.id],
    }),
    program: one(referralPrograms, {
      fields: [referralCodes.programId],
      references: [referralPrograms.id],
    }),
    client: one(clients, {
      fields: [referralCodes.clientId],
      references: [clients.id],
    }),
    conversions: many(referralConversions),
    bookings: many(bookings),
  }),
);

export const referralConversionsRelations = relations(
  referralConversions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [referralConversions.organizationId],
      references: [organizations.id],
    }),
    referralCode: one(referralCodes, {
      fields: [referralConversions.referralCodeId],
      references: [referralCodes.id],
    }),
    referrerClient: one(clients, {
      fields: [referralConversions.referrerClientId],
      references: [clients.id],
      relationName: "referrerConversions",
    }),
    referredClient: one(clients, {
      fields: [referralConversions.referredClientId],
      references: [clients.id],
      relationName: "referredConversions",
    }),
    payment: one(payments, {
      fields: [referralConversions.paymentId],
      references: [payments.id],
    }),
  }),
);

export const referralCreditBalancesRelations = relations(
  referralCreditBalances,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [referralCreditBalances.organizationId],
      references: [organizations.id],
    }),
    client: one(clients, {
      fields: [referralCreditBalances.clientId],
      references: [clients.id],
    }),
  }),
);

export const referralCreditLedgerRelations = relations(
  referralCreditLedger,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [referralCreditLedger.organizationId],
      references: [organizations.id],
    }),
    client: one(clients, {
      fields: [referralCreditLedger.clientId],
      references: [clients.id],
    }),
    conversion: one(referralConversions, {
      fields: [referralCreditLedger.conversionId],
      references: [referralConversions.id],
    }),
    payment: one(payments, {
      fields: [referralCreditLedger.paymentId],
      references: [payments.id],
    }),
  }),
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [payments.clientId],
    references: [clients.id],
  }),
  service: one(coachServices, {
    fields: [payments.serviceId],
    references: [coachServices.id],
  }),
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const revenueSnapshotsRelations = relations(
  revenueSnapshots,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [revenueSnapshots.organizationId],
      references: [organizations.id],
    }),
  }),
);

export const notificationTemplatesRelations = relations(
  notificationTemplates,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [notificationTemplates.organizationId],
      references: [organizations.id],
    }),
    logs: many(notificationLogs),
  }),
);

export const notificationLogsRelations = relations(
  notificationLogs,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [notificationLogs.organizationId],
      references: [organizations.id],
    }),
    template: one(notificationTemplates, {
      fields: [notificationLogs.templateId],
      references: [notificationTemplates.id],
    }),
    client: one(clients, {
      fields: [notificationLogs.clientId],
      references: [clients.id],
    }),
  }),
);

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [pushSubscriptions.organizationId],
      references: [organizations.id],
    }),
    client: one(clients, {
      fields: [pushSubscriptions.clientId],
      references: [clients.id],
    }),
  }),
);

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [conversations.organizationId],
      references: [organizations.id],
    }),
    client: one(clients, {
      fields: [conversations.clientId],
      references: [clients.id],
    }),
    participants: many(conversationParticipants),
    messages: many(messages),
  }),
);

export const conversationParticipantsRelations = relations(
  conversationParticipants,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [conversationParticipants.organizationId],
      references: [organizations.id],
    }),
    conversation: one(conversations, {
      fields: [conversationParticipants.conversationId],
      references: [conversations.id],
    }),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  organization: one(organizations, {
    fields: [messages.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const driveFoldersRelations = relations(
  driveFolders,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [driveFolders.organizationId],
      references: [organizations.id],
    }),
    parent: one(driveFolders, {
      fields: [driveFolders.parentId],
      references: [driveFolders.id],
      relationName: "driveFolderParent",
    }),
    children: many(driveFolders, { relationName: "driveFolderParent" }),
    files: many(driveFiles),
    shares: many(driveShares),
  }),
);

export const driveFilesRelations = relations(driveFiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [driveFiles.organizationId],
    references: [organizations.id],
  }),
  folder: one(driveFolders, {
    fields: [driveFiles.folderId],
    references: [driveFolders.id],
  }),
  shares: many(driveShares),
}));

export const driveSharesRelations = relations(driveShares, ({ one }) => ({
  organization: one(organizations, {
    fields: [driveShares.organizationId],
    references: [organizations.id],
  }),
  file: one(driveFiles, {
    fields: [driveShares.fileId],
    references: [driveFiles.id],
  }),
  folder: one(driveFolders, {
    fields: [driveShares.folderId],
    references: [driveFolders.id],
  }),
  client: one(clients, {
    fields: [driveShares.clientId],
    references: [clients.id],
  }),
}));

export const videoCategoriesRelations = relations(
  videoCategories,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [videoCategories.organizationId],
      references: [organizations.id],
    }),
    videos: many(videos),
  }),
);

export const videosRelations = relations(videos, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [videos.organizationId],
    references: [organizations.id],
  }),
  category: one(videoCategories, {
    fields: [videos.categoryId],
    references: [videoCategories.id],
  }),
  accessList: many(videoAccess),
}));

export const videoAccessRelations = relations(videoAccess, ({ one }) => ({
  organization: one(organizations, {
    fields: [videoAccess.organizationId],
    references: [organizations.id],
  }),
  video: one(videos, {
    fields: [videoAccess.videoId],
    references: [videos.id],
  }),
  client: one(clients, {
    fields: [videoAccess.clientId],
    references: [clients.id],
  }),
}));

export const automationsRelations = relations(automations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [automations.organizationId],
    references: [organizations.id],
  }),
  actions: many(automationActions),
  executions: many(automationExecutions),
}));

export const automationActionsRelations = relations(
  automationActions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [automationActions.organizationId],
      references: [organizations.id],
    }),
    automation: one(automations, {
      fields: [automationActions.automationId],
      references: [automations.id],
    }),
  }),
);

export const automationExecutionsRelations = relations(
  automationExecutions,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [automationExecutions.organizationId],
      references: [organizations.id],
    }),
    automation: one(automations, {
      fields: [automationExecutions.automationId],
      references: [automations.id],
    }),
    client: one(clients, {
      fields: [automationExecutions.clientId],
      references: [clients.id],
    }),
    actionLogs: many(actionLogs),
  }),
);

export const actionLogsRelations = relations(actionLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [actionLogs.organizationId],
    references: [organizations.id],
  }),
  execution: one(automationExecutions, {
    fields: [actionLogs.executionId],
    references: [automationExecutions.id],
  }),
  action: one(automationActions, {
    fields: [actionLogs.actionId],
    references: [automationActions.id],
  }),
}));

export const coachTasksRelations = relations(coachTasks, ({ one }) => ({
  organization: one(organizations, {
    fields: [coachTasks.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [coachTasks.clientId],
    references: [clients.id],
  }),
  sourceAutomation: one(automations, {
    fields: [coachTasks.sourceAutomationId],
    references: [automations.id],
  }),
}));

export const questionnairesRelations = relations(
  questionnaires,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [questionnaires.organizationId],
      references: [organizations.id],
    }),
    questions: many(questionnaireQuestions),
    schedule: one(questionnaireSchedules, {
      fields: [questionnaires.id],
      references: [questionnaireSchedules.questionnaireId],
    }),
    submissions: many(questionnaireSubmissions),
  }),
);

export const questionnaireQuestionsRelations = relations(
  questionnaireQuestions,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [questionnaireQuestions.organizationId],
      references: [organizations.id],
    }),
    questionnaire: one(questionnaires, {
      fields: [questionnaireQuestions.questionnaireId],
      references: [questionnaires.id],
    }),
    responses: many(questionnaireResponses),
  }),
);

export const questionnaireSchedulesRelations = relations(
  questionnaireSchedules,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [questionnaireSchedules.organizationId],
      references: [organizations.id],
    }),
    questionnaire: one(questionnaires, {
      fields: [questionnaireSchedules.questionnaireId],
      references: [questionnaires.id],
    }),
    submissions: many(questionnaireSubmissions),
  }),
);

export const questionnaireSubmissionsRelations = relations(
  questionnaireSubmissions,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [questionnaireSubmissions.organizationId],
      references: [organizations.id],
    }),
    questionnaire: one(questionnaires, {
      fields: [questionnaireSubmissions.questionnaireId],
      references: [questionnaires.id],
    }),
    schedule: one(questionnaireSchedules, {
      fields: [questionnaireSubmissions.scheduleId],
      references: [questionnaireSchedules.id],
    }),
    client: one(clients, {
      fields: [questionnaireSubmissions.clientId],
      references: [clients.id],
    }),
    responses: many(questionnaireResponses),
  }),
);

export const questionnaireResponsesRelations = relations(
  questionnaireResponses,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [questionnaireResponses.organizationId],
      references: [organizations.id],
    }),
    submission: one(questionnaireSubmissions, {
      fields: [questionnaireResponses.submissionId],
      references: [questionnaireSubmissions.id],
    }),
    question: one(questionnaireQuestions, {
      fields: [questionnaireResponses.questionId],
      references: [questionnaireQuestions.id],
    }),
  }),
);

export const coachingPathwaysRelations = relations(
  coachingPathways,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [coachingPathways.organizationId],
      references: [organizations.id],
    }),
    steps: many(pathwaySteps),
    enrollments: many(pathwayEnrollments),
  }),
);

export const pathwayStepsRelations = relations(pathwaySteps, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [pathwaySteps.organizationId],
    references: [organizations.id],
  }),
  pathway: one(coachingPathways, {
    fields: [pathwaySteps.pathwayId],
    references: [coachingPathways.id],
  }),
  logs: many(pathwayStepLogs),
}));

export const pathwayEnrollmentsRelations = relations(
  pathwayEnrollments,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [pathwayEnrollments.organizationId],
      references: [organizations.id],
    }),
    pathway: one(coachingPathways, {
      fields: [pathwayEnrollments.pathwayId],
      references: [coachingPathways.id],
    }),
    client: one(clients, {
      fields: [pathwayEnrollments.clientId],
      references: [clients.id],
    }),
    stepLogs: many(pathwayStepLogs),
  }),
);

export const pathwayStepLogsRelations = relations(pathwayStepLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [pathwayStepLogs.organizationId],
    references: [organizations.id],
  }),
  enrollment: one(pathwayEnrollments, {
    fields: [pathwayStepLogs.enrollmentId],
    references: [pathwayEnrollments.id],
  }),
  step: one(pathwaySteps, {
    fields: [pathwayStepLogs.stepId],
    references: [pathwaySteps.id],
  }),
}));
