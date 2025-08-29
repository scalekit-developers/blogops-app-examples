// Provides human-friendly labels & descriptions for passwordless flows
export function usePasswordlessMeta(type?: unknown) {
  // Accept legacy numeric enum (1,2,3) or string; ignore anything else gracefully
  let normalized: string | null = null;
  const enumMap: Record<number, string> = { 1: 'OTP', 2: 'LINK', 3: 'LINK_OTP' };
  if (typeof type === 'number') normalized = enumMap[type] || null;
  else if (typeof type === 'string') normalized = type.toUpperCase();
  const map: Record<string, { label: string; info: string } > = {
    OTP: { label: 'One-Time Passcode (Email Code)', info: 'You entered a 6‑digit code that was emailed to you.' },
    LINK: { label: 'Magic Link', info: 'You clicked a single-use sign-in link emailed to you.' },
    LINK_OTP: { label: 'Magic Link + Code Backup', info: 'You used a magic link (or its fallback code) for sign-in.' }
  };
  if (!normalized || !map[normalized]) return { label: 'Session', info: 'Standard authenticated session.' };
  return map[normalized];
}
