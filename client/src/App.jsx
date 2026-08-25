import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation, Pagination } from 'swiper/modules'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Clock,
  Code2,
  Globe,
  Home,
  Image,
  LayoutDashboard,
  Leaf,
  LogOut,
  Mail,
  MapPin,
  Maximize2,
  Menu,
  ArrowRight,
  MessageCircle,
  Pencil,
  Phone,
  Play,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Truck,
  Video,
  X,
} from 'lucide-react'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import reviewsPageDefaults from './reviewsPageDefaults.js'
import contactPageDefaults, { BUSINESS_ADDRESS } from './contactPageDefaults.js'
import pricingDefaults, { landingPricingDefaults } from './pricingDefaults.js'
import { landingComparisonDefaults, homeComparisonDefaults } from './comparisonDefaults.js'
import landingDefaults, { landingLiveDemoCta, landingWhatsappCta } from './landingDefaults.js'
import homeDefaults, { englishSiteChromeSettings } from './homeDefaults.js'
import { legalPagesBySlug } from './legalPageContent.js'
import { bottomNavHomeItem, bottomNavSideItems, navItems, siteChrome } from './siteChrome.js'
import { useScrollSideIn, sideInAttr } from './useScrollSideIn.js'
import GtmSnippets from './components/GtmSnippets.jsx'
import {
  normalizeGtmSettings,
  observeViewContent,
  trackBeginCheckout,
  trackContact,
  trackLead,
  trackPageView,
  trackViewContent,
} from './tracking'

const API_BASE =
  import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== null
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
    : import.meta.env.DEV
      ? 'http://localhost:5000'
      : ''
const AUTH_TOKEN_KEY = 'iot_admin_token'

const getAuthToken = () => {
  try {
    return String(localStorage.getItem(AUTH_TOKEN_KEY) || '').trim()
  } catch {
    return ''
  }
}

const setAuthToken = (token) => {
  const value = String(token || '').trim()
  if (!value) {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    return
  }
  localStorage.setItem(AUTH_TOKEN_KEY, value)
}

const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

const authHeaders = (extra = {}) => {
  const token = getAuthToken()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra }
}

// Register once at module load so child effects (ProtectedAdmin) never race without auth headers.
axios.interceptors.request.use((config) => {
  const url = String(config.url || '')
  const isApiRequest = API_BASE
    ? url.startsWith(API_BASE) || url.startsWith('/api') || url.startsWith('/uploads')
    : url.startsWith('/api') || url.startsWith('/uploads')
  if (isApiRequest) {
    const token = getAuthToken()
    if (token) {
      config.headers = config.headers || {}
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  }
  return config
})

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const requestUrl = String(error.config?.url || '')
    const isLoginRequest = requestUrl.includes('/api/auth/login')
    const isVerifyRequest = requestUrl.includes('/api/auth/verify')
    const onAdminRoute =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

    // Clear session only on real auth rejection for protected admin APIs (not verify race/network).
    if (
      status === 401 &&
      !isLoginRequest &&
      !isVerifyRequest &&
      onAdminRoute &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/admin/login'
    ) {
      clearAuthToken()
      window.location.assign('/admin/login')
    }

    return Promise.reject(error)
  },
)

/** Make /uploads/... and other relative media paths load from the API host. */
const resolveMediaUrl = (url) => {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  if (value.startsWith('//')) return `${window.location.protocol}${value}`
  if (value.startsWith('/uploads/')) return `${API_BASE}${value}`
  if (value.startsWith('/')) return value
  return value
}

const withResolvedMedia = (item) => {
  if (!item || typeof item !== 'object') return item
  return {
    ...item,
    imageUrl: item.imageUrl ? resolveMediaUrl(item.imageUrl) : item.imageUrl,
    thumbnailUrl: item.thumbnailUrl ? resolveMediaUrl(item.thumbnailUrl) : item.thumbnailUrl,
    videoUrl: item.videoUrl ? resolveMediaUrl(item.videoUrl) : item.videoUrl,
  }
}

const DEFAULT_LOGO_URL = '/logo-iotprogrammers.png'

const fallbackContent = {
  siteSettings: {
    logoText: 'IP',
    logoUrl: DEFAULT_LOGO_URL,
    brandName: 'IoTProgrammers',
    whatsappNumber: '01302003306',
    address: BUSINESS_ADDRESS,
    ...englishSiteChromeSettings,
    facebookUrl: 'https://facebook.com',
    footerPrivacyUrl: '/privacy-policy',
    footerTermsUrl: '/terms-of-service',
    footerCookieUrl: '/cookie-policy',
    footerRefundUrl: '/refund-policy',
    contactEmail: 'iotprogrammers@gmail.com',
    contactPhone: '01302003306',
    gtmHeadCode: '',
    gtmBodyCode: '',
    ga4MeasurementId: '',
    fbPixelId: '',
  },
  home: homeDefaults,
  landing: landingDefaults,
  contact: contactPageDefaults,
  pricing: pricingDefaults,
  reviewsPage: reviewsPageDefaults,
}

const stripMongoMeta = (value) => {
  if (Array.isArray(value)) return value.map(stripMongoMeta)
  if (!value || typeof value !== 'object') return value

  const next = {}
  for (const [key, nested] of Object.entries(value)) {
    if (key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt' || key.startsWith('$')) continue
    next[key] = stripMongoMeta(nested)
  }
  return next
}

const mergeContentWithDefaults = (incoming = {}) => {
  const clean = stripMongoMeta(incoming)
  return {
    ...fallbackContent,
    ...clean,
    siteSettings: { ...fallbackContent.siteSettings, ...clean.siteSettings },
    home: {
      ...fallbackContent.home,
      ...clean.home,
      heroSlides:
        Array.isArray(clean.home?.heroSlides) && clean.home.heroSlides.length
          ? clean.home.heroSlides
          : fallbackContent.home.heroSlides,
      featureCards:
        Array.isArray(clean.home?.featureCards) && clean.home.featureCards.length
          ? clean.home.featureCards
          : fallbackContent.home.featureCards,
      demoCards:
        Array.isArray(clean.home?.demoCards) && clean.home.demoCards.length
          ? clean.home.demoCards
          : fallbackContent.home.demoCards,
      comparison: { ...homeComparisonDefaults, ...clean.home?.comparison },
    },
    landing: {
      ...fallbackContent.landing,
      ...clean.landing,
      demoCards:
        Array.isArray(clean.landing?.demoCards) && clean.landing.demoCards.length
          ? clean.landing.demoCards
          : fallbackContent.landing.demoCards,
      reviews:
        Array.isArray(clean.landing?.reviews) && clean.landing.reviews.length
          ? clean.landing.reviews
          : fallbackContent.landing.reviews,
      gallery:
        Array.isArray(clean.landing?.gallery) && clean.landing.gallery.length
          ? clean.landing.gallery
          : fallbackContent.landing.gallery,
      faqItems:
        Array.isArray(clean.landing?.faqItems) && clean.landing.faqItems.length
          ? clean.landing.faqItems
          : fallbackContent.landing.faqItems,
      comparison: { ...landingComparisonDefaults, ...clean.landing?.comparison },
      pricing: {
        ...landingPricingDefaults,
        ...clean.landing?.pricing,
        plans:
          Array.isArray(clean.landing?.pricing?.plans) && clean.landing.pricing.plans.length
            ? clean.landing.pricing.plans
            : landingPricingDefaults.plans,
      },
    },
    contact: {
      ...fallbackContent.contact,
      ...clean.contact,
      hours:
        Array.isArray(clean.contact?.hours) && clean.contact.hours.length
          ? clean.contact.hours
          : fallbackContent.contact.hours,
    },
    reviewsPage: {
      ...reviewsPageDefaults,
      ...clean.reviewsPage,
      featuredReviews: Array.isArray(clean.reviewsPage?.featuredReviews)
        ? clean.reviewsPage.featuredReviews
        : reviewsPageDefaults.featuredReviews,
      reviews: Array.isArray(clean.reviewsPage?.reviews)
        ? clean.reviewsPage.reviews
        : reviewsPageDefaults.reviews,
    },
    pricing: {
      ...pricingDefaults,
      ...clean.pricing,
      plans:
        Array.isArray(clean.pricing?.plans) && clean.pricing.plans.length
          ? clean.pricing.plans
          : pricingDefaults.plans,
    },
  }
}

const staleWhatsappCtaTexts = new Set(['Contact now', 'Contact Now'])

const resolveWhatsappLabel = (text, fallback = siteChrome.whatsappCta) => {
  const value = String(text || '').trim()
  if (!value || staleWhatsappCtaTexts.has(value)) {
    return fallback
  }
  return value
}

const createEmptyItem = (type = 'generic') => {
  const base = {
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    thumbnailUrl: '',
    videoUrl: '',
    liveUrl: '',
    username: '',
    password: '',
    whatsappText: siteChrome.whatsappCta,
    keyFeatures: [],
    rating: 5,
    type: 'image',
    status: 'published',
    addedAt: new Date().toISOString(),
  }

  if (type === 'review') {
    return {
      ...base,
      title: 'Customer Name',
      category: 'General Servicing',
      description: '',
      rating: 5,
    }
  }

  if (type === 'featuredReview') {
    return {
      ...base,
      title: 'Customer Name',
      subtitle: 'Google Review',
      description: '',
      rating: 5,
    }
  }

  if (type === 'hero') {
    return {
      ...base,
      badge: 'IoTProgrammers',
      title: 'Banner headline',
      subtitle: 'Banner subtitle text',
      ctaText: siteChrome.whatsappCta,
      ctaLink: 'https://wa.me/8801302003306',
    }
  }

  if (type === 'feature') {
    return {
      ...base,
      icon: 'shield',
      title: 'Feature title',
      description: 'Feature description',
    }
  }

  if (type === 'gallery') {
    return { ...base, title: 'Gallery item', type: 'image' }
  }

  if (type === 'demo') {
    return {
      ...base,
      title: 'Demo title',
      username: 'admin',
      password: '123456',
      liveUrl: 'https://example.com/demo',
    }
  }

  if (type === 'faq') {
    return {
      ...base,
      title: 'Write your question here?',
      description: 'Write the answer here.',
    }
  }

  return base
}

const getWhatsappLink = (number) => {
  const digits = String(number || '01302003306').replace(/\D/g, '').replace(/^0+/, '')
  return `https://wa.me/88${digits}`
}

const getWhatsappLinkWithMessage = (number, message) => {
  const base = getWhatsappLink(number)
  const text = String(message || '').trim()
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

const BOOKING_SERVICE_OPTIONS = [
  'Landing Page',
  'Portfolio',
  'Demo Showcase',
  'MERN + Admin',
  'Other',
]

const buildBookingWhatsAppMessage = (form) => {
  const lines = [
    '*Quick Booking – IoTProgrammers*',
    '',
    `*Name:* ${form.name.trim()}`,
    `*Phone:* ${form.phone.trim()}`,
  ]

  if (form.district.trim()) {
    lines.push(`*District/City:* ${form.district.trim()}`)
  }

  if (form.serviceType) {
    lines.push(`*Service:* ${form.serviceType}`)
  }

  if (form.address.trim()) {
    lines.push(`*Address/Location:* ${form.address.trim()}`)
  }

  if (form.details.trim()) {
    lines.push('')
    lines.push('*Project Details:*')
    lines.push(form.details.trim())
  }

  return lines.join('\n')
}

const isWhatsappLink = (url) => /wa\.me/i.test(url || '')

const isWhatsappCtaText = (text) => /^(contact\s*now|whatsapp(\s*now|(\s*us)?)?)$/i.test(String(text || '').trim())

const isDirectVideoFile = (url) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || '')

const extractYoutubeId = (url) => {
  if (!url) return ''

  try {
    const parsed = new URL(url.trim())
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || ''
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const fromQuery = parsed.searchParams.get('v')
      if (fromQuery) return fromQuery

      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') {
        return parts[1] || ''
      }
    }
  } catch {
    const fallback =
      url.match(/[?&]v=([^&]+)/)?.[1] ||
      url.match(/youtu\.be\/([^?&/]+)/)?.[1] ||
      url.match(/\/embed\/([^?&/]+)/)?.[1] ||
      url.match(/\/shorts\/([^?&/]+)/)?.[1]
    return fallback || ''
  }

  return ''
}

const getPlayableVideoUrl = (url, { autoplay = true, muted = false } = {}) => {
  if (!url) return ''

  const trimmed = String(url).trim()
  if (!trimmed) return ''

  if (isDirectVideoFile(trimmed)) {
    return trimmed
  }

  const youtubeId = extractYoutubeId(trimmed)
  if (youtubeId) {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      mute: muted ? '1' : '0',
      playsinline: '1',
      rel: '0',
      controls: '1',
      modestbranding: '1',
    })

    if (typeof window !== 'undefined' && window.location?.origin) {
      params.set('origin', window.location.origin)
    }

    return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`
  }

  if (/youtube\.com\/embed\//i.test(trimmed)) {
    const separator = trimmed.includes('?') ? '&' : '?'
    return autoplay
      ? `${trimmed}${separator}autoplay=1&mute=${muted ? '1' : '0'}&playsinline=1&rel=0&controls=1`
      : trimmed
  }

  return trimmed
}

const VIDEO_PLAY_EVENT = 'iot-exclusive-video-play'

const requestExclusiveVideoPlay = (playerId) => {
  window.dispatchEvent(new CustomEvent(VIDEO_PLAY_EVENT, { detail: { playerId } }))
}

const useExclusiveVideo = (playerId, onForeignPlay) => {
  useEffect(() => {
    const handlePlay = (event) => {
      if (event.detail?.playerId === playerId) return
      onForeignPlay()
    }

    window.addEventListener(VIDEO_PLAY_EVENT, handlePlay)
    return () => window.removeEventListener(VIDEO_PLAY_EVENT, handlePlay)
  }, [playerId, onForeignPlay])
}

const getYoutubeThumbnail = (url) => {
  const id = extractYoutubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
}

const getGalleryThumbnail = (item) => {
  if (item.thumbnailUrl) return item.thumbnailUrl
  if (item.imageUrl) return item.imageUrl
  if (item.type === 'video' && item.videoUrl) return getYoutubeThumbnail(item.videoUrl)
  return ''
}

const featureIconMap = {
  shield: ShieldCheck,
  leaf: Leaf,
  truck: Truck,
  message: MessageCircle,
  globe: Globe,
  home: Home,
  sparkles: Sparkles,
}

const reviewIdentityKey = (review) =>
  review._id || `${review.title || ''}|${review.description?.slice(0, 80) || ''}`

const mergeReviewsWithoutDuplicates = (...lists) => {
  const seen = new Set()
  const merged = []

  lists.flat().forEach((review) => {
    if (!review) return
    const key = reviewIdentityKey(review)
    if (seen.has(key)) return
    seen.add(key)
    merged.push(review)
  })

  return merged
}

const getPageReviews = (content, source = 'all') => {
  const reviewsPageReviews = content.reviewsPage?.reviews || []
  const landingReviews = content.landing?.reviews || []
  const featuredReviews = content.reviewsPage?.featuredReviews || []

  if (source === 'landing') {
    if (reviewsPageReviews.length) {
      return reviewsPageReviews
    }

    const fallbackReviews = mergeReviewsWithoutDuplicates(landingReviews, featuredReviews)
    if (fallbackReviews.length) {
      return fallbackReviews
    }

    return []
  }

  if (reviewsPageReviews.length) {
    return reviewsPageReviews
  }

  return landingReviews
}

const groupReviewsByCategory = (reviews) => {
  const groups = new Map()

  reviews.forEach((review) => {
    const category = review.category?.trim() || 'General'
    if (!groups.has(category)) {
      groups.set(category, [])
    }
    groups.get(category).push(review)
  })

  return Array.from(groups.entries())
}

const renderReviewDescription = (text) => {
  if (!text) return null

  return text.split('\n\n').map((paragraph, paragraphIndex) => (
    <span key={`paragraph-${paragraphIndex}`}>
      {paragraphIndex > 0 ? (
        <>
          <br />
          <br />
        </>
      ) : null}
      {paragraph.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`bold-${paragraphIndex}-${index}`}>{part.slice(2, -2)}</strong>
        }

        return part
      })}
    </span>
  ))
}

const renderStarRow = (rating = 5, className) => <div className={className}>{'★'.repeat(rating)}</div>

const getReviewerInitial = (name) => {
  const trimmed = String(name || 'C').trim()
  return trimmed.charAt(0).toUpperCase()
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
}

function App() {
  const [content, setContent] = useState(fallbackContent)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/content`, {
          headers: { 'Cache-Control': 'no-store' },
          params: { t: Date.now() },
        })
        setContent(mergeContentWithDefaults(response.data))
        setError('')
      } catch {
        setError('Backend unavailable. Showing fallback content.')
      } finally {
        setLoading(false)
      }
    }

    fetchContent()

    const refetchOnFocus = () => {
      if (window.location.pathname.startsWith('/admin')) return
      fetchContent()
    }

    window.addEventListener('focus', refetchOnFocus)
    return () => window.removeEventListener('focus', refetchOnFocus)
  }, [])

  const sharedProps = useMemo(
    () => ({
      content,
      setContent,
      loading,
      error,
    }),
    [content, loading, error]
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<SiteLayout {...sharedProps} />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdmin>
              <AdminPage
                {...sharedProps}
              />
            </ProtectedAdmin>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

function SiteLayout({ content, loading, error }) {
  const location = useLocation()
  const isLanding = location.pathname === '/landing'
  const isReviews = location.pathname === '/reviews'
  const isContact = location.pathname === '/contact'

  useEffect(() => {
    document.body.classList.toggle('reviews-route-body', isReviews)
    document.body.classList.toggle('contact-route-body', isContact)
    return () => {
      document.body.classList.remove('reviews-route-body')
      document.body.classList.remove('contact-route-body')
    }
  }, [isReviews, isContact])

  useEffect(() => {
    scrollToTop()
  }, [location.pathname])

  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])

  return (
    <div className={`app-frame${isLanding ? ' landing-route' : ''}${isReviews ? ' reviews-route' : ''}${isContact ? ' contact-route' : ''}`}>
      <GtmSnippets siteSettings={content.siteSettings} />
      <SiteHeader content={content} variant="dark" />
      {isLanding && <LandingIntroSection content={content} />}
      <div className={`app-shell${isLanding ? ' landing-shell' : ''}${isReviews ? ' reviews-shell' : ''}${isContact ? ' contact-shell' : ''}`}>
        {loading && <div className="status-banner">{siteChrome.loading}</div>}
        {error && (
          <div className="status-banner warning">
            {error === 'Backend unavailable. Showing fallback content.' ? siteChrome.backendError : error}
          </div>
        )}
        <main className={`page-shell${isReviews ? ' reviews-page-shell' : ''}${isContact ? ' contact-page-shell' : ''}`}>
          <Routes>
            <Route path="/" element={<HomePage content={content} />} />
            <Route path="/home" element={<HomePage content={content} />} />
            <Route path="/landing" element={<LandingPage content={content} />} />
            <Route path="/reviews" element={<ReviewsPage content={content} />} />
            <Route path="/contact" element={<ContactPage content={content} />} />
            <Route path="/privacy-policy" element={<SimpleTextPage slug="privacy-policy" />} />
            <Route path="/terms-of-service" element={<SimpleTextPage slug="terms-of-service" />} />
            <Route path="/cookie-policy" element={<SimpleTextPage slug="cookie-policy" />} />
            <Route path="/refund-policy" element={<SimpleTextPage slug="refund-policy" />} />
          </Routes>
        </main>
      </div>
      {!isReviews && <SiteFooter content={content} />}
      <FloatingWhatsapp number={content.siteSettings.whatsappNumber} />
      <BottomNav />
    </div>
  )
}

function SiteHeader({ content, variant = 'dark' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const settings = content.siteSettings || {}
  const brandName = settings.brandName || 'IoTProgrammers'
  const brandLabel = String(brandName).replace(/IoT\s*Programmers/i, 'IoT Programmers').replace(/^IoTProgrammers$/i, 'IoT Programmers')
  const logoUrl = resolveMediaUrl(String(settings.logoUrl || '').trim() || DEFAULT_LOGO_URL)

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className={`site-header-wrap${variant === 'light' ? ' site-header-wrap-light' : ''}`}>
      <header className={`site-header${variant === 'light' ? ' site-header-light' : ''}`}>
        <div className="site-header-inner">
          <NavLink to="/" className="brand-lockup" onClick={closeMenu} aria-label={brandLabel}>
            {logoUrl ? (
              <img src={logoUrl} alt="" className="brand-logo-img" />
            ) : (
              <div className="brand-logo">{settings.logoText || 'IP'}</div>
            )}
            <span className="brand-title">{brandLabel}</span>
          </NavLink>

          <div className="header-actions">
            <nav className="header-nav">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `header-link${isActive ? ' active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <button
              type="button"
              className="header-menu-btn"
              aria-label={menuOpen ? siteChrome.closeMenu : siteChrome.openMenu}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="header-dropdown">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={closeMenu}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function BottomNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const bottomNavItems = [...bottomNavSideItems.slice(0, 2), bottomNavHomeItem, ...bottomNavSideItems.slice(2)]

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleNavClick = () => {
    scrollToTop()
  }

  const openMenu = () => {
    scrollToTop()
    setMenuOpen(true)
  }

  const closeMenu = () => {
    setMenuOpen(false)
  }

  const renderBottomNavLink = (item) => {
    const Icon = item.icon

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={handleNavClick}
        className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
      >
        <Icon size={20} strokeWidth={1.75} />
        <span>{item.label}</span>
      </NavLink>
    )
  }

  return (
    <>
      <nav
        className="bottom-nav"
        aria-label={siteChrome.navAria}
        style={{ height: 'calc(55px + env(safe-area-inset-bottom, 0px))' }}
      >
        {bottomNavSideItems.slice(0, 2).map(renderBottomNavLink)}

        <NavLink
          to={bottomNavHomeItem.to}
          onClick={handleNavClick}
          className={({ isActive }) => `bottom-nav-center${isActive ? ' active' : ''}`}
          aria-label={bottomNavHomeItem.label}
        >
          <span className="bottom-nav-center-bump" aria-hidden="true" />
          <img src="/assets/home-button.gif" alt="" className="bottom-nav-center-img" />
        </NavLink>

        {bottomNavSideItems.slice(2).map(renderBottomNavLink)}

        <button type="button" className="bottom-nav-link bottom-nav-menu" onClick={openMenu}>
          <Menu size={20} strokeWidth={1.75} />
          <span>{siteChrome.menu}</span>
        </button>
      </nav>

      {menuOpen && (
        <div className="bottom-menu-overlay" onClick={closeMenu}>
          <div className="bottom-menu-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="bottom-menu-header">
              <h3>{siteChrome.menu}</h3>
              <button type="button" className="bottom-menu-close" onClick={closeMenu} aria-label={siteChrome.closeMenu}>
                <X size={18} />
              </button>
            </div>
            {bottomNavItems.map((item) => (
              <NavLink key={`menu-${item.to}`} to={item.to} end={item.end} onClick={() => { closeMenu(); handleNavClick() }}>
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/privacy-policy" onClick={() => { closeMenu(); handleNavClick() }}>{siteChrome.privacy}</NavLink>
            <NavLink to="/terms-of-service" onClick={() => { closeMenu(); handleNavClick() }}>{siteChrome.terms}</NavLink>
            <NavLink to="/cookie-policy" onClick={() => { closeMenu(); handleNavClick() }}>{siteChrome.cookies}</NavLink>
            <NavLink to="/refund-policy" onClick={() => { closeMenu(); handleNavClick() }}>{siteChrome.refund}</NavLink>
          </div>
        </div>
      )}
    </>
  )
}

function FloatingWhatsapp({ number }) {
  return (
    <a
      className="floating-whatsapp"
      href={getWhatsappLink(number || '01302003306')}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      onClick={(event) => {
        trackContact(
          { content_name: 'Floating WhatsApp', lead_source: 'floating_whatsapp' },
          event.currentTarget,
        )
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="floating-whatsapp-icon">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  )
}

function SiteFooter({ content }) {
  const settings = content.siteSettings || {}
  const brandName = settings.brandName || 'IoTProgrammers'
  const brandLabel = String(brandName).replace(/IoT\s*Programmers/i, 'IoT Programmers').replace(/^IoTProgrammers$/i, 'IoT Programmers')
  const logoUrl = resolveMediaUrl(String(settings.logoUrl || '').trim() || DEFAULT_LOGO_URL)
  const phone = settings.contactPhone || settings.whatsappNumber || '01302003306'
  const whatsappHref = getWhatsappLink(settings.whatsappNumber || phone)
  const tagline = englishSiteChromeSettings.footerTagline
  const about = englishSiteChromeSettings.footerAbout
  const privacyLabel = englishSiteChromeSettings.footerPrivacyLabel
  const termsLabel = englishSiteChromeSettings.footerTermsLabel
  const cookieLabel = englishSiteChromeSettings.footerCookieLabel || siteChrome.cookies
  const refundLabel = englishSiteChromeSettings.footerRefundLabel || siteChrome.refund
  const facebookLabel = englishSiteChromeSettings.facebookLabel
  const copyright = englishSiteChromeSettings.copyrightText
  const privacyUrl = settings.footerPrivacyUrl || '/privacy-policy'
  const termsUrl = settings.footerTermsUrl || '/terms-of-service'
  const cookieUrl = settings.footerCookieUrl || '/cookie-policy'
  const refundUrl = settings.footerRefundUrl || '/refund-policy'

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div className="site-footer-brand-lockup">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="site-footer-logo" />
            ) : null}
            <h3 className="site-footer-brand-name">{brandLabel}</h3>
          </div>
          {tagline && <p className="site-footer-tagline">{tagline}</p>}
          {about && <p className="site-footer-about">{about}</p>}
        </div>

        <div className="site-footer-grid">
          <div className="site-footer-col">
            <h4 className="site-footer-heading">{siteChrome.linksHeading}</h4>
            <nav className="site-footer-list" aria-label={siteChrome.footerLinksAria}>
              <NavLink to="/">{siteChrome.home}</NavLink>
              <NavLink to="/landing">{siteChrome.landing}</NavLink>
              <NavLink to="/reviews">{siteChrome.reviews}</NavLink>
              <NavLink to="/contact">{siteChrome.contact}</NavLink>
              {settings.facebookUrl && (
                <a href={settings.facebookUrl} target="_blank" rel="noreferrer" className="site-footer-social">
                  {facebookLabel}
                </a>
              )}
            </nav>
          </div>

          <div className="site-footer-col">
            <h4 className="site-footer-heading">{siteChrome.contactHeading}</h4>
            <div className="site-footer-list">
              {settings.address && <p className="site-footer-address">{settings.address}</p>}
              {phone && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    trackContact(
                      { content_name: 'Footer WhatsApp', lead_source: 'footer_whatsapp' },
                      event.currentTarget,
                    )
                  }}
                >
                  {phone} (WhatsApp)
                </a>
              )}
              {settings.contactEmail && (
                <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
              )}
            </div>
          </div>

          <div className="site-footer-col">
            <h4 className="site-footer-heading">{siteChrome.legalHeading}</h4>
            <nav className="site-footer-list" aria-label={siteChrome.legalLinksAria}>
              <NavLink to={privacyUrl}>{privacyLabel}</NavLink>
              <NavLink to={termsUrl}>{termsLabel}</NavLink>
              <NavLink to={cookieUrl}>{cookieLabel}</NavLink>
              <NavLink to={refundUrl}>{refundLabel}</NavLink>
            </nav>
          </div>

          <div className="site-footer-col">
            <h4 className="site-footer-heading">{siteChrome.servicesHeading}</h4>
            <div className="site-footer-list">
              {siteChrome.services.map((service) => (
                <p key={service}>{service}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>{copyright}</p>
      </div>
    </footer>
  )
}

function LandingIntroSection({ content }) {
  const rootRef = useRef(null)
  const playerId = useId()
  const videoRef = useRef(null)
  const [introActive, setIntroActive] = useState(true)
  const introVideoUrl = resolveMediaUrl(content.landing?.introVideoUrl?.trim())
  // Mobile browsers block unmuted autoplay — mute is required for real-device autoplay.
  const landingVideoSrc = introVideoUrl
    ? getPlayableVideoUrl(introVideoUrl, { autoplay: introActive, muted: true })
    : ''
  const isFileVideo = Boolean(introVideoUrl && isDirectVideoFile(introVideoUrl))

  useScrollSideIn(rootRef, [content.landing?.headline, content.landing?.featuresText])

  useExclusiveVideo(playerId, () => {
    setIntroActive(false)
    videoRef.current?.pause()
  })

  useEffect(() => {
    if (!isFileVideo || !videoRef.current || !introActive) return undefined

    const video = videoRef.current
    video.muted = true
    video.defaultMuted = true
    video.setAttribute('muted', '')
    video.playsInline = true
    const playPromise = video.play()
    playPromise?.catch?.(() => {})

    return undefined
  }, [isFileVideo, landingVideoSrc, introActive])

  const resumeIntro = () => {
    setIntroActive(true)
    requestExclusiveVideoPlay(playerId)
  }

  return (
    <section ref={rootRef} className="landing-intro-hero section-blend">
      <div className="landing-video-wrap" onClick={resumeIntro}>
        {landingVideoSrc ? (
          isFileVideo ? (
            <video
              ref={videoRef}
              className="landing-video-player"
              src={introVideoUrl}
              autoPlay={introActive}
              muted
              loop
              playsInline
              controls
              preload="auto"
              onPlay={resumeIntro}
            />
          ) : (
            <iframe
              key={introActive ? 'intro-on-muted' : 'intro-off'}
              src={landingVideoSrc}
              title="Landing intro video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )
        ) : (
          <div className="landing-video-placeholder">
            <p>অ্যাডমিন থেকে ল্যান্ডিং ইন্ট্রো ভিডিও যোগ করুন।</p>
          </div>
        )}
      </div>

      <div className="landing-intro-copy" data-animate={sideInAttr(0)}>
        <p className="eyebrow">IoTProgrammers</p>
        <h2>{content.landing?.headline || 'হাই-কনভার্টিং MERN ডেমো ও পোর্টফোলিও ওয়েবসাইট লঞ্চ করুন'}</h2>
        <p>{content.landing?.featuresText || 'কাস্টম ল্যান্ডিং পেজ, ডেমো কার্ড, ক্লায়েন্ট রিভিউ, ইমেজ-ভিডিও গ্যালারি এবং WhatsApp CTA। সবকিছু অ্যাডমিন থেকে এডিট করা যায়।'}</p>
      </div>
    </section>
  )
}

function VideoLightbox({ open, url, title, isFile, onClose }) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !url) return null

  return createPortal(
    <div className="video-lightbox" role="dialog" aria-modal="true" aria-label={title || 'Video player'} onClick={onClose}>
      <div className="video-lightbox-panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="video-lightbox-close" onClick={onClose} aria-label="Close video">
          <X size={22} />
        </button>
        {isFile ? (
          <video className="video-lightbox-player" src={url} title={title} controls autoPlay playsInline />
        ) : (
          <iframe
            className="video-lightbox-player"
            src={url}
            title={title || 'Demo video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    </div>,
    document.body,
  )
}

function CardVideoMedia({
  title,
  videoUrl,
  thumbnailUrl,
  thumbnailAlt,
  discountBadge,
  mediaClassName = 'product-media',
  thumbnailClassName = 'product-thumbnail-button',
  onPlayReady,
}) {
  const playerId = useId()
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const resolvedVideoUrl = resolveMediaUrl(videoUrl)
  const resolvedThumb = resolveMediaUrl(thumbnailUrl)
  const playableUrl = getPlayableVideoUrl(resolvedVideoUrl, { autoplay: true, muted: false })
  const inlinePlayableUrl = getPlayableVideoUrl(resolvedVideoUrl, { autoplay: true, muted: false })
  const isFileVideo = isDirectVideoFile(resolvedVideoUrl)

  useExclusiveVideo(playerId, () => {
    setPlaying(false)
    setExpanded(false)
    videoRef.current?.pause()
  })

  const startInlinePlay = useCallback(() => {
    if (!inlinePlayableUrl) return
    requestExclusiveVideoPlay(playerId)
    setPlaying(true)
  }, [inlinePlayableUrl, playerId])

  useEffect(() => {
    onPlayReady?.(startInlinePlay)
  }, [onPlayReady, startInlinePlay])

  return (
    <>
      <div className={`${mediaClassName} card-video-media${playing ? ' is-playing' : ''}`}>
        {playing && inlinePlayableUrl ? (
          <>
            {isFileVideo ? (
              <div className="card-inline-frame">
                <video
                  ref={videoRef}
                  className="card-inline-video"
                  src={inlinePlayableUrl}
                  title={title}
                  controls
                  autoPlay
                  playsInline
                  onPlay={() => requestExclusiveVideoPlay(playerId)}
                />
              </div>
            ) : (
              <div className="card-inline-frame">
                <iframe
                  className="card-inline-video"
                  src={inlinePlayableUrl}
                  title={title || 'Demo video'}
                  width="100%"
                  height="100%"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            )}
            <button
              type="button"
              className="card-video-expand"
              onClick={() => {
                requestExclusiveVideoPlay(playerId)
                setExpanded(true)
              }}
              aria-label={`Expand ${title}`}
            >
              <Maximize2 size={18} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`thumbnail-button ${thumbnailClassName}`.trim()}
            onClick={startInlinePlay}
            disabled={!inlinePlayableUrl}
            aria-label={inlinePlayableUrl ? `Play ${title}` : 'Add a YouTube video URL in admin to play'}
          >
            <img src={resolvedThumb} alt={thumbnailAlt || title} />
            {discountBadge && <span className="product-discount">{discountBadge}</span>}
            {inlinePlayableUrl && (
              <span className="video-play-fab" aria-hidden="true">
                <span className="video-play-fab-inner">
                  <Play size={28} fill="currentColor" strokeWidth={0} />
                </span>
              </span>
            )}
          </button>
        )}
      </div>

      <VideoLightbox
        open={expanded}
        url={playableUrl}
        title={title}
        isFile={isFileVideo}
        onClose={() => setExpanded(false)}
      />
    </>
  )
}

function GalleryCard({ item, whatsappNumber, liveDemoLabel = siteChrome.liveDemo, whatsappFallback = landingWhatsappCta }) {
  const playVideoRef = useRef(null)
  const cardRef = useRef(null)
  const handlePlayReady = useCallback((play) => {
    playVideoRef.current = play
  }, [])
  const media = withResolvedMedia(item)
  const isVideo = media.type === 'video' || Boolean(media.videoUrl?.trim())
  const videoUrl = media.videoUrl?.trim() || ''
  const playableUrl = isVideo ? getPlayableVideoUrl(videoUrl) : ''
  const liveUrl = media.liveUrl?.trim() || ''
  const imageUrl = (media.imageUrl || media.thumbnailUrl)?.trim() || ''
  const whatsappLabel = resolveWhatsappLabel(media.whatsappText, whatsappFallback)
  const thumbnail = isVideo
    ? getGalleryThumbnail(media) || getYoutubeThumbnail(videoUrl)
    : media.imageUrl || media.thumbnailUrl

  useEffect(() => {
    return observeViewContent(cardRef.current, {
      id: media.id || media._id || media.title,
      name: media.title || 'Gallery item',
    })
  }, [media.id, media._id, media.title])

  const renderLiveDemoButton = () => {
    if (liveUrl) {
      return (
        <a
          href={liveUrl}
          target="_blank"
          rel="noreferrer"
          className="product-demo-link"
          onClick={() => trackViewContent({ id: media.id || media.title, name: media.title }, { force: true })}
        >
          {liveDemoLabel}
        </a>
      )
    }

    if (isVideo && playableUrl) {
      if (thumbnail) {
        return (
          <button
            type="button"
            className="product-demo-link"
            onClick={() => {
              trackViewContent({ id: media.id || media.title, name: media.title }, { force: true })
              playVideoRef.current?.()
            }}
          >
            {liveDemoLabel}
          </button>
        )
      }

      return (
        <a href={videoUrl || playableUrl} target="_blank" rel="noreferrer" className="product-demo-link">
          {liveDemoLabel}
        </a>
      )
    }

    if (!isVideo && imageUrl) {
      return (
        <a href={imageUrl} target="_blank" rel="noreferrer" className="product-demo-link">
          {liveDemoLabel}
        </a>
      )
    }

    return null
  }

  return (
    <article ref={cardRef} className="gallery-card">
      {isVideo && playableUrl ? (
        thumbnail ? (
          <CardVideoMedia
            title={media.title}
            videoUrl={videoUrl}
            thumbnailUrl={thumbnail}
            mediaClassName="gallery-media"
            thumbnailClassName="gallery-thumbnail-button"
            onPlayReady={handlePlayReady}
          />
        ) : isDirectVideoFile(videoUrl) ? (
          <div className="gallery-media">
            <video src={videoUrl} controls playsInline preload="metadata" title={media.title} />
          </div>
        ) : (
          <div className="gallery-media">
            <iframe
              src={getPlayableVideoUrl(videoUrl, { autoplay: false, muted: true })}
              title={media.title || 'Gallery video'}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )
      ) : (
        <img src={media.imageUrl || media.thumbnailUrl || thumbnail} alt={media.title || 'Gallery image'} />
      )}

      <div className="gallery-card-body product-body">
        <h3 className="product-title">{media.title}</h3>
        {renderLiveDemoButton()}
        <a
          href={getWhatsappLink(whatsappNumber)}
          target="_blank"
          rel="noreferrer"
          className="product-demo-link product-whatsapp-link"
          onClick={(event) => {
            trackContact(
              {
                content_name: media.title || 'Gallery WhatsApp',
                lead_source: 'gallery_whatsapp',
              },
              event.currentTarget,
            )
          }}
        >
          {whatsappLabel}
        </a>
      </div>
    </article>
  )
}

function LandingFaqSection({ landing }) {
  const [openIndex, setOpenIndex] = useState(0)
  const items = landing?.faqItems || []

  if (!items.length) return null

  const toggleItem = (index) => {
    setOpenIndex((current) => (current === index ? -1 : index))
  }

  return (
    <section className="landing-faq-section section-blend" aria-label="সাধারণ প্রশ্ন">
      <SectionHeader
        title={landing.faqTitle || 'সাধারণ প্রশ্ন'}
        subtitle={landing.faqSubtitle || 'ডেমো, ডেলিভারি, অ্যাডমিন কন্ট্রোল ও সাপোর্ট নিয়ে দ্রুত উত্তর।'}
      />
      <div className="landing-faq-list">
        {items.map((item, index) => {
          const isOpen = openIndex === index

          return (
            <article
              key={item._id || `${item.title}-${index}`}
              className={`landing-faq-item${isOpen ? ' open' : ''}`}
              data-animate={sideInAttr(index)}
            >
              <button type="button" className="landing-faq-question" onClick={() => toggleItem(index)} aria-expanded={isOpen}>
                <span>{item.title}</span>
                <ChevronDown size={20} aria-hidden="true" />
              </button>
              <div className="landing-faq-answer">
                <p>{item.description}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function parsePriceRows(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const highlight = line.startsWith('*')
      const clean = highlight ? line.slice(1).trim() : line
      const [label = '', price = ''] = clean.split('|').map((part) => part.trim())
      return { label, price, highlight }
    })
}

function parseListItems(text) {
  return String(text || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function ScopeCompareSection({ data, defaults }) {
  const scope = { ...defaults, ...(data || {}) }
  const included = parseListItems(scope.includedItems)
  const excluded = parseListItems(scope.excludedItems)

  return (
    <section className="ip-scope-section section-blend" aria-label={scope.includedTitle}>
      <div className="ip-scope-header" data-animate={sideInAttr(0)}>
        <h2>
          {scope.titlePrefix} <span>{scope.titleHighlight}</span>
        </h2>
        {scope.subtitle ? <p>{scope.subtitle}</p> : null}
      </div>
      <div className="ip-scope-wrap">
        <article className="ip-scope-card ip-scope-included" data-animate={sideInAttr(0)}>
          <h3>
            <span aria-hidden="true">✓</span> {scope.includedTitle}
          </h3>
          <ul>
            {included.map((item) => (
              <li key={item}>
                <span className="ip-scope-mark" aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </article>
        <article className="ip-scope-card ip-scope-excluded" data-animate={sideInAttr(1)}>
          <h3>
            <span aria-hidden="true">✗</span> {scope.excludedTitle}
          </h3>
          <ul>
            {excluded.map((item) => (
              <li key={item}>
                <span className="ip-scope-mark" aria-hidden="true">
                  ✗
                </span>
                {item}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}

function PricingCompareSection({ pricing: pricingProp, defaults = pricingDefaults, sectionAriaLabel }) {
  const pricing = { ...defaults, ...(pricingProp || {}) }
  const plans = Array.isArray(pricing.plans) && pricing.plans.length ? pricing.plans : defaults.plans
  const ariaLabel =
    sectionAriaLabel ||
    `${pricing.titlePrefix || ''} ${pricing.titleHighlight || ''}`.trim() ||
    'Pricing'

  return (
    <section className="ip-pricing-section section-blend" aria-label={ariaLabel}>
      <div className="ip-pricing-header" data-animate={sideInAttr(0)}>
        <h2>
          {pricing.titlePrefix} <span>{pricing.titleHighlight}</span>
        </h2>
        {pricing.subtitle ? <p>{pricing.subtitle}</p> : null}
      </div>

      <div className="ip-pricing-wrap">
        {plans.map((plan, index) => {
          const featured = Boolean(plan.featured || plan.badge)
          const rows = parsePriceRows(plan.rowsText)
          const features = String(plan.featuresText || '')
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)

          return (
            <article
              key={plan.title}
              className={`ip-pricing-card${featured ? ' is-featured' : ''}`}
              data-animate={sideInAttr(index)}
            >
              {plan.badge ? <div className="ip-pricing-badge">{plan.badge}</div> : null}
              <div>
                <h3>{plan.title}</h3>
                {plan.subtitle ? <p className="ip-pricing-sub">{plan.subtitle}</p> : null}
              </div>
              <table className="ip-price-table">
                <thead>
                  <tr>
                    <th>{plan.leftLabel || 'SERVICE'}</th>
                    <th>{plan.rightLabel || 'PRICE'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${plan.title}-${row.label}`} className={row.highlight ? 'is-highlight' : undefined}>
                      <td>{row.label}</td>
                      <td className="ip-price">{row.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {features.length > 0 && (
                <ul className="ip-pricing-features">
                  {features.map((feature) => (
                    <li key={feature}>
                      <span className="ip-pricing-check" aria-hidden="true">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              {plan.note ? <p className="ip-pricing-note">{plan.note}</p> : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function LandingPage({ content }) {
  const rootRef = useRef(null)
  const pageReviews = getPageReviews(content, 'landing')
  const landingDemoCards = content.landing?.demoCards || []
  const galleryItems = content.landing?.gallery || []

  useScrollSideIn(rootRef, [content.landing, pageReviews.length])

  return (
    <div ref={rootRef} className="page-stack landing-page">
      {landingDemoCards.length > 0 && (
        <section className="landing-demos-section section-blend" aria-label="ডেমো শোকেস">
          <div className="landing-demo-stack">
            {landingDemoCards.map((card, index) => (
              <div key={card._id || card.title} data-animate={sideInAttr(index)}>
                <DemoCard
                  card={card}
                  variant="product"
                  whatsappNumber={content.siteSettings.whatsappNumber}
                  whatsappFallback={landingWhatsappCta}
                  liveDemoLabel={landingLiveDemoCta}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="reviews-section section-blend section-blend--carousel">
        <div className="reviews-section-header" data-animate={sideInAttr(0)}>
          <h2>
            {content.landing?.reviewsTitlePrefix || 'বিশ্বাস করার'}{' '}
            <span>{content.landing?.reviewsTitleHighlight || 'কারণ আছে।'}</span>
          </h2>
          <p>{content.landing?.reviewsSubtitle || 'আমাদের কাজ নিয়ে যাচাইকৃত ক্লায়েন্ট রিভিউ।'}</p>
        </div>
        <div className="reviews-carousel-shell">
          <button type="button" className="feature-arrow feature-arrow-prev reviews-prev" aria-label="আগের রিভিউ">
            <ChevronLeft size={20} />
          </button>

          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            className="reviews-swiper"
            slidesPerView={1}
            spaceBetween={16}
            loop={pageReviews.length > 1}
            autoplay={pageReviews.length > 1 ? { delay: 4000, disableOnInteraction: false } : false}
            navigation={{
              prevEl: '.reviews-prev',
              nextEl: '.reviews-next',
            }}
            pagination={{ clickable: true }}
            watchOverflow
            breakpoints={{
              768: {
                slidesPerView: Math.min(2, pageReviews.length || 1),
                spaceBetween: 18,
              },
              1100: {
                slidesPerView: Math.min(3, pageReviews.length || 1),
                spaceBetween: 20,
              },
            }}
          >
            {pageReviews.map((review) => (
              <SwiperSlide key={review._id || review.title} className="review-slide">
                <article className="review-card">
                  <div className="stars">{'★'.repeat(review.rating || 5)}</div>
                  <p className="review-quote">"{review.description?.replace(/\*\*/g, '')}"</p>
                  <div className="review-author">
                    <h3>{review.title}</h3>
                    <span>{review.subtitle}</span>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>

          <button type="button" className="feature-arrow feature-arrow-next reviews-next" aria-label="পরের রিভিউ">
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      <PricingCompareSection
        pricing={content.landing?.pricing}
        defaults={landingPricingDefaults}
        sectionAriaLabel="মূল্য তালিকা"
      />
      <ScopeCompareSection data={content.landing?.comparison} defaults={landingComparisonDefaults} />

      <section className="landing-gallery-section section-blend">
        <div data-animate={sideInAttr(0)}>
          <SectionHeader
            title={content.landing?.galleryTitle || 'ছবি ও ভিডিও'}
            subtitle={content.landing?.gallerySubtitle || 'অ্যাডমিন থেকে যোগ করা ভিজুয়াল, ডেমো ও সাপোর্টিং কনটেন্ট।'}
          />
        </div>
        <div className="gallery-grid">
          {galleryItems.map((item, index) => (
            <div key={item.id || item._id || item.title} data-animate={sideInAttr(index)}>
              <GalleryCard
                item={item}
                whatsappNumber={content.siteSettings.whatsappNumber}
                liveDemoLabel={landingLiveDemoCta}
                whatsappFallback={landingWhatsappCta}
              />
            </div>
          ))}
        </div>
      </section>

      <LandingFaqSection landing={content.landing} />
    </div>
  )
}

function HomePage({ content }) {
  const rootRef = useRef(null)
  const contactPage = { ...contactPageDefaults, ...content.contact }
  const phone = contactPage.phone || content.siteSettings.contactPhone || '01302003306'
  const whatsappNumber = contactPage.whatsappNumber || content.siteSettings.whatsappNumber || phone
  const telHref = `tel:${String(phone).replace(/\s/g, '')}`

  useScrollSideIn(rootRef, [content.home, content.pricing])

  return (
    <div ref={rootRef} className="page-stack home-page">
      <section className="hero-banner-section section-blend">
        <Swiper
          modules={[Autoplay, Pagination]}
          slidesPerView={1}
          loop={content.home.heroSlides.length > 1}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          className="hero-banner-swiper"
        >
          {content.home.heroSlides.map((slide) => (
            <SwiperSlide key={slide._id || slide.title}>
              <article className="hero-banner-slide">
                <img src={resolveMediaUrl(slide.imageUrl)} alt={slide.title} className="hero-banner-bg" />
                <div className="hero-banner-overlay" aria-hidden="true" />
                <div className="hero-banner-content">
                  {slide.badge && <span className="hero-banner-badge">{slide.badge}</span>}
                  <h2 className="hero-banner-title">{slide.title}</h2>
                  {slide.subtitle && <p className="hero-banner-subtitle">{slide.subtitle}</p>}
                  {slide.ctaText && (() => {
                    const fallbackHref = getWhatsappLink(whatsappNumber)
                    const rawHref = slide.ctaLink || fallbackHref
                    const isWaCta = isWhatsappLink(rawHref) || isWhatsappCtaText(slide.ctaText)
                    const ctaHref = isWaCta && !isWhatsappLink(rawHref) ? fallbackHref : rawHref
                    const opensExternal = /^https?:\/\//i.test(ctaHref)

                    return (
                      <a
                        href={ctaHref}
                        className={`hero-banner-cta${isWaCta ? ' whatsapp-btn' : ''}`}
                        target={opensExternal ? '_blank' : undefined}
                        rel={opensExternal ? 'noreferrer' : undefined}
                        onClick={(event) => {
                          if (!isWaCta) return
                          trackContact(
                            {
                              content_name: slide.title || 'Hero WhatsApp CTA',
                              lead_source: 'home_hero_cta',
                            },
                            event.currentTarget,
                          )
                        }}
                      >
                        {slide.ctaText}
                      </a>
                    )
                  })()}
                </div>
              </article>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      <section className="feature-section section-blend section-blend--carousel">
        <div className="feature-carousel-shell feature-carousel-mobile">
          <button type="button" className="feature-arrow feature-arrow-prev" aria-label="Previous features">
            <ChevronLeft size={20} />
          </button>

          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            slidesPerView={1.2}
            spaceBetween={14}
            loop={(content.home.featureCards || []).length > 2}
            autoplay={{ delay: 3200, disableOnInteraction: false }}
            navigation={{
              prevEl: '.feature-arrow-prev',
              nextEl: '.feature-arrow-next',
            }}
            pagination={{ clickable: true }}
            watchOverflow
            className="feature-swiper"
          >
            {(content.home.featureCards || []).map((card) => {
              const Icon = featureIconMap[card.icon] || ShieldCheck

              return (
                <SwiperSlide key={card._id || card.title}>
                  <article className="feature-card">
                    <div className="feature-card-icon">
                      <Icon size={34} strokeWidth={1.75} />
                    </div>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </article>
                </SwiperSlide>
              )
            })}
          </Swiper>

          <button type="button" className="feature-arrow feature-arrow-next" aria-label="Next features">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="feature-grid">
          {(content.home.featureCards || []).map((card, index) => {
            const Icon = featureIconMap[card.icon] || ShieldCheck

            return (
              <article
                key={`grid-${card._id || card.title}`}
                className="feature-card"
                data-animate={sideInAttr(index)}
              >
                <div className="feature-card-icon">
                  <Icon size={34} strokeWidth={1.75} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            )
          })}
        </div>

        {content.home.featureFooterText && (
          <div className="feature-section-footer-wrap" data-animate={sideInAttr(0)}>
            <a
              href={getWhatsappLink(whatsappNumber)}
              className="feature-section-footer feature-section-footer-wa whatsapp-btn"
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                trackContact(
                  { content_name: 'Home Feature WhatsApp', lead_source: 'home_feature_footer' },
                  event.currentTarget,
                )
              }}
            >
              {content.home.featureFooterText}
            </a>
          </div>
        )}
      </section>

      <section id="products" className="products-section section-blend">
        {content.home.productsOfferText && (
          <div className="products-offer-bar" data-animate={sideInAttr(0)}>
            <a href={content.home.productsOfferLink || '#'}>{content.home.productsOfferText}</a>
          </div>
        )}

        <div className="products-grid">
          {(content.home.demoCards || []).map((card, index) => (
            <div key={card.id || card._id || card.title} data-animate={sideInAttr(index)}>
              <DemoCard
                card={card}
                variant="product"
                whatsappNumber={content.siteSettings.whatsappNumber}
                whatsappFallback={siteChrome.whatsappCta}
              />
            </div>
          ))}
        </div>
      </section>

      <PricingCompareSection pricing={content.pricing} defaults={pricingDefaults} sectionAriaLabel="Pricing" />
      <ScopeCompareSection data={content.home?.comparison} defaults={homeComparisonDefaults} />

      <QuickBookingSection
        page={contactPage}
        whatsappNumber={whatsappNumber}
        phone={phone}
        telHref={telHref}
        leadSource="quick_booking"
      />
    </div>
  )
}

function ReviewsPage({ content }) {
  const rootRef = useRef(null)
  const reviewsConfig = content.reviewsPage || reviewsPageDefaults
  const featuredReviews = reviewsConfig.featuredReviews || []
  const groupedReviews = groupReviewsByCategory(reviewsConfig.reviews || [])
  const whatsappLink = reviewsConfig.ctaWhatsappLink || getWhatsappLink(content.siteSettings.whatsappNumber)
  const callLink = reviewsConfig.ctaCallLink || `tel:${content.siteSettings.contactPhone || content.contact.phone || '01302003306'}`

  useScrollSideIn(rootRef, [reviewsConfig])

  return (
    <div ref={rootRef} className="reviews-clone-page">
      <section className="wp-review-header-section section-blend">
        <div className="wp-review-header-container" data-animate={sideInAttr(0)}>
          <span className="wp-review-tagline">{reviewsConfig.heroTagline}</span>
          <h2 className="wp-review-main-title">
            {reviewsConfig.heroTitlePrefix}{' '}
            <br className="wp-mobile-break" />
            <span className="wp-green-highlight">{reviewsConfig.heroTitleHighlight}</span>
          </h2>
          <div className="wp-rating-badge-row">
            <div className="wp-rating-glass-box">
              <div className="wp-badge-score">{reviewsConfig.heroScore}</div>
              <div className="wp-badge-details">
                {renderStarRow(5, 'wp-badge-stars')}
                <div className="wp-badge-subtext">{reviewsConfig.heroRatingText}</div>
              </div>
            </div>
            <p className="wp-rating-support-text">{reviewsConfig.heroSupportText}</p>
          </div>
        </div>
      </section>

      <section className="featured-section section-blend">
        <div className="featured-inner">
          <div className="featured-header" data-animate={sideInAttr(0)}>
            <span className="section-eyebrow">{reviewsConfig.featuredEyebrow}</span>
            <h2 className="section-title">
              {reviewsConfig.featuredTitlePrefix}{' '}
              <span className="accent">{reviewsConfig.featuredTitleHighlight}</span>
            </h2>
          </div>
          <div className="featured-grid">
            {featuredReviews.map((review, index) => (
              <article
                key={review._id || review.title}
                className="featured-review"
                data-animate={sideInAttr(index)}
              >
                {renderStarRow(review.rating || 5, 'fr-stars')}
                <p className="fr-text">{renderReviewDescription(review.description)}</p>
                <div className="fr-author">
                  <div className="fr-avatar">{getReviewerInitial(review.title)}</div>
                  <div className="fr-meta">
                    <span className="fr-name">{review.title}</span>
                    <span className="fr-source">{review.subtitle || 'Google Review'}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wp-stories-section section-blend">
        <div className="wp-customer-stories-header" data-animate={sideInAttr(0)}>
          <span className="wp-stories-eyebrow">{reviewsConfig.storiesEyebrow}</span>
          <h2 className="wp-stories-title">
            {reviewsConfig.storiesTitlePrefix}{' '}
            <span className="wp-stories-accent">{reviewsConfig.storiesTitleHighlight}</span>
          </h2>
        </div>

        {groupedReviews.map(([category, categoryReviews]) => (
          <div key={category} className="wp-feedback-group-wrapper">
            <div className="wp-service-group-title" data-animate={sideInAttr(0)}>
              <span className="wp-service-icon">✓</span> {category}
            </div>
            <div className="wp-feedback-static-grid">
              {categoryReviews.map((review, index) => (
                <article
                  key={review._id || `${category}-${review.title}`}
                  className="wp-feedback-card"
                  data-animate={sideInAttr(index)}
                >
                  {renderStarRow(review.rating || 5, 'wp-card-stars')}
                  <p className="wp-card-text">{renderReviewDescription(review.description)}</p>
                  <div className="wp-card-author-row">
                    <div className="wp-card-avatar">{getReviewerInitial(review.title)}</div>
                    <span className="wp-card-name">{review.title}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="wp-cta-green-section section-blend">
        <div className="wp-cta-container" data-animate={sideInAttr(0)}>
          <h2 className="wp-cta-heading">{reviewsConfig.ctaTitle}</h2>
          <p className="wp-cta-desc">{reviewsConfig.ctaDescription}</p>
          <div className="wp-cta-btn-group">
            <a
              href={whatsappLink}
              className="wp-cta-btn whatsapp-btn"
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                trackContact(
                  { content_name: 'Reviews CTA WhatsApp', lead_source: 'reviews_cta' },
                  event.currentTarget,
                )
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.199 4.38 4.38-1.199z" />
              </svg>
              {reviewsConfig.ctaWhatsappText}
            </a>
            <a href={callLink} className="wp-cta-btn wp-cta-call">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {reviewsConfig.ctaCallText}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

function renderMultiline(text) {
  return String(text || '')
    .split('\n')
    .map((line, index) => (
      <Fragment key={`${line}-${index}`}>
        {index > 0 ? <br /> : null}
        {line}
      </Fragment>
    ))
}

function QuickBookingSection({ page, whatsappNumber, phone, telHref, leadSource = 'quick_booking' }) {
  const formId = useId()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    district: '',
    serviceType: '',
    address: '',
    details: '',
  })
  const [error, setError] = useState('')

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    if (error) {
      setError('')
    }
  }

  const handleSend = (event) => {
    event.preventDefault()

    if (!form.name.trim() || !form.phone.trim()) {
      setError('Please enter your name and phone number.')
      return
    }

    trackLead(
      {
        content_name: form.serviceType || 'Quick Booking',
        content_category: 'lead',
        lead_source: leadSource,
        name: form.name,
        phone: form.phone,
        currency: 'BDT',
      },
      event.currentTarget,
    )

    const message = buildBookingWhatsAppMessage(form)
    const url = getWhatsappLinkWithMessage(whatsappNumber, message)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section id="quick-booking" className="asr-booking-section cp-booking section-blend">
      <div className="cp-booking-inner">
        <article className="cp-booking-card" data-animate={sideInAttr(0)}>
          <header className="cp-booking-header">
            <span className="cp-booking-eyebrow">Project inquiry</span>
            <h2>{page.bookingTitle || 'Quick Booking, sends to our WhatsApp'}</h2>
            <p>{page.bookingSubtitle || 'Tell us about your website project and we will reply on WhatsApp.'}</p>
          </header>

          <form
            className="cp-booking-form"
            onSubmit={handleSend}
            noValidate
            onFocusCapture={() => trackBeginCheckout({ content_name: 'Quick Booking' })}
          >
            <div className="cp-booking-field">
              <label htmlFor={`${formId}-name`}>Your name *</label>
              <input
                id={`${formId}-name`}
                type="text"
                name="name"
                value={form.name}
                onChange={updateField('name')}
                placeholder="Your full name"
                autoComplete="name"
                required
              />
            </div>

            <div className="cp-booking-field">
              <label htmlFor={`${formId}-phone`}>Phone number *</label>
              <input
                id={`${formId}-phone`}
                type="tel"
                name="phone"
                value={form.phone}
                onChange={updateField('phone')}
                placeholder="e.g. 01302003306"
                autoComplete="tel"
                required
              />
            </div>

            <div className="cp-booking-field">
              <label htmlFor={`${formId}-district`}>District / City</label>
              <input
                id={`${formId}-district`}
                type="text"
                name="district"
                value={form.district}
                onChange={updateField('district')}
                placeholder="e.g. Gopalganj, Dhaka"
                autoComplete="address-level2"
              />
            </div>

            <div className="cp-booking-field">
              <label htmlFor={`${formId}-service`}>Select service type</label>
              <select
                id={`${formId}-service`}
                name="serviceType"
                value={form.serviceType}
                onChange={updateField('serviceType')}
              >
                <option value="">Choose a service</option>
                {BOOKING_SERVICE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="cp-booking-field cp-booking-field--full">
              <label htmlFor={`${formId}-address`}>Full address / location</label>
              <input
                id={`${formId}-address`}
                type="text"
                name="address"
                value={form.address}
                onChange={updateField('address')}
                placeholder="Area, upazila, or full address"
                autoComplete="street-address"
              />
            </div>

            <div className="cp-booking-field cp-booking-field--full">
              <label htmlFor={`${formId}-details`}>Project details / message</label>
              <textarea
                id={`${formId}-details`}
                name="details"
                value={form.details}
                onChange={updateField('details')}
                placeholder="Tell us about pages, features, timeline, or share a reference link"
                rows={4}
              />
            </div>

            {error ? (
              <p className="cp-booking-error cp-booking-field--full" role="alert">
                {error}
              </p>
            ) : null}

            <div className="cp-booking-actions cp-booking-field--full">
              <button type="submit" className="cp-booking-submit">
                <MessageCircle size={20} strokeWidth={2.2} aria-hidden="true" />
                Send to WhatsApp
              </button>
            </div>
          </form>
        </article>

        <div className="cp-booking-pills" data-animate={sideInAttr(1)}>
          <a
            className="cp-booking-pill cp-booking-pill--wa"
            href={getWhatsappLink(whatsappNumber)}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              trackContact(
                { content_name: 'Quick Booking WhatsApp Pill', lead_source: 'booking_pill' },
                event.currentTarget,
              )
            }}
          >
            <MessageCircle size={18} strokeWidth={2.2} aria-hidden="true" />
            {page.bookingWhatsappPillText || 'WhatsApp Us'}
          </a>
          <a className="cp-booking-pill cp-booking-pill--call" href={telHref}>
            <Phone size={18} strokeWidth={2.2} aria-hidden="true" />
            {page.bookingCallPillText || `Call ${phone}`}
          </a>
        </div>
      </div>
    </section>
  )
}

function ContactPage({ content }) {
  const rootRef = useRef(null)
  const page = { ...contactPageDefaults, ...content.contact }
  const phone = page.phone || content.siteSettings.contactPhone || '01302003306'
  const email = page.email || content.siteSettings.contactEmail || 'iotprogrammers@gmail.com'
  const whatsappNumber = page.whatsappNumber || content.siteSettings.whatsappNumber || phone
  const address = page.address || content.siteSettings.address || BUSINESS_ADDRESS
  const hours = Array.isArray(page.hours) && page.hours.length ? page.hours : contactPageDefaults.hours
  const mapSrc = page.mapEmbedUrl || contactPageDefaults.mapEmbedUrl
  const telHref = `tel:${String(phone).replace(/\s/g, '')}`

  useScrollSideIn(rootRef, [page])

  return (
    <div ref={rootRef} className="contact-clone-page">
      <section className="cp-hero section-blend">
        <div className="cp-hero-inner" data-animate={sideInAttr(0)}>
          <span className="cp-eyebrow">{page.eyebrow}</span>
          <h1>
            {page.headingPrefix || page.heading}{' '}
            {page.headingHighlight ? <span>{page.headingHighlight}</span> : null}
          </h1>
          <div className="cp-hero-copy">
            <p>{page.description}</p>
          </div>
        </div>
      </section>

      <section className="cp-reach section-blend">
        <div className="cp-reach-inner">
          <header className="cp-reach-header" data-animate={sideInAttr(0)}>
            <span className="cp-reach-eyebrow">Get in touch</span>
            <h2 className="cp-reach-title">Choose your preferred channel</h2>
            <p className="cp-reach-subtitle">We respond fast during working hours — WhatsApp is usually the quickest.</p>
          </header>
          <div className="cp-card-grid">
            <article className="cp-card cp-card--whatsapp cp-card--featured" data-animate={sideInAttr(0)}>
              <span className="cp-card-badge">Fastest reply</span>
              <div className="cp-card-icon" aria-hidden="true">
                <MessageCircle size={24} strokeWidth={2.2} />
              </div>
              <h3>{page.whatsappCardTitle}</h3>
              <p>{page.whatsappCardText}</p>
              <a
                className="cp-card-action cp-card-action--wa"
                href={getWhatsappLink(whatsappNumber)}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  trackContact(
                    { content_name: 'Contact WhatsApp Card', lead_source: 'contact_card' },
                    event.currentTarget,
                  )
                }}
              >
                <span>{phone}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </article>

            <article className="cp-card cp-card--phone" data-animate={sideInAttr(1)}>
              <div className="cp-card-icon" aria-hidden="true">
                <Phone size={22} strokeWidth={2.2} />
              </div>
              <h3>{page.phoneCardTitle}</h3>
              <p>{page.phoneCardText}</p>
              <a className="cp-card-action cp-card-action--phone" href={telHref}>
                <span>{phone}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </article>

            <article className="cp-card cp-card--email" data-animate={sideInAttr(2)}>
              <div className="cp-card-icon" aria-hidden="true">
                <Mail size={22} strokeWidth={2.2} />
              </div>
              <h3>{page.emailCardTitle}</h3>
              <p>{page.emailCardText}</p>
              <a className="cp-card-action cp-card-action--email" href={`mailto:${email}`}>
                <span className="cp-card-action-email">{email}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className="cp-office section-blend">
        <div className="cp-office-inner">
          <header className="cp-office-header" data-animate={sideInAttr(0)}>
            <span className="cp-office-eyebrow">{page.officeEyebrow}</span>
            <h2 className="cp-office-title">
              {page.officeTitlePrefix}{' '}
              <span className="cp-office-highlight">{page.officeTitleHighlight}</span>
            </h2>
            <p className="cp-office-subtitle">
              Drop by during working hours or explore our location on the map below.
            </p>
          </header>

          <div className="cp-office-grid">
            <article className="cp-office-card cp-office-card--address" data-animate={sideInAttr(0)}>
              <div className="cp-office-card-icon" aria-hidden="true">
                <MapPin size={22} strokeWidth={2.2} />
              </div>
              <span className="cp-office-card-label">Address</span>
              <p>
                <strong>{page.officeName || content.siteSettings.brandName}</strong>
                {renderMultiline(address)}
              </p>
            </article>

            <article className="cp-office-card cp-office-card--hours" data-animate={sideInAttr(1)}>
              <div className="cp-office-card-icon" aria-hidden="true">
                <Clock size={22} strokeWidth={2.2} />
              </div>
              <span className="cp-office-card-label">Operating hours</span>
              <div className="cp-hours-panel">
                <table className="cp-hours">
                  <thead>
                    <tr>
                      <th scope="col">Day</th>
                      <th scope="col">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((row) => (
                      <tr key={`${row.day}-${row.time}`}>
                        <td>{row.day}</td>
                        <td>{row.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="cp-office-card cp-office-card--areas" data-animate={sideInAttr(2)}>
              <div className="cp-office-card-icon" aria-hidden="true">
                <Globe size={22} strokeWidth={2.2} />
              </div>
              <span className="cp-office-card-label">Service areas</span>
              <p>{renderMultiline(page.serviceAreas)}</p>
            </article>

            <article className="cp-office-card cp-office-card--details" data-animate={sideInAttr(3)}>
              <div className="cp-office-card-icon" aria-hidden="true">
                <Building2 size={22} strokeWidth={2.2} />
              </div>
              <span className="cp-office-card-label">Company details</span>
              <p className="cp-details">{renderMultiline(page.companyDetails)}</p>
            </article>
          </div>

          <div className="cp-map-wrap" data-animate={sideInAttr(4)}>
            <span className="cp-map-label">Find us on the map</span>
            <div className="cp-map">
              <iframe title="Gopalganj Sadar Upazila map" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </div>
        </div>
      </section>

      <section className="cp-cta section-blend">
        <div className="cp-cta-inner" data-animate={sideInAttr(0)}>
          <h2>
            {page.ctaTitlePrefix} <span>{page.ctaTitleHighlight}</span>
          </h2>
          <p>{page.ctaDescription}</p>
          <div className="cp-cta-actions">
            <a
              className="cp-btn cp-btn-wa"
              href={getWhatsappLink(whatsappNumber)}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                trackContact(
                  { content_name: 'Contact CTA WhatsApp', lead_source: 'contact_cta' },
                  event.currentTarget,
                )
              }}
            >
              {page.ctaWhatsappText || `WhatsApp ${phone}`}
            </a>
            <a className="cp-btn cp-btn-call" href={telHref}>
              {page.ctaCallText || 'Call directly'}
            </a>
          </div>
        </div>
      </section>

      <QuickBookingSection
        page={page}
        whatsappNumber={whatsappNumber}
        phone={phone}
        telHref={telHref}
        leadSource="contact_form"
      />
    </div>
  )
}

function DemoCard({ card, whatsappNumber, variant = 'landing', whatsappFallback, liveDemoLabel }) {
  const cardRef = useRef(null)
  const media = withResolvedMedia(card)
  const username = media.username || 'admin'
  const password = media.password || '123456'
  const liveUrl = media.liveUrl || '#'
  const demoLabel = liveDemoLabel || siteChrome.liveDemo
  const whatsappLabel = resolveWhatsappLabel(
    media.whatsappText,
    whatsappFallback || siteChrome.whatsappCta,
  )

  useEffect(() => {
    return observeViewContent(cardRef.current, {
      id: media.id || media._id || media.title,
      name: media.title || 'Demo',
    })
  }, [media.id, media._id, media.title])

  const trackDemoWhatsApp = (event) => {
    trackContact(
      {
        content_name: media.title || 'Demo WhatsApp',
        lead_source: variant === 'product' ? 'demo_whatsapp' : 'landing_demo_whatsapp',
      },
      event.currentTarget,
    )
  }

  const trackDemoView = () => {
    trackViewContent({ id: media.id || media.title, name: media.title }, { force: true })
  }

  if (variant === 'product') {
    return (
      <article ref={cardRef} className="product-card">
        <CardVideoMedia
          title={media.title}
          videoUrl={media.videoUrl}
          thumbnailUrl={media.thumbnailUrl}
          mediaClassName="product-media"
          thumbnailClassName="product-thumbnail-button"
        />

        <div className="product-body">
          <h3 className="product-title">{media.title}</h3>
          <div className="product-credentials">
            <p>
              <ShieldCheck size={15} /> {siteChrome.adminLabel}: <strong>{username}</strong>
              <span className="product-cred-sep" aria-hidden="true">
                ·
              </span>
              {siteChrome.passwordLabel}: <strong>{password}</strong>
            </p>
          </div>
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="product-demo-link"
            onClick={trackDemoView}
          >
            {demoLabel}
          </a>
          <a
            href={getWhatsappLink(whatsappNumber)}
            target="_blank"
            rel="noreferrer"
            className="product-demo-link product-whatsapp-link"
            onClick={trackDemoWhatsApp}
          >
            {whatsappLabel}
          </a>
        </div>
      </article>
    )
  }

  return (
    <article ref={cardRef} className="demo-card">
      <CardVideoMedia
        title={media.title}
        videoUrl={media.videoUrl}
        thumbnailUrl={media.thumbnailUrl}
        mediaClassName="demo-media"
      />
      <div className="demo-card-body product-body">
        <h3>{media.title}</h3>
        <p>{media.description}</p>
        <div className="feature-pill-list">
          {(media.keyFeatures || []).map((feature) => (
            <span key={feature} className="feature-pill">
              <Sparkles size={14} /> {feature}
            </span>
          ))}
        </div>
        <div className="credential-box">
          <p>
            <ShieldCheck size={16} /> {siteChrome.adminLabel} username: <strong>{media.username}</strong>
          </p>
          <p>
            {siteChrome.passwordLabel}: <strong>{media.password}</strong>
          </p>
        </div>
        <a
          href={liveUrl}
          target="_blank"
          rel="noreferrer"
          className="product-demo-link"
          onClick={trackDemoView}
        >
          {demoLabel}
        </a>
        <a
          href={getWhatsappLink(whatsappNumber)}
          target="_blank"
          rel="noreferrer"
          className="product-demo-link product-whatsapp-link"
          onClick={trackDemoWhatsApp}
        >
          {whatsappLabel}
        </a>
      </div>
    </article>
  )
}

function ProtectedAdmin({ children }) {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    const verifySession = async () => {
      const token = getAuthToken()

      if (!token) {
        if (!cancelled) {
          setChecking(false)
          setAuthed(false)
          navigate('/admin/login', { replace: true })
        }
        return
      }

      try {
        await axios.get(`${API_BASE}/api/auth/verify`, {
          headers: authHeaders({ 'Cache-Control': 'no-store' }),
        })
        if (!cancelled) {
          setAuthed(true)
          setSessionError('')
        }
      } catch (error) {
        if (cancelled) return

        const status = error.response?.status
        // Only force logout on real auth failure. Keep session on network/API downtime.
        if (status === 401 || status === 403) {
          clearAuthToken()
          setAuthed(false)
          navigate('/admin/login', { replace: true })
        } else {
          setAuthed(true)
          setSessionError('Could not reach the server. Your session is kept — retry if Save fails.')
        }
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    verifySession()
    return () => {
      cancelled = true
    }
  }, [navigate])

  if (checking) {
    return (
      <div className="admin-page">
        <p>Checking login...</p>
      </div>
    )
  }

  if (!authed) {
    return null
  }

  return (
    <>
      {sessionError ? <div className="status-banner warning">{sessionError}</div> : null}
      {children}
    </>
  )
}

function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const token = getAuthToken()
    if (!token) return undefined

    axios
      .get(`${API_BASE}/api/auth/verify`, {
        headers: authHeaders({ 'Cache-Control': 'no-store' }),
      })
      .then(() => {
        if (!cancelled) navigate('/admin', { replace: true })
      })
      .catch((err) => {
        if (cancelled) return
        const status = err.response?.status
        if (status === 401 || status === 403) {
          clearAuthToken()
        }
      })

    return () => {
      cancelled = true
    }
  }, [navigate])

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, { username, password })
      setAuthToken(response.data.token)
      navigate('/admin', { replace: true })
    } catch (loginError) {
      setError(loginError.response?.data?.message || 'Login failed. Check username and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleLogin}>
        <p className="eyebrow">Secure Access</p>
        <h2>Admin Login</h2>
        <p className="admin-login-text">Enter your admin username and password to access the dashboard.</p>

        <label className="field-label">
          <span>Username</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>

        <label className="field-label">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <div className="status-banner warning">{error}</div>}

        <button type="submit" className="primary-btn wide-btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="admin-login-hint">First time default: admin / admin123</p>
        <NavLink to="/" className="admin-login-back">
          Back to website
        </NavLink>
      </form>
    </div>
  )
}

const adminNavItems = [
  { id: 'settings', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'landing', label: 'Landing', icon: Globe },
  { id: 'home', label: 'Home', icon: Home },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'contact', label: 'Contact', icon: Mail },
  { id: 'tracking', label: 'Tracking / GTM', icon: Code2 },
  { id: 'security', label: 'Settings', icon: Settings },
]

const videoTargets = [
  { path: 'landing.gallery', type: 'gallery', label: 'Landing Gallery' },
  { path: 'landing.demoCards', type: 'demo', label: 'Landing Demo' },
  { path: 'home.demoCards', type: 'demo', label: 'Home Demo' },
]

const imageTargets = [
  { path: 'landing.gallery', type: 'gallery', label: 'Landing Gallery' },
  { path: 'home.heroSlides', type: 'hero', label: 'Home' },
]

const formatAddedDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const getItemsByPath = (source, path) => path.split('.').reduce((acc, key) => acc?.[key], source) || []

function AdminPage({ content, setContent, loading }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(() => mergeContentWithDefaults(content))
  const [activeTab, setActiveTab] = useState('settings')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mediaModal, setMediaModal] = useState(null)

  useEffect(() => {
    if (loading) return
    setDraft(mergeContentWithDefaults(content))
  }, [loading, content])

  const updateValue = (path, value) => {
    const keys = path.split('.')
    setDraft((current) => {
      const next = structuredClone(current)
      let ref = next
      for (let index = 0; index < keys.length - 1; index += 1) {
        ref = ref[keys[index]]
      }
      ref[keys.at(-1)] = value
      return next
    })
  }

  const updateCollectionItem = (sectionPath, index, field, value) => {
    setDraft((current) => {
      const next = structuredClone(current)
      const items = sectionPath.split('.').reduce((acc, key) => acc[key], next)
      items[index][field] = field === 'keyFeatures' ? value.split(',').map((item) => item.trim()).filter(Boolean) : value
      return next
    })
  }

  const addCollectionItem = (sectionPath, type) => {
    setDraft((current) => {
      const next = structuredClone(current)
      const items = sectionPath.split('.').reduce((acc, key) => acc[key], next)
      items.push(createEmptyItem(type))
      return next
    })
  }

  const removeCollectionItem = (sectionPath, index) => {
    setDraft((current) => {
      const next = structuredClone(current)
      const items = sectionPath.split('.').reduce((acc, key) => acc[key], next)
      items.splice(index, 1)
      return next
    })
  }

  const deleteMediaItem = async (sectionPath, index) => {
    const next = structuredClone(draft)
    const items = sectionPath.split('.').reduce((acc, key) => acc[key], next)
    items.splice(index, 1)
    try {
      await persistDraft(next)
      setMessage('Item deleted.')
    } catch (error) {
      setMessage(error.response?.data?.message || 'Delete failed. Login again if session expired.')
    }
  }

  const uploadFile = async (event, path, index, field) => {
    const file = event.target.files?.[0]
    if (!file) return

    const payload = new FormData()
    payload.append('file', file)

    try {
      const response = await axios.post(`${API_BASE}/api/upload`, payload, {
        headers: authHeaders(),
      })
      const url = resolveMediaUrl(response.data.url || response.data.path)
      setDraft((current) => {
        const next = structuredClone(current)
        const items = path.split('.').reduce((acc, key) => acc[key], next)
        if (!items?.[index]) return current
        items[index][field] = url
        if (path === 'landing.gallery') {
          if (field === 'videoUrl') {
            items[index].type = 'video'
          } else if (field === 'imageUrl' || field === 'thumbnailUrl') {
            items[index].type = items[index].videoUrl ? items[index].type : 'image'
            if (field === 'imageUrl') items[index].thumbnailUrl = url
          }
        }
        return next
      })
      setMessage('File uploaded. Click "Save All Changes" to publish.')
    } catch (error) {
      const status = error.response?.status
      setMessage(
        status === 401
          ? 'Session expired. Please login again, then upload.'
          : error.response?.data?.message || 'Upload failed. Login again if session expired.'
      )
    } finally {
      event.target.value = ''
    }
  }

  const uploadCollectionFiles = async (event, sectionPath, type, field) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    try {
      const uploadedItems = []

      for (const file of files) {
        const payload = new FormData()
        payload.append('file', file)
        const response = await axios.post(`${API_BASE}/api/upload`, payload, {
          headers: authHeaders(),
        })
        const url = resolveMediaUrl(response.data.url || response.data.path)
        const nextItem = createEmptyItem(type)

        nextItem.title = file.name.replace(/\.[^/.]+$/, '') || (type === 'gallery' ? 'Gallery item' : 'New item')
        nextItem[field] = url
        if (type === 'gallery') {
          nextItem.type = 'image'
          nextItem.imageUrl = url
          nextItem.thumbnailUrl = url
          nextItem.videoUrl = ''
        }
        uploadedItems.push(nextItem)
      }

      setDraft((current) => {
        const next = structuredClone(current)
        const items = sectionPath.split('.').reduce((acc, key) => acc[key], next)
        items.push(...uploadedItems)
        return next
      })

      setMessage(`${uploadedItems.length} image added. Click "Save All Changes" to publish.`)
    } catch (error) {
      const status = error.response?.status
      setMessage(
        status === 401
          ? 'Session expired. Please login again, then upload.'
          : error.response?.data?.message || 'Upload failed. Login again if session expired.'
      )
    } finally {
      event.target.value = ''
    }
  }

  const addItemWithVideoLink = (sectionPath, type, videoUrl) => {
    const url = videoUrl.trim()
    if (!url) {
      setMessage('Paste a YouTube or video link first.')
      return false
    }

    const nextItem = createEmptyItem(type)
    nextItem.videoUrl = url
    nextItem.title = nextItem.title || 'New video'
    if (type === 'gallery') nextItem.type = 'video'

    setDraft((current) => {
      const next = structuredClone(current)
      const items = sectionPath.split('.').reduce((acc, key) => acc[key], next)
      items.push(nextItem)
      return next
    })

    setMessage('Video link added. Click "Save All Changes" to publish.')
    return true
  }

  const uploadOneFile = async (file) => {
    const payload = new FormData()
    payload.append('file', file)
    const response = await axios.post(`${API_BASE}/api/upload`, payload, {
      headers: authHeaders(),
    })
    return resolveMediaUrl(response.data.url || response.data.path)
  }

  const persistDraft = async (nextDraft = draft) => {
    const token = getAuthToken()
    if (!token) {
      const err = new Error('Login required')
      err.response = { status: 401, data: { message: 'Login required. Please sign in again.' } }
      throw err
    }

    const payload = stripMongoMeta(nextDraft)
    const response = await axios.put(`${API_BASE}/api/content`, payload, {
      headers: authHeaders({ 'Cache-Control': 'no-store' }),
    })
    const saved = mergeContentWithDefaults(response.data)
    setDraft(saved)
    setContent(saved)
    return saved
  }

  const upsertItemAtPath = (source, path, item, index = null) => {
    const items = path.split('.').reduce((acc, key) => acc[key], source)
    if (!Array.isArray(items)) return
    if (index == null) items.push(structuredClone(item))
    else items[index] = structuredClone(item)
  }

  const saveMediaItem = async (kind, form, files = {}) => {
    const targetList = kind === 'video' ? videoTargets : imageTargets
    const target = targetList.find((item) => item.path === form.path) || targetList[0]
    let mediaUrl = form.mediaUrl.trim()
    let thumbnailUrl = (form.thumbnailUrl || '').trim()

    try {
      if (files.mediaFile) mediaUrl = await uploadOneFile(files.mediaFile)
      if (files.thumbnailFile) thumbnailUrl = await uploadOneFile(files.thumbnailFile)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Upload failed. Login again if session expired.')
      return false
    }

    if (kind === 'video' && !mediaUrl) {
      setMessage('Paste a YouTube / video link first.')
      return false
    }

    if (kind === 'image' && !mediaUrl) {
      setMessage('Upload an image or paste an image URL first.')
      return false
    }

    const next = structuredClone(draft)
    const currentItems = target.path.split('.').reduce((acc, key) => acc[key], next)
    const nextItem = form.index == null
      ? createEmptyItem(target.type)
      : { ...currentItems[form.index] }

    nextItem.id = nextItem.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    nextItem.title = form.title.trim() || (kind === 'video' ? 'New video' : 'New image')
    nextItem.status = 'published'
    nextItem.addedAt = nextItem.addedAt || new Date().toISOString()
    const isGalleryTarget = target.path === 'landing.gallery' || target.type === 'gallery'
    if (kind === 'video' && !isGalleryTarget) {
      nextItem.username = (form.username || nextItem.username || 'admin').trim()
      nextItem.password = (form.password || nextItem.password || '123456').trim()
      nextItem.liveUrl = (form.liveUrl || nextItem.liveUrl || 'https://example.com/demo').trim()
    }
    if (isGalleryTarget) {
      nextItem.liveUrl = (form.liveUrl ?? nextItem.liveUrl ?? '').trim()
    }

    if (kind === 'video') {
      nextItem.videoUrl = mediaUrl
      nextItem.type = 'video'
      if (thumbnailUrl) {
        nextItem.thumbnailUrl = thumbnailUrl
        nextItem.imageUrl = thumbnailUrl
      } else if (isGalleryTarget) {
        const ytThumb = getYoutubeThumbnail(mediaUrl)
        if (ytThumb) {
          nextItem.thumbnailUrl = ytThumb
          nextItem.imageUrl = ytThumb
        }
      }
    } else {
      nextItem.imageUrl = mediaUrl
      nextItem.thumbnailUrl = mediaUrl
      nextItem.type = 'image'
      if (isGalleryTarget) nextItem.videoUrl = ''
    }

    if (form.index == null) {
      upsertItemAtPath(next, target.path, nextItem)
    } else {
      upsertItemAtPath(next, target.path, nextItem, form.index)
    }

    setDraft(next)
    setContent(next)

    try {
      await persistDraft(next)
      setMessage(`${kind === 'video' ? 'Video' : 'Image'} published to the ${target.label} page.`)
      return true
    } catch (error) {
      setMessage(error.response?.data?.message || 'Save failed. Login again if session expired, then retry.')
      return false
    }
  }

  const saveContent = async () => {
    setSaving(true)
    setMessage('')

    try {
      const normalizedSettings = normalizeGtmSettings(draft.siteSettings || {})
      const nextDraft = {
        ...draft,
        siteSettings: {
          ...draft.siteSettings,
          ...normalizedSettings,
        },
      }
      setDraft(nextDraft)
      await persistDraft(nextDraft)
      setMessage('Content saved successfully.')
    } catch (error) {
      const status = error.response?.status
      setMessage(
        status === 401
          ? 'Session expired. Please login again (admin / admin123 if unchanged), then Save.'
          : error.response?.data?.message || 'Save failed. Login again if session expired, then retry.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    clearAuthToken()
    navigate('/admin/login', { replace: true })
  }

  const handlePasswordChange = async () => {
    setPasswordMessage('')

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New password and confirm password do not match.')
      return
    }

    setChangingPassword(true)

    try {
      const response = await axios.post(
        `${API_BASE}/api/auth/change-password`,
        {
          currentPassword,
          newPassword,
        },
        { headers: authHeaders() },
      )
      setPasswordMessage(response.data.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (passwordError) {
      setPasswordMessage(passwordError.response?.data?.message || 'Password change failed.')
    } finally {
      setChangingPassword(false)
    }
  }

  const activeLabel = adminNavItems.find((item) => item.id === activeTab)?.label || 'Dashboard'

  if (loading) {
    return (
      <div className="admin-shell">
        <div className="admin-loading">Loading admin dashboard...</div>
      </div>
    )
  }

  const sidebar = (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <strong>IoTProgrammers</strong>
        <span className="admin-badge">Admin</span>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin sections">
        {adminNavItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-btn${activeTab === item.id ? ' active' : ''}`}
              onClick={() => {
                setActiveTab(item.id)
                setSidebarOpen(false)
              }}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="admin-sidebar-foot">
        <NavLink to="/" className="admin-nav-btn" onClick={() => setSidebarOpen(false)}>
          <Globe size={18} strokeWidth={1.7} />
          <span>View website</span>
        </NavLink>
        <button type="button" className="admin-nav-btn" onClick={handleLogout}>
          <LogOut size={18} strokeWidth={1.7} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <div className="admin-drawer" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" className="admin-drawer-backdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
          <div className="admin-drawer-panel">
            <button type="button" className="admin-drawer-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="admin-sidebar-desktop">{sidebar}</div>

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            <button type="button" className="admin-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div>
              <p className="admin-header-eyebrow">Signed in as admin · admin</p>
              {activeTab !== 'videos' && activeTab !== 'images' ? <h1>{activeLabel}</h1> : null}
            </div>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="admin-btn ghost" onClick={handleLogout}>
              Logout
            </button>
            <button type="button" className="admin-btn primary" onClick={saveContent} disabled={saving}>
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </header>

        {message && <div className="admin-toast">{message}</div>}

        <div className="admin-content">
          {activeTab === 'settings' && (
            <AdminSection title="Site Settings" description="Brand, contact, footer and legal links used across the website.">
              <FormGrid>
                <InputField label="Logo Text" value={draft.siteSettings.logoText} onChange={(value) => updateValue('siteSettings.logoText', value)} />
                <InputField
                  label="Logo URL"
                  value={draft.siteSettings.logoUrl || ''}
                  onChange={(value) => updateValue('siteSettings.logoUrl', value)}
                />
                <InputField label="Brand Name" value={draft.siteSettings.brandName} onChange={(value) => updateValue('siteSettings.brandName', value)} />
                <InputField label="WhatsApp Number" value={draft.siteSettings.whatsappNumber} onChange={(value) => updateValue('siteSettings.whatsappNumber', value)} />
                <InputField label="Address" value={draft.siteSettings.address} onChange={(value) => updateValue('siteSettings.address', value)} />
                <InputField label="Contact Email" value={draft.siteSettings.contactEmail} onChange={(value) => updateValue('siteSettings.contactEmail', value)} />
                <InputField label="Contact Phone" value={draft.siteSettings.contactPhone} onChange={(value) => updateValue('siteSettings.contactPhone', value)} />
                <InputField label="Footer Tagline" value={draft.siteSettings.footerTagline || ''} onChange={(value) => updateValue('siteSettings.footerTagline', value)} />
                <TextAreaField label="Footer About" value={draft.siteSettings.footerAbout || ''} onChange={(value) => updateValue('siteSettings.footerAbout', value)} />
                <InputField label="Facebook URL" value={draft.siteSettings.facebookUrl || ''} onChange={(value) => updateValue('siteSettings.facebookUrl', value)} />
                <InputField label="Facebook Label" value={draft.siteSettings.facebookLabel || ''} onChange={(value) => updateValue('siteSettings.facebookLabel', value)} />
                <InputField label="Privacy Label" value={draft.siteSettings.footerPrivacyLabel} onChange={(value) => updateValue('siteSettings.footerPrivacyLabel', value)} />
                <InputField label="Privacy URL" value={draft.siteSettings.footerPrivacyUrl} onChange={(value) => updateValue('siteSettings.footerPrivacyUrl', value)} />
                <InputField label="Terms Label" value={draft.siteSettings.footerTermsLabel} onChange={(value) => updateValue('siteSettings.footerTermsLabel', value)} />
                <InputField label="Terms URL" value={draft.siteSettings.footerTermsUrl} onChange={(value) => updateValue('siteSettings.footerTermsUrl', value)} />
                <TextAreaField label="Copyright Text" value={draft.siteSettings.copyrightText} onChange={(value) => updateValue('siteSettings.copyrightText', value)} />
              </FormGrid>
            </AdminSection>
          )}

          {activeTab === 'tracking' && (
            <AdminSection
              title="Tracking / GTM"
              description="Paste a GTM container ID (GTM-XXX) or full snippets. Head injects in <head>, body noscript in <body>. Leave empty to disable."
            >
              <div className="admin-tracking-status">
                <span
                  className={`admin-tracking-pill${
                    String(draft.siteSettings.gtmHeadCode || '').trim() ||
                    String(draft.siteSettings.gtmBodyCode || '').trim()
                      ? ' is-active'
                      : ''
                  }`}
                >
                  {String(draft.siteSettings.gtmHeadCode || '').trim() ||
                  String(draft.siteSettings.gtmBodyCode || '').trim()
                    ? 'Active'
                    : 'Disabled'}
                </span>
                <p className="admin-tracking-help">
                  If you enter only a container ID in either field, Save will auto-generate the standard head and body snippets.
                  Public site loads these dynamically — no hardcoded GTM ID in source.
                </p>
              </div>
              <FormGrid>
                <TextAreaField
                  label="GTM Head Code"
                  value={draft.siteSettings.gtmHeadCode || ''}
                  onChange={(value) => updateValue('siteSettings.gtmHeadCode', value)}
                  rows={8}
                />
                <TextAreaField
                  label="GTM Body Code (noscript)"
                  value={draft.siteSettings.gtmBodyCode || ''}
                  onChange={(value) => updateValue('siteSettings.gtmBodyCode', value)}
                  rows={6}
                />
                <InputField
                  label="GA4 Measurement ID (optional, G-XXXX)"
                  value={draft.siteSettings.ga4MeasurementId || ''}
                  onChange={(value) => updateValue('siteSettings.ga4MeasurementId', value)}
                />
                <InputField
                  label="Facebook Pixel ID (optional)"
                  value={draft.siteSettings.fbPixelId || ''}
                  onChange={(value) => updateValue('siteSettings.fbPixelId', value)}
                />
              </FormGrid>
            </AdminSection>
          )}

          {activeTab === 'landing' && (
            <>
              <AdminSection title="Landing Intro" description="Hero video, headline and supporting copy for the landing page.">
                <FormGrid>
                  <InputField
                    label="Intro Video URL (YouTube or MP4 link)"
                    value={draft.landing.introVideoUrl}
                    onChange={(value) => updateValue('landing.introVideoUrl', value)}
                  />
                  <InputField label="Headline" value={draft.landing.headline} onChange={(value) => updateValue('landing.headline', value)} />
                  <TextAreaField
                    label="Features Text"
                    value={draft.landing.featuresText}
                    onChange={(value) => updateValue('landing.featuresText', value)}
                  />
                </FormGrid>
              </AdminSection>

              <AdminSection title="Landing FAQ Section" description="FAQ accordion shown at the bottom of the landing page.">
                <FormGrid>
                  <InputField
                    label="FAQ Title"
                    value={draft.landing.faqTitle || ''}
                    onChange={(value) => updateValue('landing.faqTitle', value)}
                  />
                  <TextAreaField
                    label="FAQ Subtitle"
                    value={draft.landing.faqSubtitle || ''}
                    onChange={(value) => updateValue('landing.faqSubtitle', value)}
                  />
                </FormGrid>
              </AdminSection>

              <CollectionEditor
                title="FAQ Questions & Answers"
                description="Add as many Q&A items as you need. Title = question, description = answer."
                items={draft.landing.faqItems || []}
                path="landing.faqItems"
                itemType="faq"
                onItemChange={updateCollectionItem}
                onAdd={() => addCollectionItem('landing.faqItems', 'faq')}
                onRemove={removeCollectionItem}
                onUpload={uploadFile}
                onBulkUpload={uploadCollectionFiles}
                fields={['title', 'description']}
              />

              <AdminSection
                title="Landing Reviews Header"
                description="বাংলা হেডিং — ল্যান্ডিং পেজের রিভিউ সেকশন। কারousel কার্ড Reviews Page → Category Review Cards থেকে আসে (এখানে শুধু শিরোনাম/সাবটাইটেল)।"
              >
                <FormGrid>
                  <InputField label="Reviews Title Prefix" value={draft.landing.reviewsTitlePrefix || ''} onChange={(value) => updateValue('landing.reviewsTitlePrefix', value)} />
                  <InputField label="Reviews Title Highlight" value={draft.landing.reviewsTitleHighlight || ''} onChange={(value) => updateValue('landing.reviewsTitleHighlight', value)} />
                  <TextAreaField label="Reviews Subtitle" value={draft.landing.reviewsSubtitle || ''} onChange={(value) => updateValue('landing.reviewsSubtitle', value)} />
                  <InputField label="Gallery Title" value={draft.landing.galleryTitle || ''} onChange={(value) => updateValue('landing.galleryTitle', value)} />
                  <TextAreaField label="Gallery Subtitle" value={draft.landing.gallerySubtitle || ''} onChange={(value) => updateValue('landing.gallerySubtitle', value)} />
                </FormGrid>
              </AdminSection>

              <CollectionEditor
                title="Landing Gallery (ছবি ও ভিডিও)"
                description="Unlimited cards for the landing gallery. Upload images, paste YouTube/MP4 links, edit titles, or delete anytime. Save All Changes to publish."
                items={draft.landing.gallery || []}
                path="landing.gallery"
                itemType="gallery"
                onItemChange={updateCollectionItem}
                onAdd={() => addCollectionItem('landing.gallery', 'gallery')}
                onRemove={removeCollectionItem}
                onUpload={uploadFile}
                onBulkUpload={uploadCollectionFiles}
                onAddVideoLink={addItemWithVideoLink}
                fields={['title', 'type', 'imageUrl', 'videoUrl', 'thumbnailUrl', 'liveUrl', 'whatsappText']}
              />

              <AdminSection title="Landing Pricing (বাংলা)" description="শুধু ল্যান্ডিং পেজে দেখাবে। * দিয়ে সারি হাইলাইট করুন। ফরম্যাট: সার্ভিস | ৳ 12,000">
                <FormGrid>
                  <InputField label="Title Prefix" value={draft.landing.pricing?.titlePrefix || ''} onChange={(value) => updateValue('landing.pricing.titlePrefix', value)} />
                  <InputField label="Title Highlight" value={draft.landing.pricing?.titleHighlight || ''} onChange={(value) => updateValue('landing.pricing.titleHighlight', value)} />
                  <TextAreaField label="Subtitle" value={draft.landing.pricing?.subtitle || ''} onChange={(value) => updateValue('landing.pricing.subtitle', value)} />
                </FormGrid>
                {(draft.landing.pricing?.plans || []).map((plan, index) => (
                  <FormGrid key={`landing-pricing-${index}`}>
                    <InputField label={`Plan ${index + 1} Title`} value={plan.title || ''} onChange={(value) => updateCollectionItem('landing.pricing.plans', index, 'title', value)} />
                    <InputField label="Subtitle" value={plan.subtitle || ''} onChange={(value) => updateCollectionItem('landing.pricing.plans', index, 'subtitle', value)} />
                    <InputField label="Badge" value={plan.badge || ''} onChange={(value) => updateCollectionItem('landing.pricing.plans', index, 'badge', value)} />
                    <InputField label="Left Column" value={plan.leftLabel || ''} onChange={(value) => updateCollectionItem('landing.pricing.plans', index, 'leftLabel', value)} />
                    <InputField label="Right Column" value={plan.rightLabel || ''} onChange={(value) => updateCollectionItem('landing.pricing.plans', index, 'rightLabel', value)} />
                    <TextAreaField label="Price Rows" value={plan.rowsText || ''} onChange={(value) => updateCollectionItem('landing.pricing.plans', index, 'rowsText', value)} />
                    <TextAreaField label="Features (one per line)" value={plan.featuresText || ''} onChange={(value) => updateCollectionItem('landing.pricing.plans', index, 'featuresText', value)} />
                    <InputField label="Footer Note" value={plan.note || ''} onChange={(value) => updateCollectionItem('landing.pricing.plans', index, 'note', value)} />
                  </FormGrid>
                ))}
              </AdminSection>

              <AdminSection title="Included / Not included (বাংলা)" description="ল্যান্ডিং পেজের গ্রিন/রেড কম্পেয়ার লিস্ট। প্রতি লাইনে একটি আইটেম।">
                <FormGrid>
                  <InputField label="Title Prefix" value={draft.landing.comparison?.titlePrefix || ''} onChange={(value) => updateValue('landing.comparison.titlePrefix', value)} />
                  <InputField label="Title Highlight" value={draft.landing.comparison?.titleHighlight || ''} onChange={(value) => updateValue('landing.comparison.titleHighlight', value)} />
                  <TextAreaField label="Subtitle" value={draft.landing.comparison?.subtitle || ''} onChange={(value) => updateValue('landing.comparison.subtitle', value)} />
                  <InputField label="Included Title" value={draft.landing.comparison?.includedTitle || ''} onChange={(value) => updateValue('landing.comparison.includedTitle', value)} />
                  <TextAreaField label="Included Items" value={draft.landing.comparison?.includedItems || ''} onChange={(value) => updateValue('landing.comparison.includedItems', value)} />
                  <InputField label="Excluded Title" value={draft.landing.comparison?.excludedTitle || ''} onChange={(value) => updateValue('landing.comparison.excludedTitle', value)} />
                  <TextAreaField label="Excluded Items" value={draft.landing.comparison?.excludedItems || ''} onChange={(value) => updateValue('landing.comparison.excludedItems', value)} />
                </FormGrid>
              </AdminSection>
            </>
          )}

          {activeTab === 'home' && (
            <>
              <AdminSection title="Home Feature Section" description="Footer line under the feature cards.">
                <FormGrid>
                  <TextAreaField
                    label="Footer Contact Text"
                    value={draft.home.featureFooterText}
                    onChange={(value) => updateValue('home.featureFooterText', value)}
                  />
                </FormGrid>
              </AdminSection>

              <CollectionEditor
                title="Home Feature Carousel Cards"
                items={draft.home.featureCards}
                path="home.featureCards"
                itemType="feature"
                onItemChange={updateCollectionItem}
                onAdd={() => addCollectionItem('home.featureCards', 'feature')}
                onRemove={removeCollectionItem}
                onUpload={uploadFile}
                onBulkUpload={uploadCollectionFiles}
                fields={['icon', 'title', 'description']}
              />

              <AdminSection title="Home Products Section">
                <FormGrid>
                  <InputField
                    label="Offer Bar Text"
                    value={draft.home.productsOfferText}
                    onChange={(value) => updateValue('home.productsOfferText', value)}
                  />
                  <InputField
                    label="Offer Bar Link"
                    value={draft.home.productsOfferLink}
                    onChange={(value) => updateValue('home.productsOfferLink', value)}
                  />
                </FormGrid>
              </AdminSection>

              <AdminSection title="Home Pricing (English)" description="Shown only on Home. Put * at the start of a row to highlight it. Format: Service | ৳ 12,000">
                <FormGrid>
                  <InputField label="Title Prefix" value={draft.pricing?.titlePrefix || ''} onChange={(value) => updateValue('pricing.titlePrefix', value)} />
                  <InputField label="Title Highlight" value={draft.pricing?.titleHighlight || ''} onChange={(value) => updateValue('pricing.titleHighlight', value)} />
                  <TextAreaField label="Subtitle" value={draft.pricing?.subtitle || ''} onChange={(value) => updateValue('pricing.subtitle', value)} />
                </FormGrid>
                {(draft.pricing?.plans || []).map((plan, index) => (
                  <FormGrid key={`home-pricing-${index}`}>
                    <InputField label={`Plan ${index + 1} Title`} value={plan.title || ''} onChange={(value) => updateCollectionItem('pricing.plans', index, 'title', value)} />
                    <InputField label="Subtitle" value={plan.subtitle || ''} onChange={(value) => updateCollectionItem('pricing.plans', index, 'subtitle', value)} />
                    <InputField label="Badge (e.g. BEST VALUE)" value={plan.badge || ''} onChange={(value) => updateCollectionItem('pricing.plans', index, 'badge', value)} />
                    <InputField label="Left Column Label" value={plan.leftLabel || ''} onChange={(value) => updateCollectionItem('pricing.plans', index, 'leftLabel', value)} />
                    <InputField label="Right Column Label" value={plan.rightLabel || ''} onChange={(value) => updateCollectionItem('pricing.plans', index, 'rightLabel', value)} />
                    <TextAreaField label="Price Rows (label | price, * for highlight)" value={plan.rowsText || ''} onChange={(value) => updateCollectionItem('pricing.plans', index, 'rowsText', value)} />
                    <TextAreaField label="Features (one per line)" value={plan.featuresText || ''} onChange={(value) => updateCollectionItem('pricing.plans', index, 'featuresText', value)} />
                    <InputField label="Footer Note" value={plan.note || ''} onChange={(value) => updateCollectionItem('pricing.plans', index, 'note', value)} />
                  </FormGrid>
                ))}
              </AdminSection>

              <AdminSection title="Included / Not included (English)" description="Home page green/red comparison lists. One item per line.">
                <FormGrid>
                  <InputField label="Title Prefix" value={draft.home.comparison?.titlePrefix || ''} onChange={(value) => updateValue('home.comparison.titlePrefix', value)} />
                  <InputField label="Title Highlight" value={draft.home.comparison?.titleHighlight || ''} onChange={(value) => updateValue('home.comparison.titleHighlight', value)} />
                  <TextAreaField label="Subtitle" value={draft.home.comparison?.subtitle || ''} onChange={(value) => updateValue('home.comparison.subtitle', value)} />
                  <InputField label="Included Title" value={draft.home.comparison?.includedTitle || ''} onChange={(value) => updateValue('home.comparison.includedTitle', value)} />
                  <TextAreaField label="Included Items" value={draft.home.comparison?.includedItems || ''} onChange={(value) => updateValue('home.comparison.includedItems', value)} />
                  <InputField label="Excluded Title" value={draft.home.comparison?.excludedTitle || ''} onChange={(value) => updateValue('home.comparison.excludedTitle', value)} />
                  <TextAreaField label="Excluded Items" value={draft.home.comparison?.excludedItems || ''} onChange={(value) => updateValue('home.comparison.excludedItems', value)} />
                </FormGrid>
              </AdminSection>
            </>
          )}

          {activeTab === 'videos' && (
            <AdminRecordList
              title="Videos"
              addLabel="Add Video"
              records={videoTargets.flatMap((target) =>
                getItemsByPath(draft, target.path)
                  .map((item, index) => ({ item, index, target }))
                  .filter(({ item }) => target.path !== 'landing.gallery' || item.type === 'video' || item.videoUrl)
              )}
              onAdd={() => setMediaModal({ kind: 'video', path: 'landing.gallery', index: null, title: '', mediaUrl: '', thumbnailUrl: '', username: 'admin', password: '123456', liveUrl: '' })}
              onEdit={(record) =>
                setMediaModal({
                  kind: 'video',
                  path: record.target.path,
                  index: record.index,
                  title: record.item.title || '',
                  mediaUrl: record.item.videoUrl || '',
                  thumbnailUrl: record.item.thumbnailUrl || record.item.imageUrl || '',
                  username: record.item.username || 'admin',
                  password: record.item.password || '123456',
                  liveUrl: record.item.liveUrl || '',
                })
              }
              onDelete={(record) => deleteMediaItem(record.target.path, record.index)}
            />
          )}

          {activeTab === 'images' && (
            <AdminRecordList
              title="Images"
              addLabel="Add Image"
              records={imageTargets.flatMap((target) =>
                getItemsByPath(draft, target.path)
                  .map((item, index) => ({ item, index, target }))
                  .filter(({ item }) => target.path !== 'landing.gallery' || item.type !== 'video')
              )}
              onAdd={() => setMediaModal({ kind: 'image', path: 'landing.gallery', index: null, title: '', mediaUrl: '', liveUrl: '' })}
              onEdit={(record) =>
                setMediaModal({
                  kind: 'image',
                  path: record.target.path,
                  index: record.index,
                  title: record.item.title || '',
                  mediaUrl: record.item.imageUrl || record.item.thumbnailUrl || '',
                  liveUrl: record.item.liveUrl || '',
                })
              }
              onDelete={(record) => deleteMediaItem(record.target.path, record.index)}
            />
          )}

          {activeTab === 'reviews' && (
            <>
              <AdminSection title="Reviews Hero Section">
                <FormGrid>
                  <InputField label="Tagline" value={draft.reviewsPage?.heroTagline || ''} onChange={(value) => updateValue('reviewsPage.heroTagline', value)} />
                  <InputField label="Title Prefix" value={draft.reviewsPage?.heroTitlePrefix || ''} onChange={(value) => updateValue('reviewsPage.heroTitlePrefix', value)} />
                  <InputField label="Title Highlight" value={draft.reviewsPage?.heroTitleHighlight || ''} onChange={(value) => updateValue('reviewsPage.heroTitleHighlight', value)} />
                  <InputField label="Score" value={draft.reviewsPage?.heroScore || ''} onChange={(value) => updateValue('reviewsPage.heroScore', value)} />
                  <InputField label="Rating Text" value={draft.reviewsPage?.heroRatingText || ''} onChange={(value) => updateValue('reviewsPage.heroRatingText', value)} />
                  <InputField label="Support Text" value={draft.reviewsPage?.heroSupportText || ''} onChange={(value) => updateValue('reviewsPage.heroSupportText', value)} />
                </FormGrid>
              </AdminSection>

              <AdminSection title="Featured Reviews Header">
                <FormGrid>
                  <InputField label="Eyebrow" value={draft.reviewsPage?.featuredEyebrow || ''} onChange={(value) => updateValue('reviewsPage.featuredEyebrow', value)} />
                  <InputField label="Title Prefix" value={draft.reviewsPage?.featuredTitlePrefix || ''} onChange={(value) => updateValue('reviewsPage.featuredTitlePrefix', value)} />
                  <InputField label="Title Highlight" value={draft.reviewsPage?.featuredTitleHighlight || ''} onChange={(value) => updateValue('reviewsPage.featuredTitleHighlight', value)} />
                </FormGrid>
              </AdminSection>

              <CollectionEditor
                title="Featured Google Reviews (Top 3 Cards)"
                items={draft.reviewsPage?.featuredReviews || []}
                path="reviewsPage.featuredReviews"
                itemType="featuredReview"
                onItemChange={updateCollectionItem}
                onAdd={() => addCollectionItem('reviewsPage.featuredReviews', 'featuredReview')}
                onRemove={removeCollectionItem}
                onUpload={uploadFile}
                onBulkUpload={uploadCollectionFiles}
                fields={['title', 'subtitle', 'description', 'rating']}
              />

              <AdminSection title="Category Reviews Header">
                <FormGrid>
                  <InputField label="Eyebrow" value={draft.reviewsPage?.storiesEyebrow || ''} onChange={(value) => updateValue('reviewsPage.storiesEyebrow', value)} />
                  <InputField label="Title Prefix" value={draft.reviewsPage?.storiesTitlePrefix || ''} onChange={(value) => updateValue('reviewsPage.storiesTitlePrefix', value)} />
                  <InputField label="Title Highlight" value={draft.reviewsPage?.storiesTitleHighlight || ''} onChange={(value) => updateValue('reviewsPage.storiesTitleHighlight', value)} />
                </FormGrid>
                <p className="admin-field-hint">
                  Use **double asterisks** for bold brand names. Blank lines in description create paragraph breaks.
                </p>
              </AdminSection>

              <CollectionEditor
                title="Category Review Cards"
                description="Also powers the landing page reviews carousel. Add or edit reviews here to update both /reviews and the home page carousel."
                items={draft.reviewsPage?.reviews || []}
                path="reviewsPage.reviews"
                itemType="review"
                onItemChange={updateCollectionItem}
                onAdd={() => addCollectionItem('reviewsPage.reviews', 'review')}
                onRemove={removeCollectionItem}
                onUpload={uploadFile}
                onBulkUpload={uploadCollectionFiles}
                fields={['category', 'title', 'description', 'rating']}
              />

              <AdminSection title="Reviews CTA Section">
                <FormGrid>
                  <InputField label="CTA Title" value={draft.reviewsPage?.ctaTitle || ''} onChange={(value) => updateValue('reviewsPage.ctaTitle', value)} />
                  <TextAreaField label="CTA Description" value={draft.reviewsPage?.ctaDescription || ''} onChange={(value) => updateValue('reviewsPage.ctaDescription', value)} />
                  <InputField label="WhatsApp Button Text" value={draft.reviewsPage?.ctaWhatsappText || ''} onChange={(value) => updateValue('reviewsPage.ctaWhatsappText', value)} />
                  <InputField label="WhatsApp Link" value={draft.reviewsPage?.ctaWhatsappLink || ''} onChange={(value) => updateValue('reviewsPage.ctaWhatsappLink', value)} />
                  <InputField label="Call Button Text" value={draft.reviewsPage?.ctaCallText || ''} onChange={(value) => updateValue('reviewsPage.ctaCallText', value)} />
                  <InputField label="Call Link" value={draft.reviewsPage?.ctaCallLink || ''} onChange={(value) => updateValue('reviewsPage.ctaCallLink', value)} />
                </FormGrid>
              </AdminSection>
            </>
          )}

          {activeTab === 'contact' && (
            <>
              <AdminSection title="Contact Hero" description="Top heading and intro copy for the Contact page.">
                <FormGrid>
                  <InputField label="Eyebrow" value={draft.contact.eyebrow || ''} onChange={(value) => updateValue('contact.eyebrow', value)} />
                  <InputField label="Title Prefix" value={draft.contact.headingPrefix || ''} onChange={(value) => updateValue('contact.headingPrefix', value)} />
                  <InputField label="Title Highlight" value={draft.contact.headingHighlight || ''} onChange={(value) => updateValue('contact.headingHighlight', value)} />
                  <TextAreaField label="Description" value={draft.contact.description} onChange={(value) => updateValue('contact.description', value)} />
                </FormGrid>
              </AdminSection>

              <AdminSection title="Contact Details" description="Phone, email, WhatsApp and office address.">
                <FormGrid>
                  <InputField label="Phone" value={draft.contact.phone} onChange={(value) => updateValue('contact.phone', value)} />
                  <InputField label="Email" value={draft.contact.email} onChange={(value) => updateValue('contact.email', value)} />
                  <InputField label="WhatsApp Number" value={draft.contact.whatsappNumber} onChange={(value) => updateValue('contact.whatsappNumber', value)} />
                  <InputField label="Office Name" value={draft.contact.officeName || ''} onChange={(value) => updateValue('contact.officeName', value)} />
                  <InputField label="Address" value={draft.contact.address} onChange={(value) => updateValue('contact.address', value)} />
                  <InputField label="Map Embed URL" value={draft.contact.mapEmbedUrl || ''} onChange={(value) => updateValue('contact.mapEmbedUrl', value)} />
                </FormGrid>
              </AdminSection>

              <AdminSection title="Reach Cards" description="WhatsApp, phone and email card copy.">
                <FormGrid>
                  <InputField label="WhatsApp Card Title" value={draft.contact.whatsappCardTitle || ''} onChange={(value) => updateValue('contact.whatsappCardTitle', value)} />
                  <TextAreaField label="WhatsApp Card Text" value={draft.contact.whatsappCardText || ''} onChange={(value) => updateValue('contact.whatsappCardText', value)} />
                  <InputField label="Phone Card Title" value={draft.contact.phoneCardTitle || ''} onChange={(value) => updateValue('contact.phoneCardTitle', value)} />
                  <TextAreaField label="Phone Card Text" value={draft.contact.phoneCardText || ''} onChange={(value) => updateValue('contact.phoneCardText', value)} />
                  <InputField label="Email Card Title" value={draft.contact.emailCardTitle || ''} onChange={(value) => updateValue('contact.emailCardTitle', value)} />
                  <TextAreaField label="Email Card Text" value={draft.contact.emailCardText || ''} onChange={(value) => updateValue('contact.emailCardText', value)} />
                </FormGrid>
              </AdminSection>

              <AdminSection title="Office Section" description="Visit-our-office copy, hours and company details.">
                <FormGrid>
                  <InputField label="Office Eyebrow" value={draft.contact.officeEyebrow || ''} onChange={(value) => updateValue('contact.officeEyebrow', value)} />
                  <InputField label="Office Title Prefix" value={draft.contact.officeTitlePrefix || ''} onChange={(value) => updateValue('contact.officeTitlePrefix', value)} />
                  <InputField label="Office Title Highlight" value={draft.contact.officeTitleHighlight || ''} onChange={(value) => updateValue('contact.officeTitleHighlight', value)} />
                  <TextAreaField label="Service Areas" value={draft.contact.serviceAreas || ''} onChange={(value) => updateValue('contact.serviceAreas', value)} />
                  <TextAreaField label="Company Details" value={draft.contact.companyDetails || ''} onChange={(value) => updateValue('contact.companyDetails', value)} />
                </FormGrid>
                {(draft.contact.hours || []).map((row, index) => (
                  <FormGrid key={`hours-${index}`}>
                    <InputField label={`Hours day ${index + 1}`} value={row.day || ''} onChange={(value) => updateCollectionItem('contact.hours', index, 'day', value)} />
                    <InputField label={`Hours time ${index + 1}`} value={row.time || ''} onChange={(value) => updateCollectionItem('contact.hours', index, 'time', value)} />
                  </FormGrid>
                ))}
              </AdminSection>

              <AdminSection title="Contact CTA" description="Bottom call-to-action buttons.">
                <FormGrid>
                  <InputField label="CTA Title Prefix" value={draft.contact.ctaTitlePrefix || ''} onChange={(value) => updateValue('contact.ctaTitlePrefix', value)} />
                  <InputField label="CTA Title Highlight" value={draft.contact.ctaTitleHighlight || ''} onChange={(value) => updateValue('contact.ctaTitleHighlight', value)} />
                  <TextAreaField label="CTA Description" value={draft.contact.ctaDescription || ''} onChange={(value) => updateValue('contact.ctaDescription', value)} />
                  <InputField label="WhatsApp Button Text" value={draft.contact.ctaWhatsappText || ''} onChange={(value) => updateValue('contact.ctaWhatsappText', value)} />
                  <InputField label="Call Button Text" value={draft.contact.ctaCallText || ''} onChange={(value) => updateValue('contact.ctaCallText', value)} />
                </FormGrid>
              </AdminSection>

              <AdminSection title="Quick Booking Form" description="WhatsApp booking section at the bottom of the Contact page.">
                <FormGrid>
                  <InputField label="Booking Title" value={draft.contact.bookingTitle || ''} onChange={(value) => updateValue('contact.bookingTitle', value)} />
                  <TextAreaField label="Booking Subtitle" value={draft.contact.bookingSubtitle || ''} onChange={(value) => updateValue('contact.bookingSubtitle', value)} />
                  <InputField label="WhatsApp Pill Text" value={draft.contact.bookingWhatsappPillText || ''} onChange={(value) => updateValue('contact.bookingWhatsappPillText', value)} />
                  <InputField label="Call Pill Text" value={draft.contact.bookingCallPillText || ''} onChange={(value) => updateValue('contact.bookingCallPillText', value)} />
                </FormGrid>
              </AdminSection>
            </>
          )}

          {activeTab === 'security' && (
            <AdminSection title="Change Admin Password" description="Update the password used to access this dashboard.">
              <FormGrid>
                <InputField label="Current Password" value={currentPassword} onChange={setCurrentPassword} type="password" />
                <InputField label="New Password" value={newPassword} onChange={setNewPassword} type="password" />
                <InputField label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
              </FormGrid>
              {passwordMessage && <div className="admin-toast">{passwordMessage}</div>}
              <button type="button" className="admin-btn primary" onClick={handlePasswordChange} disabled={changingPassword}>
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </AdminSection>
          )}
        </div>
      </div>

      {mediaModal && (
        <AdminMediaModal
          form={mediaModal}
          onChange={setMediaModal}
          onClose={() => setMediaModal(null)}
          onSave={async (files) => {
            const saved = await saveMediaItem(mediaModal.kind, mediaModal, files)
            if (saved) setMediaModal(null)
          }}
        />
      )}
    </div>
  )
}

function AdminRecordList({ title, addLabel, records, onAdd, onEdit, onDelete }) {
  return (
    <div className="admin-records">
      <div className="admin-records-head">
        <h2>{title}</h2>
        <button type="button" className="admin-add-btn" onClick={onAdd}>
          {addLabel} +
        </button>
      </div>

      <div className="admin-records-card">
        {records.length === 0 && <p className="admin-records-empty">No items yet. Click “{addLabel} +” to add one.</p>}
        {records.map((record) => (
          <article key={`${record.target.path}-${record.index}`} className="admin-record">
            <div className="admin-record-row">
              <span>Title</span>
              <strong>{record.item.title || 'Untitled'}</strong>
            </div>
            <div className="admin-record-row">
              <span>Page</span>
              <strong>{record.target.label}</strong>
            </div>
            <div className="admin-record-row">
              <span>Status</span>
              <em className="admin-status-published">{(record.item.status || 'published').toUpperCase()}</em>
            </div>
            <div className="admin-record-row">
              <span>Added</span>
              <strong>{formatAddedDate(record.item.addedAt)}</strong>
            </div>
            <div className="admin-record-row">
              <span>Actions</span>
              <div className="admin-record-actions">
                <button type="button" className="admin-icon-btn edit" onClick={() => onEdit(record)} aria-label="Edit">
                  <Pencil size={18} />
                </button>
                <button type="button" className="admin-icon-btn delete" onClick={() => onDelete(record)} aria-label="Delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function AdminMediaModal({ form, onChange, onClose, onSave }) {
  const [mediaFile, setMediaFile] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const isVideo = form.kind === 'video'
  const isGallery = form.path === 'landing.gallery'
  const targets = isVideo ? videoTargets : imageTargets
  const thumbnailPreview = thumbnailFile ? URL.createObjectURL(thumbnailFile) : form.thumbnailUrl

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ mediaFile, thumbnailFile })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-head">
          <h3>{form.index == null ? (isVideo ? 'Add Video' : 'Add Image') : (isVideo ? 'Edit Video' : 'Edit Image')}</h3>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="admin-modal-body">
        <label className="field-label">
          <span>Show on</span>
          <select value={form.path} onChange={(event) => onChange({ ...form, path: event.target.value, index: form.path === event.target.value ? form.index : null })}>
            {targets.map((target) => (
              <option key={target.path} value={target.path}>
                {target.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span>Title</span>
          <input value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} placeholder="Hello" />
        </label>
        {isVideo ? (
          <>
            <label className="field-label">
              <span>Video link</span>
              <input
                value={form.mediaUrl}
                onChange={(event) => onChange({ ...form, mediaUrl: event.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </label>
            {isGallery && (
              <label className="field-label">
                <span>Or upload video file</span>
                <input type="file" accept="video/mp4,video/webm,video/ogg" onChange={(event) => setMediaFile(event.target.files?.[0] || null)} />
              </label>
            )}
            <label className="field-label">
              <span>Thumbnail image (optional)</span>
              <input type="file" accept="image/*" onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)} />
            </label>
            {thumbnailPreview ? <img src={thumbnailPreview} alt="Thumbnail preview" className="admin-thumb-preview" /> : null}
            {isGallery ? (
              <label className="field-label">
                <span>Live demo URL (optional)</span>
                <input value={form.liveUrl || ''} onChange={(event) => onChange({ ...form, liveUrl: event.target.value })} placeholder="https://your-demo-link.com" />
              </label>
            ) : (
              <>
                <label className="field-label">
                  <span>Admin username</span>
                  <input value={form.username || ''} onChange={(event) => onChange({ ...form, username: event.target.value })} placeholder="admin" />
                </label>
                <label className="field-label">
                  <span>Password</span>
                  <input value={form.password || ''} onChange={(event) => onChange({ ...form, password: event.target.value })} placeholder="123456" />
                </label>
                <label className="field-label">
                  <span>Live demo URL</span>
                  <input value={form.liveUrl || ''} onChange={(event) => onChange({ ...form, liveUrl: event.target.value })} placeholder="https://your-demo-link.com" />
                </label>
              </>
            )}
          </>
        ) : (
          <>
            <label className="field-label">
              <span>Image URL</span>
              <input value={form.mediaUrl} onChange={(event) => onChange({ ...form, mediaUrl: event.target.value })} placeholder="https://..." />
            </label>
            <label className="field-label">
              <span>Or upload image</span>
              <input type="file" accept="image/*" onChange={(event) => setMediaFile(event.target.files?.[0] || null)} />
            </label>
            {isGallery && (
              <label className="field-label">
                <span>Live demo URL (optional)</span>
                <input value={form.liveUrl || ''} onChange={(event) => onChange({ ...form, liveUrl: event.target.value })} placeholder="https://your-demo-link.com" />
              </label>
            )}
          </>
        )}
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="admin-add-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CollectionEditor({ title, description, items, path, fields, itemType, onItemChange, onAdd, onRemove, onUpload, onBulkUpload, onAddVideoLink }) {
  const [videoLink, setVideoLink] = useState('')
  const supportsImageUpload = fields.includes('imageUrl') || fields.includes('thumbnailUrl')
  const supportsVideoLink = fields.includes('videoUrl')

  const handleAddVideoLink = () => {
    const added = onAddVideoLink?.(path, itemType, videoLink)
    if (added) setVideoLink('')
  }

  return (
    <AdminSection title={title} description={description}>
      <div className="collection-stack">
        {(supportsImageUpload || supportsVideoLink) && (
          <div className="admin-upload-box">
            <div className="admin-upload-box-head">
              <div>
                <strong>Add More Items</strong>
                <p>Current items stay. Paste a video link to add a new card, or upload extra images.</p>
              </div>
              <span className="admin-upload-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            {supportsVideoLink && (
              <div className="admin-video-link-row">
                <input
                  type="url"
                  value={videoLink}
                  onChange={(event) => setVideoLink(event.target.value)}
                  placeholder="Paste YouTube / video link..."
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleAddVideoLink()
                    }
                  }}
                />
                <button type="button" className="admin-btn primary" onClick={handleAddVideoLink}>
                  + Add Video Link
                </button>
              </div>
            )}
            <div className="admin-upload-actions">
              {supportsImageUpload && (
                <label className="admin-btn ghost admin-upload-label">
                  + Upload Images
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(event) => onBulkUpload(event, path, itemType, fields.includes('thumbnailUrl') ? 'thumbnailUrl' : 'imageUrl')}
                  />
                </label>
              )}
              <button type="button" className="admin-btn ghost" onClick={onAdd}>
                + Add Empty Item
              </button>
            </div>
          </div>
        )}
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="admin-item-card">
            <div className="admin-item-header">
              <h3>{item.title || `Item ${index + 1}`}</h3>
              <button type="button" className="danger-btn" onClick={() => onRemove(path, index)}>
                Delete
              </button>
            </div>
            <FormGrid>
              {fields.map((field) => (
                <label key={field} className="field-label">
                  <span>
                    {path.includes('faqItems') && field === 'title'
                      ? 'Question'
                      : path.includes('faqItems') && field === 'description'
                        ? 'Answer'
                        : field === 'videoUrl'
                      ? 'Video URL (YouTube link or MP4)'
                      : field === 'thumbnailUrl'
                        ? 'Thumbnail URL'
                        : field === 'liveUrl'
                          ? 'Live Demo URL (optional)'
                          : field === 'whatsappText'
                            ? 'WhatsApp Button Text'
                            : field}
                  </span>
                  {field === 'description' || field === 'keyFeatures' ? (
                    <textarea
                      value={field === 'keyFeatures' ? (item[field] || []).join(', ') : item[field] || ''}
                      onChange={(event) => onItemChange(path, index, field, event.target.value)}
                      rows={field === 'keyFeatures' ? 2 : 4}
                    />
                  ) : field === 'type' ? (
                    <select value={item[field] || 'image'} onChange={(event) => onItemChange(path, index, field, event.target.value)}>
                      <option value="image">image</option>
                      <option value="video">video</option>
                    </select>
                  ) : field === 'icon' ? (
                    <select value={item[field] || 'shield'} onChange={(event) => onItemChange(path, index, field, event.target.value)}>
                      <option value="shield">shield</option>
                      <option value="leaf">leaf</option>
                      <option value="truck">truck</option>
                      <option value="message">message</option>
                      <option value="globe">globe</option>
                      <option value="home">home</option>
                      <option value="sparkles">sparkles</option>
                    </select>
                  ) : (
                    <input
                      value={item[field] || ''}
                      onChange={(event) => onItemChange(path, index, field, event.target.value)}
                      placeholder={
                        field === 'videoUrl'
                          ? 'https://www.youtube.com/watch?v=... or youtu.be/...'
                          : undefined
                      }
                    />
                  )}
                </label>
              ))}
              {(fields.includes('imageUrl') || fields.includes('thumbnailUrl')) && (
                <label className="field-label">
                  <span>Upload image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => onUpload(event, path, index, fields.includes('imageUrl') ? 'imageUrl' : 'thumbnailUrl')}
                  />
                </label>
              )}
              {fields.includes('videoUrl') && path.includes('gallery') && (
                <label className="field-label">
                  <span>Upload video file</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    onChange={(event) => {
                      onUpload(event, path, index, 'videoUrl')
                      onItemChange(path, index, 'type', 'video')
                    }}
                  />
                </label>
              )}
            </FormGrid>
          </div>
        ))}
        {!(supportsImageUpload || supportsVideoLink) && (
          <button type="button" className="secondary-btn add-btn" onClick={onAdd}>
            Add New Item
          </button>
        )}
      </div>
    </AdminSection>
  )
}

function AdminSection({ title, description, children }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      <div className="admin-panel-body">{children}</div>
    </section>
  )
}

function FormGrid({ children }) {
  return <div className="form-grid">{children}</div>
}

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextAreaField({ label, value, onChange, rows = 4 }) {
  return (
    <label className="field-label field-span">
      <span>{label}</span>
      <textarea rows={rows} value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className={`section-heading${action ? ' section-heading-with-action' : ''}`}>
      <div>
        <p className="eyebrow">IoTProgrammers</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

function SimpleTextPage({ slug }) {
  const page = legalPagesBySlug[slug]
  const title = page?.title || siteChrome.privacy
  const subtitle =
    page?.subtitle ||
    `This ${title.toLowerCase()} content can be replaced with your final legal text.`
  const relatedLinks = [
    { to: '/privacy-policy', label: siteChrome.privacy },
    { to: '/terms-of-service', label: siteChrome.terms },
    { to: '/cookie-policy', label: siteChrome.cookies },
    { to: '/refund-policy', label: siteChrome.refund },
  ].filter((link) => link.to !== `/${slug}`)

  return (
    <section className="simple-page legal-page">
      <SectionHeader title={title} subtitle={subtitle} />
      {page?.lastUpdated ? (
        <p className="legal-page-updated">Last updated: {page.lastUpdated}</p>
      ) : null}
      {page?.sections?.length ? (
        <div className="legal-page-body">
          {page.sections.map((section) => (
            <section key={section.heading} className="legal-page-section">
              <h3>{section.heading}</h3>
              {section.paragraphs.map((paragraph, index) => (
                <p key={`${section.heading}-${index}`}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      ) : null}
      <nav className="legal-page-related" aria-label={siteChrome.legalLinksAria}>
        {relatedLinks.map((link) => (
          <NavLink key={link.to} to={link.to}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </section>
  )
}

export default App
