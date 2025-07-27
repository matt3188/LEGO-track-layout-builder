<script setup lang="ts">
interface Props {
  show?: boolean;
}

interface Emits {
  'close': [];
}

defineProps<Props>();
defineEmits<Emits>();

const shortcuts = [
  {
    title: 'Track Pieces',
    items: [
      { keys: ['S'], description: 'Add straight track piece' },
      { keys: ['C'], description: 'Add curved track piece' },
      { keys: ['D'], description: 'Enter delete mode' },
      { keys: ['Escape'], description: 'Clear selection / Exit mode' }
    ]
  },
  {
    title: 'Rotation',
    items: [
      { keys: ['F'], description: 'Flip piece horizontally' },
      { keys: ['R'], description: 'Rotate piece clockwise' },
      { keys: ['Shift', 'R'], description: 'Rotate piece counter-clockwise' }
    ]
  },
  {
    title: 'View Controls',
    items: [
      { keys: ['Cmd/Ctrl', '0'], description: 'Reset zoom and center view' },
      { keys: ['Mouse Wheel'], description: 'Zoom in/out' },
      { keys: ['Click + Drag'], description: 'Pan the view' }
    ]
  },
  {
    title: 'Actions',
    items: [
      { keys: ['Cmd/Ctrl', 'Z'], description: 'Undo last action' },
      { keys: ['Click'], description: 'Place piece / Delete piece (in delete mode)' },
      { keys: ['Click + Drag'], description: 'Move existing piece' }
    ]
  },
  {
    title: 'Help',
    items: [
      { keys: ['?'], description: 'Show/hide this help dialog' }
    ]
  }
];
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50" @click="$emit('close')">
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
        <div v-for="(section, index) in shortcuts" :key="section.title" :class="{ 'mb-8': index < shortcuts.length - 1, 'mb-0': index === shortcuts.length - 1 }">
          <h3 class="text-lg text-gray-700 mb-4 pb-2 border-b border-gray-200 m-0">{{ section.title }}</h3>
          <div v-for="(shortcut, shortcutIndex) in section.items" :key="shortcutIndex" :class="{ 'border-b border-gray-50': shortcutIndex < section.items.length - 1 }" class="flex items-center gap-4 py-2">
            <div class="flex items-center gap-1">
              <template v-for="(key, keyIndex) in shortcut.keys" :key="keyIndex">
                <span v-if="keyIndex > 0" class="mx-1">+</span>
                <kbd class="bg-gray-100 border border-gray-300 rounded px-2 py-1 font-mono text-sm min-w-8 text-center shadow-sm">
                  {{ key }}
                </kbd>
              </template>
            </div>
            <span class="flex-1 text-gray-600">{{ shortcut.description }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>