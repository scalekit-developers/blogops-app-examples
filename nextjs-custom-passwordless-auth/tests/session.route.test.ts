import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

describe("/api/auth/session route", () => {
  it("returns null when no token", async () => {
    vi.resetModules();
    vi.doMock("next-auth/jwt", () => ({
      getToken: vi.fn(async () => null),
    }));
    const { GET } = await import("@/app/api/auth/session/route");
    const url = new URL("http://localhost/api/auth/session");
    const req = new NextRequest(url);
    const res = await GET(req);
    const json = await res.json();
    expect(json).toBeNull();
  });

  it("returns session when token present", async () => {
    vi.resetModules();
    vi.doMock("next-auth/jwt", () => ({
      getToken: vi.fn(async () => ({ email: "tester@example.com", exp: Math.floor(Date.now() / 1000) + 3600 })),
    }));
    const { GET } = await import("@/app/api/auth/session/route");
    const url = new URL("http://localhost/api/auth/session");
    const req = new NextRequest(url);
    const res = await GET(req);
    const json = await res.json();
    expect(json).toMatchObject({ user: { email: "tester@example.com" } });
    expect(typeof json.expires).toBe("string");
  });
});
