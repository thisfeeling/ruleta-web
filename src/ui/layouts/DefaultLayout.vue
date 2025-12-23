<script setup lang="ts">
import LanguageSwitcher from '@/ui/components/LanguageSwitcher.vue'
import VersionDisplay from '@/ui/components/hud/VersionDisplay.vue'
</script>

<template>
  <div class="default-layout min-h-screen flex flex-col">
    <header class="default-layout__header flex justify-between items-center p-4 bg-base-200">
      <h1 class="default-layout__title text-2xl font-bold">Ruleta Familiar</h1>
      <div class="flex items-center gap-3">
        <VersionDisplay />
        <LanguageSwitcher />
      </div>
    </header>

    <main class="default-layout__main flex-1">
      <slot />
    </main>

    <footer class="default-layout__footer text-center py-4 text-sm text-base-content/60">
      <p>&copy; 2025 Ruleta Familiar</p>
    </footer>
  </div>
</template>

<style scoped></style>
