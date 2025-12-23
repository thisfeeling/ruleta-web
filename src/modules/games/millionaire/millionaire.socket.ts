import { useEcho } from '@/modules/core/composables/useEcho'
import { useMillionaireStore } from './millionaire.store'
import type { Question } from './millionaire.store'
import { audioService } from '@/modules/core/services/audio.service'

interface QuestionReceivedEvent {
  question: Question
}

interface AnswerResultEvent {
  is_correct: boolean
}

interface TimerUpdateEvent {
  time_left: number
}

export function useMillionaireWebSocket() {
  const store = useMillionaireStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.millionaire')

  gameChannel?.listen('QuestionReceived', (...args: unknown[]) => {
    const event = args[0] as QuestionReceivedEvent
    console.log('[MillionaireSocket] QuestionReceived', event)
    store.setQuestion(event.question)
    audioService.play({
      id: 'question-appear',
      url: '/assets/audio/sfx/millionaire/question.mp3',
      channel: 'sfx',
    })
  })

  gameChannel?.listen('AnswerResult', (...args: unknown[]) => {
    const event = args[0] as AnswerResultEvent
    console.log('[MillionaireSocket] AnswerResult', event)
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

  gameChannel?.listen('TimerUpdate', (...args: unknown[]) => {
    const event = args[0] as TimerUpdateEvent
    store.updateTimer(event.time_left)
  })

  gameChannel?.listen('RoundComplete', (...args: unknown[]) => {
    const event = args[0] as unknown
    console.log('[MillionaireSocket] RoundComplete', event)
    // round complete - compute score locally or wait for server ScoreAdded
    store.computeScore()
  })

  return {
    gameChannel,
  }
}
