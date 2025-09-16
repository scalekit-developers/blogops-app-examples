import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock scalekit module used by authOptions
vi.mock("@/lib/scalekit", () => {
  return {
    scalekit: {
      passwordless: {
        sendPasswordlessEmail: vi.fn(async () => {}),
        verifyPasswordlessEmail: vi.fn(async (input: { code?: string; linkToken?: string }) => {
          if (input.code === "123456" || input.linkToken === "token-ok") {
            return { email: "test@example.com" };
          }
          throw new Error("Invalid");
        }),
      },
    },
  };
});

// Import after mocks
import { scalekitAuthorize } from "@/lib/authOptions";
import { scalekit } from "@/lib/scalekit";

describe("authorize()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_URL = "http://localhost:3000";
  });

  it("sends passwordless email when only email provided", async () => {
    const res = await scalekitAuthorize({ email: "test@example.com" });
    expect(res).toBeNull();
  expect((scalekit as { passwordless: { sendPasswordlessEmail: (...args: unknown[]) => Promise<void> } }).passwordless.sendPasswordlessEmail).toHaveBeenCalledOnce();
  });

  it("verifies OTP and returns user", async () => {
    const res = await scalekitAuthorize({ code: "123456", authRequestId: "req-1" });
    expect(res).toEqual({ id: "test@example.com", email: "test@example.com" });
  });

  it("verifies link token and returns user", async () => {
    const res = await scalekitAuthorize({ linkToken: "token-ok", authRequestId: "req-2" });
    expect(res).toEqual({ id: "test@example.com", email: "test@example.com" });
  });
});
