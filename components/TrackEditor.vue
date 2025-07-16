<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';

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
  historyStack,
  clearPieces,
  isDeleteMode,
} = useTrackEditor({
  canvas,
  copyStatus,
});

// Define control buttons configuration
const controlButtons = computed(() => [
  {
    label: '➕ Add Straight',
    action: addStraight,
    class: 'button-default'
  },
  {
    label: '➕ Add Curve',
    action: addCurve,
    class: 'button-default'
  },
  {
    label: '🗑️ Delete Mode',
    action: enableDeleteMode,
    class: isDeleteMode.value ? 'button-delete-active' : 'button-default'
  },
  {
    label: '↩️ Undo',
    action: undoLastAction,
    class: 'button-default'
  },
  {
    label: '📋 Copy schema',
    action: copyLayout,
    class: 'button-default'
  },
  {
    label: '📄 Paste schema',
    action: () => handlePasteLayout(),
    class: 'button-default'
  },
  {
    label: '❌ Clear',
    action: clearPieces,
    class: 'button-default'
  },
  {
    label: '🤖 Auto Layout',
    action: () => showAutoLayout.value = true,
    class: 'button-primary'
  }
]);

// Button style classes
const buttonClasses = {
  'button-default': 'px-4 py-2 border border-gray-300 rounded bg-white cursor-pointer transition-colors duration-200 hover:bg-gray-100',
  'button-delete-active': 'px-4 py-2 border rounded cursor-pointer transition-colors duration-200 bg-red-500 text-white border-red-600',
  'button-primary': 'px-4 py-2 border border-gray-300 rounded bg-blue-500 text-white cursor-pointer transition-colors duration-200 hover:bg-blue-600'
};

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

function handleGenerateAutoLayout() {
  generateAutoLayout(straightCount.value, curveCount.value);
  showAutoLayout.value = false;
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
        v-for="button in controlButtons"
        :key="button.label"
        @click="button.action"
        :class="buttonClasses[button.class]"
      >
        {{ button.label }}
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

    <!-- Auto Layout Modal -->
    <div v-if="showAutoLayout" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 class="text-xl font-bold mb-4">🤖 Auto Layout Generator</h2>
        <p class="text-gray-600 mb-4">Generate a connected track layout automatically. Specify how many pieces you want to use:</p>
        
        <div class="space-y-4">
          <div>
            <label for="straightCount" class="block text-sm font-medium text-gray-700 mb-1">
              Straight Pieces:
            </label>
            <input 
              id="straightCount"
              v-model.number="straightCount" 
              type="number" 
              min="0" 
              max="50" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label for="curveCount" class="block text-sm font-medium text-gray-700 mb-1">
              Curve Pieces:
            </label>
            <input 
              id="curveCount"
              v-model.number="curveCount" 
              type="number" 
              min="0" 
              max="50" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div class="text-sm text-gray-500">
            <p>💡 Tip: 16 curves make a perfect circle!</p>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button 
            @click="handleGenerateAutoLayout"
            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
          >
            Generate Layout
          </button>
          <button 
            @click="showAutoLayout = false"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Help Modal -->
    <HelpModal :show="showHelp" @close="() => showHelp = false" />
  </div>
</template>
