export function validateAnswer(selectedIndex: number, correctIndex: number): boolean {
  return selectedIndex === correctIndex
}

export function calculateScore(
  correctAnswers: number,
  totalQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
): number {
  if (totalQuestions === 0) return 0
  const baseScore = (correctAnswers / totalQuestions) * 1000
  const multiplier = difficulty === 'hard' ? 1.2 : difficulty === 'medium' ? 1.0 : 0.8
  return Math.round(baseScore * multiplier)
}

export function shouldEliminate(
  correctAnswers: number,
  totalQuestions: number,
  threshold: number = 0.5,
): boolean {
  if (totalQuestions === 0) return true
  return correctAnswers / totalQuestions < threshold
}
