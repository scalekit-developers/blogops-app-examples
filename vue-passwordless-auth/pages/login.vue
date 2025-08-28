<script setup lang="ts">
const auth = useAuth();
watchEffect(()=> { if (auth.isAuthenticated) navigateTo('/dashboard'); });

const hasRequest = computed(()=> !!auth.authRequestId);
const showOtp = computed(()=> auth.passwordlessType === 'OTP' || auth.passwordlessType === 'LINK_OTP');
const showLinkInfo = computed(()=> auth.passwordlessType === 'LINK' || auth.passwordlessType === 'LINK_OTP');

// Poll session (simple) if link-only while waiting for user to click email magic link
let pollTimer: any; let visHandler: any;
function startPolling() {
  clearInterval(pollTimer);
  if (showLinkInfo.value && !showOtp.value) {
    pollTimer = setInterval(()=> {
      if (document.visibilityState === 'visible') auth.fetchSession();
    }, 4000);
  }
}
watch(showLinkInfo, () => startPolling());
if (process.client) {
  visHandler = () => { if (document.visibilityState === 'visible') auth.fetchSession(); };
  document.addEventListener('visibilitychange', visHandler);
}
onUnmounted(()=> { clearInterval(pollTimer); if (visHandler) document.removeEventListener('visibilitychange', visHandler); });
</script>
<template>
  <div class="login-shell">
    <div class="intro">
      <h2>Passwordless Sign In</h2>
      <p class="lead" v-if="!hasRequest">Sign in without a password. Enter your email and we’ll send a secure magic link and/or a one-time code.</p>
      <div v-if="auth.isAuthenticated" class="authed-bar">
        <span>Signed in as {{ auth.user?.email }}</span>
        <button class="btn outline" @click="auth.logout(); navigateTo('/login');">Logout</button>
      </div>
    </div>
    <AuthEmailForm v-if="!hasRequest" />
    <div v-else class="verify-block card-surface">
      <h3>Check your email</h3>
      <p v-if="showLinkInfo">A magic link was sent. Open it in <strong>this browser</strong> to finish login.</p>
      <p v-if="showOtp">A one-time code was sent. <NuxtLink to="/passwordless/code">Go to code page</NuxtLink>.</p>
      <p v-if="showLinkInfo && !showOtp" class="hint">Waiting for link click... (auto refresh every few seconds)</p>
      <p v-if="showLinkInfo && showOtp" class="hint">You can either click the link OR use the code.</p>
      <div class="actions">
        <button v-if="showLinkInfo" class="btn outline" @click="auth.fetchSession()" :disabled="auth.loading">Refresh Status</button>
        <button class="btn outline" @click="auth.resend()" :disabled="auth.loading || (auth.nextResendAt && Date.now() < auth.nextResendAt)">
          <span v-if="auth.nextResendAt && Date.now() < auth.nextResendAt">Resend in {{ Math.ceil((auth.nextResendAt - Date.now())/1000) }}s</span>
          <span v-else>Resend</span>
        </button>
        <button class="btn outline" @click="auth.resetFlow()" type="button">Start Over</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-shell { display:flex; flex-direction:column; gap:1.75rem; }
.intro { display:flex; flex-direction:column; gap:.6rem; max-width:620px; }
.lead { margin:0; font-size:.9rem; color:var(--c-text-dim); line-height:1.5; }
.verify-block { max-width:560px; display:flex; flex-direction:column; gap:.85rem; }
.hint { font-size:.7rem; color:var(--c-text-dim); letter-spacing:.5px; }
.authed-bar { display:flex; gap:.75rem; align-items:center; margin-top:.5rem; }
.actions { display:flex; gap:.5rem; flex-wrap:wrap; }
</style>
