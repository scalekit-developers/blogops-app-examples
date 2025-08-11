import { getSessionEmail } from "@/lib/session-store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (!session) {
    return NextResponse.json({ email: null });
  }
  const email = getSessionEmail(session);
  return NextResponse.json({ email: email || null });
}
