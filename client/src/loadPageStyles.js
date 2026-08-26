const loaded = new Set()

/** Load route-specific CSS off the critical path. */
export function ensurePageStyles(key, loader) {
  if (loaded.has(key)) return Promise.resolve()
  loaded.add(key)
  return loader()
}

export function scheduleIdle(task, timeout = 1200) {
  if (typeof window === 'undefined') return undefined
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(task, { timeout })
  }
  return window.setTimeout(task, 80)
}

export function cancelIdle(id) {
  if (typeof window === 'undefined' || id == null) return
  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(id)
    return
  }
  window.clearTimeout(id)
}
