import type { NextConfig } from "next";

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
  basePath: "/reading-list",
  trailingSlash: true,
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;
