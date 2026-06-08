import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { logAuditEvent } from "@/lib/audit/service";
import { createManualPayment } from "@/lib/revenue/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createManualPaymentSchema } from "@/lib/validators/payments";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const body = await parseJsonBody(createManualPaymentSchema, request);
  const payment = await createManualPayment(
    org.organizationId,
    org.clerkUserId,
    body,
  );

  await logAuditEvent({
    organizationId: org.organizationId,
    actor: { type: "coach", clerkUserId: org.clerkUserId },
    action: "payment.manual_create",
    resourceType: "payment",
    resourceId: payment.id,
    request,
  });

  return jsonOk(payment, { status: 201 });
});
