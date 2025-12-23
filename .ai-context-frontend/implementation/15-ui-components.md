# 15 - UI Components & Layouts

**Status**: [x] Completed

---

## 📋 Overview

Componentes reutilizables UI y layouts para toda la aplicación.

---

## 🎯 Objectives

- [x] Crear componentes de alertas
- [x] Crear componentes de botones
- [x] Crear componentes de formularios
- [x] Crear componentes HUD
- [x] Crear componentes de modales
- [x] Crear layouts (Default, Game)

---

## 📁 Files to Create

```
src/ui/
├── components/
│   ├── alerts/
│   │   ├── AlertContainer.vue
│   │   └── AlertItem.vue
│   ├── buttons/
│   │   ├── PrimaryButton.vue
│   │   ├── SecondaryButton.vue
│   │   └── IconButton.vue
│   ├── forms/
│   │   ├── TextInput.vue
│   │   ├── ColorPicker.vue
│   │   └── PinInput.vue
│   ├── hud/
│   │   ├── TimerItem.vue
│   │   ├── ProgressBar.vue
│   │   └── StatusBadge.vue
│   ├── modals/
│   │   ├── ModalContainer.vue
│   │   ├── ConfirmModal.vue
│   │   └── InfoModal.vue
│   └── screens/
│       ├── LoadingScreen.vue
│       └── ErrorScreen.vue
│
└── layouts/
    ├── DefaultLayout.vue
    └── GameLayout.vue
```

---

## 🔧 Implementation

### 1. Alert System

#### AlertContainer.vue

```vue
<script setup lang="ts">
import { useUIStore } from '@/modules/core/stores/ui.store'
import AlertItem from './AlertItem.vue'

const uiStore = useUIStore()
</script>

<template>
  <div class="alert-container">
    <TransitionGroup name="alert">
      <AlertItem
        v-for="alert in uiStore.alerts"
        :key="alert.id"
        :alert="alert"
        @dismiss="uiStore.dismissAlert(alert.id)"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.alert-container {
  @apply fixed top-20 right-4 z-100;
  @apply flex flex-col gap-3;
  @apply max-w-md;
}

.alert-enter-active,
.alert-leave-active {
  transition: all 0.3s ease;
}

.alert-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.alert-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
```

#### AlertItem.vue

```vue
<script setup lang="ts">
import type { Alert } from '@/modules/core/stores/ui.store'

interface Props {
  alert: Alert
}

defineProps<Props>()
const emit = defineEmits<{ dismiss: [] }>()

const alertClasses = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
}
</script>

<template>
  <div class="alert" :class="alertClasses[alert.type]">
    <span>{{ alert.message }}</span>
    <div v-if="alert.action" class="alert-action">
      <button class="btn btn-sm" @click="alert.action.callback">
        {{ alert.action.label }}
      </button>
    </div>
    <button class="btn btn-sm btn-circle btn-ghost" @click="emit('dismiss')">✕</button>
  </div>
</template>

<style scoped>
.alert {
  @apply shadow-lg;
}

.alert-action {
  @apply flex-1 flex justify-end;
}
</style>
```

**Checklist**:

- [x] Create AlertContainer
- [x] Create AlertItem with types (success, error, warning, info)
- [x] Add enter/leave animations
- [x] Support action buttons
- [x] Test with UI store

---

### 2. Buttons

#### PrimaryButton.vue

```vue
<script setup lang="ts">
interface Props {
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false,
  size: 'md',
})
</script>

<template>
  <button
    class="btn btn-primary"
    :class="[`btn-${size}`, { loading }]"
    :disabled="disabled || loading"
  >
    <slot />
  </button>
</template>
```

**Checklist**:

- [x] Create button variants (Primary, Secondary, IconButton)
- [x] Support sizes (sm, md, lg)
- [x] Support loading state
- [x] Support disabled state

---

### 3. Forms

#### ColorPicker.vue

```vue
<script setup lang="ts">
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

const modelValue = defineModel<string>()
</script>

<template>
  <div class="color-picker">
    <div
      v-for="color in colors"
      :key="color"
      class="color-picker__option"
      :class="{ 'color-picker__option--selected': modelValue === color }"
      :style="{ backgroundColor: color }"
      @click="modelValue = color"
    />
  </div>
</template>

<style scoped>
.color-picker {
  @apply flex gap-3 flex-wrap;
}

.color-picker__option {
  @apply w-12 h-12 rounded-full cursor-pointer;
  @apply transition-transform hover:scale-110;
  @apply ring-2 ring-transparent;
}

.color-picker__option--selected {
  @apply ring-primary ring-offset-2;
}
</style>
```

#### PinInput.vue

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

const modelValue = defineModel<string>()
const inputs = ref<string[]>(['', '', '', ''])
const inputRefs = ref<HTMLInputElement[]>([])

function handleInput(index: number) {
  const value = inputs.value[index]

  if (value.length === 1 && index < 3) {
    inputRefs.value[index + 1]?.focus()
  }

  modelValue.value = inputs.value.join('')
}

function handleKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Backspace' && !inputs.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus()
  }
}
</script>

<template>
  <div class="pin-input">
    <input
      v-for="(_, index) in inputs"
      :key="index"
      ref="inputRefs"
      v-model="inputs[index]"
      type="text"
      inputmode="numeric"
      maxlength="1"
      class="pin-input__digit"
      @input="handleInput(index)"
      @keydown="handleKeydown($event, index)"
    />
  </div>
</template>

<style scoped>
.pin-input {
  @apply flex gap-3;
}

.pin-input__digit {
  @apply input input-bordered input-lg w-16 text-center text-2xl font-mono;
}
</style>
```

**Checklist**:

- [x] Create TextInput with validation
- [x] Create ColorPicker with preset colors
- [x] Create PinInput for 4-digit PIN
- [x] Add error states
- [x] Test form components

---

### 4. HUD Components

#### TimerItem.vue

```vue
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  seconds: number
  maxSeconds?: number
  warning?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxSeconds: 60,
  warning: 10,
})

const progress = computed(() => (props.seconds / props.maxSeconds) * 100)
const isWarning = computed(() => props.seconds <= props.warning)
const minutes = computed(() => Math.floor(props.seconds / 60))
const remainingSeconds = computed(() => props.seconds % 60)
</script>

<template>
  <div class="timer" :class="{ 'timer--warning': isWarning }">
    <div class="timer__display">
      {{ minutes }}:{{ remainingSeconds.toString().padStart(2, '0') }}
    </div>
    <div class="timer__bar">
      <div class="timer__progress" :style="{ width: `${progress}%` }" />
    </div>
  </div>
</template>

<style scoped>
.timer {
  @apply flex flex-col items-center gap-2;
}

.timer__display {
  @apply text-3xl font-mono font-bold;
}

.timer--warning .timer__display {
  @apply text-error animate-pulse;
}

.timer__bar {
  @apply w-32 h-2 bg-base-300 rounded-full overflow-hidden;
}

.timer__progress {
  @apply h-full bg-primary transition-all duration-1000;
}

.timer--warning .timer__progress {
  @apply bg-error;
}
</style>
```

**Checklist**:

- [x] Create Timer component
- [x] Create ProgressBar component
- [x] Create StatusBadge component
- [x] Support warning states
- [x] Test with different values

---

### 5. Modals

#### ModalContainer.vue

```vue
<script setup lang="ts">
import { useUIStore } from '@/modules/core/stores/ui.store'

const uiStore = useUIStore()
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="modal">
      <div
        v-for="modal in uiStore.modals"
        :key="modal.id"
        class="modal modal-open"
        @click.self="modal.persistent ? null : uiStore.closeModal(modal.id)"
      >
        <div class="modal-box">
          <component :is="modal.component" v-bind="modal.props" />
        </div>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
```

**Checklist**:

- [x] Create ModalContainer with teleport
- [x] Support persistent modals (no close on backdrop click)
- [x] Create ConfirmModal
- [x] Create InfoModal
- [x] Add animations

---

### 6. Layouts

#### DefaultLayout.vue

```vue
<script setup lang="ts">
import LanguageSwitcher from '@/ui/components/LanguageSwitcher.vue'
</script>

<template>
  <div class="default-layout">
    <header class="default-layout__header">
      <h1 class="default-layout__title">Ruleta Familiar</h1>
      <LanguageSwitcher />
    </header>

    <main class="default-layout__main">
      <slot />
    </main>

    <footer class="default-layout__footer">
      <p>&copy; 2025 Ruleta Familiar</p>
    </footer>
  </div>
</template>

<style scoped>
.default-layout {
  @apply min-h-screen flex flex-col;
}

.default-layout__header {
  @apply flex justify-between items-center p-4;
  @apply bg-base-200;
}

.default-layout__title {
  @apply text-2xl font-bold;
}

.default-layout__main {
  @apply flex-1;
}

.default-layout__footer {
  @apply text-center py-4 text-sm text-base-content/60;
}
</style>
```

#### GameLayout.vue

```vue
<script setup lang="ts">
import PlayerHUB from '@/modules/player/PlayerHUB.vue'
import ScoreboardCompact from '@/modules/game/scoreboard/ScoreboardCompact.vue'
import ChatBox from '@/modules/chat/ChatBox.vue'
import { useScoreboardWebSocket } from '@/modules/game/scoreboard/scoreboard.socket'
import { usePlayerWebSocket } from '@/modules/player/player.socket'

useScoreboardWebSocket()
usePlayerWebSocket()
</script>

<template>
  <div class="game-layout">
    <!-- HUDs -->
    <PlayerHUB />
    <ScoreboardCompact />
    <ChatBox />

    <!-- Game Scene -->
    <main class="game-layout__scene">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.game-layout {
  @apply min-h-screen relative overflow-hidden;
}

.game-layout__scene {
  @apply w-full h-full;
}
</style>
```

**Checklist**:

- [x] Create DefaultLayout for home/lobby
- [x] Create GameLayout with HUDs
- [x] Position HUD components correctly
- [x] Ensure layouts are responsive

---

## ✅ Acceptance Criteria

- [x] Alert system shows/dismisses alerts correctly
- [x] Buttons support all states (loading, disabled, sizes)
- [x] Form components work and validate
- [x] ColorPicker allows color selection
- [x] PinInput works for 4-digit PIN
- [x] Timer displays countdown correctly
- [x] Modals open/close with animations
- [x] DefaultLayout displays header/footer
- [x] GameLayout positions HUDs correctly
- [x] All components are responsive
- [x] DaisyUI theme applies correctly

---

## 🔗 Related Files

- `src/ui/components/**/*.vue`
- `src/ui/layouts/DefaultLayout.vue`
- `src/ui/layouts/GameLayout.vue`
- `src/modules/core/stores/ui.store.ts`

---

## 📚 References

- [DaisyUI Components](https://daisyui.com/components/)
- [Vue Transitions](https://vuejs.org/guide/built-ins/transition.html)
- [Teleport](https://vuejs.org/guide/built-ins/teleport.html)
