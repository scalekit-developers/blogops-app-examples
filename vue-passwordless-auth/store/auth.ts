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
      this.authRequestId = resp.authRequestId;
      this.passwordlessType = resp.passwordlessType;
      this.expiresAt = resp.expiresAt;
    },
    reset() { this.user = null; this.authRequestId = null; this.passwordlessType = null; this.expiresAt = null; }
  }
});
