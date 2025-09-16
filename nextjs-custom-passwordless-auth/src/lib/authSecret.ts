// Centralized auth secret. Prefer AUTH_SECRET (v5), fallback to NEXTAUTH_SECRET for compatibility.
// In production, always set AUTH_SECRET (or NEXTAUTH_SECRET) to a strong value.
export const AUTH_SECRET =
	process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-please-set-auth-secret";
