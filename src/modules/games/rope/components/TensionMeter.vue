<template>
  <div class="tension-meter">0%</div>
</template>

<script setup lang="ts"></script>

<style scoped>
.tension-meter {
  width: 100%;
  height: 8px;
  background: var(--color-base-200);
  border-radius: 999px;
  overflow: hidden;
}
.tension-meter .bar {
  height: 100%;
  background: var(--color-primary);
  width: 50%;
}
</style>
