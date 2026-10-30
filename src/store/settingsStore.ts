import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GameSettings, KeyBindings, GraphicsSettings } from '../data/types'

const DEFAULT_KEYS: KeyBindings = {
  moveForward: 'w',
  moveBackward: 's',
  moveLeft: 'a',
  moveRight: 'd',
  sprint: 'Shift',
  shoot: 'e',
  throughBall: 'q',
  crossOrLoft: 'f',
  tackle: ' ',
  switchPlayer: 's',
  teammatePressure: 'q',
  toggleRadar: 'Tab',
  pause: 'Escape',
}

const DEFAULT_GRAPHICS: GraphicsSettings = {
  shadows: true,
  postProcessing: false,
  crowdDensity: 'medium',
  grassDetail: true,
  targetFps: 60,
}

interface SettingsState {
  settings: GameSettings
  updateKeys: (keys: Partial<KeyBindings>) => void
  updateGraphics: (g: Partial<GraphicsSettings>) => void
  setMatchDuration: (mins: number) => void
  setDifficulty: (d: GameSettings['difficulty']) => void
  setVolume: (v: number) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState>()(persist(
  (set) => ({
    settings: {
      keys: DEFAULT_KEYS,
      graphics: DEFAULT_GRAPHICS,
      matchDuration: 5,
      difficulty: 'professional',
      commentary: false,
      volume: 0.8,
    },
    updateKeys: (keys) => set((s) => ({ settings: { ...s.settings, keys: { ...s.settings.keys, ...keys } } })),
    updateGraphics: (g) => set((s) => ({ settings: { ...s.settings, graphics: { ...s.settings.graphics, ...g } } })),
    setMatchDuration: (matchDuration) => set((s) => ({ settings: { ...s.settings, matchDuration } })),
    setDifficulty: (difficulty) => set((s) => ({ settings: { ...s.settings, difficulty } })),
    setVolume: (volume) => set((s) => ({ settings: { ...s.settings, volume } })),
    reset: () => set({ settings: { keys: DEFAULT_KEYS, graphics: DEFAULT_GRAPHICS, matchDuration: 5, difficulty: 'professional', commentary: false, volume: 0.8 } }),
  }),
  { name: 'fc27-settings' }
))
