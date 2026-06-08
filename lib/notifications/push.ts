import webpush from "web-push";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import type { SendChannelResult } from "./types";

function configureWebPush(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@helios.lappom.fr";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export type PushSendInput = {
  organizationId: string;
  clientId: string;
  title: string;
  body: string;
  url?: string;
};

export async function sendPushToClient(
  input: PushSendInput,
): Promise<SendChannelResult> {
  if (!configureWebPush()) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[notifications:push] stub send", input);
      return { ok: true, delivered: 0 };
    }
    return { ok: false, error: "VAPID keys are not configured." };
  }

  const subscriptions = await getDb().query.pushSubscriptions.findMany({
    where: and(
      eq(pushSubscriptions.organizationId, input.organizationId),
      eq(pushSubscriptions.clientId, input.clientId),
    ),
  });

  if (subscriptions.length === 0) {
    return { ok: true, delivered: 0 };
  }

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url ?? "/client",
  });

  let delivered = 0;
  const errors: string[] = [];

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
      );
      delivered += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Push delivery failed.";
      errors.push(message);

      if (message.includes("410") || message.includes("404")) {
        await getDb()
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, subscription.id));
      }
    }
  }

  if (delivered === 0 && errors.length > 0) {
    return { ok: false, error: errors[0], delivered: 0 };
  }

  return { ok: true, delivered };
}
