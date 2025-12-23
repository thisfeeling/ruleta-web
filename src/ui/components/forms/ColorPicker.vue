<script setup lang="ts">
import { ref } from 'vue'

const colors = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
]

const props = withDefaults(defineProps<{ modelValue?: string }>(), {
  modelValue: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function select(color: string) {
  emit('update:modelValue', color)
}
</script>

<template>
  <div class="color-picker flex gap-3 flex-wrap">
    <div
      v-for="c in colors"
      :key="c"
      class="w-10 h-10 rounded-full cursor-pointer transition-transform hover:scale-110 ring-2"
      :class="{ 'ring-primary ring-offset-2': c === props.modelValue }"
      :style="{ backgroundColor: c }"
      @click="select(c)"
      role="button"
      :aria-pressed="c === props.modelValue"
    />
  </div>
</template>

<style scoped></style>
