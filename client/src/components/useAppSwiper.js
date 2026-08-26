import { useEffect, useState } from 'react'

/** Dynamically load Swiper + CSS so it stays off the critical JS path. */
export function useAppSwiper() {
  const [mod, setMod] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = () => {
      import('./AppSwiper.jsx')
        .then((m) => {
          if (!cancelled) setMod(m)
        })
        .catch(() => {})
    }

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(load, { timeout: 900 })
      return () => {
        cancelled = true
        window.cancelIdleCallback?.(idleId)
      }
    }

    const timer = window.setTimeout(load, 120)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return mod
}
