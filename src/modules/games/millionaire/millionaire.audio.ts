import { useAudio } from '@/modules/core/composables/useAudio'

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
    play({ id: 'question-sound', url: MILLIONAIRE_SOUNDS.question, channel: 'sfx' })
  }

  function playSelectSound() {
    play({ id: 'select-sound', url: MILLIONAIRE_SOUNDS.select, channel: 'sfx' })
  }

  function playCorrectSound() {
    play({ id: 'correct-sound', url: MILLIONAIRE_SOUNDS.correct, channel: 'sfx' })
  }

  function playWrongSound() {
    play({ id: 'wrong-sound', url: MILLIONAIRE_SOUNDS.wrong, channel: 'sfx' })
  }

  function playTickSound() {
    play({ id: 'tick-sound', url: MILLIONAIRE_SOUNDS.tick, channel: 'sfx', volume: 0.3 })
  }

  return {
    playTheme,
    stopTheme,
    playQuestionSound,
    playSelectSound,
    playCorrectSound,
    playWrongSound,
    playTickSound,
  }
}
