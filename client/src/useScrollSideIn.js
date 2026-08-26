import { useEffect } from 'react'

const SWIPER_GUARD = '.swiper, .swiper-wrapper, .swiper-slide'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Side-in scroll reveals for elements with data-animate="left|right".
 * GSAP is loaded on demand so it is not in the critical first-paint path.
 */
export function useScrollSideIn(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef?.current
    if (!root || typeof window === 'undefined') return undefined

    const media = window.matchMedia(REDUCED_MOTION_QUERY)
    if (media.matches) return undefined

    let cancelled = false
    let triggers = []
    let targets = []
    let gsapRef = null

    const run = async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (cancelled || !rootRef?.current) return

      gsap.registerPlugin(ScrollTrigger)
      gsapRef = gsap

      targets = Array.from(root.querySelectorAll('[data-animate="left"], [data-animate="right"]')).filter(
        (el) => !el.closest(SWIPER_GUARD),
      )
      if (!targets.length) return

      const isNarrow = window.matchMedia('(max-width: 767px)').matches
      const offset = isNarrow ? '36vw' : '100vw'

      targets.forEach((el) => {
        const side = el.getAttribute('data-animate')
        const fromX = side === 'right' ? offset : `-${offset}`

        const tween = gsap.fromTo(
          el,
          { x: fromX, autoAlpha: isNarrow ? 0.2 : 1 },
          {
            x: 0,
            autoAlpha: 1,
            duration: isNarrow ? 0.65 : 0.85,
            ease: 'power3.out',
            overwrite: 'auto',
            scrollTrigger: {
              trigger: el,
              start: 'top 92%',
              toggleActions: 'play reverse play reverse',
              invalidateOnRefresh: true,
            },
          },
        )

        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger)
      })

      ScrollTrigger.refresh()
    }

    // Idle defer — keep first paint free of GSAP parse/exec cost.
    const start = () => {
      if (cancelled) return
      run().catch(() => {})
    }
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(start, { timeout: 1800 })
      return () => {
        cancelled = true
        window.cancelIdleCallback?.(idleId)
        triggers.forEach((trigger) => trigger.kill())
        if (gsapRef && targets.length) {
          gsapRef.killTweensOf(targets)
          gsapRef.set(targets, { clearProps: 'transform,opacity,visibility' })
        }
      }
    }

    const timer = window.setTimeout(start, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      triggers.forEach((trigger) => trigger.kill())
      if (gsapRef && targets.length) {
        gsapRef.killTweensOf(targets)
        gsapRef.set(targets, { clearProps: 'transform,opacity,visibility' })
      }
    }
  }, deps)
}

export function sideInAttr(index, startLeft = true) {
  const isLeft = startLeft ? index % 2 === 0 : index % 2 === 1
  return isLeft ? 'left' : 'right'
}
