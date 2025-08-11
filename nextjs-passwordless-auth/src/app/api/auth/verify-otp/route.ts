import { createSession } from "@/lib/session-store";
import Scalekit from "@scalekit-sdk/node";
import { NextRequest, NextResponse } from "next/server";

const scalekit = new Scalekit(
  process.env.SCALEKIT_ENVIRONMENT_URL!,
  process.env.SCALEKIT_CLIENT_ID!,
  process.env.SCALEKIT_CLIENT_SECRET!
);

export async function POST(req: NextRequest) {
  try {
    const { code, authRequestId } = await req.json();
    if (!code || !authRequestId) {
      return NextResponse.json({ error: "Code and authRequestId are required." }, { status: 400 });
    }
    const verifyResponse = await scalekit.passwordless.verifyPasswordlessEmail({ code }, authRequestId);
    // Set a session cookie using the shared session store
    const sessionId = createSession(verifyResponse.email);
    const response = NextResponse.json({ success: true });
    response.cookies.set("session", sessionId, { httpOnly: true, path: "/", sameSite: "lax" });
    return response;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid or expired code.";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
