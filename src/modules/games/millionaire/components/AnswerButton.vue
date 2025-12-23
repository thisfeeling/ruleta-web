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
  @apply btn btn-lg btn-outline h-auto min-h-80px;
  @apply flex items-center gap-4 p-4;
  @apply text-left transition-all;
}

.answer-button:not(:disabled):hover {
  @apply scale-105;
}

.answer-button--selected {
  @apply btn-primary;
}

.answer-button--correct {
  @apply btn-success;
}

.answer-button--wrong {
  @apply btn-error;
}

.answer-button__label {
  @apply text-3xl font-bold;
}

.answer-button__text {
  @apply text-base flex-1;
}
</style>
