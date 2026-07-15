import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const isProduction = process.env.NODE_ENV === "production";

  // In production, enforce that all requests come through your main domain
  if (isProduction && host && host !== "heshammourad.com") {
    // If it's a Vercel preview deployment or system request, we might want to bypass it
    const isVercelPreview = host.endsWith(".vercel.app") && host !== "heshammourad-reading-list.vercel.app";
    
    if (!isVercelPreview) {
      return new NextResponse(
        JSON.stringify({
          error: "Direct access is prohibited. Please visit heshammourad.com instead.",
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
