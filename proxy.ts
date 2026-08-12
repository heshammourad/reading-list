import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname;

  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");

  if (!isLocalhost) {
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

    return new NextResponse(
      "Direct access is prohibited. Please access via https://heshammourad.com/reading-list",
      {
        status: 403,
        headers: {
          "content-type": "text/plain",
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  // "/" is explicitly included because Next.js skips the proxy for the basePath
  // root when using only the negative-lookahead pattern
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
