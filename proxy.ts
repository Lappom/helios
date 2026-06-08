import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/tarifs",
  "/find(.*)",
  "/checkout(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/webhooks(.*)",
  "/api/v1/public(.*)",
  "/api/v1/integrations/public(.*)",
  "/api/v1/checkout(.*)",
  "/api/v1/promo-codes/validate",
  "/api/v1/bookings/slots",
  "/_design",
  "/design(.*)",
]);

const isCoachRoute = createRouteMatcher(["/coach(.*)"]);
const isClientRoute = createRouteMatcher(["/client(.*)"]);
const isApiV1Route = createRouteMatcher(["/api/v1(.*)"]);

function rewriteFindSubdomain(req: Request): NextResponse | null {
  const host = req.headers.get("host") ?? "";
  if (!host.startsWith("find.")) {
    return null;
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.startsWith("/find") || pathname.startsWith("/api")) {
    return null;
  }

  if (pathname === "/" || pathname === "") {
    url.pathname = "/find/coaches";
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/coaches")) {
    url.pathname = `/find${pathname}`;
    return NextResponse.rewrite(url);
  }

  return null;
}

export default clerkMiddleware(async (auth, req) => {
  const findRewrite = rewriteFindSubdomain(req);
  if (findRewrite) {
    return findRewrite;
  }

  if (isPublicRoute(req)) {
    return;
  }

  if (isCoachRoute(req)) {
    await auth.protect();
    const { orgId } = await auth();
    if (!orgId) {
      return Response.redirect(new URL("/sign-in", req.url));
    }
    return;
  }

  if (isClientRoute(req)) {
    await auth.protect();
    return;
  }

  if (isApiV1Route(req)) {
    await auth.protect();
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|\\.well-known/workflow|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
