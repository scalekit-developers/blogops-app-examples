<script setup lang="ts">
const { isAuthenticated, user, logout } = useAuth();
</script>
<template>
  <div class="auth-status" :class="{ on: isAuthenticated }">
    <template v-if="isAuthenticated">
      <span class="user">{{ user?.email }}</span>
      <button class="btn outline mini" @click="logout">Logout</button>
    </template>
    <template v-else>
      <NuxtLink class="btn outline mini" to="/login">Login</NuxtLink>
    </template>
  </div>
</template>
<style scoped>
.auth-status { display:flex; align-items:center; gap:.5rem; }
.user { font-size:.7rem; background:rgba(255,255,255,.07); padding:.35rem .6rem; border-radius:var(--radius-sm); letter-spacing:.5px; }
.mini { padding:.35rem .65rem; font-size:.65rem; }
</style>
