import "server-only";

import {
  executeAutomationActionStep,
  markExecutionCompletedStep,
  markExecutionFailedStep,
  markExecutionRunningStep,
} from "../steps";
import type { RunAutomationInput } from "../types";

export async function runAutomationWorkflow(input: RunAutomationInput) {
  "use workflow";

  await markExecutionRunningStep(input.executionId);

  try {
    for (const action of input.actions) {
      await executeAutomationActionStep(input, action);
    }
    await markExecutionCompletedStep(input.executionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow failed";
    await markExecutionFailedStep(input.executionId, message);
    throw error;
  }
}
