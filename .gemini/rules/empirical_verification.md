# Empirical Runtime Verification Guidelines

1. **Build Success ≠ Task Completion**: Passing `pnpm build` or type checks does NOT prove edge routing, middleware authorization, or header behavior works in production.
2. **Differential HTTP Testing**: Always test live endpoints using `curl` across differential paths:
   - Root path (`/`)
   - API endpoints (`/api/...`)
   - Non-existent subpaths (`/test-path`)
3. **Isolate Variables**: Verify status codes (307, 403, 200), `Location` headers, and response bodies explicitly before declaring success.
