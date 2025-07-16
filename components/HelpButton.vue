<script setup lang="ts">
interface Emits {
  'click': [];
}

defineEmits<Emits>();
</script>

<template>
  <button 
    @click="$emit('click')"
    title="Show keyboard shortcuts"
    class="fixed bottom-4 right-4 w-10 h-10 rounded-full border-2 border-gray-800 bg-white text-xl font-bold cursor-pointer flex items-center justify-center shadow-lg transition-all duration-200 hover:bg-gray-800 hover:text-white hover:scale-110"
  >
    ?
  </button>
</template>
