export const AI_CREDIT_COSTS = {
  chat: 1,
  generateProgram: 5,
} as const;

export type AiCreditAction = keyof typeof AI_CREDIT_COSTS;
