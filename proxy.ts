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
  // Vercel overwrites x-forwarded-host with the true host, so it cannot be
  // forged; a Host: override is rejected at the edge before reaching us.
  const hostname = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname
  )
    .split(":")[0]
    .toLowerCase();

  const vercelEnv = process.env.VERCEL_ENV;

  // Preview deployments carry an unpredictable *.vercel.app host, so no
  // allowlist can name them. They are already gated by Vercel Authentication
  // (Standard Protection), which 302s to vercel.com/sso-api before this runs —
  // measured 2026-08-12, alongside the production alias, which is NOT covered
  // by it and so still depends on the checks below. Without this branch the
  // host allowlist makes previews untestable rather than making them safe.
  const isPreviewDeployment = vercelEnv === "preview";

  // Suffix match, not substring: includes("heshammourad.com") would also admit
  // heshammourad.com.attacker.test and notheshammourad.com.
  const isPortalHost =
    hostname === "heshammourad.com" || hostname.endsWith(".heshammourad.com");

  // Local and Codespaces hosts are development conveniences. They were
  // previously allowed on production too, which meant a Codespace port set to
  // public exposed the whole app at a *.github.dev host with no auth at all.
  const isDevelopmentHost =
    vercelEnv !== "production" &&
    (hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".github.dev") ||
      hostname.endsWith(".github.preview.dev"));

  const isAllowedHost = isPreviewDeployment || isPortalHost || isDevelopmentHost;

  const portalSecret = process.env.READING_LIST_SECRET;
  const requestSecret = request.headers.get("x-portal-secret");

  // In non-allowed host environments, require request to come via portal authorization with valid secret
  const isValidPortalRequest = Boolean(
    portalSecret && requestSecret && secretsMatch(requestSecret, portalSecret)
  );

  if (!isAllowedHost && !isValidPortalRequest) {
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
