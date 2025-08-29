<script setup lang="ts">
import BaseInput from './ui/BaseInput.vue';
import BaseButton from './ui/BaseButton.vue';
const email = ref('');
const auth = useAuth();
const sent = computed(()=> !!auth.authRequestId);
const sending = ref(false);

async function onSubmit() {
  if (sent.value || sending.value) return;
  sending.value = true;
  try {
    await auth.send(email.value.trim());
  } finally {
    // If global loading stuck, local sending still ends enabling input
    sending.value = false;
  }
}
</script>
<template>
  <form @submit.prevent="onSubmit" class="email-card card-surface">
    <div class="head">
      <h3>Sign In</h3>
      <p class="sub">Use passwordless authentication. We’ll send a secure link and/or code.</p>
    </div>
    <label for="email" class="lbl">Email address</label>
    <BaseInput id="email" v-model="email" type="email" required :disabled="sending" placeholder="you@example.com" autocomplete="email" />
    <BaseButton :loading="sending" :disabled="sending || !email.trim()">
      <template #default>
        <span v-if="sending">Sending…</span>
        <span v-else-if="sent">Sent ✓ Check inbox</span>
        <span v-else>Send Link / Code</span>
      </template>
    </BaseButton>
    <transition name="fade">
      <p v-if="auth.error" class="err">{{ auth.error }}</p>
    </transition>
    <transition name="fade">
      <p v-if="sent" class="ok">Email sent. If not received, check spam or resend.</p>
    </transition>
  </form>
</template>
<style scoped>
.email-card { display:flex; flex-direction:column; gap:.85rem; width:100%; max-width:460px; position:relative; overflow:hidden; }
.email-card:before { content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit; background:radial-gradient(circle at 85% -10%,rgba(255,255,255,.18),transparent 55%); mix-blend-mode:overlay; }
.head { display:flex; flex-direction:column; gap:.35rem; }
.head h3 { margin:0; font-size:1.25rem; background:var(--c-accent-grad); -webkit-background-clip:text; color:transparent; }
.sub { margin:0; font-size:.8rem; color:var(--c-text-dim); line-height:1.3; }
.lbl { font-size:.75rem; letter-spacing:.05em; text-transform:uppercase; color:var(--c-text-dim); font-weight:500; }
button.btn:disabled { opacity:.6; cursor:not-allowed; }
.err { margin:0; background:#47131b; border:1px solid #7f1d1d; padding:.55rem .7rem; border-radius:var(--radius-sm); color:#fecaca; font-size:.75rem; }
.ok { margin:0; background:#113c2a; border:1px solid #145c3a; padding:.55rem .7rem; border-radius:var(--radius-sm); color:#86efac; font-size:.7rem; }
</style>
