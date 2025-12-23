import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Question {
  id: number
  text: string
  options: string[]
  correct_answer: number
  difficulty: 'easy' | 'medium' | 'hard'
  time_limit: number
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

export const useMillionaireStore = defineStore('millionaire', () => {
  const currentQuestion = ref<Question | null>(null)
  const questionNumber = ref(0)
  const totalQuestions = ref(0)
  const timeLeft = ref(0)
  const selectedAnswer = ref<number | null>(null)
  const isAnswered = ref(false)
  const isCorrect = ref<boolean | null>(null)
  const score = ref(0)
  const correctAnswers = ref(0)

  function setQuestion(q: Question) {
    currentQuestion.value = q
    questionNumber.value = (questionNumber.value || 0) + 1
    totalQuestions.value = Math.max(totalQuestions.value, questionNumber.value)
    timeLeft.value = q.time_limit
    selectedAnswer.value = null
    isAnswered.value = false
    isCorrect.value = null
  }

  function selectAnswer(index: number) {
    if (isAnswered.value || !currentQuestion.value) return
    selectedAnswer.value = index
  }

  async function submitAnswer() {
    if (isAnswered.value || selectedAnswer.value === null || !currentQuestion.value) return

    isAnswered.value = true

    try {
      // send to backend
      const payload = {
        question_id: currentQuestion.value.id,
        answer_index: selectedAnswer.value,
      }
      // lazy import to avoid cycles in tests
      const { apiService } = await import('@/modules/core/services/api.service')
      await apiService.post('/games/millionaire/answer', payload)
    } catch (e) {
      // network failed — keep optimistic state but log
      // Optionally revert isAnswered if needed
      console.error('[MillionaireStore] submitAnswer failed', e)
    }
  }

  function revealResult(correct: boolean) {
    isCorrect.value = correct
    if (correct) {
      correctAnswers.value += 1
    }
  }

  function updateTimer(time: number) {
    timeLeft.value = time
    if (time <= 0 && !isAnswered.value) {
      // time over -> auto submit with null answer
      isAnswered.value = true
      isCorrect.value = false
    }
  }

  function nextQuestion() {
    currentQuestion.value = null
    selectedAnswer.value = null
    isAnswered.value = false
    isCorrect.value = null
  }

  function reset() {
    currentQuestion.value = null
    questionNumber.value = 0
    totalQuestions.value = 0
    timeLeft.value = 0
    selectedAnswer.value = null
    isAnswered.value = false
    isCorrect.value = null
    score.value = 0
    correctAnswers.value = 0
  }

  const canAnswer = computed(
    () => !!currentQuestion.value && !isAnswered.value && timeLeft.value > 0,
  )
  const timeProgress = computed(() =>
    currentQuestion.value ? (timeLeft.value / currentQuestion.value.time_limit) * 100 : 0,
  )

  // A small helper to compute final score (used on RoundComplete)
  function computeScore() {
    // Normalized as % correct * 1000; difficulty not considered here
    score.value = Math.round((correctAnswers.value / Math.max(totalQuestions.value, 1)) * 1000)
    return score.value
  }

  async function submitScore() {
    const normalized = computeScore()

    try {
      const { submitGameScore } = await import('@/modules/game/scoreboard/scoreboard.api')
      await submitGameScore({
        game: 'millionaire',
        rawData: { correctAnswers: correctAnswers.value, totalQuestions: totalQuestions.value },
        score: normalized,
      })
    } catch (e) {
      // network failed — log and continue

      console.error('[MillionaireStore] submitScore failed', e)
    }
  }

  return {
    currentQuestion,
    questionNumber,
    totalQuestions,
    timeLeft,
    selectedAnswer,
    isAnswered,
    isCorrect,
    score,
    correctAnswers,
    setQuestion,
    selectAnswer,
    submitAnswer,
    revealResult,
    updateTimer,
    nextQuestion,
    reset,
    canAnswer,
    timeProgress,
    computeScore,
    submitScore,
  }
})
