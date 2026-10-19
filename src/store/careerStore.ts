import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CareerSave } from '../data/types'

function generateSaveId(): string {
  return Date.now().toString(36)
}

interface CareerStoreState {
  saves: CareerSave[]
  activeSaveId: string | null
  createSave: (managerName: string, teamId: string) => string
  loadSave: (id: string) => void
  updateSave: (id: string, updates: Partial<CareerSave>) => void
  deleteSave: (id: string) => void
  getActiveSave: () => CareerSave | null
}

export const useCareerStore = create<CareerStoreState>()(persist(
  (set, get) => ({
    saves: [],
    activeSaveId: null,

    createSave: (managerName, teamId) => {
      const id = generateSaveId()
      const newSave: CareerSave = {
        id,
        managerName,
        teamId,
        season: 1,
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
      }
      set((s) => ({ saves: [...s.saves, newSave], activeSaveId: id }))
      return id
    },

    loadSave: (id) => {
      set({ activeSaveId: id })
      set((s) => ({
        saves: s.saves.map((save) =>
          save.id === id ? { ...save, lastPlayedAt: Date.now() } : save
        ),
      }))
    },

    updateSave: (id, updates) =>
      set((s) => ({
        saves: s.saves.map((save) =>
          save.id === id ? { ...save, ...updates, lastPlayedAt: Date.now() } : save
        ),
      })),

    deleteSave: (id) =>
      set((s) => ({
        saves: s.saves.filter((save) => save.id !== id),
        activeSaveId: s.activeSaveId === id ? null : s.activeSaveId,
      })),

    getActiveSave: () => {
      const { saves, activeSaveId } = get()
      return saves.find((s) => s.id === activeSaveId) ?? null
    },
  }),
  { name: 'fc27-career' }
))
