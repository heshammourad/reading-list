import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function handleProxy(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname;

  // Check if request comes from portal via secret or x-from-portal header
  const portalSecret = process.env.PORTAL_SECRET;
  const requestSecret =
    request.headers.get("x-portal-secret") ||
    request.headers.get("x-from-portal");

  const isValidPortalRequest = portalSecret
    ? requestSecret === portalSecret
    : request.headers.get("x-from-portal") === "true";

  const isMainDomain = host.includes("heshammourad.com");
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");

  // If not local dev, and not valid portal request, and not main domain -> Block direct Vercel access
  if (!isLocalhost && !isValidPortalRequest && !isMainDomain) {
    if (request.nextUrl.pathname.startsWith("/api")) {
      return new NextResponse(
        JSON.stringify({
          error:
            "Direct access is prohibited. Please access via https://heshammourad.com/reading-list",
        }),
        {
          status: 403,
          headers: {
            "content-type": "application/json",
            "x-reading-list-middleware": "blocked",
          },
        }
      );
    }

    return NextResponse.redirect("https://heshammourad.com/reading-list", {
      status: 307,
      headers: {
        "x-reading-list-middleware": "redirected",
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set("x-reading-list-middleware", "allowed");
  return response;
}

export function proxy(request: NextRequest) {
  return handleProxy(request);
}

export function middleware(request: NextRequest) {
  return handleProxy(request);
}

export default function defaultExport(request: NextRequest) {
  return handleProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
