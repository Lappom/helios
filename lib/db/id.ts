import { createId as cuid2CreateId } from "@paralleldrive/cuid2";

export function createId(): string {
  return cuid2CreateId();
}
