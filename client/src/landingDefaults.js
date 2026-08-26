import { landingComparisonDefaults } from './comparisonDefaults.js'
import { landingPricingDefaults } from './pricingDefaults.js'

export const landingWhatsappCta = '৫ মিনিট ফ্রি WhatsApp কল — এখনই কথা বলুন'
export const landingLiveDemoCta = 'লাইভ ডেমো দেখুন'

const landingDefaults = {
  // Empty until admin sets Landing → Intro Video URL (avoids sticky default vs admin mismatch).
  introVideoUrl: '',
  headline: 'বাংলাদেশি ব্যবসার জন্য প্রফেশনাল MERN পোর্টফোলিও ও ডেমো ওয়েবসাইট',
  featuresText:
    'ল্যান্ডিং পেজ, লাইভ ডেমো কার্ড, ক্লায়েন্ট রিভিউ, ইমেজ-ভিডিও গ্যালারি ও WhatsApp লিড বাটন—সবকিছু অ্যাডমিন ড্যাশবোর্ড থেকে কোড ছাড়াই এডিট করুন। IoTProgrammers বাংলাদেশি এজেন্সি, স্টার্টআপ ও SME-এর জন্য দ্রুত ডেলিভারি ও সাপোর্ট দেয়।',
  demoCards: [
    {
      title: 'ক্লিনিক ও হেলথকেয়ার ডেমো',
      description:
        'অ্যাপয়েন্টমেন্ট বুকিং, WhatsApp CTA ও অ্যাডমিন ড্যাশবোর্ড—বাংলাদেশি ক্লিনিক ও ডায়াগনস্টিক সেন্টারের জন্য রেডি ল্যান্ডিং।',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      liveUrl: 'https://example.com/demo-clinic',
      username: 'clinic-admin',
      password: 'secure-demo',
      whatsappText: landingWhatsappCta,
      keyFeatures: ['অনলাইন অ্যাপয়েন্টমেন্ট', 'WhatsApp লিড', 'অ্যাডমিন কন্ট্রোল'],
    },
    {
      title: 'ই-কমার্স স্টোর ডেমো',
      description:
        'প্রোডাক্ট শোকেস, WhatsApp অর্ডার ও মোবাইল-অপ্টিমাইজড ল্যান্ডিং—দ্রুত কনভার্শনের জন্য তৈরি।',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
      videoUrl: 'https://www.youtube.com/embed/oHg5SJYRHA0',
      liveUrl: 'https://example.com/demo-store',
      username: 'store-admin',
      password: 'store-pass',
      whatsappText: landingWhatsappCta,
      keyFeatures: ['প্রোডাক্ট ক্যাটালগ', 'WhatsApp অর্ডার', 'রেসপন্সিভ UI'],
    },
  ],
  reviews: [
    {
      title: 'রফি আহমেদ',
      subtitle: 'CEO, DigitalMart BD',
      description:
        'IoTProgrammers আমাদের এজেন্সি ক্লায়েন্টদের জন্য দ্রুত ডেমো সাইট ডেলিভারি করে। অ্যাডমিন প্যানেল দিয়ে আমরা নিজেরাই কনটেন্ট আপডেট করি—কোডিং জানার দরকার নেই।',
      rating: 5,
    },
    {
      title: 'সাদিয়া আক্তার',
      subtitle: 'Founder, ShopEasy BD',
      description:
        'ল্যান্ডিং পেজটা প্রফেশনাল লাগে, WhatsApp বাটনে সরাসরি লিড আসে। ডেমো দেখিয়ে ক্লায়েন্ট নিশ্চিত করা অনেক সহজ হয়েছে।',
      rating: 5,
    },
  ],
  gallery: [
    {
      title: 'অফিস ও টিম শোকেস',
      type: 'image',
      imageUrl:
        'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
      liveUrl: 'https://example.com/demo-office',
      whatsappText: landingWhatsappCta,
    },
    {
      title: 'ওয়েবসাইট ডেমো ওয়াকথ্রু',
      type: 'video',
      videoUrl: 'https://www.youtube.com/embed/jNQXAC9IVRw',
      liveUrl: 'https://example.com/demo-walkthrough',
      whatsappText: landingWhatsappCta,
    },
  ],
  faqTitle: 'সাধারণ জিজ্ঞাসা',
  faqSubtitle: 'সেবা, ডেলিভারি, অ্যাডমিন কন্ট্রোল, ডেমো ও সাপোর্ট—সংক্ষিপ্ত উত্তর।',
  faqItems: [
    {
      title: 'IoTProgrammers কী ধরনের ওয়েবসাইট বানায়?',
      description:
        'MERN স্ট্যাকে পোর্টফোলিও, ডেমো শোকেস, ল্যান্ডিং পেজ, রিভিউ পেজ, গ্যালারি এবং অ্যাডমিন-কন্ট্রোলড বিজনেস ওয়েবসাইট। বাংলাদেশি এজেন্সি ও SME ক্লায়েন্টের জন্য বিশেষভাবে ডিজাইন করা।',
    },
    {
      title: 'কোডিং ছাড়াই কনটেন্ট আপডেট করা যায়?',
      description:
        'হ্যাঁ। অ্যাডমিন ড্যাশবোর্ড থেকে ব্যানার, ডেমো কার্ড, ভিডিও, রিভিউ, FAQ, প্রাইসিং, কন্টাক্ট ও ফুটার—যেকোনো সময় এডিট করা যায়।',
    },
    {
      title: 'ক্লায়েন্টদের জন্য লাইভ ডেমো দেওয়া হয়?',
      description:
        'হ্যাঁ। প্রতিটি ডেমো কার্ডে ভিডিও প্রিভিউ, লাইভ লিংক ও অ্যাডমিন লগইন দেওয়া যায়—ক্লায়েন্ট পেমেন্টের আগেই সাইট দেখতে পারে।',
    },
    {
      title: 'প্রজেক্ট কত দিনে ডেলিভারি হয়?',
      description:
        'স্কোপ অনুযায়ী ৭–২১ দিন। স্টার্টার পোর্টফোলিও ও ডেমো ল্যান্ডিং সাধারণত ১–২ সপ্তাহে সম্পন্ন হয়।',
    },
    {
      title: 'নিজের ডোমেইন ও হোস্টিং ব্যবহার করা যাবে?',
      description:
        'হ্যাঁ। ডেভেলপমেন্ট শেষে আপনার হোস্টিং (cPanel/VPS) ও কাস্টম ডোমেইনে ডিপ্লয় করা হয়। ডোমেইন-হোস্টিং খরচ আলাদা।',
    },
    {
      title: 'WhatsApp লিড ইন্টিগ্রেশন আছে?',
      description:
        'হ্যাঁ। ল্যান্ডিং, হোম, রিভিউ ও কন্টাক্ট সেকশনে WhatsApp বাটন যোগ করা যায়—ক্লিক করলেই সরাসরি চ্যাট শুরু।',
    },
    {
      title: 'ওয়েবসাইট মোবাইলে ঠিকঠাক চলবে?',
      description:
        'সব লেআউট মোবাইল, ট্যাবলেট ও ডেস্কটপের জন্য রেসপন্সিভ। বাংলাদেশে বেশিরভাগ ট্রাফিক মোবাইল থেকে আসে—সেটা মাথায় রেখে ডিজাইন করা হয়।',
    },
    {
      title: 'লঞ্চের পর সাপোর্ট কীভাবে পাব?',
      description:
        'WhatsApp বা ইমেইলে আপডেট, বাগ ফিক্স ও নতুন ফিচারের জন্য যোগাযোগ করা যায়। ১ বছরের কেয়ার প্ল্যানে প্রায়োরিটি সাপোর্ট পাবেন।',
    },
  ],
  reviewsTitlePrefix: 'ক্লায়েন্টরা যা',
  reviewsTitleHighlight: 'বলছেন।',
  reviewsSubtitle: 'বাংলাদেশি ব্যবসা ও এজেন্সির অভিজ্ঞতা—IoTProgrammers দিয়ে তৈরি ওয়েবসাইট নিয়ে।',
  galleryTitle: 'প্রজেক্ট গ্যালারি',
  gallerySubtitle: 'ডেমো, অফিস ও ক্লায়েন্ট প্রজেক্টের ছবি ও ভিডিও—অ্যাডমিন থেকে যোগ ও এডিট করুন।',
  comparison: landingComparisonDefaults,
  pricing: landingPricingDefaults,
}

export default landingDefaults
