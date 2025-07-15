<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const canvas = ref(null);
const copyStatus = ref('');

const {
  addStraight,
  addCurve,
  undoLastAction,
  copyLayout,
  updateRotationDisplay,
  handleKeyDown,
  initCanvas,
  cleanup,
  historyStack,
  clearPieces,
} = useTrackEditor({
  canvas,
  copyStatus,
});

onMounted(() => {
  initCanvas();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div>
    <canvas ref="canvas" id="trackCanvas"></canvas>
    <div class="controls">
      <button @click="addStraight">➕ Add Straight</button>
      <button @click="addCurve">➕ Add Curve</button>
      <button @click="undoLastAction">↩️ Undo</button>
      <button @click="copyLayout">📋 Copy schema</button>
      <button @click="clearPieces">❌ Clear</button>
      <span>{{ copyStatus }}</span>
    </div>
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
</style>
