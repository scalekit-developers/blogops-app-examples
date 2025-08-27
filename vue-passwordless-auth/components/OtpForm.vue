<script setup lang="ts">
const code = ref('');
const { verifyCode, resend, loading, error, passwordlessType, isOtp, expiresAt } = useAuth();
const done = ref(false);
const now = ref(Date.now());
const timeLeft = computed(() => {
  if (!expiresAt) return null;
  return Math.max(0, Math.floor(expiresAt - now.value/1000));
});
let interval: any;
onMounted(()=>{ interval = setInterval(()=>{ now.value = Date.now(); }, 1000); });
onUnmounted(()=> clearInterval(interval));
async function submit() {
  const resp = await verifyCode(code.value.trim());
  if (resp) { done.value = true; setTimeout(()=> navigateTo('/dashboard'), 600); }
}
</script>
<template>
  <div v-if="isOtp && !done" class="card">
    <p>Enter the OTP sent to your email.</p>
    <input v-model="code" placeholder="123456" maxlength="10" />
    <button :disabled="loading" @click="submit">Verify</button>
    <button type="button" @click="resend" :disabled="loading">Resend</button>
    <p v-if="timeLeft !== null">Expires in: {{ timeLeft }}s</p>
    <p v-if="error" class="err">{{ error }}</p>
  </div>
  <p v-else-if="done">Verified! Redirecting...</p>
</template>
<style scoped>
.card { display:flex; flex-direction:column; gap:.5rem; max-width:320px; }
input, button { padding:.5rem .75rem; }
.err { color:#b00; }
</style>
