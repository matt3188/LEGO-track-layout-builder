import { defineStore } from 'pinia'
import type { TrackPiece } from '~/composables/trackPieces/types'

interface SavedLayout {
  name: string
  pieces: TrackPiece[]
}

export const useLayoutsStore = defineStore('layouts', {
  state: () => ({
    layouts: [] as SavedLayout[]
  }),
  getters: {
    layoutNames: (state) => state.layouts.map(l => l.name)
  },
  actions: {
    saveLayout(name: string, pieces: TrackPiece[]) {
      const existing = this.layouts.find(l => l.name === name)
      const copy = JSON.parse(JSON.stringify(pieces)) as TrackPiece[]
      if (existing) {
        existing.pieces = copy
      } else {
        this.layouts.push({ name, pieces: copy })
      }
    },
    getLayout(name: string): TrackPiece[] | undefined {
      const l = this.layouts.find(lay => lay.name === name)
      return l ? JSON.parse(JSON.stringify(l.pieces)) as TrackPiece[] : undefined
    }
  }
})
