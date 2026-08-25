const pricingDefaults = {
  titlePrefix: 'Transparent',
  titleHighlight: 'pricing.',
  subtitle: 'What you see is what you pay. No hidden fees, no surprise add-ons.',
  plans: [
    {
      title: 'One-Off Project',
      subtitle: 'Pay as you go · No monthly fee',
      badge: '',
      featured: false,
      leftLabel: 'SERVICE',
      rightLabel: 'PRICE',
      rowsText:
        'Landing page | ৳ 12,000\nPortfolio website | ৳ 25,000\nDemo showcase (3 demos) | ৳ 32,000\nMERN site + admin | ৳ 45,000\n*Extra demo page (each) | ৳ 6,000',
      featuresText:
        'Live demo before you pay\nMobile-responsive design\nWhatsApp support during delivery\nAdmin login for content updates',
      note: 'Final price depends on project scope. WhatsApp for a quote.',
    },
    {
      title: '1-Year Care Plan',
      subtitle: 'Best value · Support plus updates',
      badge: 'BEST VALUE',
      featured: true,
      leftLabel: 'PACKAGE',
      rightLabel: 'ANNUAL PRICE',
      rowsText:
        'Landing + 1 year support | ৳ 22,000\nPortfolio + 1 year support | ৳ 38,000\nDemo showcase + 1 year | ৳ 48,000\nAgency pack (5 demos) | ৳ 72,000\n*Extra site / year | ৳ 8,000',
      featuresText:
        '12 months WhatsApp priority support\nContent and demo updates from admin\nBug fixes and small changes\nMonthly site check\nFaster turnaround for new pages',
      note: 'Contract can be customized. Cancellation terms apply.',
    },
  ],
};

const landingPricingDefaults = {
  titlePrefix: 'স্বচ্ছ ও',
  titleHighlight: 'পেশাদার মূল্য তালিকা।',
  subtitle: 'বাংলাদেশি ব্যবসার জন্য স্পষ্ট দাম—কোনো লুকানো চার্জ বা হঠাৎ অতিরিক্ত ফি নেই।',
  plans: [
    {
      title: 'এককালীন প্রজেক্ট',
      subtitle: 'কাজ শেষে পেমেন্ট · কোনো মাসিক ফি নেই',
      badge: '',
      featured: false,
      leftLabel: 'সেবা',
      rightLabel: 'মূল্য (৳)',
      rowsText:
        'ল্যান্ডিং পেজ | ৳ 12,000\nপোর্টফোলিও ওয়েবসাইট | ৳ 25,000\nডেমো শোকেস (৩টি ডেমো) | ৳ 32,000\nMERN সাইট + অ্যাডমিন ড্যাশবোর্ড | ৳ 45,000\n*অতিরিক্ত ডেমো পেজ (প্রতিটি) | ৳ 6,000',
      featuresText:
        'পেমেন্টের আগে লাইভ ডেমো দেখানো\nমোবাইল-রেসপন্সিভ প্রফেশনাল ডিজাইন\nডেলিভারির সময় WhatsApp সাপোর্ট\nকনটেন্ট আপডেটের জন্য অ্যাডমিন লগইন',
      note: 'চূড়ান্ত মূল্য প্রজেক্ট স্কোপ অনুযায়ী। কোটেশনের জন্য WhatsApp করুন।',
    },
    {
      title: '১ বছরের কেয়ার প্ল্যান',
      subtitle: 'সেরা মূল্য · সাপোর্ট ও আপডেট সহ',
      badge: 'সেরা মূল্য',
      featured: true,
      leftLabel: 'প্যাকেজ',
      rightLabel: 'বার্ষিক মূল্য (৳)',
      rowsText:
        'ল্যান্ডিং + ১ বছর সাপোর্ট | ৳ 22,000\nপোর্টফোলিও + ১ বছর সাপোর্ট | ৳ 38,000\nডেমো শোকেস + ১ বছর | ৳ 48,000\nএজেন্সি প্যাক (৫টি ডেমো) | ৳ 72,000\n*অতিরিক্ত সাইট / বছর | ৳ 8,000',
      featuresText:
        '১২ মাস WhatsApp প্রায়োরিটি সাপোর্ট\nঅ্যাডমিন থেকে কনটেন্ট ও ডেমো আপডেট\nবাগ ফিক্স ও ছোট পরিবর্তন\nমাসিক সাইট হেলথ চেক\nনতুন পেজ দ্রুত ডেলিভারি',
      note: 'কন্ট্রাক্ট আপনার প্রয়োজন অনুযায়ী কাস্টমাইজ করা যায়। শর্ত প্রযোজ্য।',
    },
  ],
};

module.exports = { pricingDefaults, landingPricingDefaults };
