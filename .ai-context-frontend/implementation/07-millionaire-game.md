# 07 - Millionaire Game Implementation

**Status**: [ ] Not Started | [ ] In Progress | [ ] Completed | [ ] Tested

---

## 📋 Overview

Juego de preguntas y respuestas tipo "¿Quién quiere ser millonario?" con eliminación masiva basada en respuestas incorrectas.

---

## 🎯 Objectives

- [ ] Implementar millionaire.store.ts
- [ ] Implementar millionaire.logic.ts (validación, scoring)
- [ ] Implementar millionaire.socket.ts (WebSocket)
- [ ] Implementar millionaire.audio.ts (sonidos del juego)
- [ ] Crear MillionaireScene.vue (escena principal)
- [ ] Crear componentes UI (QuestionCard, AnswerButton, Timer)

---

## 📁 Files to Create

```
src/modules/games/millionaire/
├── millionaire.store.ts
├── millionaire.logic.ts
├── millionaire.socket.ts
├── millionaire.audio.ts
├── MillionaireScene.vue
└── components/
    ├── QuestionCard.vue
    ├── AnswerButton.vue
    └── MillionaireTimer.vue
```

---

## 🔧 Implementation

### 1. Millionaire Store (`millionaire.store.ts`)

```typescript
export interface Question {
  id: number
  text: string
  options: string[] // 4 options
  correct_answer: number // 0-3
  difficulty: 'easy' | 'medium' | 'hard'
  time_limit: number // seconds
}

export interface MillionaireState {
  currentQuestion: Question | null
  questionNumber: number
  totalQuestions: number
  timeLeft: number
  selectedAnswer: number | null
  isAnswered: boolean
  isCorrect: boolean | null
  score: number
  correctAnswers: number
}
```

**Key Actions**:

- [ ] `setQuestion(question)` - Load new question
- [ ] `selectAnswer(index)` - Player selects answer
- [ ] `submitAnswer()` - Send answer to server
- [ ] `revealResult(correct)` - Show if answer was correct
- [ ] `updateTimer(time)` - Countdown timer
- [ ] `nextQuestion()` - Move to next question
- [ ] `reset()` - Clear state

**Checklist**:

- [ ] Create store with reactive state
- [ ] Implement all actions
- [ ] Add computed properties (canAnswer, timeProgress, etc.)
- [ ] Test state mutations

---

### 2. Millionaire Logic (`millionaire.logic.ts`)

```typescript
export function validateAnswer(selectedIndex: number, correctIndex: number): boolean {
  return selectedIndex === correctIndex
}

export function calculateScore(
  correctAnswers: number,
  totalQuestions: number,
  difficulty: string,
): number {
  // Normalize to 0-1000 range
  const baseScore = (correctAnswers / totalQuestions) * 1000

  // Apply difficulty multiplier
  const multiplier = difficulty === 'hard' ? 1.2 : difficulty === 'medium' ? 1.0 : 0.8

  return Math.round(baseScore * multiplier)
}

export function shouldEliminate(
  correctAnswers: number,
  totalQuestions: number,
  threshold: number = 0.5,
): boolean {
  return correctAnswers / totalQuestions < threshold
}
```

**Checklist**:

- [ ] Implement answer validation
- [ ] Implement score calculation
- [ ] Implement elimination logic
- [ ] Add helper functions
- [ ] Write unit tests

---

### 3. Millionaire Socket (`millionaire.socket.ts`)

```typescript
export function useMillionaireWebSocket() {
  const store = useMillionaireStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.millionaire')

  // New question received
  gameChannel.listen('QuestionReceived', (event) => {
    store.setQuestion(event.question)
    audioService.play({
      id: 'question-appear',
      url: '/assets/audio/sfx/millionaire/question.mp3',
      channel: 'sfx',
    })
  })

  // Answer result
  gameChannel.listen('AnswerResult', (event) => {
    store.revealResult(event.is_correct)

    const sound = event.is_correct
      ? '/assets/audio/sfx/millionaire/correct.mp3'
      : '/assets/audio/sfx/millionaire/wrong.mp3'

    audioService.play({
      id: 'answer-result',
      url: sound,
      channel: 'sfx',
    })
  })

  // Timer update
  gameChannel.listen('TimerUpdate', (event) => {
    store.updateTimer(event.time_left)
  })
}
```

**Events to Listen**:

- [ ] `QuestionReceived` - New question
- [ ] `AnswerResult` - Answer validation result
- [ ] `TimerUpdate` - Countdown updates
- [ ] `RoundComplete` - All questions answered

**Checklist**:

- [ ] Create composable for WebSocket
- [ ] Listen to all events
- [ ] Update store on events
- [ ] Play sounds on events
- [ ] Handle cleanup

---

### 4. Millionaire Audio (`millionaire.audio.ts`)

```typescript
export const MILLIONAIRE_SOUNDS = {
  theme: '/assets/audio/music/millionaire-theme.mp3',
  question: '/assets/audio/sfx/millionaire/question.mp3',
  select: '/assets/audio/sfx/millionaire/select.mp3',
  correct: '/assets/audio/sfx/millionaire/correct.mp3',
  wrong: '/assets/audio/sfx/millionaire/wrong.mp3',
  thinking: '/assets/audio/sfx/millionaire/thinking.mp3',
  tick: '/assets/audio/sfx/millionaire/tick.mp3',
}

export function useMillionaireAudio() {
  const { play, stop } = useAudio()

  function playTheme() {
    play({
      id: 'millionaire-theme',
      url: MILLIONAIRE_SOUNDS.theme,
      channel: 'music',
      loop: true,
      volume: 0.5,
    })
  }

  function stopTheme() {
    stop('music')
  }

  function playQuestionSound() {
    play({
      id: 'question-sound',
      url: MILLIONAIRE_SOUNDS.question,
      channel: 'sfx',
    })
  }

  function playCorrectSound() {
    play({
      id: 'correct-sound',
      url: MILLIONAIRE_SOUNDS.correct,
      channel: 'sfx',
    })
  }

  function playWrongSound() {
    play({
      id: 'wrong-sound',
      url: MILLIONAIRE_SOUNDS.wrong,
      channel: 'sfx',
    })
  }

  function playTickSound() {
    play({
      id: 'tick-sound',
      url: MILLIONAIRE_SOUNDS.tick,
      channel: 'sfx',
      volume: 0.3,
    })
  }

  return {
    playTheme,
    stopTheme,
    playQuestionSound,
    playCorrectSound,
    playWrongSound,
    playTickSound,
  }
}
```

**Audio Files Needed**:

- [ ] `millionaire-theme.mp3` - Background music
- [ ] `question.mp3` - Question appears
- [ ] `select.mp3` - Answer selected
- [ ] `correct.mp3` - Correct answer
- [ ] `wrong.mp3` - Wrong answer
- [ ] `tick.mp3` - Timer tick (last 10 seconds)

---

### 5. Millionaire Scene (`MillionaireScene.vue`)

```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useMillionaireStore } from './millionaire.store'
import { useMillionaireWebSocket } from './millionaire.socket'
import { useMillionaireAudio } from './millionaire.audio'
import QuestionCard from './components/QuestionCard.vue'
import AnswerButton from './components/AnswerButton.vue'
import MillionaireTimer from './components/MillionaireTimer.vue'

const store = useMillionaireStore()
const { playTheme, stopTheme } = useMillionaireAudio()

useMillionaireWebSocket()

onMounted(() => {
  playTheme()
})

onUnmounted(() => {
  stopTheme()
  store.reset()
})

function handleAnswerSelect(index: number) {
  store.selectAnswer(index)
  store.submitAnswer()
}
</script>

<template>
  <div class="millionaire-scene">
    <!-- HUD -->
    <div class="millionaire-scene__hud">
      <div class="millionaire-scene__question-number">
        {{ store.questionNumber }} / {{ store.totalQuestions }}
      </div>
      <MillionaireTimer :time-left="store.timeLeft" />
      <div class="millionaire-scene__score">{{ store.correctAnswers }} ✓</div>
    </div>

    <!-- Question -->
    <QuestionCard v-if="store.currentQuestion" :question="store.currentQuestion" />

    <!-- Answers -->
    <div class="millionaire-scene__answers">
      <AnswerButton
        v-for="(option, index) in store.currentQuestion?.options"
        :key="index"
        :text="option"
        :index="index"
        :selected="store.selectedAnswer === index"
        :is-correct="store.isCorrect === true && store.selectedAnswer === index"
        :is-wrong="store.isCorrect === false && store.selectedAnswer === index"
        :disabled="store.isAnswered"
        @select="handleAnswerSelect"
      />
    </div>

    <!-- Result Feedback -->
    <Transition name="fade">
      <div v-if="store.isAnswered" class="millionaire-scene__result">
        <span v-if="store.isCorrect" class="text-success text-4xl">
          ✓ {{ $t('games.millionaire.correct') }}
        </span>
        <span v-else class="text-error text-4xl"> ✗ {{ $t('games.millionaire.incorrect') }} </span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.millionaire-scene {
  @apply min-h-screen flex flex-col items-center justify-center p-8;
  @apply bg-linear-to-b from-purple-900 to-blue-900;
}

.millionaire-scene__hud {
  @apply fixed top-4 left-0 right-0;
  @apply flex justify-between items-center px-8;
}

.millionaire-scene__question-number {
  @apply text-xl font-bold text-white;
}

.millionaire-scene__score {
  @apply text-xl font-bold text-white;
}

.millionaire-scene__answers {
  @apply grid grid-cols-2 gap-4 mt-8 w-full max-w-4xl;
}

.millionaire-scene__result {
  @apply fixed inset-0 flex items-center justify-center;
  @apply bg-base-100/80 backdrop-blur-sm;
  @apply pointer-events-none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

**Checklist**:

- [ ] Create scene component
- [ ] Display question and answers
- [ ] Handle answer selection
- [ ] Show timer
- [ ] Display result feedback
- [ ] Play theme music on mount
- [ ] Stop music on unmount
- [ ] Reset store on unmount

---

### 6. Question Card Component (`components/QuestionCard.vue`)

```vue
<script setup lang="ts">
interface Props {
  question: {
    text: string
    difficulty: string
  }
}

defineProps<Props>()
</script>

<template>
  <div class="question-card">
    <div class="question-card__badge">
      {{ question.difficulty }}
    </div>
    <h2 class="question-card__text">
      {{ question.text }}
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
```

---

### 7. Answer Button Component (`components/AnswerButton.vue`)

```vue
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
      'answer-button--selected': selected && !isCorrect && !isWrong,
      'answer-button--correct': isCorrect,
      'answer-button--wrong': isWrong,
    }"
    :disabled="disabled"
    @click="emit('select', index)"
  >
    <span class="answer-button__label">{{ labels[index] }}</span>
    <span class="answer-button__text">{{ text }}</span>
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
```

---

### 8. Millionaire Timer (`components/MillionaireTimer.vue`)

```vue
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  timeLeft: number
  maxTime?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxTime: 30,
})

const progress = computed(() => (props.timeLeft / props.maxTime) * 100)
const isLowTime = computed(() => props.timeLeft <= 10)
</script>

<template>
  <div class="millionaire-timer">
    <div class="millionaire-timer__value" :class="{ 'text-error': isLowTime }">{{ timeLeft }}s</div>
    <div class="millionaire-timer__bar">
      <div
        class="millionaire-timer__progress"
        :class="{ 'bg-error': isLowTime, 'bg-primary': !isLowTime }"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.millionaire-timer {
  @apply flex flex-col items-center gap-2;
}

.millionaire-timer__value {
  @apply text-3xl font-mono font-bold text-white;
}

.millionaire-timer__bar {
  @apply w-32 h-3 bg-base-300 rounded-full overflow-hidden;
}

.millionaire-timer__progress {
  @apply h-full transition-all duration-1000 ease-linear;
}
</style>
```

---

## ✅ Acceptance Criteria

- [ ] Store manages question state correctly
- [ ] Players can select and submit answers
- [ ] Timer counts down and updates UI
- [ ] Answer validation works (correct/incorrect)
- [ ] Sound effects play on events
- [ ] Theme music plays during game
- [ ] WebSocket events update store
- [ ] UI shows result feedback
- [ ] Elimination calculated based on incorrect answers
- [ ] Score calculated and sent to scoreboard
- [ ] Scene cleans up on unmount

---

## 🔗 Related Files

- `src/modules/games/millionaire/millionaire.store.ts`
- `src/modules/games/millionaire/millionaire.logic.ts`
- `src/modules/games/millionaire/millionaire.socket.ts`
- `src/modules/games/millionaire/MillionaireScene.vue`
- All component files in `components/`

---

## 📚 References

- [Pinia Stores](https://pinia.vuejs.org/)
- [DaisyUI Buttons](https://daisyui.com/components/button/)
- [Vue Transitions](https://vuejs.org/guide/built-ins/transition.html)
