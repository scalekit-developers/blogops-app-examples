<script setup lang="ts">
import CodeEntry from '@/components/ui/CodeEntry.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
const auth = useAuth();
// If no authRequestId (direct visit), bounce to login
if (process.client) {
  watchEffect(()=> { if (!auth.authRequestId && !auth.loading) navigateTo('/login'); });
  watchEffect(()=> { if (auth.isAuthenticated) navigateTo('/dashboard'); });
}
const code = ref('');
// Ensure a clean state when arriving here
if (process.client) auth.verifying = false;
const submitting = computed(()=> auth.verifying);
async function submit() {
  if (!code.value.trim()) return;
  const ok = await auth.verifyCode(code.value.trim());
  if (ok) {
    // navigate handled by dashboard guard
    navigateTo('/dashboard');
  }
}
function resend() { auth.resend(); }
</script>
<template>
  <div class="wrap card-surface" v-if="auth.authRequestId">
    <div class="head">
      <h2>Enter Verification Code</h2>
      <p class="desc" v-if="auth.passwordlessType==='LINK_OTP'">Use the code below or click the link in your email.</p>
      <p class="desc" v-else>Check your inbox for a one-time passcode.</p>
    </div>
    <form @submit.prevent="submit" class="form">
      <CodeEntry v-model="code" :length="6" :disabled="submitting" @submit="submit" />
      <BaseButton :loading="submitting" :disabled="submitting || code.length!==6">{{ submitting ? 'Verifying…' : 'Verify Code' }}</BaseButton>
    </form>
    <p v-if="auth.error" class="err">{{ auth.error }}</p>
    <div class="meta-bar">
      <span class="meta">Request ID: {{ auth.authRequestId.slice(0,18) }}…</span>
    </div>
    <div class="actions">
      <button type="button" class="btn outline" @click="resend" :disabled="auth.loading || submitting">Resend</button>
      <button type="button" class="btn outline" @click="auth.resetFlow(); navigateTo('/login');" :disabled="submitting">Start Over</button>
      <button v-if="auth.user" type="button" class="btn outline" @click="auth.logout(); navigateTo('/login');">Logout</button>
    </div>
  </div>
  <div v-else class="empty">
    <p>Redirecting…</p>
  </div>
</template>
<style scoped>
.wrap { max-width:520px; display:flex; flex-direction:column; gap:1.1rem; }
.head { display:flex; flex-direction:column; gap:.4rem; }
.head h2 { margin:0; font-size:1.35rem; background:var(--c-accent-grad); -webkit-background-clip:text; color:transparent; }
.desc { margin:0; font-size:.75rem; letter-spacing:.5px; color:var(--c-text-dim); }
.form { display:flex; gap:.75rem; align-items:center; }
input { flex:1; padding:.7rem .85rem; font-size:1.35rem; letter-spacing:.3rem; text-align:center; font-weight:600; }
input::placeholder { letter-spacing:normal; font-weight:400; }
.err { color:#fecaca; background:#47131b; border:1px solid #7f1d1d; padding:.55rem .7rem; border-radius:var(--radius-sm); font-size:.7rem; margin:0; }
.meta-bar { display:flex; justify-content:space-between; }
.meta { font-size:.6rem; color:var(--c-text-dim); letter-spacing:.1em; text-transform:uppercase; }
.actions { display:flex; gap:.6rem; flex-wrap:wrap; }
.empty { padding:2rem 0; }
</style>
