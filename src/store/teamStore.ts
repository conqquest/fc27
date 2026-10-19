import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FormationName } from '../data/types'

interface TeamState {
  homeTeamId: string | null
  awayTeamId: string | null
  homeFormation: FormationName | null
  awayFormation: FormationName | null
  setHomeTeam: (id: string) => void
  setAwayTeam: (id: string) => void
  setHomeFormation: (f: FormationName) => void
  setAwayFormation: (f: FormationName) => void
  swap: () => void
  reset: () => void
}

export const useTeamStore = create<TeamState>()(persist(
  (set) => ({
    homeTeamId: 'manchester-city',
    awayTeamId: 'liverpool',
    homeFormation: null,
    awayFormation: null,

    setHomeTeam: (id) => set({ homeTeamId: id }),
    setAwayTeam: (id) => set({ awayTeamId: id }),
    setHomeFormation: (f) => set({ homeFormation: f }),
    setAwayFormation: (f) => set({ awayFormation: f }),

    swap: () =>
      set((s) => ({
        homeTeamId: s.awayTeamId,
        awayTeamId: s.homeTeamId,
        homeFormation: s.awayFormation,
        awayFormation: s.homeFormation,
      })),

    reset: () =>
      set({
        homeTeamId: 'manchester-city',
        awayTeamId: 'liverpool',
        homeFormation: null,
        awayFormation: null,
      }),
  }),
  { name: 'fc27-teams' }
))
