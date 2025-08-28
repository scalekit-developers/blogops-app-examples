import { defineStore } from 'pinia';

interface AuthState {
  user: { email: string } | null;
  authRequestId: string | null;
  passwordlessType: string | null;
  expiresAt: number | null;
  sessionLoaded: boolean; // whether we have attempted to load server session
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({ user: null, authRequestId: null, passwordlessType: null, expiresAt: null, sessionLoaded: false }),
  getters: {
    isAuthenticated: (s) => !!s.user,
    isOtp: (s) => s.passwordlessType === 'OTP' || s.passwordlessType === 'LINK_OTP'
  },
  actions: {
    setSession(data: any) {
  this.user = data.user;
  if (data.passwordlessType) this.passwordlessType = data.passwordlessType;
      // Normalize any numeric enum to string code
      if (typeof this.passwordlessType === 'number') {
        const map: Record<number, string> = { 1: 'OTP', 2: 'LINK', 3: 'LINK_OTP' };
        this.passwordlessType = map[this.passwordlessType] || String(this.passwordlessType);
      }
  if (data.authRequestId) this.authRequestId = data.authRequestId;
  this.sessionLoaded = true;
    },
    setAuthRequest(resp: any) {
  // Accept both camelCase (SDK) and snake_case (raw API) field names
  this.authRequestId = resp.authRequestId || resp.auth_request_id || this.authRequestId;
  let type = resp.passwordlessType || resp.passwordless_type;
  // Some SDK versions may return numeric enum; map to string
  if (typeof type === 'number') {
    const map: Record<number, string> = { 1: 'OTP', 2: 'LINK', 3: 'LINK_OTP' };
    type = map[type] || this.passwordlessType;
  }
  this.passwordlessType = type || this.passwordlessType;
  this.expiresAt = resp.expiresAt || resp.expires_at || this.expiresAt;
    },
  reset() { this.user = null; this.authRequestId = null; this.passwordlessType = null; this.expiresAt = null; this.sessionLoaded = true; }
  }
});
