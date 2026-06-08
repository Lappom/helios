import type { ApiKeyContext } from "@/lib/api/api-key-auth";
import { requireApiKey } from "@/lib/api/api-key-auth";
import { applyCorsHeaders, corsPreflightResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";
import { enforceApiRateLimits } from "@/lib/api/rate-limit";
import { jsonOk, toProblemResponse } from "@/lib/api/response";
import { consumeApiCredit } from "@/lib/billing/api-credits";

export type PublicApiHandlerContext = {
  request: Request;
  apiKey: ApiKeyContext;
};

type PublicApiHandler = (
  ctx: PublicApiHandlerContext,
) => Promise<Response> | Response;

export function withPublicApiHandler(handler: PublicApiHandler) {
  return async function publicApiRouteHandler(
    request: Request,
  ): Promise<Response> {
    const instance = new URL(request.url).pathname;

    if (request.method === "OPTIONS") {
      return corsPreflightResponse(request);
    }

    try {
      const apiKey = await requireApiKey(request);
      await enforceApiRateLimits(apiKey.organizationId, apiKey.planTier);
      await consumeApiCredit(apiKey.organizationId, apiKey.planTier);

      const response = await handler({ request, apiKey });
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
