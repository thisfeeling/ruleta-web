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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(to bottom, #6b21a8, #1e3a8a);
}

.millionaire-scene__hud {
  position: fixed;
  top: 1rem;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: 2rem;
  padding-right: 2rem;
}

.millionaire-scene__question-number {
  font-size: 1.125rem;
  font-weight: 700;
  color: #fff;
}

.millionaire-scene__score {
  font-size: 1.125rem;
  font-weight: 700;
  color: #fff;
}

.millionaire-scene__answers {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 2rem;
  width: 100%;
  max-width: 56rem;
}

.millionaire-scene__result {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(6px);
  pointer-events: none;
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
