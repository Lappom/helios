import type { OrgContext } from "@/lib/auth/types";
import { getOrgContext, requireOrg } from "@/lib/auth/org-context";
import { getDb, runWithDbScope } from "@/lib/db";
import { hasFeature, hasPlan } from "@/lib/billing/access";
import type { ClerkFeature } from "@/lib/billing/plans";
import { applyCorsHeaders, corsPreflightResponse } from "./cors";
import { logger } from "./logger";
import {
  assertRateLimitAllowed,
  enforceRateLimit,
  rateLimitKeyFromRequest,
} from "./rate-limit";
import { jsonOk, problem, toProblemResponse } from "./response";

export type ApiHandlerContext = {
  request: Request;
  org: OrgContext | null;
};

export type ApiHandlerOptions = {
  requireOrg?: boolean;
  requirePlan?: string;
  requireFeature?: ClerkFeature | string;
  rateLimit?: boolean;
};

type ApiHandler = (ctx: ApiHandlerContext) => Promise<Response> | Response;

export function withApiHandler(
  options: ApiHandlerOptions,
  handler: ApiHandler,
) {
  return async function apiRouteHandler(request: Request): Promise<Response> {
    const instance = new URL(request.url).pathname;

    if (request.method === "OPTIONS") {
      return corsPreflightResponse(request);
    }

    try {
      if (options.rateLimit !== false) {
        const org = await getOrgContext();
        const rateKey = rateLimitKeyFromRequest(
          request,
          org?.organizationId,
        );
        const rateResult = await enforceRateLimit(rateKey);
        assertRateLimitAllowed(rateResult);
      }

      const org = options.requireOrg ? await requireOrg() : await getOrgContext();

      if (options.requirePlan) {
        const allowed = await hasPlan(options.requirePlan);
        if (!allowed) {
          throw problem({
            type: "forbidden",
            title: "Plan required",
            status: 403,
            detail: `Plan '${options.requirePlan}' is required.`,
          });
        }
      }

      if (options.requireFeature) {
        const allowed = await hasFeature(options.requireFeature);
        if (!allowed) {
          throw problem({
            type: "forbidden",
            title: "Feature not available",
            status: 403,
            detail: `Feature '${options.requireFeature}' is not available on your plan.`,
          });
        }
      }

      const response = org
        ? await runWithDbScope({ organizationId: org.organizationId }, async () =>
            handler({ request, org }),
          )
        : await runWithDbScope({ bypass: true }, async () =>
            handler({ request, org }),
          );
      const headers = applyCorsHeaders(request, response.headers);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      logger.captureException(error, { path: instance });
      const response = toProblemResponse(error, instance);
      const headers = applyCorsHeaders(request, response.headers);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  };
}

export { jsonOk };
