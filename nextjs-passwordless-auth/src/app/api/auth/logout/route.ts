import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Clear the session cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set("session", "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return response;
}
