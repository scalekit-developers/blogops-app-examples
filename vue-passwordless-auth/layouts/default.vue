<template>
  <div class="shell">
    <header class="site-header card-surface">
      <div class="brand">
        <NuxtLink to="/" class="logo-link" aria-label="Scalekit Home">
          <span class="logo-text">Scalekit</span>
        </NuxtLink>
        <h1>Passwordless Sample</h1>
      </div>
      <nav class="nav">
        <NuxtLink to="/" class="nav-link">Home</NuxtLink>
        <NuxtLink to="/login" class="nav-link">Login</NuxtLink>
        <NuxtLink to="/dashboard" class="nav-link">Dashboard</NuxtLink>
      </nav>
      <div class="status">
        <AuthStatus />
      </div>
    </header>
    <main class="main">
      <NuxtErrorBoundary>
        <template #error="{ error }">
          <div class="err-box card-surface">
            <h3>Something went wrong</h3>
            <p class="msg">{{ error.message }}</p>
            <button class="btn outline" @click="error.value = null">Retry</button>
          </div>
        </template>
        <div class="content card-surface">
          <slot />
        </div>
      </NuxtErrorBoundary>
    </main>
    <footer class="site-footer">
      <p>Built with <strong>Nuxt 3</strong> + <strong>Scalekit</strong> · <a href="https://nuxt.com" target="_blank" rel="noopener">Nuxt Docs</a></p>
    </footer>
  </div>
</template>


<style scoped>
.shell { min-height:100vh; display:flex; flex-direction:column; gap:1.25rem; width:100%; max-width:1200px; margin:0 auto; padding:1.25rem 1.5rem 2.5rem; }
.site-header { display:grid; grid-template-columns: auto 1fr auto; gap:1.25rem; align-items:center; }
.brand { display:flex; align-items:center; gap:.75rem; }
.brand h1 { font-size:1.1rem; margin:0; background:var(--c-accent-grad); -webkit-background-clip:text; color:transparent; letter-spacing:.5px; }
.logo-link { display:inline-flex; align-items:center; text-decoration:none; line-height:0; }
.logo-text { padding:.45rem .8rem; font-weight:700; font-size:.85rem; background:var(--c-accent-grad); -webkit-background-clip:text; color:transparent; letter-spacing:.5px; border:1px solid rgba(255,255,255,.12); border-radius:var(--radius-sm); box-shadow:0 2px 6px -2px rgba(0,0,0,.4); }
.nav { display:flex; gap:.75rem; }
.nav-link { padding:.45rem .85rem; border-radius:var(--radius-sm); font-size:.85rem; font-weight:500; color:var(--c-text-dim); transition:.25s background, .25s color; }
.nav-link:hover, .nav-link.router-link-active { background:rgba(255,255,255,.07); color:var(--c-text); text-decoration:none; }
.status { font-size:.8rem; }
.main { flex:1; display:flex; flex-direction:column; gap:1.25rem; }
.content { animation:fadeIn .4s ease; }
.err-box { border:1px solid #3b0d12; background:linear-gradient(135deg,#3b0d12,#22080b); color:#f8d7da; display:flex; flex-direction:column; gap:.5rem; }
.err-box h3 { margin:0; font-size:1rem; }
.err-box .msg { margin:0; font-size:.85rem; }
.site-footer { text-align:center; font-size:.7rem; color:var(--c-text-dim); margin-top:.5rem; }
.site-footer a { color:var(--c-text-dim); }
.site-footer a:hover { color:var(--c-text); }
@keyframes fadeIn { from { opacity:0; transform:translateY(6px);} to { opacity:1; transform:translateY(0);} }
@media (max-width: 820px) {
  .site-header { grid-template-columns: 1fr auto; grid-template-rows:auto auto; }
  .nav { order:3; flex-wrap:wrap; }
}
</style>
