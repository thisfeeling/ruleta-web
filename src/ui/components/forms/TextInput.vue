<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    type?: string
    error?: string | null
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: '',
    type: 'text',
    error: null,
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const inputClasses = computed(() => {
  return ['input input-bordered w-full', props.error ? 'input-error' : '']
})

function onInput(e: Event) {
  const t = e.target as HTMLInputElement
  emit('update:modelValue', t.value)
}
</script>

<template>
  <div>
    <input
      :type="props.type"
      :placeholder="props.placeholder"
      :class="inputClasses"
      :value="props.modelValue"
      @input="onInput"
      :disabled="props.disabled"
    />
    <p v-if="props.error" class="text-xs text-error mt-1">{{ props.error }}</p>
  </div>
</template>

<style scoped>
/* rely on daisyUI / tailwind utility classes */
</style>
