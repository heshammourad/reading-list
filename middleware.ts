import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const isProduction = process.env.NODE_ENV === "production";

  // Shared secret check between portal (heshammourad-portal) and reading-list
  const portalSecret = process.env.PORTAL_SECRET;
  const requestSecret =
    request.headers.get("x-portal-secret") ||
    request.headers.get("x-from-portal");

  const isValidPortalRequest = portalSecret
    ? requestSecret === portalSecret
    : request.headers.get("x-from-portal") === "true";

  const isMainDomain = host === "heshammourad.com";

  // In production, prohibit direct access to all *.vercel.app domains unless authenticated via portal secret
  if (isProduction && !isValidPortalRequest && !isMainDomain) {
    if (request.nextUrl.pathname.startsWith("/api")) {
      return new NextResponse(
        JSON.stringify({
          error:
            "Direct access is prohibited. Please access via https://heshammourad.com/reading-list",
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      );
    }

    return NextResponse.redirect("https://heshammourad.com/reading-list", 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
