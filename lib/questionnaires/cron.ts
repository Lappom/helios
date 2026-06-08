import {
  markOverdueSubmissions,
  processWeeklyQuestionnaireCreates,
  processWeeklyQuestionnaireReminders,
} from "./service";

export async function processQuestionnaireSchedules(now: Date = new Date()) {
  const [overdue, created, reminded] = await Promise.all([
    markOverdueSubmissions(now),
    processWeeklyQuestionnaireCreates(now),
    processWeeklyQuestionnaireReminders(now),
  ]);

  return {
    overdueMarked: overdue.marked,
    submissionsCreated: created.created,
    remindersSent: reminded.reminded,
  };
}
