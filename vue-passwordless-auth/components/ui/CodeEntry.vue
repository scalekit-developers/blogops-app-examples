<script setup lang="ts">
// Simple multi-box code entry (OTP). Emits combined value.
const props = defineProps<{ length?: number; modelValue?: string; disabled?: boolean }>();
const emit = defineEmits(['update:modelValue','submit']);
const len = computed(()=> props.length || 6);
const boxes = ref<string[]>(Array(len.value).fill(''));
const inputs = ref<HTMLInputElement[]>([] as any);
watch(()=> props.modelValue, (v)=> {
  if (!v) { boxes.value = Array(len.value).fill(''); return; }
  const chars = v.split('').slice(0,len.value);
  boxes.value = Array(len.value).fill('').map((_,i)=> chars[i] || '');
});
function onInput(i: number, e: Event) {
  const val = (e.target as HTMLInputElement).value.replace(/\D+/g,'').slice(-1);
  boxes.value[i] = val;
  emit('update:modelValue', boxes.value.join(''));
  if (val && i < len.value-1) inputs.value[i+1]?.focus();
  if (boxes.value.join('').length === len.value) emit('submit');
}
function onPaste(e: ClipboardEvent, i: number) {
  const data = e.clipboardData?.getData('text') || '';
  const digits = data.replace(/\D+/g,'');
  if (!digits) return; // let normal flow
  e.preventDefault();
  // Fill starting at position i
  let idx = 0;
  for (let pos = i; pos < len.value && idx < digits.length; pos++) {
    boxes.value[pos] = digits[idx++] || '';
  }
  emit('update:modelValue', boxes.value.join(''));
  // Move focus to next empty or last
  const firstEmpty = boxes.value.findIndex((c)=> !c);
  const focusPos = firstEmpty === -1 ? len.value - 1 : firstEmpty;
  inputs.value[focusPos]?.focus();
  if (boxes.value.join('').length === len.value) emit('submit');
}
function onKey(i: number, e: KeyboardEvent) {
  if (e.key === 'Backspace' && !boxes.value[i] && i>0) { inputs.value[i-1]?.focus(); }
}
</script>
<template>
  <div class="code-entry" :class="{ disabled: disabled }">
  <input v-for="(_,i) in len" :key="i" ref="inputs" class="cell" inputmode="numeric" pattern="[0-9]*" maxlength="1"
       :disabled="disabled" :value="boxes[i]" @input="onInput(i,$event)" @keydown="onKey(i,$event)" @paste="onPaste($event,i)" />
  </div>
</template>
<style scoped>
.code-entry { display:flex; gap:.5rem; }
.cell { width:42px; height:52px; text-align:center; font-size:1.3rem; font-weight:600; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.15); border-radius:var(--radius-sm); }
.cell:focus { outline:2px solid var(--c-accent); }
.disabled .cell { opacity:.5; }
@media (max-width:480px){ .cell { width:38px; height:48px; } }
</style>
