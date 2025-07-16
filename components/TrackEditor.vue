<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const canvas = ref(null);
const copyStatus = ref('');
const showHelp = ref(false);

const {
  addStraight,
  addCurve,
  enableDeleteMode,
  undoLastAction,
  copyLayout,
  updateRotationDisplay,
  handleKeyDown,
  initCanvas,
  cleanup,
  historyStack,
  clearPieces,
  isDeleteMode,
} = useTrackEditor({
  canvas,
  copyStatus,
});

function handleGlobalKeyDown(e) {
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

function handleAddStraight() {
  addStraight();
}

function handleAddCurve() {
  addCurve();
}

function handleEnableDeleteMode() {
  enableDeleteMode();
}

function closeHelp() {
  showHelp.value = false;
}

onMounted(() => {
  initCanvas();
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
});
</script>

<template>
  <div>
    <canvas ref="canvas" id="trackCanvas"></canvas>
    
    <!-- Controls Panel -->
    <div class="controls">
      <button @click="handleAddStraight">➕ Add Straight</button>
      <button @click="handleAddCurve">➕ Add Curve</button>
      <button @click="handleEnableDeleteMode" :class="{ active: isDeleteMode }">🗑️ Delete Mode</button>
      <button @click="undoLastAction">↩️ Undo</button>
      <button @click="copyLayout">📋 Copy schema</button>
      <button @click="clearPieces">❌ Clear</button>
      <span>{{ copyStatus }}</span>
    </div>

    <!-- Help Button -->
    <button class="help-button" @click="showHelp = true" title="Show keyboard shortcuts">
      ?
    </button>

    <!-- Help Modal -->
    <HelpModal :show="showHelp" @close="closeHelp" />
  </div>
</template>

<style scoped>
canvas {
  border: 1px solid #ccc;
  display: block;
}

.controls {
  position: fixed;
  top: 1rem;
  left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.controls button {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.controls button:hover {
  background: #f0f0f0;
}

.controls button.active {
  background: #ff6b6b;
  color: white;
  border-color: #ff5252;
}

.help-button {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #333;
  background: white;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.help-button:hover {
  background: #333;
  color: white;
  transform: scale(1.1);
}
</style>
