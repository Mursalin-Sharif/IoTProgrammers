import { useEffect, useRef } from 'react'
import { applyGtmSnippets, ensureDataLayer, pushTrackingConfig } from '../tracking'

/**
 * Dynamically injects Admin-configured GTM head/body snippets.
 * Empty fields → no injection. Changing snippets replaces previous nodes.
 */
export default function GtmSnippets({ siteSettings = {} }) {
  const lastKey = useRef('')

  useEffect(() => {
    ensureDataLayer()

    const head = String(siteSettings.gtmHeadCode || siteSettings.gtmHeadScript || '').trim()
    const body = String(siteSettings.gtmBodyCode || siteSettings.gtmBodyScript || '').trim()
    const ga4 = String(siteSettings.ga4MeasurementId || '').trim()
    const fb = String(siteSettings.fbPixelId || '').trim()
    const key = `${head}||${body}||${ga4}||${fb}`

    if (key === lastKey.current) return
    lastKey.current = key

    applyGtmSnippets({ head, body })
    pushTrackingConfig({ ga4MeasurementId: ga4, fbPixelId: fb })
  }, [
    siteSettings.gtmHeadCode,
    siteSettings.gtmBodyCode,
    siteSettings.gtmHeadScript,
    siteSettings.gtmBodyScript,
    siteSettings.ga4MeasurementId,
    siteSettings.fbPixelId,
  ])

  return null
}
