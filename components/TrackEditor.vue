<script setup lang="ts">
const canvas = ref(null);
const copyStatus = ref('');
const showHelp = ref(false);
const showHud = ref(true);

// Auto-layout generation state
const straightCount = ref(8);
const curveCount = ref(8);
const showAutoLayout = ref(false);

const {
  addStraight,
  addCurve,
  addSwitchLeft,
  addSwitchRight,
  enableDeleteMode,
  undoLastAction,
  copyLayout,
  loadLayout,
  generateAutoLayout,
  handleKeyDown,
  initCanvas,
  cleanup,
  clearPieces,
  isDeleteMode,
  showConnectionPoints,
  pieceCounts,
} = useTrackEditor({
  canvas,
  copyStatus,
});


// Use clipboard composable
const { handlePaste } = useClipboard(copyStatus);

function handleGlobalKeyDown(e: KeyboardEvent) {
  // Handle HUD toggle
  if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    showHud.value = !showHud.value;
    return;
  }

  // Handle help modal toggle
  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    showHelp.value = !showHelp.value;
    return;
  }
  
  // Handle escape key for help modal
  if (e.key === 'Escape' && showHelp.value) {
    showHelp.value = false;
    return;
  }
  
  // Pass other keys to the track editor
  if (!showHelp.value) {
    handleKeyDown(e);
  }
}

function handleGenerateAutoLayout() {
  generateAutoLayout(straightCount.value, curveCount.value);
  showAutoLayout.value = false;
}

onMounted(() => {
  initCanvas();
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  cleanup();
  window.removeEventListener('keydown', handleGlobalKeyDown);
});
</script>

<template>
  <div>
    <canvas ref="canvas" class="w-screen h-screen"></canvas>

    <transition
      enter-from-class="-translate-x-[calc(100%)] opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      enter-active-class="transition-all duration-300 ease-in-out"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="-translate-x-[calc(100%)] opacity-0"
      leave-active-class="transition-all duration-300 ease-in-out"
    >
      <ControlPanel
        v-if="showHud"
        :copy-status="copyStatus"
        :is-delete-mode="isDeleteMode"
        :piece-counts="pieceCounts"
        :on-add-straight="addStraight"
        :on-add-curve="addCurve"
        :on-add-switch-left="addSwitchLeft"
        :on-add-switch-right="addSwitchRight"
        :on-enable-delete-mode="enableDeleteMode"
        :on-undo="undoLastAction"
        :on-copy="copyLayout"
        :on-paste="() => handlePaste(loadLayout)"
        :on-clear="clearPieces"
        :on-show-auto-layout="() => showAutoLayout = true"
      />
    </transition>

    <transition
      enter-from-class="translate-x-[calc(100%)] opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      enter-active-class="transition-all duration-300 ease-in-out"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-[calc(100%)] opacity-0"
      leave-active-class="transition-all duration-300 ease-in-out"
    >
      <HelpButton v-if="showHud" @click="showHelp = true" />
    </transition>

    <AutoLayoutModal 
      :show="showAutoLayout"
      v-model:straight-count="straightCount"
      v-model:curve-count="curveCount"
      @generate="handleGenerateAutoLayout"
      @close="showAutoLayout = false"
    />

    <HelpModal :show="showHelp" @close="() => showHelp = false" />
  </div>
</template>
