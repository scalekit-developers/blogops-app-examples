<script setup lang="ts">
const props = defineProps<{ kind?: 'ok' | 'warn' | 'error' | 'info' }>();
</script>
<template>
  <span :class="['status-badge', props.kind || 'info']"><slot /></span>
</template>
<style scoped>
.status-badge { display:inline-block; font-size:.6rem; letter-spacing:.1em; text-transform:uppercase; padding:.25rem .55rem; border-radius:999px; background:rgba(255,255,255,.08); color:var(--c-text-dim); font-weight:600; }
.status-badge.ok { background:#0f5132; color:#d1fae5; }
.status-badge.warn { background:#664d03; color:#fde68a; }
.status-badge.error { background:#5f1119; color:#fecaca; }
.status-badge.info { background:#1e3a5f; color:#bfdbfe; }
</style>
