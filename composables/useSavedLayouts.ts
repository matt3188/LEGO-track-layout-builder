import { computed, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useLayoutsStore } from '~/stores/layouts'
import type { TrackPiece } from '~/composables/trackPieces/types'

export function useSavedLayouts(pieces: Ref<TrackPiece[]>, loadLayout: (json: string) => void, copyStatus: Ref<string>) {
  const layoutsStore = useLayoutsStore()
  const { layoutNames } = storeToRefs(layoutsStore)
  const hasSavedLayouts = computed(() => layoutNames.value.length > 0)

  function handleSaveLayout() {
    const name = prompt('Enter a name for this layout:')
    if (name && name.trim()) {
      layoutsStore.saveLayout(name.trim(), pieces.value)
      copyStatus.value = 'Layout saved!'
      setTimeout(() => (copyStatus.value = ''), 2000)
    }
  }

  function handleLoadLayout() {
    if (layoutNames.value.length === 0) return
    const list = layoutNames.value.join('\n')
    const name = prompt(`Load which layout?\n${list}`)
    if (name) {
      const layout = layoutsStore.getLayout(name.trim())
      if (layout) {
        loadLayout(JSON.stringify(layout))
      } else {
        alert('Layout not found')
      }
    }
  }

  return {
    handleSaveLayout,
    handleLoadLayout,
    hasSavedLayouts,
    layoutNames
  }
}
