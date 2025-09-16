import { AUTH_SECRET } from "@/lib/authSecret";
import { getToken, JWT } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

type TokenShape = JWT & { email?: string; exp?: number };

export async function GET(req: NextRequest) {
	const token = (await getToken({ req, secret: AUTH_SECRET })) as TokenShape | null;
	if (!token) return NextResponse.json(null, { status: 200 });
	const exp = token.exp ? new Date(token.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
	return NextResponse.json(
		{
			user: { email: token.email ?? null },
			expires: exp.toISOString(),
		},
		{ status: 200 }
	);
}

export async function POST(req: NextRequest) {
	// Mirror GET for compatibility
	return GET(req);
}
