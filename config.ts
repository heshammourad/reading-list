/**
 * Configuration for the application.
 * If the application is served from a subpath on a domain (e.g. /my-subpath),
 * this prefix will be prepended to API calls and other relative URLs.
 * 
 * Set this via the NEXT_PUBLIC_SUBPATH_PREFIX environment variable, or modify it here.
 * It should start with a slash and have no trailing slash (e.g., "/reading-list").
 */
const rawPrefix = process.env.NEXT_PUBLIC_SUBPATH_PREFIX || "";

// Normalize the prefix: ensure it starts with "/" and has no trailing "/"
export const SUBPATH_PREFIX = rawPrefix
  ? (rawPrefix.startsWith("/") ? rawPrefix : `/${rawPrefix}`).replace(/\/$/, "")
  : "";

/**
 * Prepends the subpath prefix to a path.
 * @param path The path to prefix (e.g., "/api/cover")
 * @returns The prefixed path (e.g., "/reading-list/api/cover")
 */
export function prefixUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SUBPATH_PREFIX}${cleanPath}`;
}
