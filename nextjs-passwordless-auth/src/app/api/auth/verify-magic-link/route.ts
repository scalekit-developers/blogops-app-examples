import { createSession } from "@/lib/session-store";
import Scalekit from "@scalekit-sdk/node";
import { NextRequest, NextResponse } from "next/server";

const scalekit = new Scalekit(
  process.env.SCALEKIT_ENVIRONMENT_URL!,
  process.env.SCALEKIT_CLIENT_ID!,
  process.env.SCALEKIT_CLIENT_SECRET!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const linkToken = searchParams.get("link_token");
  const authRequestId = searchParams.get("auth_request_id");
  if (!linkToken) return NextResponse.json({ error: "Missing link_token." }, { status: 400 });
  if (!authRequestId) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/verify-magic-link?link_token=${encodeURIComponent(linkToken)}`);
  }
  try {
    const verifyResponse = await scalekit.passwordless.verifyPasswordlessEmail({ linkToken }, authRequestId);
    const sessionToken = createSession(verifyResponse.email);
    const response = NextResponse.json({ success: true });
    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid or expired magic link.";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { linkToken, authRequestId } = await req.json();
    if (!linkToken) return NextResponse.json({ error: "Missing link_token." }, { status: 400 });
    if (!authRequestId) return NextResponse.json({ error: "Missing auth_request_id." }, { status: 400 });
    const verifyResponse = await scalekit.passwordless.verifyPasswordlessEmail({ linkToken }, authRequestId);
    const sessionId = createSession(verifyResponse.email);
    const response = NextResponse.json({ success: true });
    response.cookies.set("session", sessionId, { httpOnly: true, path: "/", sameSite: "lax" });
    return response;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid or expired magic link.";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
