<script setup lang="ts">
const isHomePage = useRoute().path === '/';
</script>

<template>
  <UApp class="h-screen w-screen overflow-hidden m-0 p-0">
    <div class="absolute top-4 right-4 z-10">
      <UButton v-if="!isHomePage" to="/" icon="mdi:home" color="ghost" />
      <ColorMode />
    </div>
    <NuxtPage />
  </UApp>
</template>
