import { defineStore } from 'pinia';

interface AuthState {
  user: { email: string } | null;
  authRequestId: string | null;
  passwordlessType: string | null;
  expiresAt: number | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({ user: null, authRequestId: null, passwordlessType: null, expiresAt: null }),
  getters: {
    isAuthenticated: (s) => !!s.user,
    isOtp: (s) => s.passwordlessType === 'OTP' || s.passwordlessType === 'LINK_OTP'
  },
  actions: {
    setSession(data: any) {
      this.user = data.user;
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
    reset() { this.user = null; this.authRequestId = null; this.passwordlessType = null; this.expiresAt = null; }
  }
});
