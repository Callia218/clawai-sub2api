import { computed, onBeforeUnmount, ref, watch } from 'vue'

// The application shell is an isolated stacking context. Body portals use this
// small, shared scale: page popovers 40, dialogs 50+, dialog popovers layer + 1.
const dialogs = ref<{ id: symbol; layer: number }[]>([])

export function useDialogLayer(open: () => boolean, requestedLayer: () => number = () => 50) {
  const id = Symbol('dialog')
  const layer = ref(requestedLayer())
  const isTopmost = computed(() => dialogs.value[dialogs.value.length - 1]?.id === id)

  function remove() {
    dialogs.value = dialogs.value.filter(dialog => dialog.id !== id)
    document.body.classList.toggle('modal-open', dialogs.value.length > 0)
  }

  watch(open, (visible) => {
    if (!visible) return remove()
    layer.value = Math.max(requestedLayer(), 50, ...dialogs.value.map(dialog => dialog.layer + 10))
    dialogs.value.push({ id, layer: layer.value })
    document.body.classList.add('modal-open')
  }, { immediate: true, flush: 'sync' })

  onBeforeUnmount(remove)
  return { layer, isTopmost }
}
