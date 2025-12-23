<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useMillionaireStore } from './millionaire.store'
import { useMillionaireWebSocket } from './millionaire.socket'
import { useMillionaireAudio } from './millionaire.audio'
import QuestionCard from './components/QuestionCard.vue'
import AnswerButton from './components/AnswerButton.vue'
import MillionaireTimer from './components/MillionaireTimer.vue'

const store = useMillionaireStore()
const { playTheme, stopTheme, playSelectSound } = useMillionaireAudio()

useMillionaireWebSocket()

onMounted(() => {
  playTheme()
})

onUnmounted(() => {
  stopTheme()
  store.reset()
})

function handleAnswerSelect(index: number) {
  if (!store.canAnswer) return
  playSelectSound()
  store.selectAnswer(index)
  store.submitAnswer()
}
</script>

<template>
  <div class="millionaire-scene">
    <div class="millionaire-scene__hud">
      <div class="millionaire-scene__question-number">
        {{ store.questionNumber }} / {{ store.totalQuestions }}
      </div>
      <MillionaireTimer :time-left="store.timeLeft" />
      <div class="millionaire-scene__score">{{ store.correctAnswers }} ✓</div>
    </div>

    <QuestionCard
      v-if="store.currentQuestion"
      :question="{ text: store.currentQuestion.text, difficulty: store.currentQuestion.difficulty }"
    />

    <div class="millionaire-scene__answers">
      <AnswerButton
        v-for="(option, index) in store.currentQuestion?.options || []"
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

    <transition name="fade">
      <div v-if="store.isAnswered" class="millionaire-scene__result">
        <span v-if="store.isCorrect" class="text-success text-4xl"
          >✓ {{ $t('games.millionaire.correct') }}</span
        >
        <span v-else class="text-error text-4xl">✗ {{ $t('games.millionaire.incorrect') }}</span>
      </div>
    </transition>
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
