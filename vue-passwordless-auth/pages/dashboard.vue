<script setup lang="ts">
definePageMeta({ requiresAuth: true });
const auth = useAuth();
const meta = computed(()=> usePasswordlessMeta(auth.passwordlessType));
async function doLogout() { await auth.logout(); }
if (process.client) {
  watch(() => auth.isAuthenticated, (v) => { if (!v) navigateTo('/login'); });
}
</script>
<template>
  <div class="dash">
    <header class="top">
      <div class="head">
        <h2>Dashboard</h2>
        <p class="tag" v-if="auth.user">Active Session</p>
      </div>
      <div v-if="auth.user" class="session">
        <span class="email">{{ auth.user.email }}</span>
        <button class="btn outline" @click="doLogout">Logout</button>
      </div>
    </header>
    <section class="panel card-surface">
  <p v-if="auth.user">You signed in with <strong>{{ meta.label }}</strong>. {{ meta.info }} Your session cookie is httpOnly and expires in 1 day.</p>
      <p v-else>Signing out… Redirecting.</p>
      <div class="grid">
        <div class="mini card-surface">
          <h4>Status</h4>
          <p>{{ auth.user ? 'Authenticated' : 'Anonymous' }}</p>
        </div>
        <div class="mini card-surface">
          <h4>Mode</h4>
          <p>{{ meta.label }}</p>
        </div>
        <div class="mini card-surface">
          <h4>Auth Request</h4>
          <p class="mono">{{ auth.authRequestId?.slice(0,16) || '—' }}</p>
        </div>
      </div>
      <div class="refs">
        <h4>References</h4>
        <ul>
          <li><a href="https://docs.scalekit.com/passwordless/quickstart/" target="_blank" rel="noopener">Scalekit Passwordless Quickstart</a></li>
          <li><a href="https://scalekit.com/" target="_blank" rel="noopener">Scalekit Website</a></li>
        </ul>
      </div>
    </section>
  </div>
</template>
<style scoped>
.dash { display:flex; flex-direction:column; gap:1.5rem; }
.top { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; }
.session { display:flex; gap:.75rem; align-items:center; }
.email { font-size:.7rem; background:rgba(255,255,255,.07); padding:.35rem .6rem; border-radius:var(--radius-sm); letter-spacing:.5px; }
.panel { display:flex; flex-direction:column; gap:1.25rem; }
.grid { display:grid; gap:.9rem; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); }
.mini { padding:1rem 1rem .9rem; display:flex; flex-direction:column; gap:.35rem; box-shadow:none; }
.mini h4 { margin:0; font-size:.7rem; text-transform:uppercase; letter-spacing:.1em; color:var(--c-text-dim); font-weight:600; }
.mini p { margin:0; font-size:.85rem; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size:.65rem; word-break:break-all; }
.tag { margin:.35rem 0 0; background:var(--c-accent-grad); -webkit-background-clip:text; color:transparent; font-size:.75rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; }
.head { display:flex; flex-direction:column; }
</style>
