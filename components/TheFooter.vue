<script setup lang="ts">
const footerLinks= computed(() => [
  {
    href: 'https://github.com/matt3188/LEGO-track-layout-builder',
    icon: 'mdi:github'
  },
  {
    href: 'https://www.instagram.com/legofanuk/',
    icon: 'mdi:instagram'
  },
  {
    href: 'https://coff.ee/legofanuk',
    icon: 'simple-icons:buymeacoffee'
  }
])
</script>

<template>
  <footer class="py-4">
    <div class="container mx-auto text-center">
      <ul class="flex justify-center">
        <li v-for="link in footerLinks" :key="link.href">
          <UButton 
            :to="link.href" 
            target="_blank" 
            rel="noopener noreferrer" 
            :icon="link.icon" 
            size="md" 
            color="neutral" 
            variant="ghost"
          />
        </li>
      </ul>
      <small>Made with ❤️ for the LEGO community.</small>
    </div>
  </footer>
</template>