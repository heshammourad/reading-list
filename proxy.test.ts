import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

/**
 * The host allowlist is the only thing standing between the public internet and
 * the library on the production alias, which Vercel's Standard Protection does
 * not cover. These tests pin the two properties that make it a gate rather than
 * a speed bump: matches are anchored to the end of the hostname, and
 * development hosts do not apply in production.
 */

function requestFrom(host: string, path = "/") {
  return new NextRequest(new URL(path, "https://example.invalid"), {
    headers: { "x-forwarded-host": host },
  });
}

function isAllowed(response: Response) {
  return response.status !== 403;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy host allowlist", () => {
  describe("in production", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("allows the portal apex and its subdomains", () => {
      vi.stubEnv("VERCEL_ENV", "production");
      expect(isAllowed(proxy(requestFrom("heshammourad.com")))).toBe(true);
      expect(isAllowed(proxy(requestFrom("www.heshammourad.com")))).toBe(true);
    });

    it("rejects hostnames that merely contain the portal domain", () => {
      vi.stubEnv("VERCEL_ENV", "production");
      expect(
        isAllowed(proxy(requestFrom("heshammourad.com.attacker.test")))
      ).toBe(false);
      expect(isAllowed(proxy(requestFrom("notheshammourad.com")))).toBe(false);
    });

    it("rejects development hosts", () => {
      vi.stubEnv("VERCEL_ENV", "production");
      expect(isAllowed(proxy(requestFrom("localhost:3000")))).toBe(false);
      expect(isAllowed(proxy(requestFrom("127.0.0.1:3000")))).toBe(false);
      expect(
        isAllowed(proxy(requestFrom("reading-3000.app.github.dev")))
      ).toBe(false);
    });

    it("rejects the bare production alias without a portal secret", () => {
      vi.stubEnv("VERCEL_ENV", "production");
      expect(isAllowed(proxy(requestFrom("reading-list-six-psi.vercel.app")))).toBe(
        false
      );
    });
  });

  describe("on a preview deployment", () => {
    it("allows the generated deployment host, which Vercel Authentication gates", () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      expect(
        isAllowed(
          proxy(
            requestFrom(
              "reading-list-jze5yosxa-hesham-mourads-projects.vercel.app"
            )
          )
        )
      ).toBe(true);
    });
  });

  describe("locally, where VERCEL_ENV is unset", () => {
    it("allows development hosts", () => {
      vi.stubEnv("VERCEL_ENV", undefined);
      expect(isAllowed(proxy(requestFrom("localhost:3000")))).toBe(true);
      expect(
        isAllowed(proxy(requestFrom("reading-3000.app.github.dev")))
      ).toBe(true);
    });

    it("still rejects an arbitrary host", () => {
      vi.stubEnv("VERCEL_ENV", undefined);
      expect(isAllowed(proxy(requestFrom("attacker.test")))).toBe(false);
    });
  });

  describe("portal secret", () => {
    it("admits a disallowed host carrying the matching secret", () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("READING_LIST_SECRET", "s3cret");
      const request = new NextRequest(new URL("https://example.invalid/"), {
        headers: {
          "x-forwarded-host": "reading-list-six-psi.vercel.app",
          "x-portal-secret": "s3cret",
        },
      });
      expect(isAllowed(proxy(request))).toBe(true);
    });

    it("rejects a mismatched secret", () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("READING_LIST_SECRET", "s3cret");
      const request = new NextRequest(new URL("https://example.invalid/"), {
        headers: {
          "x-forwarded-host": "reading-list-six-psi.vercel.app",
          "x-portal-secret": "wrong",
        },
      });
      expect(isAllowed(proxy(request))).toBe(false);
    });
  });

  it("answers API paths with JSON and page paths with text", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const api = proxy(requestFrom("attacker.test", "/api/cover"));
    expect(api.status).toBe(403);
    expect(api.headers.get("content-type")).toContain("application/json");
    await expect(api.json()).resolves.toHaveProperty("error");

    const page = proxy(requestFrom("attacker.test", "/"));
    expect(page.status).toBe(403);
    expect(page.headers.get("content-type")).toContain("text/plain");
  });
});
