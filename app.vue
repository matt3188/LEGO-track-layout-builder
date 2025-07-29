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

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

#trackCanvas {
  width: 100vw;
  height: 100vh;
  cursor: grab;
}
</style>
