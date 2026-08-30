const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const { reviewsPageDefaults } = require('./reviewsPageDefaults');
const { pricingDefaults, landingPricingDefaults } = require('./pricingDefaults');
const { landingComparisonDefaults, homeComparisonDefaults } = require('./comparisonDefaults');
const { homeDefaults, englishSiteChromeSettings, hasBanglaText } = require('./homeDefaults');
const { landingDefaults, landingWhatsappCta } = require('./landingDefaults');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const ensureJwtSecret = () => {
  const existing = String(process.env.JWT_SECRET || '').trim();
  // Never rotate an existing secret — that invalidates all admin sessions.
  if (existing) {
    if (existing.length < 32) {
      console.warn('JWT_SECRET is shorter than 32 characters. Prefer a longer secret in server/.env');
    }
    return existing;
  }

  const generated = crypto.randomBytes(48).toString('hex');
  const line = `JWT_SECRET=${generated}\n`;

  if (fs.existsSync(envPath)) {
    const current = fs.readFileSync(envPath, 'utf8');
    fs.appendFileSync(envPath, current.endsWith('\n') || !current ? line : `\n${line}`);
  } else {
    fs.writeFileSync(envPath, line);
  }

  process.env.JWT_SECRET = generated;
  console.warn('Generated a strong JWT_SECRET and saved it to server/.env');
  return generated;
};

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iotprogrammers-portfolio';
const JWT_SECRET = ensureJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const CLIENT_ORIGIN = String(process.env.CLIENT_ORIGIN || '').trim();
const clientDistDir = path.join(__dirname, '../client/dist');
const uploadsDir = path.join(__dirname, 'uploads');
let isMongoReady = false;
let memoryContent;

/** In-memory cache for GET /api/content — avoids hammering Mongo on every page view / tab focus. */
const CONTENT_CACHE_TTL_MS = Number(process.env.CONTENT_CACHE_TTL_MS || 60_000);
let contentCache = { payload: null, etag: null, expiresAt: 0 };

const invalidateContentCache = () => {
  contentCache = { payload: null, etag: null, expiresAt: 0 };
};

const createRateLimiter = ({ windowMs, max, message = 'Too many requests. Please try again shortly.' }) => {
  const buckets = new Map();
  return (req, res, next) => {
    const key = String(req.ip || req.socket?.remoteAddress || 'unknown');
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ message });
    }
    return next();
  };
};

const loginRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many login attempts.' });
const uploadRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: 'Upload limit reached. Wait a minute.' });

// Hostinger / reverse proxies
app.set('trust proxy', 1);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const corsOptions = CLIENT_ORIGIN
  ? {
      origin: CLIENT_ORIGIN.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      credentials: true,
    }
  : undefined;

app.use(corsOptions ? cors(corsOptions) : cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '7d',
    etag: true,
    setHeaders(res, filePath) {
      if (/\.(jpe?g|png|gif|webp|avif|mp4|webm|svg)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      }
    },
  }),
);

const mediaItemSchema = new mongoose.Schema(
  {
    title: String,
    subtitle: String,
    description: String,
    imageUrl: String,
    thumbnailUrl: String,
    videoUrl: String,
    liveUrl: String,
    username: String,
    password: String,
    whatsappText: String,
    badge: String,
    ctaText: String,
    ctaLink: String,
    icon: String,
    keyFeatures: [String],
    rating: Number,
    category: String,
    discountBadge: String,
    price: String,
    originalPrice: String,
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    status: {
      type: String,
      default: 'published',
    },
    addedAt: String,
  },
  { _id: true }
);

const siteContentSchema = new mongoose.Schema(
  {
    siteSettings: {
      logoText: String,
      logoUrl: String,
      brandName: String,
      whatsappNumber: String,
      address: String,
      footerTagline: String,
      footerAbout: String,
      facebookUrl: String,
      facebookLabel: String,
      footerPrivacyLabel: String,
      footerPrivacyUrl: String,
      footerTermsLabel: String,
      footerTermsUrl: String,
      footerCookieLabel: String,
      footerCookieUrl: String,
      footerRefundLabel: String,
      footerRefundUrl: String,
      copyrightText: String,
      contactEmail: String,
      contactPhone: String,
      gtmHeadCode: { type: String, default: '' },
      gtmBodyCode: { type: String, default: '' },
      ga4MeasurementId: { type: String, default: '' },
      fbPixelId: { type: String, default: '' },
      // Legacy aliases (migrated → gtmHeadCode / gtmBodyCode in ensureContent)
      gtmHeadScript: String,
      gtmBodyScript: String,
    },
    home: {
      featureFooterText: String,
      productsOfferText: String,
      productsOfferLink: String,
      heroSlides: [mediaItemSchema],
      featureCards: [mediaItemSchema],
      demoCards: [mediaItemSchema],
      comparison: {
        titlePrefix: String,
        titleHighlight: String,
        subtitle: String,
        includedTitle: String,
        includedItems: String,
        excludedTitle: String,
        excludedItems: String,
      },
    },
    landing: {
      introVideoUrl: String,
      headline: String,
      featuresText: String,
      demoCards: [mediaItemSchema],
      reviews: [mediaItemSchema],
      gallery: [mediaItemSchema],
      faqTitle: String,
      faqSubtitle: String,
      faqItems: [mediaItemSchema],
      reviewsTitlePrefix: String,
      reviewsTitleHighlight: String,
      reviewsSubtitle: String,
      galleryTitle: String,
      gallerySubtitle: String,
      comparison: {
        titlePrefix: String,
        titleHighlight: String,
        subtitle: String,
        includedTitle: String,
        includedItems: String,
        excludedTitle: String,
        excludedItems: String,
      },
      pricing: {
        titlePrefix: String,
        titleHighlight: String,
        subtitle: String,
        plans: [
          {
            title: String,
            subtitle: String,
            badge: String,
            featured: Boolean,
            leftLabel: String,
            rightLabel: String,
            rowsText: String,
            featuresText: String,
            note: String,
          },
        ],
      },
    },
    contact: {
      eyebrow: String,
      headingPrefix: String,
      headingHighlight: String,
      heading: String,
      description: String,
      phone: String,
      email: String,
      address: String,
      officeName: String,
      whatsappNumber: String,
      whatsappCardTitle: String,
      whatsappCardText: String,
      phoneCardTitle: String,
      phoneCardText: String,
      emailCardTitle: String,
      emailCardText: String,
      officeEyebrow: String,
      officeTitlePrefix: String,
      officeTitleHighlight: String,
      hours: [
        {
          day: String,
          time: String,
        },
      ],
      serviceAreas: String,
      companyDetails: String,
      mapEmbedUrl: String,
      ctaTitlePrefix: String,
      ctaTitleHighlight: String,
      ctaDescription: String,
      ctaWhatsappText: String,
      ctaCallText: String,
      bookingTitle: String,
      bookingSubtitle: String,
      bookingWhatsappPillText: String,
      bookingCallPillText: String,
    },
    reviewsPage: {
      heroTagline: String,
      heroTitlePrefix: String,
      heroTitleHighlight: String,
      heroScore: String,
      heroRatingText: String,
      heroSupportText: String,
      featuredEyebrow: String,
      featuredTitlePrefix: String,
      featuredTitleHighlight: String,
      featuredReviews: [mediaItemSchema],
      storiesEyebrow: String,
      storiesTitlePrefix: String,
      storiesTitleHighlight: String,
      reviews: [mediaItemSchema],
      ctaTitle: String,
      ctaDescription: String,
      ctaWhatsappText: String,
      ctaCallText: String,
      ctaWhatsappLink: String,
      ctaCallLink: String,
    },
    pricing: {
      titlePrefix: String,
      titleHighlight: String,
      subtitle: String,
      plans: [
        {
          title: String,
          subtitle: String,
          badge: String,
          featured: Boolean,
          leftLabel: String,
          rightLabel: String,
          rowsText: String,
          featuresText: String,
          note: String,
        },
      ],
    },
  },
  { timestamps: true }
);

const SiteContent = mongoose.model('SiteContent', siteContentSchema);

const adminAuthSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

const AdminAuth = mongoose.model('AdminAuth', adminAuthSchema);

let memoryAuth = {
  username: DEFAULT_ADMIN_USERNAME,
  passwordHash: '',
};

const hashPassword = async (password) => bcrypt.hash(password, 12);

const comparePassword = async (password, passwordHash) => bcrypt.compare(password, passwordHash);

const signToken = (username) =>
  jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Login required' });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: 'Login required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.role !== 'admin' || !payload?.username) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    req.admin = payload;
    return next();
  } catch (error) {
    const message =
      error?.name === 'TokenExpiredError'
        ? 'Session expired. Please login again.'
        : 'Invalid or expired token';
    return res.status(401).json({ message });
  }
};

const getAdminRecord = async (username = DEFAULT_ADMIN_USERNAME) => {
  if (isMongoReady) {
    if (username) {
      const byName = await AdminAuth.findOne({ username });
      if (byName) return byName;
    }
    return AdminAuth.findOne();
  }

  if (!username || memoryAuth.username === username) {
    return memoryAuth.passwordHash ? memoryAuth : null;
  }

  return null;
};

const updateAdminPassword = async (passwordHash, username = DEFAULT_ADMIN_USERNAME) => {
  if (isMongoReady) {
    return AdminAuth.findOneAndUpdate(
      { username },
      { passwordHash },
      { upsert: true, new: true }
    );
  }

  memoryAuth = {
    username,
    passwordHash,
  };
  return memoryAuth;
};

const ensureAdminAuth = async () => {
  // Seed credentials only when no admin exists yet (env overrides defaults).
  if (!isMongoReady) {
    if (!memoryAuth.passwordHash) {
      memoryAuth = {
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash: await hashPassword(DEFAULT_ADMIN_PASSWORD),
      };
    }
    return;
  }

  const existing = await AdminAuth.findOne();
  if (!existing) {
    await AdminAuth.create({
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash: await hashPassword(DEFAULT_ADMIN_PASSWORD),
    });
  }
};

const defaultContent = {
  siteSettings: {
    logoText: 'IP',
    logoUrl: '/logo-iotprogrammers.png',
    brandName: 'IoTProgrammers',
    whatsappNumber: '01302003306',
    address:
      '256, KONAGRAM, MAJHIGATI HIGH SCHOOL-8100, GOPALGANJ SADAR, GOPALGANJ, DHAKA, BANGLADESH',
    ...englishSiteChromeSettings,
    facebookUrl: 'https://facebook.com',
    footerPrivacyUrl: '/privacy-policy',
    footerTermsUrl: '/terms-of-service',
    footerCookieUrl: '/cookie-policy',
    footerRefundUrl: '/refund-policy',
    contactEmail: 'iotprogrammers@gmail.com',
    contactPhone: '01302003306',
    gtmHeadCode: `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MT999BBG');</script>
<!-- End Google Tag Manager -->
<script>(function(){var GA4='G-ENQ45TKR0E';var SERVER='https://server.iotprogrammers.com/g/collect';var EV={page_view:1,view_item:1,add_to_cart:1,begin_checkout:1,purchase:1,contact:1,generate_lead:1};function cookie(n){var m=document.cookie.match(new RegExp('(?:^|; )'+n.replace(/([.$?*|{}()\\[\\]\\/+^])/g,'\\\\$1')+'=([^;]*)'));return m?decodeURIComponent(m[1]):'';}function cid(){var g=cookie('_ga').match(/GA\\d+\\.\\d+\\.(.+)$/);return g?g[1]:(Date.now()+'.'+Math.floor(Math.random()*1e9));}function sid(){var g=cookie('_ga_ENQ45TKR0E').match(/GS\\d+\\.\\d+\\.s?(\\d+)/);return g?g[1]:String(Math.floor(Date.now()/1000));}function send(en,p){if(!en||!EV[en])return;var q=new URLSearchParams();q.set('v','2');q.set('tid',GA4);q.set('cid',cid());q.set('en',en);q.set('dl',location.href);q.set('dt',document.title||'');q.set('sid',sid());q.set('sct','1');q.set('seg','1');q.set('_s','1');q.set('_p',String(Date.now()));if(p&&p.event_id){q.set('ep.event_id',String(p.event_id));q.set('evnid',String(p.event_id));}if(p&&p.page_path)q.set('dp',String(p.page_path));if(p&&p.fbp)q.set('ep.x-fb-ck-fbp',String(p.fbp));if(p&&p.fbc)q.set('ep.x-fb-ck-fbc',String(p.fbc));var url=SERVER+'?'+q.toString();try{if(navigator.sendBeacon)navigator.sendBeacon(url);else{var i=new Image();i.src=url;}}catch(e){}}var w=window;w.dataLayer=w.dataLayer||[];var _push=w.dataLayer.push.bind(w.dataLayer);w.dataLayer.push=function(){for(var i=0;i<arguments.length;i++){var a=arguments[i];if(a&&typeof a==='object'&&!Array.isArray(a)&&a.event){send(a.event,a);if(a.ga4_measurement_id)GA4=String(a.ga4_measurement_id);}}return _push.apply(null,arguments);};for(var j=0;j<w.dataLayer.length;j++){var e=w.dataLayer[j];if(e&&e.event)send(e.event,e);}})();</script>`,
    gtmBodyCode: `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MT999BBG"
height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`,
    ga4MeasurementId: 'G-ENQ45TKR0E',
    fbPixelId: '5491102457781853',
  },
  home: {
    ...homeDefaults,
    comparison: homeComparisonDefaults,
  },
  landing: landingDefaults,
  contact: {
    eyebrow: 'CONTACT IOTPROGRAMMERS',
    headingPrefix: 'Get in touch.',
    headingHighlight: 'We respond fast.',
    heading: 'Get in touch. We respond fast.',
    description:
      'WhatsApp is the fastest way to reach us: portfolio websites, demo showcases, landing pages and admin dashboards. We typically reply within minutes during working hours.',
    phone: '01302003306',
    email: 'iotprogrammers@gmail.com',
    address:
      '256, KONAGRAM, MAJHIGATI HIGH SCHOOL-8100\nGOPALGANJ SADAR, GOPALGANJ\nDHAKA, BANGLADESH',
    officeName: 'IoTProgrammers',
    whatsappNumber: '01302003306',
    whatsappCardTitle: 'WhatsApp',
    whatsappCardText: 'Fastest reply. Send your project idea or a demo screenshot and we will get back quickly.',
    phoneCardTitle: 'Phone Call',
    phoneCardText: 'Speak with our team directly during working hours.',
    emailCardTitle: 'Email',
    emailCardText: 'For quotes, invoices, or detailed project briefs with attachments.',
    officeEyebrow: 'VISIT OUR OFFICE',
    officeTitlePrefix: 'Our office is in',
    officeTitleHighlight: 'Gopalganj.',
    hours: [
      { day: 'Saturday to Thursday', time: '10:00 AM to 8:00 PM' },
      { day: 'Friday', time: 'Closed' },
      { day: 'Public Holidays', time: 'By appointment' },
    ],
    serviceAreas:
      'We serve clients across Bangladesh and remotely worldwide.\nPortfolio websites, demo showcases, landing pages, and admin-controlled business sites.',
    companyDetails:
      'WhatsApp: 01302003306\nEmail: iotprogrammers@gmail.com\nMERN Portfolio · Demo Websites · WhatsApp Leads\nBased in Gopalganj · Fast WhatsApp support',
    mapEmbedUrl:
      'https://www.google.com/maps?q=Gopalganj+Sadar+Upazila,+Gopalganj,+Bangladesh&hl=en&z=12&output=embed',
    ctaTitlePrefix: 'Ready to start a',
    ctaTitleHighlight: 'project?',
    ctaDescription: 'WhatsApp is the fastest way: we typically reply within minutes during working hours.',
    ctaWhatsappText: 'WhatsApp 01302003306',
    ctaCallText: 'Call directly',
    bookingTitle: 'Quick Booking, sends to our WhatsApp',
    bookingSubtitle:
      'Share your project details below and we will open WhatsApp with a pre-filled message — usually a reply within minutes during working hours.',
    bookingWhatsappPillText: 'WhatsApp Us',
    bookingCallPillText: 'Call 01302003306',
  },
  reviewsPage: reviewsPageDefaults,
  pricing: pricingDefaults,
};

memoryContent = structuredClone(defaultContent);

const connectDb = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_MS || 8000),
      socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 45000),
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 1),
      maxIdleTimeMS: Number(process.env.MONGODB_MAX_IDLE_MS || 30000),
    });
    isMongoReady = true;
    console.log('MongoDB connected');
  } catch (error) {
    isMongoReady = false;
    console.error('MongoDB connection error:', error.message);
  }
};

mongoose.connection.on('disconnected', () => {
  isMongoReady = false;
  invalidateContentCache();
  console.warn('MongoDB disconnected — serving cached/fallback content until reconnect');
});

mongoose.connection.on('reconnected', () => {
  isMongoReady = true;
  invalidateContentCache();
  console.log('MongoDB reconnected');
});

const ensureContent = async () => {
  if (!isMongoReady) {
    return;
  }

  const existing = await SiteContent.findOne();

  if (!existing) {
    await SiteContent.create(defaultContent);
    return;
  }

  const patch = {};

  if (!existing.landing?.introVideoUrl) {
    // Keep empty until admin sets Landing intro video — never force a sample URL.
  } else if (
    existing.landing.introVideoUrl.includes('youtube.com/embed/jNQXAC9IVRw') &&
    defaultContent.landing.introVideoUrl
  ) {
    patch['landing.introVideoUrl'] = defaultContent.landing.introVideoUrl;
  }
  if (!existing.landing?.headline) {
    patch['landing.headline'] = defaultContent.landing.headline;
  }
  if (!existing.landing?.featuresText) {
    patch['landing.featuresText'] = defaultContent.landing.featuresText;
  }
  if (!existing.home?.featureFooterText || String(existing.home.featureFooterText).includes('Imo')) {
    patch['home.featureFooterText'] = defaultContent.home.featureFooterText;
  }
  if (!existing.home?.productsOfferText || hasBanglaText(existing.home.productsOfferText)) {
    patch['home.productsOfferText'] = defaultContent.home.productsOfferText;
  }
  if (!existing.home?.heroSlides?.length) {
    patch['home.heroSlides'] = defaultContent.home.heroSlides;
  }
  const homeFeatureCards = existing.home?.featureCards || [];
  if (
    !homeFeatureCards.length ||
    homeFeatureCards.some((card) => hasBanglaText(card.title) || hasBanglaText(card.description))
  ) {
    patch['home.featureCards'] = defaultContent.home.featureCards;
  }
  if (
    !existing.home?.comparison?.includedItems ||
    hasBanglaText(existing.home?.comparison?.titlePrefix) ||
    existing.home?.comparison?.titlePrefix === 'যা পাবেন'
  ) {
    patch['home.comparison'] = defaultContent.home.comparison;
  }
  if (
    !existing.pricing?.plans?.length ||
    hasBanglaText(existing.pricing?.titlePrefix) ||
    existing.pricing?.titlePrefix === 'স্বচ্ছ'
  ) {
    patch.pricing = defaultContent.pricing;
  }
  if (
    !existing.siteSettings?.footerTagline ||
    hasBanglaText(existing.siteSettings?.footerTagline) ||
    hasBanglaText(existing.siteSettings?.footerAbout) ||
    hasBanglaText(existing.siteSettings?.facebookLabel) ||
    hasBanglaText(existing.siteSettings?.footerPrivacyLabel) ||
    hasBanglaText(existing.siteSettings?.footerTermsLabel) ||
    hasBanglaText(existing.siteSettings?.copyrightText)
  ) {
    patch['siteSettings.footerTagline'] = defaultContent.siteSettings.footerTagline;
    patch['siteSettings.footerAbout'] = defaultContent.siteSettings.footerAbout;
    patch['siteSettings.facebookLabel'] = defaultContent.siteSettings.facebookLabel;
    patch['siteSettings.footerPrivacyLabel'] = defaultContent.siteSettings.footerPrivacyLabel;
    patch['siteSettings.footerTermsLabel'] = defaultContent.siteSettings.footerTermsLabel;
    patch['siteSettings.copyrightText'] = defaultContent.siteSettings.copyrightText;
  }
  if (!existing.siteSettings?.logoUrl) {
    patch['siteSettings.logoUrl'] = defaultContent.siteSettings.logoUrl;
  } else if (
    String(existing.siteSettings.logoUrl).trim() === '/logo-iotprogrammers.jpg'
  ) {
    patch['siteSettings.logoUrl'] = defaultContent.siteSettings.logoUrl;
  }
  if (!existing.siteSettings?.facebookUrl) {
    patch['siteSettings.facebookUrl'] = defaultContent.siteSettings.facebookUrl;
  }
  if (!existing.siteSettings?.footerCookieUrl) {
    patch['siteSettings.footerCookieUrl'] = defaultContent.siteSettings.footerCookieUrl;
  }
  if (!existing.siteSettings?.footerRefundUrl) {
    patch['siteSettings.footerRefundUrl'] = defaultContent.siteSettings.footerRefundUrl;
  }
  if (!existing.siteSettings?.footerCookieLabel) {
    patch['siteSettings.footerCookieLabel'] = defaultContent.siteSettings.footerCookieLabel;
  }
  if (!existing.siteSettings?.footerRefundLabel) {
    patch['siteSettings.footerRefundLabel'] = defaultContent.siteSettings.footerRefundLabel;
  }

  // GTM / tracking fields — use raw Mongo values (Document getters apply schema
  // defaults, so `== null` on the mongoose doc falsely skips seeding empty keys).
  const rawSettings =
    (
      await SiteContent.collection.findOne(
        { _id: existing._id },
        {
          projection: {
            'siteSettings.gtmHeadCode': 1,
            'siteSettings.gtmBodyCode': 1,
            'siteSettings.ga4MeasurementId': 1,
            'siteSettings.fbPixelId': 1,
            'siteSettings.gtmHeadScript': 1,
            'siteSettings.gtmBodyScript': 1,
          },
        },
      )
    )?.siteSettings || {};

  if (!Object.prototype.hasOwnProperty.call(rawSettings, 'gtmHeadCode')) {
    patch['siteSettings.gtmHeadCode'] =
      rawSettings.gtmHeadScript || defaultContent.siteSettings.gtmHeadCode;
  }
  if (!Object.prototype.hasOwnProperty.call(rawSettings, 'gtmBodyCode')) {
    patch['siteSettings.gtmBodyCode'] =
      rawSettings.gtmBodyScript || defaultContent.siteSettings.gtmBodyCode;
  }
  if (!Object.prototype.hasOwnProperty.call(rawSettings, 'ga4MeasurementId')) {
    patch['siteSettings.ga4MeasurementId'] = defaultContent.siteSettings.ga4MeasurementId;
  }
  if (!Object.prototype.hasOwnProperty.call(rawSettings, 'fbPixelId')) {
    patch['siteSettings.fbPixelId'] = defaultContent.siteSettings.fbPixelId;
  }
  if (
    !existing.reviewsPage?.heroTagline ||
    !existing.reviewsPage?.featuredReviews?.length ||
    existing.reviewsPage?.heroTitleHighlight?.includes('Aircon')
  ) {
    patch.reviewsPage = defaultContent.reviewsPage;
  }
  if (!existing.landing?.faqItems?.length) {
    patch['landing.faqTitle'] = defaultContent.landing.faqTitle;
    patch['landing.faqSubtitle'] = defaultContent.landing.faqSubtitle;
    patch['landing.faqItems'] = defaultContent.landing.faqItems;
  } else if (
    existing.landing?.faqTitle === 'Frequently Asked Questions' ||
    /what kind of websites|how (long|fast)|do you/i.test(existing.landing?.faqItems?.[0]?.title || '')
  ) {
    patch['landing.faqTitle'] = defaultContent.landing.faqTitle;
    patch['landing.faqSubtitle'] = defaultContent.landing.faqSubtitle;
    patch['landing.faqItems'] = defaultContent.landing.faqItems;
  }

  if (
    !existing.landing?.demoCards?.length ||
    existing.landing?.demoCards?.[0]?.title === 'Clinic Appointment Demo'
  ) {
    patch['landing.demoCards'] = defaultContent.landing.demoCards;
  } else {
    const demoCards = existing.landing?.demoCards || [];
    const staleLandingWhatsappTexts = new Set([
      'ডেমো দেখতে WhatsApp করুন',
      'কোটেশন নিন',
      'Contact now',
    ]);
    const needsWhatsappCtaUpdate = (text) => {
      const value = String(text || '').trim();
      return !value || staleLandingWhatsappTexts.has(value);
    };
    if (demoCards.some((card) => needsWhatsappCtaUpdate(card.whatsappText))) {
      patch['landing.demoCards'] = demoCards.map((card) => {
        const plain = card.toObject?.() || card;
        return { ...plain, whatsappText: landingWhatsappCta };
      });
    }
  }

  if (!existing.landing?.gallery?.length) {
    patch['landing.gallery'] = defaultContent.landing.gallery;
  } else if (!patch['landing.gallery']) {
    const gallery = existing.landing?.gallery || [];
    const staleLandingWhatsappTexts = new Set([
      'ডেমো দেখতে WhatsApp করুন',
      'কোটেশন নিন',
      'Contact now',
    ]);
    const needsWhatsappCtaUpdate = (text) => {
      const value = String(text || '').trim();
      return !value || staleLandingWhatsappTexts.has(value);
    };
    if (gallery.some((item) => needsWhatsappCtaUpdate(item.whatsappText))) {
      patch['landing.gallery'] = gallery.map((item) => {
        const plain = item.toObject?.() || item;
        return { ...plain, whatsappText: landingWhatsappCta };
      });
    }
  }

  const homeWhatsappCta = 'WhatsApp Now';
  const staleHomeWhatsappTexts = new Set(['Contact now', 'Contact Now']);

  if (!existing.home?.demoCards?.length) {
    patch['home.demoCards'] = defaultContent.home.demoCards;
  } else {
    const homeDemoCards = existing.home?.demoCards || [];
    const needsHomeWhatsappCtaUpdate = (text) => {
      const value = String(text || '').trim();
      return !value || staleHomeWhatsappTexts.has(value);
    };
    if (homeDemoCards.some((card) => needsHomeWhatsappCtaUpdate(card.whatsappText))) {
      patch['home.demoCards'] = homeDemoCards.map((card) => {
        const plain = card.toObject?.() || card;
        return { ...plain, whatsappText: homeWhatsappCta };
      });
    }
  }

  const heroSlides = existing.home?.heroSlides || [];
  const needsHeroImagePatch = heroSlides.some((slide) =>
    /images\.unsplash\.com|photo-1497366811353|photo-1460925895917|photo-1516321318423/i.test(
      String(slide.imageUrl || '').trim(),
    ),
  );
  const needsHeroCtaPatch = heroSlides.some((slide) => {
    const cta = String(slide.ctaText || '').trim();
    return cta === 'Contact Now' || cta === 'Contact now';
  });
  if (needsHeroImagePatch || needsHeroCtaPatch) {
    patch['home.heroSlides'] = heroSlides.map((slide) => {
      const plain = slide.toObject?.() || slide;
      let next = { ...plain };
      const imageUrl = String(plain.imageUrl || '').trim();
      if (
        /images\.unsplash\.com|photo-1497366811353|photo-1460925895917|photo-1516321318423/i.test(
          imageUrl,
        )
      ) {
        next = { ...next, imageUrl: '/assets/hero-home.jpg' };
      }
      const cta = String(plain.ctaText || '').trim();
      if (cta === 'Contact Now' || cta === 'Contact now') {
        next = { ...next, ctaText: homeWhatsappCta };
      }
      return next;
    });
  }

  if (!existing.landing?.reviews?.length) {
    patch['landing.reviews'] = defaultContent.landing.reviews;
  }

  if (!existing.landing?.reviewsTitlePrefix) {
    patch['landing.reviewsTitlePrefix'] = defaultContent.landing.reviewsTitlePrefix;
    patch['landing.reviewsTitleHighlight'] = defaultContent.landing.reviewsTitleHighlight;
    patch['landing.reviewsSubtitle'] = defaultContent.landing.reviewsSubtitle;
  }

  if (!existing.landing?.galleryTitle) {
    patch['landing.galleryTitle'] = defaultContent.landing.galleryTitle;
    patch['landing.gallerySubtitle'] = defaultContent.landing.gallerySubtitle;
  }

  if (
    !existing.landing?.pricing?.plans?.length ||
    existing.landing?.pricing?.titlePrefix === 'Transparent'
  ) {
    patch['landing.pricing'] = defaultContent.landing.pricing;
  }

  if (
    !existing.landing?.comparison?.includedItems ||
    existing.landing?.comparison?.titlePrefix === "What's included"
  ) {
    patch['landing.comparison'] = defaultContent.landing.comparison;
  }


  if (Object.keys(patch).length > 0) {
    await SiteContent.updateOne({}, { $set: patch });
  }
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_BYTES || 8 * 1024 * 1024),
    files: 1,
  },
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mongo: isMongoReady ? 'connected' : 'offline' });
});

// GET /api/content is registered after withNormalizedLiveUrls (see below).

const omitMongoMeta = (value) => {
  if (Array.isArray(value)) return value.map(omitMongoMeta);
  if (!value || typeof value !== 'object') return value;

  const next = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt' || key.startsWith('$')) continue;
    next[key] = omitMongoMeta(nested);
  }
  return next;
};

/** Admin often pastes bare domains (dev.iotprogrammers.com) — make them absolute https links. */
const normalizeLiveDemoUrl = (url) => {
  const raw = String(url || '').trim();
  if (!raw || raw === '#') return raw;
  if (/^(https?:|mailto:|tel:|sms:)/i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return raw;
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#].*)?$/i.test(raw)) {
    return `https://${raw}`;
  }
  return raw;
};

const sanitizeMediaItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const next = omitMongoMeta(item?.toObject?.() || item);
    next.type = next.type === 'video' || next.type === 'image'
      ? next.type
      : next.videoUrl
        ? 'video'
        : 'image';
    if (!next.status) next.status = 'published';
    if (!next.addedAt) next.addedAt = new Date().toISOString();
    if (next.liveUrl) next.liveUrl = normalizeLiveDemoUrl(next.liveUrl);
    return next;
  });

const withNormalizedLiveUrls = (payload = {}) => {
  const next = { ...payload };
  if (next.home) {
    next.home = {
      ...next.home,
      demoCards: sanitizeMediaItems(next.home.demoCards),
    };
  }
  if (next.landing) {
    next.landing = {
      ...next.landing,
      demoCards: sanitizeMediaItems(next.landing.demoCards),
      gallery: sanitizeMediaItems(next.landing.gallery),
    };
  }
  return next;
};

const buildPublicContentPayload = async () => {
  if (!isMongoReady) {
    return withNormalizedLiveUrls({
      ...memoryContent,
      siteSettings: {
        ...defaultContent.siteSettings,
        ...(memoryContent.siteSettings || {}),
      },
    });
  }

  const content = await SiteContent.findOne().lean();
  const payload = content || defaultContent;
  return withNormalizedLiveUrls({
    ...payload,
    siteSettings: {
      ...defaultContent.siteSettings,
      ...(payload.siteSettings || {}),
    },
  });
};

app.get('/api/content', async (req, res) => {
  const now = Date.now();
  const bypassCache = req.query.refresh === '1' || req.get('Cache-Control') === 'no-cache';

  if (!bypassCache && contentCache.payload && contentCache.expiresAt > now) {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    if (contentCache.etag) {
      res.set('ETag', contentCache.etag);
      if (req.get('If-None-Match') === contentCache.etag) {
        return res.status(304).end();
      }
    }
    return res.json(contentCache.payload);
  }

  try {
    const payload = await buildPublicContentPayload();
    const etag = `"${crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex')}"`;
    contentCache = {
      payload,
      etag,
      expiresAt: now + CONTENT_CACHE_TTL_MS,
    };
    res.set('Cache-Control', bypassCache ? 'no-store' : 'public, max-age=60, stale-while-revalidate=300');
    res.set('ETag', etag);
    return res.json(payload);
  } catch (error) {
    console.error('GET /api/content failed:', error.message);
    if (contentCache.payload) {
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
      return res.json(contentCache.payload);
    }
    return res.status(503).json({ message: 'Content temporarily unavailable. Please retry.' });
  }
});

const sanitizeContentPayload = (incoming = {}) => {
  const payload = omitMongoMeta(incoming);

  if (payload.home) {
    payload.home = {
      ...payload.home,
      heroSlides: sanitizeMediaItems(payload.home.heroSlides),
      featureCards: sanitizeMediaItems(payload.home.featureCards),
      demoCards: sanitizeMediaItems(payload.home.demoCards),
    };
  }

  if (payload.landing) {
    payload.landing = {
      ...payload.landing,
      demoCards: sanitizeMediaItems(payload.landing.demoCards),
      reviews: sanitizeMediaItems(payload.landing.reviews),
      gallery: sanitizeMediaItems(payload.landing.gallery),
      faqItems: sanitizeMediaItems(payload.landing.faqItems),
    };
  }

  if (payload.reviewsPage) {
    payload.reviewsPage = {
      ...payload.reviewsPage,
      featuredReviews: sanitizeMediaItems(payload.reviewsPage.featuredReviews),
      reviews: sanitizeMediaItems(payload.reviewsPage.reviews),
    };
  }

  return Object.fromEntries(
    Object.entries({
      siteSettings: payload.siteSettings,
      home: payload.home,
      landing: payload.landing,
      contact: payload.contact,
      reviewsPage: payload.reviewsPage,
      pricing: payload.pricing,
    }).filter(([, value]) => value !== undefined)
  );
};

app.put('/api/content', requireAuth, async (req, res) => {
  const incoming = sanitizeContentPayload(req.body);

  try {
    if (!isMongoReady) {
      memoryContent = { ...memoryContent, ...incoming };
      invalidateContentCache();
      return res.json(memoryContent);
    }

    const saved = await SiteContent.findOneAndUpdate({}, { $set: incoming }, { new: true, lean: true, upsert: true });
    invalidateContentCache();
    return res.json(saved);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Could not save content' });
  }
});

app.post('/api/upload', requireAuth, uploadRateLimit, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const relativeUrl = `/uploads/${req.file.filename}`;
  const host = req.get('host');
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  const absoluteUrl = host ? `${proto}://${host}${relativeUrl}` : relativeUrl;
  return res.status(201).json({ url: absoluteUrl, path: relativeUrl, filename: req.file.filename });
});

app.delete('/api/upload/:filename', requireAuth, (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ message: 'Deleted' });
  }
  return res.status(404).json({ message: 'File not found' });
});

app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const adminRecord = await getAdminRecord(username);

  if (!adminRecord || adminRecord.username !== username) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const isValid = await comparePassword(password, adminRecord.passwordHash);

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  return res.json({
    token: signToken(username),
    username,
    expiresIn: JWT_EXPIRES_IN,
  });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ ok: true, username: req.admin.username });
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const username = req.admin?.username || DEFAULT_ADMIN_USERNAME;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  const adminRecord = await getAdminRecord(username);

  if (!adminRecord) {
    return res.status(404).json({ message: 'Admin account not found' });
  }

  const isValid = await comparePassword(currentPassword, adminRecord.passwordHash);

  if (!isValid) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  const passwordHash = await hashPassword(newPassword);
  await updateAdminPassword(passwordHash, adminRecord.username);

  return res.json({ message: 'Password updated successfully' });
});

// Production: serve Vite build from Express (Hostinger single Node app)
if (fs.existsSync(clientDistDir)) {
  app.use(
    express.static(clientDistDir, {
      index: false,
      etag: true,
      setHeaders(res, filePath) {
        const base = path.basename(filePath);
        // HTML must revalidate so Redeploy picks up new asset hashes.
        if (base === 'index.html' || filePath.endsWith(`${path.sep}index.html`)) {
          res.setHeader('Cache-Control', 'no-cache');
          return;
        }
        // Vite hashed bundles under /assets/
        if (filePath.includes(`${path.sep}assets${path.sep}`) && /\.[a-f0-9]{8,}\./i.test(base)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return;
        }
        // Static public images (logo, nav gif, favicon)
        if (/\.(js|css|woff2?|svg|webp|png|jpe?g|gif|ico)$/i.test(base)) {
          res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
          return;
        }
        if (/\.(txt|xml)$/i.test(base)) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return;
        }
        res.setHeader('Cache-Control', 'public, max-age=3600');
      },
    }),
  );
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(path.join(clientDistDir, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
} else {
  console.warn(`Client build not found at ${clientDistDir}. Run: npm run build`);
}

app.use((error, _req, res, _next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large. Maximum upload size is 8MB.' });
  }
  console.error(error);
  res.status(500).json({ message: error.message || 'Server error' });
});

connectDb().then(async () => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    if (fs.existsSync(clientDistDir)) {
      console.log(`Serving client from ${clientDistDir}`);
    }
  });

  try {
    await ensureContent();
    await ensureAdminAuth();
  } catch (error) {
    console.error('Startup migration failed:', error.message);
  }
});

const shutdown = async (signal) => {
  console.log(`${signal} received — closing server`);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
