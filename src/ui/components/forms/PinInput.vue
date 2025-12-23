<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = withDefaults(defineProps<{ modelValue?: string }>(), {
  modelValue: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const inputs = ref<string[]>(['', '', '', ''])
const inputRefs = ref<HTMLInputElement[]>([])

onMounted(() => {
  if (props.modelValue && props.modelValue.length === 4) {
    inputs.value = props.modelValue.split('')
  }
})

watch(inputs, (val) => {
  const joined = val.join('')
  emit('update:modelValue', joined)
})

function setRef(el: HTMLInputElement) {
  if (el && !inputRefs.value.includes(el)) inputRefs.value.push(el)
}

function handleInput(index: number) {
  const value = inputs.value[index] || ''
  if (value.length > 1) inputs.value[index] = value.slice(-1)

  if ((inputs.value[index] ?? '').length === 1 && index < 3) {
    inputRefs.value[index + 1]?.focus()
  }
}

function handleKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !inputs.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus()
  }
}
</script>

<template>
  <div class="pin-input flex gap-3">
    <input
      v-for="(_, index) in inputs"
      :key="index"
      ref="setRef"
      v-model="inputs[index]"
      type="text"
      inputmode="numeric"
      maxlength="1"
      class="input input-bordered input-lg w-16 text-center text-2xl font-mono"
      @input="handleInput(index)"
      @keydown="handleKeydown($event, index)"
    />
  </div>
</template>

<style scoped></style>
