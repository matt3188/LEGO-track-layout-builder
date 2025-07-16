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
async function handlePasteLayout() {
  try {
    let clipboardText = '';
    
    // Try to read from clipboard
    if (navigator.clipboard && navigator.clipboard.readText) {
      clipboardText = await navigator.clipboard.readText();
    } else {
      // Fallback: prompt user to paste manually
      clipboardText = prompt('Paste the layout JSON data:') || '';
    }
    
    if (clipboardText.trim()) {
      loadLayout(clipboardText);
    } else {
      copyStatus.value = 'No data to paste';
      setTimeout(() => (copyStatus.value = ''), 2000);
    }
  } catch (err) {
    console.error('Failed to paste:', err);
    // Fallback: prompt user to paste manually
    const clipboardText = prompt('Paste the layout JSON data:') || '';
    if (clipboardText.trim()) {
      loadLayout(clipboardText);
    }
  }
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
    <canvas ref="canvas" id="trackCanvas" class="border border-gray-300 block"></canvas>
    
    <!-- Controls Panel -->
    <div class="fixed top-4 left-4 flex flex-col gap-2">
      <button 
        @click="handleAddStraight"
        class="px-4 py-2 border border-gray-300 rounded bg-white cursor-pointer transition-colors duration-200 hover:bg-gray-100"
      >
        ➕ Add Straight
      </button>
      <button 
        @click="handleAddCurve"
        class="px-4 py-2 border border-gray-300 rounded bg-white cursor-pointer transition-colors duration-200 hover:bg-gray-100"
      >
        ➕ Add Curve
      </button>
      <button 
        @click="handleEnableDeleteMode" 
        :class="[
          'px-4 py-2 border rounded cursor-pointer transition-colors duration-200',
          isDeleteMode 
            ? 'bg-red-500 text-white border-red-600' 
            : 'border-gray-300 bg-white hover:bg-gray-100'
        ]"
      >
        🗑️ Delete Mode
      </button>
      <button 
        @click="undoLastAction"
        class="px-4 py-2 border border-gray-300 rounded bg-white cursor-pointer transition-colors duration-200 hover:bg-gray-100"
      >
        ↩️ Undo
      </button>
      <button 
        @click="copyLayout"
        class="px-4 py-2 border border-gray-300 rounded bg-white cursor-pointer transition-colors duration-200 hover:bg-gray-100"
      >
        📋 Copy schema
      </button>
      <button 
        @click="handlePasteLayout"
        class="px-4 py-2 border border-gray-300 rounded bg-white cursor-pointer transition-colors duration-200 hover:bg-gray-100"
      >
        📄 Paste schema
      </button>
      <button 
        @click="clearPieces"
        class="px-4 py-2 border border-gray-300 rounded bg-white cursor-pointer transition-colors duration-200 hover:bg-gray-100"
      >
        ❌ Clear
      </button>
      <span class="text-sm text-gray-600">{{ copyStatus }}</span>
    </div>

    <!-- Help Button -->
    <button 
      @click="showHelp = true" 
      title="Show keyboard shortcuts"
      class="fixed bottom-4 right-4 w-10 h-10 rounded-full border-2 border-gray-800 bg-white text-xl font-bold cursor-pointer flex items-center justify-center shadow-lg transition-all duration-200 hover:bg-gray-800 hover:text-white hover:scale-110"
    >
      ?
    </button>

    <!-- Help Modal -->
    <HelpModal :show="showHelp" @close="closeHelp" />
  </div>
</template>
