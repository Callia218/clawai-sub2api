/** Keep a body-teleported popover above its own dialog, below the next dialog. */
export function getPopoverLayer(trigger: HTMLElement | null): number {
  // Driver's highlighted controls must stay interactive during an onboarding tour.
  if (trigger?.closest('.driver-active-element, .driver-popover')) return 100000020
  const dialog = trigger?.closest<HTMLElement>('[data-dialog-layer], [role="dialog"], .fixed.inset-0')
  if (dialog) {
    const layer = Number(dialog.dataset.dialogLayer || getComputedStyle(dialog).zIndex)
    if (Number.isFinite(layer)) return layer + 1
  }
  return 40
}
