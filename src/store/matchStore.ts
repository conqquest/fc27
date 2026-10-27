import { create } from 'zustand'
import type { MatchPhase, MatchEvent, MatchStats } from '../data/types'

const DEFAULT_STATS: MatchStats = {
  possession: [50, 50],
  shots: [0, 0],
  shotsOnTarget: [0, 0],
  corners: [0, 0],
  fouls: [0, 0],
  yellowCards: [0, 0],
  redCards: [0, 0],
  offsides: [0, 0],
  saves: [0, 0],
  passAccuracy: [85, 82],
  distanceCovered: [0, 0],
}

interface MatchStoreState {
  phase: MatchPhase
  score: [number, number]
  minute: number
  half: 1 | 2
  events: MatchEvent[]
  stats: MatchStats
  controlledPlayerId: string | null
  showRadar: boolean
  isGoalAnimation: boolean

  setPhase: (phase: MatchPhase) => void
  addGoal: (teamIndex: 0 | 1) => void
  setMinute: (m: number) => void
  setHalf: (h: 1 | 2) => void
  addEvent: (event: MatchEvent) => void
  updateStats: (stats: Partial<MatchStats>) => void
  setControlled: (id: string | null) => void
  toggleRadar: () => void
  setGoalAnimation: (v: boolean) => void
  resetMatch: () => void
}

export const useMatchStore = create<MatchStoreState>()((set) => ({
  phase: 'PRE_MATCH',
  score: [0, 0],
  minute: 1,
  half: 1,
  events: [],
  stats: DEFAULT_STATS,
  controlledPlayerId: null,
  showRadar: true,
  isGoalAnimation: false,

  setPhase: (phase) => set({ phase }),

  addGoal: (teamIndex) =>
    set((s) => {
      const score: [number, number] = [...s.score] as [number, number]
      score[teamIndex] += 1
      return { score }
    }),

  setMinute: (minute) => set({ minute }),

  setHalf: (half) => set({ half }),

  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),

  updateStats: (stats) =>
    set((s) => ({ stats: { ...s.stats, ...stats } })),

  setControlled: (controlledPlayerId) => set({ controlledPlayerId }),

  toggleRadar: () => set((s) => ({ showRadar: !s.showRadar })),

  setGoalAnimation: (isGoalAnimation) => set({ isGoalAnimation }),

  resetMatch: () =>
    set({
      phase: 'PRE_MATCH',
      score: [0, 0],
      minute: 1,
      half: 1,
      events: [],
      stats: DEFAULT_STATS,
      controlledPlayerId: null,
      showRadar: true,
      isGoalAnimation: false,
    }),
}))
