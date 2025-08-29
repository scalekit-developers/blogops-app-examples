// Minimal Nuxt config (Nuxt 3 today; adjust when Nuxt 4 GA)
export default defineNuxtConfig({
  compatibilityDate: '2024-12-18',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  runtimeConfig: {
    scalekit: {
      envUrl: process.env.SCALEKIT_ENV_URL || '',
      clientId: process.env.SCALEKIT_CLIENT_ID || '',
      clientSecret: process.env.SCALEKIT_CLIENT_SECRET || ''
    },
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change',
    public: {
      // Expose only what clients need (avoid secrets)
  passwordlessVerifyPath: '/passwordless/verify',
  passwordlessType: process.env.PASSWORDLESS_TYPE || 'LINK_OTP'
    }
  }
});
