import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const SWIPER_GUARD = '.swiper, .swiper-wrapper, .swiper-slide'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Side-in scroll reveals for elements with data-animate="left|right".
 * Reverses on scroll-up via toggleActions. Skips Swiper nodes and reduced motion.
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

    targets.forEach((el) => {
      const side = el.getAttribute('data-animate')
      const fromX = side === 'right' ? '100vw' : '-100vw'

      const tween = gsap.fromTo(
        el,
        { x: fromX },
        {
          x: 0,
          duration: 0.85,
          ease: 'power3.out',
          overwrite: 'auto',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
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
      gsap.set(targets, { clearProps: 'transform' })
    }
  }, deps)
}

export function sideInAttr(index, startLeft = true) {
  const isLeft = startLeft ? index % 2 === 0 : index % 2 === 1
  return isLeft ? 'left' : 'right'
}
