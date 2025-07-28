<script lang="ts" setup>
const colorMode = useColorMode()
colorMode.preference = 'light'
const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(_isDark) {
    colorMode.preference = _isDark ? 'dark' : 'light'
  }
})
</script>

<template>
  <UButton
    class="cursor-pointer"
    :icon="isDark ? 'mdi:moon-and-stars' : 'mdi:white-balance-sunny'"
    color="neutral"
    variant="ghost"
    @click="isDark = !isDark"
  />
</template>
