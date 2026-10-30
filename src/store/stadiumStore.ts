import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StadiumId } from '../data/stadiums'

interface StadiumState {
  selectedStadiumId: StadiumId
  selectStadium: (id: StadiumId) => void
}

export const useStadiumStore = create<StadiumState>()(
  persist(
    (set) => ({
      selectedStadiumId: 'neon-metropolis',
      selectStadium: (id: StadiumId) => set({ selectedStadiumId: id }),
    }),
    { name: 'fc27-stadium-selection' }
  )
)
