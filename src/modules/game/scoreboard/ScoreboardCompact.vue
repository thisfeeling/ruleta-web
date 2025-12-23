<template>
  <div class="scoreboard-compact">Scoreboard</div>
</template>

<script setup lang="ts"></script>

<style scoped>
.scoreboard-compact {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: var(--color-base-200);
  border-radius: 0.5rem;
}
.score-item {
  font-weight: 700;
}
</style>
