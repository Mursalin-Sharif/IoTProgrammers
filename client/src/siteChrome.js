import { Globe, Home, Mail, Star } from 'lucide-react'

/** Fixed English nav / chrome labels (header, footer, bottom nav). */
export const navItems = [
  { to: '/', label: 'Landing', icon: Globe },
  { to: '/home', label: 'Home', icon: Home },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/contact', label: 'Contact', icon: Mail },
]

export const bottomNavSideItems = [
  { to: '/', label: 'Landing', icon: Globe, end: true },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/contact', label: 'Contact', icon: Mail },
]

export const bottomNavHomeItem = { to: '/home', label: 'Home', icon: Home }

export const siteChrome = {
  linksHeading: 'Links',
  contactHeading: 'Contact',
  legalHeading: 'Legal',
  servicesHeading: 'Services',
  home: 'Home',
  landing: 'Landing',
  reviews: 'Reviews',
  contact: 'Contact',
  facebook: 'Facebook Page',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  cookies: 'Cookie Policy',
  refund: 'Refund Policy',
  services: ['Portfolio websites', 'Demo showcases', 'Admin dashboards', 'WhatsApp lead systems'],
  menu: 'Menu',
  closeMenu: 'Close menu',
  openMenu: 'Open menu',
  navAria: 'Primary mobile navigation',
  footerLinksAria: 'Footer links',
  legalLinksAria: 'Legal links',
  loading: 'Loading website content...',
  backendError: 'Backend unavailable. Showing fallback content.',
  whatsappCta: 'WhatsApp Now',
  adminLabel: 'Admin',
  passwordLabel: 'Password',
  liveDemo: 'Live View Demo',
}
