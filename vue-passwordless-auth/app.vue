<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
<style>
:root {
  --c-bg: #0f172a;
  --c-bg-alt: #1e293b;
  --c-surface: #0f1b33;
  --c-accent: #42b883;
  --c-accent-grad: linear-gradient(90deg,#42b883,#3fa4f0 45%,#7c3aed);
  --c-text: #e2e8f0;
  --c-text-dim: #94a3b8;
  --c-border: #2c3e50;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --shadow-sm: 0 2px 4px -1px rgba(0,0,0,.25);
  --shadow-md: 0 4px 12px -2px rgba(0,0,0,.35);
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, sans-serif;
}
html,body,#__nuxt { height:100%; }
body { margin:0; background:radial-gradient(circle at 20% 20%,#1b2942,#0b1322 60%); color:var(--c-text); -webkit-font-smoothing:antialiased; }
* { box-sizing:border-box; }
a { color:var(--c-accent); text-decoration:none; }
a:hover { text-decoration:underline; }
button { cursor:pointer; font:inherit; }
.btn { background:var(--c-accent-grad); color:#fff; border:0; padding:.6rem 1rem; border-radius:var(--radius-md); font-weight:600; letter-spacing:.5px; box-shadow:var(--shadow-sm); position:relative; overflow:hidden; transition:.25s background, .25s transform, .25s box-shadow; }
.btn:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); }
.btn:active { transform:translateY(0); }
.btn.outline { background:transparent; border:1px solid var(--c-accent); color:var(--c-accent); }
.btn.outline:hover { background:rgba(66,184,131,.08); }
input,select,textarea { background:var(--c-bg-alt); color:var(--c-text); border:1px solid var(--c-border); border-radius:var(--radius-sm); padding:.55rem .7rem; font:inherit; box-shadow:0 0 0 1px transparent; transition:.2s border,.2s box-shadow; }
input:focus { outline:none; border-color:var(--c-accent); box-shadow:0 0 0 1px var(--c-accent); }
code { background:var(--c-bg-alt); padding:.25rem .4rem; border-radius:var(--radius-sm); font-size:.85em; }
.card-surface { background:linear-gradient(145deg,#132035,#0d1729); border:1px solid #1d2d47; border-radius:var(--radius-lg); padding:1.4rem 1.6rem; box-shadow:var(--shadow-md); backdrop-filter:blur(8px); }
.grid-gap { display:grid; gap:1rem; }
.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity:0; }
::-webkit-scrollbar { width:10px; height:10px; }
::-webkit-scrollbar-track { background:var(--c-bg-alt); }
::-webkit-scrollbar-thumb { background:#1f2f46; border-radius:6px; }
::-webkit-scrollbar-thumb:hover { background:#294362; }
</style>
