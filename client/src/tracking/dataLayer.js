/**
 * GTM + dataLayer helpers for IoTProgrammers lead-gen tracking (BD market).
 *
 * Primary conversion: ONE dataLayer push per user action with a shared event_id
 * so GTM web tags (FB Pixel + GA4) and server CAPI (Stape) can dedupe.
 *
 * Event map:
 * - page_view + event_name PageView — SPA route changes
 * - generate_lead + event_name Lead — Quick Booking / form success (FB Lead Ads)
 * - contact + event_name Contact — WhatsApp CTA clicks
 * - view_item + event_name ViewContent — demo/gallery (optional)
 * - begin_checkout + event_name InitiateCheckout — booking form focus (optional)
 */

const GTM_HEAD_ATTR = 'data-iot-gtm-head'
const GTM_BODY_ATTR = 'data-iot-gtm-body'
const GTM_ID_RE = /^GTM-[A-Z0-9]+$/i
const GTM_ID_IN_TEXT_RE = /GTM-[A-Z0-9]+/i
const MARKETING_STORAGE_KEY = 'iot_marketing_attribution'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id']
const GA4_SERVER_COLLECT = 'https://server.iotprogrammers.com/g/collect'
const GA4_EVENTS = new Set([
  'page_view',
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'purchase',
  'contact',
  'generate_lead',
])

let lastPageViewKey = ''
let lastPageViewAt = 0
const viewContentSeen = new Set()
const leadClickGuard = new WeakMap()
let beginCheckoutFired = false
let marketingCaptured = false
let cachedGa4Id = ''

export function ensureDataLayer() {
  if (typeof window === 'undefined') return []
  window.dataLayer = window.dataLayer || []
  return window.dataLayer
}

export function getCookie(name) {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : ''
}

function setCookie(name, value, maxAgeSeconds = 90 * 24 * 60 * 60) {
  if (typeof document === 'undefined' || !value) return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`
}

function readStoredMarketing() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(MARKETING_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStoredMarketing(payload) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(MARKETING_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Capture UTM + fbclid from the landing URL (Meta ads), persist for the session,
 * and ensure `_fbc` exists so Stape / CAPI can attribute Contact + Lead.
 */
export function captureMarketingAttribution() {
  if (typeof window === 'undefined') return getMarketingContext()

  const params = new URLSearchParams(window.location.search || '')
  const stored = readStoredMarketing()
  const next = { ...stored }

  UTM_KEYS.forEach((key) => {
    const value = String(params.get(key) || '').trim()
    if (value) next[key] = value
  })

  const fbclid = String(params.get('fbclid') || '').trim()
  if (fbclid) {
    next.fbclid = fbclid
    const existingFbc = getCookie('_fbc')
    if (!existingFbc || !existingFbc.includes(fbclid)) {
      const fbc = `fb.1.${Date.now()}.${fbclid}`
      setCookie('_fbc', fbc)
      next.fbc = fbc
    } else {
      next.fbc = existingFbc
    }
  } else if (!next.fbc) {
    const cookieFbc = getCookie('_fbc')
    if (cookieFbc) next.fbc = cookieFbc
  }

  const fbp = getCookie('_fbp')
  if (fbp) next.fbp = fbp

  writeStoredMarketing(next)
  marketingCaptured = true

  if (!next._pushed) {
    pushDataLayer({
      event: 'marketing_attribution',
      ...next,
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_query: window.location.search || '',
    })
    next._pushed = true
    writeStoredMarketing(next)
  }

  return getMarketingContext()
}

export function getMarketingContext() {
  if (typeof window === 'undefined') return {}
  if (!marketingCaptured) captureMarketingAttribution()

  const stored = readStoredMarketing()
  const fbp = getCookie('_fbp') || stored.fbp || undefined
  const fbc = getCookie('_fbc') || stored.fbc || undefined
  const context = {
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_query: window.location.search || '',
    event_source_url: window.location.href,
  }

  UTM_KEYS.forEach((key) => {
    if (stored[key]) context[key] = stored[key]
  })
  if (stored.fbclid) context.fbclid = stored.fbclid
  if (fbp) context.fbp = fbp
  if (fbc) context.fbc = fbc

  return context
}

/** Unique id per conversion — shared by browser pixel + server CAPI for dedup. */
export function generateEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** @deprecated Prefer generateEventId */
export const newEventId = generateEventId

function baseEventPayload(extra = {}) {
  const marketing = getMarketingContext()
  const event_id = extra.event_id || generateEventId()
  const event_time = extra.event_time || Math.round(Date.now() / 1000)
  const fbp = extra.fbp || marketing.fbp || getCookie('_fbp') || undefined
  const fbc = extra.fbc || marketing.fbc || getCookie('_fbc') || undefined

  return {
    ...marketing,
    ...extra,
    event_id,
    event_time,
    first_party_collection: true,
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  }
}

function readGaClientId() {
  const raw = getCookie('_ga')
  const match = String(raw || '').match(/GA\d+\.\d+\.(.+)$/)
  return match ? match[1] : ''
}

function readGaSessionId(measurementId) {
  if (!measurementId) return ''
  const suffix = String(measurementId).replace(/^G-/, '')
  const raw = getCookie(`_ga_${suffix}`)
  // GS2.1.sSESSIONID$... or GS1.1.SESSIONID...
  const match = String(raw || '').match(/GS\d+\.\d+\.s?(\d+)/)
  return match ? match[1] : ''
}

/**
 * Send GA4 event directly to the Stape/server container.
 * GTM's GA4 Event tags only reliably fire the first queued page_view in this setup;
 * this beacon keeps contact / lead / SPA page_view on the server path for CAPI.
 */
export function sendGa4ServerHit(eventName, params = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  const tid = String(params.measurement_id || cachedGa4Id || '').trim()
  const en = String(eventName || '').trim()
  if (!tid || !en) return false

  const cid = readGaClientId() || `${Date.now()}.${Math.floor(Math.random() * 1e9)}`
  const sid = readGaSessionId(tid) || String(Math.floor(Date.now() / 1000))
  const query = new URLSearchParams()
  query.set('v', '2')
  query.set('tid', tid)
  query.set('cid', cid)
  query.set('en', en)
  query.set('dl', window.location.href)
  query.set('dt', document.title || '')
  query.set('sid', sid)
  query.set('sct', '1')
  query.set('seg', '1')
  query.set('_s', '1')
  query.set('_p', String(Date.now()))
  if (params.event_id) query.set('ep.event_id', String(params.event_id))
  if (params.event_id) query.set('evnid', String(params.event_id))
  if (params.page_path) query.set('dp', String(params.page_path))
  if (params.fbp) query.set('ep.x-fb-ck-fbp', String(params.fbp))
  if (params.fbc) query.set('ep.x-fb-ck-fbc', String(params.fbc))
  if (params.value != null && params.value !== '') query.set('epn.value', String(Number(params.value)))
  if (params.currency) query.set('ep.currency', String(params.currency))

  const url = `${GA4_SERVER_COLLECT}?${query.toString()}`
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const img = new Image()
    img.src = url
    return true
  } catch {
    return false
  }
}

export function pushDataLayer(payload) {
  const layer = ensureDataLayer()
  layer.push(payload)
  const eventName = payload && payload.event
  if (eventName && GA4_EVENTS.has(eventName)) {
    sendGa4ServerHit(eventName, {
      measurement_id: cachedGa4Id || payload.ga4_measurement_id,
      event_id: payload.event_id,
      page_path: payload.page_path,
      fbp: payload.fbp,
      fbc: payload.fbc,
      value: payload.value,
      currency: payload.currency,
    })
  }
  return payload
}

/** Push optional GA4 / FB IDs for GTM variables (no hardcoded container). */
export function pushTrackingConfig({ ga4MeasurementId = '', fbPixelId = '' } = {}) {
  const ga4 = String(ga4MeasurementId || '').trim()
  const fb = String(fbPixelId || '').trim()
  if (ga4) cachedGa4Id = ga4
  if (!ga4 && !fb) return null
  return pushDataLayer({
    event: 'tracking_config',
    ...getMarketingContext(),
    ...(ga4 ? { ga4_measurement_id: ga4 } : {}),
    ...(fb ? { fb_pixel_id: fb } : {}),
  })
}

/**
 * page_view / PageView — StrictMode-safe (dedupe same path within 800ms).
 * ONE push with event_id for FB PageView + GA4 page_view tags.
 * Includes UTM / fbclid context for Meta ads → Stape CAPI.
 */
export function trackPageView(pathname) {
  captureMarketingAttribution()
  const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/')
  const now = Date.now()
  if (path === lastPageViewKey && now - lastPageViewAt < 800) {
    return null
  }
  lastPageViewKey = path
  lastPageViewAt = now

  return pushDataLayer(
    baseEventPayload({
      event: 'page_view',
      event_name: 'PageView',
      page_path: path,
      page_title: typeof document !== 'undefined' ? document.title : '',
    }),
  )
}

/**
 * view_item / ViewContent — once per content id (intersection or Live Demo).
 * @param {{ id?: string, name?: string, title?: string, value?: number, currency?: string }} item
 * @param {{ force?: boolean }} options
 */
export function trackViewContent(item = {}, options = {}) {
  const content_name = String(item.name || item.title || 'Demo').trim()
  const content_ids = [String(item.id || item.content_id || content_name).trim()].filter(Boolean)
  const dedupeKey = content_ids[0] || content_name

  if (!options.force && viewContentSeen.has(dedupeKey)) {
    return null
  }
  viewContentSeen.add(dedupeKey)

  const payload = baseEventPayload({
    event: 'view_item',
    event_name: 'ViewContent',
    content_type: 'product',
    content_name,
    content_ids,
    currency: item.currency || 'BDT',
  })

  if (item.value != null && item.value !== '') {
    payload.value = Number(item.value)
  }

  return pushDataLayer(payload)
}

function buildUserData(details = {}) {
  const email = String(details.email || details.email_address || '').trim()
  const phone = String(details.phone || details.phone_number || '').trim()
  const first = String(details.first_name || '').trim()
  const last = String(details.last_name || '').trim()
  const fullName = String(details.name || '').trim()

  let first_name = first
  let last_name = last
  if (!first_name && fullName) {
    const parts = fullName.split(/\s+/)
    first_name = parts[0] || ''
    last_name = parts.slice(1).join(' ') || ''
  }

  if (!email && !phone && !first_name && !last_name) return undefined

  return {
    ...(email ? { email_address: email } : {}),
    ...(phone ? { phone_number: phone } : {}),
    ...(first_name ? { first_name } : {}),
    ...(last_name ? { last_name } : {}),
  }
}

/**
 * generate_lead / Lead — primary FB Lead Ads conversion (forms / booking success).
 * ONE dataLayer event with event_id for browser + CAPI dedup.
 * Dedupes rapid double-fires from the same DOM element within 2s.
 */
export function trackLead(details = {}, sourceEl = null) {
  if (sourceEl && typeof sourceEl === 'object') {
    const last = leadClickGuard.get(sourceEl) || 0
    const now = Date.now()
    if (now - last < 2000) return null
    leadClickGuard.set(sourceEl, now)
  }

  const user_data = buildUserData(details)
  const payload = baseEventPayload({
    event: 'generate_lead',
    event_name: 'Lead',
    content_name: details.content_name || details.serviceType || 'Lead',
    content_category: details.content_category || 'lead',
    lead_source: details.lead_source || 'form',
    currency: details.currency || 'BDT',
    ...(user_data ? { user_data } : {}),
  })

  if (details.value != null && details.value !== '') {
    payload.value = Number(details.value)
  }

  return pushDataLayer(payload)
}

/**
 * contact / Contact — WhatsApp (and similar) CTA clicks.
 * Separate from Lead so GTM can map Contact vs Lead without double-counting.
 */
export function trackContact(details = {}, sourceEl = null) {
  if (sourceEl && typeof sourceEl === 'object') {
    const last = leadClickGuard.get(sourceEl) || 0
    const now = Date.now()
    if (now - last < 2000) return null
    leadClickGuard.set(sourceEl, now)
  }

  return pushDataLayer(
    baseEventPayload({
      event: 'contact',
      event_name: 'Contact',
      content_name: details.content_name || 'WhatsApp Contact',
      content_category: details.content_category || 'contact',
      contact_method: details.contact_method || 'whatsapp',
      lead_source: details.lead_source || 'whatsapp',
    }),
  )
}

/** begin_checkout / InitiateCheckout — once when booking form is focused/opened. */
export function trackBeginCheckout(details = {}) {
  if (beginCheckoutFired) return null
  beginCheckoutFired = true

  return pushDataLayer(
    baseEventPayload({
      event: 'begin_checkout',
      event_name: 'InitiateCheckout',
      content_name: details.content_name || 'Quick Booking',
      currency: details.currency || 'BDT',
    }),
  )
}

export function extractGtmId(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''
  if (GTM_ID_RE.test(text)) return text.toUpperCase()
  const found = text.match(GTM_ID_IN_TEXT_RE)
  return found ? found[0].toUpperCase() : ''
}

export function buildDefaultHeadSnippet(gtmId) {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`
}

export function buildDefaultHeadHtml(gtmId) {
  return `<!-- Google Tag Manager -->
<script>${buildDefaultHeadSnippet(gtmId)}</script>
<!-- End Google Tag Manager -->`
}

export function buildDefaultBodyHtml(gtmId) {
  return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`
}

function buildDefaultBodyIframe(gtmId) {
  return `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe>`
}

/**
 * Normalize admin paste: bare GTM-XXXX → standard head + body snippets.
 * If only one side has an ID and the other is empty, derive the missing side.
 */
export function normalizeGtmSettings(settings = {}) {
  const head = String(settings.gtmHeadCode || '').trim()
  const body = String(settings.gtmBodyCode || '').trim()
  const bareHead = GTM_ID_RE.test(head)
  const bareBody = GTM_ID_RE.test(body)

  if (bareHead || bareBody) {
    const id = (bareHead ? head : body).toUpperCase()
    return {
      ...settings,
      gtmHeadCode: buildDefaultHeadHtml(id),
      gtmBodyCode: buildDefaultBodyHtml(id),
      ga4MeasurementId: String(settings.ga4MeasurementId || '').trim(),
      fbPixelId: String(settings.fbPixelId || '').trim(),
    }
  }

  const idFromHead = extractGtmId(head)
  const idFromBody = extractGtmId(body)
  let nextHead = head
  let nextBody = body

  if (head && !body && idFromHead) {
    nextBody = buildDefaultBodyHtml(idFromHead)
  } else if (body && !head && idFromBody) {
    nextHead = buildDefaultHeadHtml(idFromBody)
  }

  return {
    ...settings,
    gtmHeadCode: nextHead,
    gtmBodyCode: nextBody,
    ga4MeasurementId: String(settings.ga4MeasurementId || '').trim(),
    fbPixelId: String(settings.fbPixelId || '').trim(),
  }
}

function clearMarkedNodes(attr) {
  if (typeof document === 'undefined') return
  document.querySelectorAll(`[${attr}]`).forEach((node) => node.remove())
}

function appendExecutableScript(sourceText, attributes = {}) {
  const script = document.createElement('script')
  script.setAttribute(GTM_HEAD_ATTR, '1')
  Object.entries(attributes).forEach(([key, value]) => {
    if (value != null && key !== 'src') script.setAttribute(key, value)
  })
  if (attributes.src) {
    script.src = attributes.src
    script.async = attributes.async !== 'false'
  } else {
    script.text = sourceText
  }
  document.head.appendChild(script)
  return script
}

/**
 * Inject or replace GTM head snippet. Accepts full paste or bare GTM-XXXX.
 * Ensures dataLayer exists before GTM boots.
 */
export function applyGtmHead(raw) {
  ensureDataLayer()
  clearMarkedNodes(GTM_HEAD_ATTR)

  const text = String(raw || '').trim()
  if (!text) return

  const bareId = GTM_ID_RE.test(text) ? text.toUpperCase() : ''
  if (bareId) {
    appendExecutableScript(buildDefaultHeadSnippet(bareId))
    return
  }

  const template = document.createElement('template')
  template.innerHTML = text

  const scripts = template.content.querySelectorAll('script')
  if (scripts.length) {
    scripts.forEach((oldScript) => {
      const attrs = {}
      Array.from(oldScript.attributes).forEach((attr) => {
        attrs[attr.name] = attr.value
      })
      appendExecutableScript(oldScript.textContent || '', attrs)
    })
    return
  }

  const gtmId = extractGtmId(text)
  if (gtmId && !text.includes('googletagmanager.com/gtm.js')) {
    appendExecutableScript(buildDefaultHeadSnippet(gtmId))
    return
  }

  appendExecutableScript(text)
}

/**
 * Inject or replace GTM body noscript/iframe near start of <body>.
 */
export function applyGtmBody(raw) {
  clearMarkedNodes(GTM_BODY_ATTR)

  const text = String(raw || '').trim()
  if (!text || typeof document === 'undefined') return

  let html = text
  if (GTM_ID_RE.test(text)) {
    html = buildDefaultBodyIframe(text.toUpperCase())
  } else {
    const gtmId = extractGtmId(text)
    if (gtmId && !/iframe/i.test(text)) {
      html = buildDefaultBodyIframe(gtmId)
    }
  }

  const wrapper = document.createElement('noscript')
  wrapper.setAttribute(GTM_BODY_ATTR, '1')

  const template = document.createElement('template')
  template.innerHTML = html
  const nestedNoscript = template.content.querySelector('noscript')
  if (nestedNoscript) {
    wrapper.innerHTML = nestedNoscript.innerHTML
  } else {
    wrapper.innerHTML = html
  }

  const body = document.body
  if (body.firstChild) {
    body.insertBefore(wrapper, body.firstChild)
  } else {
    body.appendChild(wrapper)
  }
}

/** Apply both snippets; clearing either field removes that injection. */
export function applyGtmSnippets({ head = '', body = '' } = {}) {
  ensureDataLayer()
  applyGtmHead(head)
  applyGtmBody(body)
}

/** Hook-friendly: track ViewContent when element is ~50% visible once. */
export function observeViewContent(element, item) {
  if (!element || typeof IntersectionObserver === 'undefined') return () => {}

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
          trackViewContent(item)
          observer.disconnect()
        }
      })
    },
    { threshold: [0.45, 0.6] },
  )

  observer.observe(element)
  return () => observer.disconnect()
}
