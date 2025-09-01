<script setup lang="ts">
// Handles magic link redirect: /passwordless/verify?link_token=...&auth_request_id=...
const route = useRoute();
const { verifyLink, loading, error, authRequestId } = useAuth();
const done = ref(false);
onMounted(async () => {
  const lt = route.query.link_token as string | undefined;
  const ar = (route.query.auth_request_id as string | undefined) || authRequestId || undefined;
  if (lt) {
    const resp = await verifyLink(lt, ar);
    if (resp) {
      done.value = true;
      setTimeout(()=> navigateTo('/dashboard'), 800);
    }
  }
});
</script>
<template>
  <div class="verify-page card-surface">
    <h2>Magic Link Verification</h2>
    <p v-if="loading" class="info">Checking your link…</p>
    <p v-else-if="done" class="ok">Success! Redirecting…</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else class="info">Missing token. Ensure you opened the exact magic link URL.</p>
    <p v-if="!loading && !done && !error && !route.query.auth_request_id" class="hint">No auth_request_id present; some deployments require it.</p>
    <div class="actions" v-if="!loading">
      <button class="btn outline" @click="useAuth().logout(); navigateTo('/login')">Logout</button>
      <NuxtLink class="btn outline" to="/login">Back</NuxtLink>
    </div>
  </div>
</template>
<style scoped>
.verify-page { max-width:520px; display:flex; flex-direction:column; gap:.9rem; }
h2 { margin:0; font-size:1.25rem; background:var(--c-accent-grad); -webkit-background-clip:text; color:transparent; }
.info { font-size:.8rem; color:var(--c-text-dim); margin:0; }
.ok { color:#86efac; font-size:.85rem; margin:0; }
.err { color:#fecaca; font-size:.8rem; margin:0; }
.hint { font-size:.6rem; letter-spacing:.1em; text-transform:uppercase; color:var(--c-text-dim); margin:0; }
.actions { display:flex; gap:.6rem; }
</style>
