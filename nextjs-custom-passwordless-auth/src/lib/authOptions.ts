import type { NextAuthConfig, Session, User } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { AUTH_SECRET } from "./authSecret";
import { scalekit } from "./scalekit";
// Conditionally enable Prisma adapter if env + deps are present (no type resolution at build time)
let adapter: Adapter | undefined = undefined;
if (process.env.DATABASE_URL) {
  try {
  // Avoid static analysis/type resolution by using an indirect dynamic import
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<unknown>;
    type PrismaModule = { PrismaClient: new () => unknown };
  type AdapterModule = { PrismaAdapter: (client: unknown) => Adapter };
    const [prismaModU, adapterModU] = await Promise.all([
      dynamicImport("@prisma/client"),
      dynamicImport("@auth/prisma-adapter"),
    ]);
    const prismaMod = prismaModU as PrismaModule;
    const adapterMod = adapterModU as AdapterModule;
    const prisma = new prismaMod.PrismaClient();
  adapter = adapterMod.PrismaAdapter(prisma);
  } catch {
    adapter = undefined;
  }
}

export async function scalekitAuthorize(credentials?: Record<string, unknown>) {
  const email = typeof credentials?.email === "string" ? credentials.email : undefined;
  const code = typeof credentials?.code === "string" ? credentials.code : undefined;
  const linkToken = typeof credentials?.linkToken === "string" ? credentials.linkToken : undefined;
  const authRequestId = typeof credentials?.authRequestId === "string" ? credentials.authRequestId : undefined;

  if (email && !code && !linkToken) {
    await scalekit.passwordless.sendPasswordlessEmail(email, {
      expiresIn: 300,
      magiclinkAuthUri: `${process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/verify-magic-link`,
    });
    return null;
  }
  if (code && authRequestId) {
    const verifyResponse = await scalekit.passwordless.verifyPasswordlessEmail({ code }, authRequestId);
    return { id: verifyResponse.email, email: verifyResponse.email } as { id: string; email: string };
  }
  if (linkToken && authRequestId) {
    const verifyResponse = await scalekit.passwordless.verifyPasswordlessEmail({ linkToken }, authRequestId);
    return { id: verifyResponse.email, email: verifyResponse.email } as { id: string; email: string };
  }
  return null;
}

const providers: Provider[] = [
  Credentials({
    id: "scalekit",
    name: "Scalekit Passwordless",
    credentials: {
      email: { label: "Email", type: "email" },
      code: { label: "Code", type: "text", optional: true },
      linkToken: { label: "Magic Link Token", type: "text", optional: true },
      authRequestId: { label: "Auth Request ID", type: "text", optional: true },
    },

    async authorize(credentials) {
      return scalekitAuthorize(credentials as Record<string, unknown>);
    },
  }) as unknown as Provider,
];

// Auto-enable GitHub OAuth if env is present, no code changes required by user
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }) as unknown as Provider
  );
}

export const authConfig: NextAuthConfig = {
  // Ensure JWT encryption/decryption uses a stable secret
  secret: AUTH_SECRET,
  providers,
  session: { strategy: "jwt" as const },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User | null }) {
      if (user?.email) token.email = user.email;
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token?.email) session.user = { ...session.user, email: token.email };
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  // Auto-enable Prisma adapter when DATABASE_URL is set and deps installed
  // Note: We rely on top-level await executed earlier; if adapter is undefined, JWT strategy remains.
  ...(adapter ? { adapter } : {}),
};
