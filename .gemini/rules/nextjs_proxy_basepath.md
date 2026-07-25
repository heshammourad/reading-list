# Next.js 16 Proxy & BasePath Routing Rules

1. **File Naming & Export**: In Next.js 16+, use `proxy.ts` (or `proxy.js`) with `export function proxy(request: NextRequest)` instead of deprecated `middleware.ts`.
2. **BasePath Matcher Rule**: When `basePath` is configured in `next.config.ts`, standard negative-lookahead matchers miss the internal root path `/`. Always explicitly include `"/"` in the matcher array:
   ```typescript
   export const config = {
     matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"],
   };
   ```
