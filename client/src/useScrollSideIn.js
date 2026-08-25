import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const SWIPER_GUARD = '.swiper, .swiper-wrapper, .swiper-slide'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Side-in scroll reveals for elements with data-animate="left|right".
 * Reverses on scroll-up via toggleActions. Skips Swiper nodes and reduced motion.
 * On narrow screens use a short slide (not ±100vw) so CSS grids stay intact.
 */
export function useScrollSideIn(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef?.current
    if (!root || typeof window === 'undefined') return undefined

    const media = window.matchMedia(REDUCED_MOTION_QUERY)
    if (media.matches) return undefined

    const targets = Array.from(root.querySelectorAll('[data-animate="left"], [data-animate="right"]')).filter(
      (el) => !el.closest(SWIPER_GUARD),
    )

    if (!targets.length) return undefined

    const triggers = []
    const isNarrow = window.matchMedia('(max-width: 767px)').matches
    const offset = isNarrow ? 56 : '100vw'

    targets.forEach((el) => {
      const side = el.getAttribute('data-animate')
      const fromX = side === 'right' ? offset : typeof offset === 'number' ? -offset : `-${offset}`

      const tween = gsap.fromTo(
        el,
        { x: fromX, autoAlpha: isNarrow ? 0.35 : 1 },
        {
          x: 0,
          autoAlpha: 1,
          duration: isNarrow ? 0.55 : 0.85,
          ease: 'power3.out',
          overwrite: 'auto',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            toggleActions: 'play reverse play reverse',
            invalidateOnRefresh: true,
          },
        },
      )

      if (tween.scrollTrigger) {
        triggers.push(tween.scrollTrigger)
      }
    })

    ScrollTrigger.refresh()

    return () => {
      triggers.forEach((trigger) => trigger.kill())
      gsap.killTweensOf(targets)
      gsap.set(targets, { clearProps: 'transform,opacity,visibility' })
    }
  }, deps)
}

export function sideInAttr(index, startLeft = true) {
  const isLeft = startLeft ? index % 2 === 0 : index % 2 === 1
  return isLeft ? 'left' : 'right'
}
