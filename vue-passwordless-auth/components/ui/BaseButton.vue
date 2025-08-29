<script setup lang="ts">
const props = defineProps<{ loading?: boolean; variant?: 'solid' | 'outline' | 'ghost'; size?: 'sm' | 'md' | 'lg'; disabled?: boolean }>();
const variantClass = computed(()=> props.variant || 'solid');
const sizeClass = computed(()=> props.size || 'md');
</script>
<template>
  <button :class="['ui-btn', variantClass, sizeClass]" :disabled="disabled || loading">
    <span v-if="loading" class="spinner" aria-hidden="true"></span>
    <span class="content"><slot /></span>
  </button>
</template>
<style scoped>
.ui-btn { position:relative; display:inline-flex; align-items:center; gap:.45rem; font-weight:500; border-radius:var(--radius-sm); border:1px solid transparent; padding:.6rem 1rem; font-size:.8rem; cursor:pointer; background:var(--c-accent-grad); color:#fff; }
.ui-btn.outline { background:transparent; border-color:rgba(255,255,255,.2); color:var(--c-text); }
.ui-btn.ghost { background:transparent; color:var(--c-text-dim); }
.ui-btn:disabled { opacity:.55; cursor:not-allowed; }
.ui-btn.sm { padding:.4rem .7rem; font-size:.7rem; }
.spinner { width:14px; height:14px; border-radius:50%; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; animation:spin 0.8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg);} }
</style>
