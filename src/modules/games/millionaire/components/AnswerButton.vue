<script setup lang="ts">
interface Props {
  text: string
  index: number
  selected: boolean
  isCorrect: boolean
  isWrong: boolean
  disabled: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [index: number]
}>()

const labels = ['A', 'B', 'C', 'D']
</script>

<template>
  <button
    class="answer-button"
    :class="{
      'answer-button--selected': props.selected && !props.isCorrect && !props.isWrong,
      'answer-button--correct': props.isCorrect,
      'answer-button--wrong': props.isWrong,
    }"
    :disabled="props.disabled"
    @click="emit('select', props.index)"
  >
    <span class="answer-button__label">{{ labels[props.index] }}</span>
    <span class="answer-button__text">{{ props.text }}</span>
  </button>
</template>

<style scoped>
.answer-button {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  box-sizing: border-box;
  min-height: 80px;
  width: 100%;
  background: transparent;
  border: 2px solid rgba(0, 0, 0, 0.06);
  border-radius: 0.5rem;
  text-align: left;
  transition:
    transform 0.15s ease,
    background-color 0.15s ease;
}

.answer-button:not(:disabled):hover {
  transform: scale(1.05);
}

.answer-button--selected {
  background: var(--color-primary, #3b82f6);
  color: white;
}

.answer-button--correct {
  background: #16a34a;
  color: white;
}

.answer-button--wrong {
  background: #ef4444;
  color: white;
}

.answer-button__label {
  font-size: 1.875rem;
  font-weight: 700;
}

.answer-button__text {
  font-size: 1rem;
  flex: 1 1 auto;
}
</style>
