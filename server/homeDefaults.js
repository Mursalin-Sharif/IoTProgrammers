const homeDefaults = {
  featureFooterText: 'WhatsApp 01302003306',
  productsOfferText: 'View current offers',
  productsOfferLink: '/home',
  heroSlides: [
    {
      badge: 'IoTProgrammers',
      title: 'Premium MERN Portfolio & Demo Websites',
      subtitle: 'Admin controlled banners · WhatsApp lead capture · Live demo access',
      ctaText: 'WhatsApp Now',
      ctaLink: 'https://wa.me/8801302003306',
      imageUrl:
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80',
    },
    {
      badge: 'IoTProgrammers',
      title: 'Launch Your Business Website Faster',
      subtitle: 'Carousel banners · Demo cards · Reviews · Full admin dashboard',
      ctaText: 'View Demos',
      ctaLink: '/home',
      imageUrl:
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80',
    },
    {
      badge: 'IoTProgrammers',
      title: 'Smart IoT & Web Solutions',
      subtitle: 'Custom development · Responsive design · Client-ready demos',
      ctaText: 'WhatsApp Now',
      ctaLink: 'https://wa.me/8801302003306',
      imageUrl:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80',
    },
  ],
  featureCards: [
    {
      icon: 'truck',
      title: 'Fast Delivery',
      description: 'Starter portfolios and demo landings shipped on schedule',
    },
    {
      icon: 'shield',
      title: 'Quality Guarantee',
      description: 'Mobile-responsive layouts tested on every device',
    },
    {
      icon: 'leaf',
      title: 'Live Demos',
      description: 'Video previews, live links, and admin login on every demo card',
    },
    {
      icon: 'message',
      title: 'WhatsApp Support',
      description: 'Instant contact and quick project support',
    },
  ],
  demoCards: [
    {
      subtitle: 'Restaurant Demo',
      title: 'Restaurant Management System',
      discountBadge: '-35%',
      price: '৳ 1,950',
      originalPrice: '৳ 3,000',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      liveUrl: 'https://example.com/demo-restaurant',
      username: 'admin',
      password: '123456',
    },
    {
      subtitle: 'School ERP Demo',
      title: 'School Management Dashboard',
      discountBadge: '-50%',
      price: '৳ 2,500',
      originalPrice: '৳ 5,000',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80',
      videoUrl: 'https://www.youtube.com/embed/oHg5SJYRHA0',
      liveUrl: 'https://example.com/demo-school',
      username: 'demo-admin',
      password: 'demo-pass',
    },
    {
      subtitle: 'Clinic Demo',
      title: 'Clinic Appointment System',
      discountBadge: '-30%',
      price: '৳ 1,750',
      originalPrice: '৳ 2,500',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80',
      videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw',
      liveUrl: 'https://example.com/demo-clinic',
      username: 'clinic-admin',
      password: 'secure-demo',
    },
    {
      subtitle: 'Ecommerce Demo',
      title: 'Online Store Landing Demo',
      discountBadge: '-40%',
      price: '৳ 2,200',
      originalPrice: '৳ 3,700',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      liveUrl: 'https://example.com/demo-store',
      username: 'store-admin',
      password: 'store-pass',
    },
  ],
}

const englishSiteChromeSettings = {
  footerTagline: 'MERN Portfolio · Demo Websites · WhatsApp Leads',
  footerAbout:
    'Premium MERN portfolio and demo websites—admin-controlled content. Landing pages, reviews, gallery, and WhatsApp CTAs for agencies and brands.',
  facebookLabel: 'Facebook Page',
  footerPrivacyLabel: 'Privacy Policy',
  footerTermsLabel: 'Terms of Service',
  copyrightText: '© 2026 IoTProgrammers. All rights reserved.',
}

const hasBanglaText = (value) => /[\u0980-\u09EF]/.test(String(value || ''))

module.exports = { homeDefaults, englishSiteChromeSettings, hasBanglaText }
