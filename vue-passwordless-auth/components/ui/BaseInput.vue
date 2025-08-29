<script setup lang="ts">
const props = defineProps<{ modelValue: string; type?: string; placeholder?: string; disabled?: boolean; autocomplete?: string }>();
const emit = defineEmits(['update:modelValue']);
function onInput(e: Event) { emit('update:modelValue', (e.target as HTMLInputElement).value); }
</script>
<template>
  <input
    :value="modelValue"
    @input="onInput"
    :type="type || 'text'"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    class="ui-input"
  />
</template>
<style scoped>
.ui-input { width:100%; padding:.65rem .8rem; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:var(--radius-sm); color:var(--c-text); font-size:.85rem; }
.ui-input:focus { outline:2px solid var(--c-accent); outline-offset:0; }
.ui-input:disabled { opacity:.55; cursor:not-allowed; }
</style>
