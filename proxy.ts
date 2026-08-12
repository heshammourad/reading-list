import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Constant-time so a mismatched secret can't be distinguished from a matching
// one by response latency. Length is compared first since timingSafeEqual
// throws (rather than returning false) on a length mismatch.
function secretsMatch(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function proxy(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname;

  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");

  const portalSecret = process.env.READING_LIST_SECRET;
  const requestSecret = request.headers.get("x-portal-secret");

  // In non-localhost environments, require request to come via portal authorization with valid secret
  const isValidPortalRequest = Boolean(
    portalSecret && requestSecret && secretsMatch(requestSecret, portalSecret)
  );

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
