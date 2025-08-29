// Shared in-memory verification state across API route bundles using globalThis.
// NOTE: This resets on server restart; replace with persistent storage (DB/Redis) in production.

const g: any = globalThis as any;
if (!g.__verifiedEmails) {
  g.__verifiedEmails = new Set<string>();
}

export const verifiedEmails: Set<string> = g.__verifiedEmails;

export function markEmailVerified(email: string) {
  if (email) verifiedEmails.add(email.toLowerCase());
}

export function isEmailVerified(email: string) {
  return !!email && verifiedEmails.has(email.toLowerCase());
}

export function clearEmailVerified(email: string) {
  if (email) verifiedEmails.delete(email.toLowerCase());
}
