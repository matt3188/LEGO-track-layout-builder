<script setup lang="ts">
interface Emits {
  'click': [];
}

defineEmits<Emits>();
</script>

<template>
  <div class="fixed bottom-4 right-4">
    <UButton 
      title="Show keyboard shortcuts"
      class="text-black  w-10 h-10 rounded-full border-1 border-gray-800 bg-white text-xl font-bold cursor-pointer flex items-center justify-center shadow-lg transition-all duration-200 hover:bg-gray-800 hover:text-white hover:scale-110"
      @click="$emit('click')"
    >
      ?
    </UButton>
  </div>
</template>
