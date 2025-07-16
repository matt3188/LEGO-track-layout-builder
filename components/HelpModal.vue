<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" @click="$emit('close')">
    <div class="bg-white rounded-lg max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" @click.stop>
      <div class="flex justify-between items-center p-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-800 m-0">Keyboard Shortcuts</h2>
        <button 
          class="bg-transparent border-none text-xl cursor-pointer text-gray-600 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors duration-200" 
          @click="$emit('close')"
        >
          ×
        </button>
      </div>
      
      <div class="p-6">
        <div class="mb-8">
          <h3 class="text-lg text-gray-700 mb-4 pb-2 border-b border-gray-200 m-0">Track Pieces</h3>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">S</kbd>
            <span class="flex-1 text-gray-600">Add straight track piece</span>
          </div>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">C</kbd>
            <span class="flex-1 text-gray-600">Add curved track piece</span>
          </div>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">D</kbd>
            <span class="flex-1 text-gray-600">Enter delete mode</span>
          </div>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">Escape</kbd>
            <span class="flex-1 text-gray-600">Clear selection / Exit mode</span>
          </div>
        </div>

        <div class="mb-8">
          <h3 class="text-lg text-gray-700 mb-4 pb-2 border-b border-gray-200 m-0">Rotation</h3>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">R</kbd>
            <span class="flex-1 text-gray-600">Rotate piece clockwise</span>
          </div>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">Shift</kbd> + <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">R</kbd>
            <span class="flex-1 text-gray-600">Rotate piece counter-clockwise</span>
          </div>
        </div>

        <div class="mb-8">
          <h3 class="text-lg text-gray-700 mb-4 pb-2 border-b border-gray-200 m-0">View Controls</h3>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">Cmd/Ctrl</kbd> + <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">0</kbd>
            <span class="flex-1 text-gray-600">Reset zoom and center view</span>
          </div>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">Mouse Wheel</kbd>
            <span class="flex-1 text-gray-600">Zoom in/out</span>
          </div>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">Click + Drag</kbd>
            <span class="flex-1 text-gray-600">Pan the view</span>
          </div>
        </div>

        <div class="mb-8">
          <h3 class="text-lg text-gray-700 mb-4 pb-2 border-b border-gray-200 m-0">Actions</h3>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">Cmd/Ctrl</kbd> + <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">Z</kbd>
            <span class="flex-1 text-gray-600">Undo last action</span>
          </div>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">Click</kbd>
            <span class="flex-1 text-gray-600">Place piece / Delete piece (in delete mode)</span>
          </div>
          <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-b-0">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">Click + Drag</kbd>
            <span class="flex-1 text-gray-600">Move existing piece</span>
          </div>
        </div>

        <div class="mb-0">
          <h3 class="text-lg text-gray-700 mb-4 pb-2 border-b border-gray-200 m-0">Help</h3>
          <div class="flex items-center gap-4 py-2">
            <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">?</kbd>
            <span class="flex-1 text-gray-600">Show/hide this help dialog</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close']);
</script>
