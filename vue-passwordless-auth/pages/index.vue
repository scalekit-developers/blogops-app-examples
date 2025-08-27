<script setup lang="ts">
const { isAuthenticated } = useAuth();
</script>
<template>
  <div>
    <h2>Home</h2>
    <p v-if="!isAuthenticated">Use the Login link in the header to start passwordless sign in.</p>
    <p v-else>Go to your <NuxtLink to="/dashboard">Dashboard</NuxtLink>.</p>
  </div>
</template>
