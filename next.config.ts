import type { NextConfig } from "next";
import { SUBPATH_PREFIX } from "./config";

const allowedOrigins = [
  "localhost:3000",
];

if (process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
  const codespaceDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  const codespaceName = process.env.CODESPACE_NAME;
  
  // Add common ports for the codespace
  allowedOrigins.push(`${codespaceName}-3000.${codespaceDomain}`);
  allowedOrigins.push(`${codespaceName}-3001.${codespaceDomain}`);
  allowedOrigins.push(`${codespaceName}-3002.${codespaceDomain}`);
  allowedOrigins.push(`${codespaceName}-4000.${codespaceDomain}`);
  allowedOrigins.push(`${codespaceName}-5000.${codespaceDomain}`);
}

const nextConfig: NextConfig = {
  basePath: SUBPATH_PREFIX || undefined,
  // Points _next/static (JS/CSS/font) URLs at this deployment's own origin instead of the
  // portal's domain. Without this, every asset request goes through the portal's proxy.ts,
  // which runs NextAuth and rewrites the request, instead of hitting Vercel's static/CDN
  // layer directly -- costing a function invocation per asset and bypassing edge caching.
  // Explicit here because Next.js only defaults assetPrefix to basePath when assetPrefix is
  // left unset (see next.config.js docs); an absolute assetPrefix must include basePath
  // itself, since files are still served under it regardless of assetPrefix.
  assetPrefix:
    process.env.VERCEL_ENV === "production"
      ? `https://reading-list-six-psi.vercel.app${SUBPATH_PREFIX}`
      : undefined,
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
  async redirects() {
    if (!SUBPATH_PREFIX) return [];
    return [
      {
        source: "/",
        destination: SUBPATH_PREFIX,
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
