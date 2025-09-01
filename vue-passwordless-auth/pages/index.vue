<script setup lang="ts">
const auth = useAuth();
</script>
<template>
  <div>
    <h2>Home</h2>
  <p v-if="!auth.isAuthenticated">Use the Login link in the header to start passwordless sign in.</p>
  <p v-else>Go to your <NuxtLink to="/dashboard">Dashboard</NuxtLink>.</p>
  </div>
</template>
