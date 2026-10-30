import type { GameSettings } from '../../data/types'

export type AIDifficultyLevel = 'easy' | 'medium' | 'hard'

export interface AIDifficultyConfig {
  level: AIDifficultyLevel
  reactionDelayMs: number
  passAccuracy: number
  pressAggressiveness: number
  tackleProbability: number
  shotPrecision: number
  markingDistance: number
  throughBallLikelihood: number
  skillMoveLikelihood: number
}

export const DIFFICULTY_PRESETS: Record<AIDifficultyLevel, AIDifficultyConfig> = {
  easy: {
    level: 'easy',
    reactionDelayMs: 1100,
    passAccuracy: 0.72,
    pressAggressiveness: 0.45,
    tackleProbability: 0.40,
    shotPrecision: 0.62,
    markingDistance: 3.6,
    throughBallLikelihood: 0.30,
    skillMoveLikelihood: 0.10,
  },
  medium: {
    level: 'medium',
    reactionDelayMs: 650,
    passAccuracy: 0.88,
    pressAggressiveness: 0.75,
    tackleProbability: 0.70,
    shotPrecision: 0.84,
    markingDistance: 2.2,
    throughBallLikelihood: 0.60,
    skillMoveLikelihood: 0.25,
  },
  hard: {
    level: 'hard',
    reactionDelayMs: 380,
    passAccuracy: 0.97,
    pressAggressiveness: 0.95,
    tackleProbability: 0.90,
    shotPrecision: 0.96,
    markingDistance: 1.2,
    throughBallLikelihood: 0.85,
    skillMoveLikelihood: 0.45,
  },
}

export function resolveDifficulty(difficulty: GameSettings['difficulty'] | AIDifficultyLevel | string): AIDifficultyConfig {
  if (difficulty === 'easy' || difficulty === 'amateur' || difficulty === 'semi-pro') {
    return DIFFICULTY_PRESETS.easy
  }
  if (difficulty === 'hard' || difficulty === 'world-class' || difficulty === 'legendary') {
    return DIFFICULTY_PRESETS.hard
  }
  return DIFFICULTY_PRESETS.medium
}
