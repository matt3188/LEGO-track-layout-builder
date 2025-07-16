<script setup lang="ts">
interface Props {
  show: boolean;
  straightCount: number;
  curveCount: number;
}

interface Emits {
  'update:straightCount': [value: number];
  'update:curveCount': [value: number];
  'generate': [];
  'close': [];
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
            :value="straightCount"
            @input="$emit('update:straightCount', parseInt($event.target.value))"
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
            :value="curveCount"
            @input="$emit('update:curveCount', parseInt($event.target.value))"
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
          @click="$emit('generate')"
          class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
        >
          Generate Layout
        </button>
        <button 
          @click="$emit('close')"
          class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>