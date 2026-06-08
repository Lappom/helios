import { z } from "zod";

export const eraseAccountSchema = z.object({
  confirmEmail: z.string().email(),
});

export type EraseAccountInput = z.infer<typeof eraseAccountSchema>;
