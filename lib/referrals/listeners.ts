import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import type { PaymentReceivedPayload } from "@/lib/events/types";
import { handleReferralPaymentReceived } from "@/lib/referrals/service";

export async function handleReferralPaymentEvent(
  payload: PaymentReceivedPayload,
): Promise<void> {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, payload.paymentId),
    columns: { bookingId: true },
  });

  await handleReferralPaymentReceived(payload, payment?.bookingId ?? null);
}
