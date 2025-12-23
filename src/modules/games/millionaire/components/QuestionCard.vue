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
  position: relative;
  background: var(--color-base-100, #fff);
  border-radius: 1rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  max-width: 56rem;
  width: 100%;
}

.question-card__badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background: var(--color-primary, #3b82f6);
  color: #fff;
  font-weight: 600;
}

.question-card__text {
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
}
</style>
