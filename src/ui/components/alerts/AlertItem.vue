<template>
  <div
    :role="role"
    :class="[
      'alert',
      'alert-animated',
      'alert-' + props.type,
      { 'alert-vertical sm:alert-horizontal': props.vertical },
    ]"
    v-bind="attrs"
    @mouseenter="onPause"
    @mouseleave="onResume"
    tabindex="0"
    @focus="onPause"
    @blur="onResume"
  >
    <slot name="icon">
      <svg
        v-if="props.showIcon"
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 shrink-0 stroke-current"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          v-if="props.type === 'info'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <path
          v-else-if="props.type === 'success'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <path
          v-else-if="props.type === 'warning'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
        <path
          v-else-if="props.type === 'error'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </slot>

    <div class="flex-1">
      <slot name="title">
        <h3 v-if="props.title" class="font-bold">{{ props.title }}</h3>
      </slot>
      <slot>
        <p v-if="props.message" class="text-sm">{{ props.message }}</p>
      </slot>
    </div>

    <div v-if="$slots.actions" class="flex gap-2">
      <slot name="actions" />
    </div>

    <button
      v-if="props.closable"
      @click="close"
      class="btn btn-ghost btn-xs ml-2"
      aria-label="Close alert"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAttrs } from 'vue'

// Multi-word component name to satisfy eslint rule
defineOptions({ name: 'UiAlert' })

const props = defineProps<{
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message?: string
  vertical?: boolean
  closable?: boolean
  showIcon?: boolean
  role?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'pause'): void
  (e: 'resume'): void
}>()

const attrs = useAttrs()

function close() {
  emit('close')
}

function onPause() {
  emit('pause')
}

function onResume() {
  emit('resume')
}
</script>

<style scoped>
/* Ensure each alert has a small margin to keep them visually separated (works well during transitions) */
.alert {
  display: flex;
  /* ensure block layout */
  align-items: center;
  margin-block-end: 0.75rem;
  /* keeps vertical spacing between alerts */
}

/* Basic custom variants for the project */
.alert-dash {
  border-left-width: 4px;
  border-left-style: solid;
  padding-left: 0.75rem;
}

.alert-outline {
  background-color: transparent !important;
  box-shadow: none !important;
  border-width: 1px !important;
}

.alert-soft {
  background-color: transparent !important;
  --alert-bg: color-mix(in oklab, var(--color-base-100) 85%, var(--color-primary) 15%);
  padding: 0.75rem 1rem;
}

/* Variant color mapping for dashed border and outline */
.alert-dash.alert-info {
  border-left-color: var(--color-info);
}

.alert-dash.alert-success {
  border-left-color: var(--color-success);
}

.alert-dash.alert-warning {
  border-left-color: var(--color-warning);
}

.alert-dash.alert-error {
  border-left-color: var(--color-error);
}

.alert-outline.alert-info {
  border-color: var(--color-info);
  color: var(--color-info) !important;
}

.alert-outline.alert-success {
  border-color: var(--color-success);
  color: var(--color-success) !important;
}

.alert-outline.alert-warning {
  border-color: var(--color-warning);
  color: var(--color-warning) !important;
}

.alert-outline.alert-error {
  border-color: var(--color-error);
  color: var(--color-error) !important;
}

/* Soft: reduce color intensity and use text color as color */
.alert-soft.alert-info {
  background-color: color-mix(in oklab, var(--color-info) 12%, var(--color-base-100) 88%);
}

.alert-soft.alert-success {
  background-color: color-mix(in oklab, var(--color-success) 12%, var(--color-base-100) 88%);
}

.alert-soft.alert-warning {
  background-color: color-mix(in oklab, var(--color-warning) 12%, var(--color-base-100) 88%);
}

.alert-soft.alert-error {
  background-color: color-mix(in oklab, var(--color-error) 12%, var(--color-base-100) 88%);
}
</style>
