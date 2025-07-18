<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import ControlPanel from './ControlPanel.vue';
import AutoLayoutModal from './AutoLayoutModal.vue';
import HelpButton from './HelpButton.vue';
import HelpModal from './HelpModal.vue';

const canvas = ref(null);
const copyStatus = ref('');
const showHelp = ref(false);

// Auto-layout generation state
const straightCount = ref(8);
const curveCount = ref(8);
const showAutoLayout = ref(false);

const {
  addStraight,
  addCurve,
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
} = useTrackEditor({
  canvas,
  copyStatus,
});

// Use clipboard composable
const { handlePaste } = useClipboard(copyStatus);

function handleGlobalKeyDown(e: KeyboardEvent) {
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
    <canvas ref="canvas" id="trackCanvas" class="border border-gray-300 block"></canvas>
    
    <ControlPanel
      :copy-status="copyStatus"
      :is-delete-mode="isDeleteMode"
      :on-add-straight="addStraight"
      :on-add-curve="addCurve"
      :on-enable-delete-mode="enableDeleteMode"
      :on-undo="undoLastAction"
      :on-copy="copyLayout"
      :on-paste="() => handlePaste(loadLayout)"
      :on-clear="clearPieces"
      :on-show-auto-layout="() => showAutoLayout = true"
    />

    <HelpButton @click="showHelp = true" />

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
