import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname;

  const portalSecret = process.env.PORTAL_SECRET;
  const requestSecret =
    request.headers.get("x-portal-secret") ||
    request.headers.get("x-from-portal");

  const isValidPortalRequest = portalSecret
    ? requestSecret === portalSecret
    : request.headers.get("x-from-portal") === "true";

  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");

  // In non-localhost environments, require request to come via portal authorization
  if (!isLocalhost && !isValidPortalRequest) {
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
          },
        }
      );
    }

    return NextResponse.redirect("https://heshammourad.com/reading-list", 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
