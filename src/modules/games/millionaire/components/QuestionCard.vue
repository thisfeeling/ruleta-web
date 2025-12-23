<script setup lang="ts">
interface Props {
  question: {
    text: string
    difficulty: string
  }
}

const props = defineProps<Props>()
</script>

<template>
  <div class="question-card">
    <div class="question-card__badge">
      {{ props.question.difficulty }}
    </div>
    <h2 class="question-card__text">
      {{ props.question.text }}
    </h2>
  </div>
</template>

<style scoped>
.question-card {
  @apply relative bg-base-100 rounded-2xl shadow-2xl p-8;
  @apply max-w-3xl w-full;
}

.question-card__badge {
  @apply absolute top-4 right-4;
  @apply badge badge-primary;
}

.question-card__text {
  @apply text-2xl font-semibold text-center;
}
</style>
