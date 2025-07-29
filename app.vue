<template>
  <UApp class="h-screen w-screen overflow-hidden m-0 p-0">
    <ColorMode class="absolute top-4 right-4 z-10" />
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
