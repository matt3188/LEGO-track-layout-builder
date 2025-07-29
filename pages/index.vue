<template>
  <div class="flex flex-col m-auto h-screen">
  <div class="m-auto flex flex-col items-center justify-center">
    <h1 class="text-3xl font-bold text-center">Welcome to the<br />LEGO Train Track Layout Builder</h1>
    <p>This is a passion project aimed at helping LEGO enthusiasts design their own train track layouts.</p>
    <div class="flex flex-col justify-center items-center space-y-2 mt-4">
      <p>Get started by creating your own custom track layout.</p>
      <UButton to="track-editor" color="secondary">Go to Track Editor</UButton>
    </div>
  </div>
  <TheFooter />
</div>
</template>