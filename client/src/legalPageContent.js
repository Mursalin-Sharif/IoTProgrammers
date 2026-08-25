import { BUSINESS_ADDRESS } from './contactPageDefaults.js'

/** Shared business details for legal pages (matches site defaults). */
export const legalContact = {
  brand: 'IoTProgrammers',
  email: 'iotprogrammers@gmail.com',
  phone: '01302003306',
  whatsapp: '01302003306',
  address: BUSINESS_ADDRESS,
  lastUpdated: '25 August 2026',
}

const contactBlock = [
  `${legalContact.brand}`,
  `WhatsApp / Phone: ${legalContact.whatsapp}`,
  `Email: ${legalContact.email}`,
  `Address: ${legalContact.address}`,
]

export const privacyPolicyContent = {
  title: 'Privacy Policy',
  subtitle:
    'How IoTProgrammers collects, uses, and protects information when you visit our site or inquire about our web design and development services.',
  lastUpdated: legalContact.lastUpdated,
  sections: [
    {
      heading: '1. Who we are',
      paragraphs: [
        'IoTProgrammers provides professional MERN portfolio and demo websites, landing pages, and admin dashboards for Bangladeshi agencies, startups, and SMEs (including clinics, ecommerce demos, and similar businesses).',
        'This Privacy Policy explains how we handle personal information when you browse this website, submit a project inquiry, book a WhatsApp consultation, or otherwise contact us.',
        ...contactBlock,
      ],
    },
    {
      heading: '2. Information we collect',
      paragraphs: [
        'Contact and inquiry details you provide: name, phone number, email address, district or location, service type, project address or business details, and any message you send via our Quick Booking form, WhatsApp, phone, or email.',
        'Technical and usage data: IP address, browser type, device type, pages viewed, referring URLs, and approximate location derived from analytics tools when enabled.',
        'Admin and client content: if we deliver an admin-managed website, you or your team may upload text, images, videos, credentials for demo access, and similar content that you choose to publish. We process that content only to provide and maintain your project.',
      ],
    },
    {
      heading: '3. How we use your information',
      paragraphs: [
        'To respond to WhatsApp, phone, and email inquiries and to schedule or deliver web design and development work.',
        'To prepare quotes, contracts, invoices, and project milestones in Bangladeshi Taka (BDT) where applicable.',
        'To operate, secure, and improve this marketing site, including demo showcases and lead generation.',
        'To measure traffic and marketing performance when analytics or advertising tags (such as Google Tag Manager, Google Analytics 4, or Meta/Facebook Pixel) are configured by us or our admins.',
        'We do not sell your personal information to third parties.',
      ],
    },
    {
      heading: '4. WhatsApp and messaging',
      paragraphs: [
        'WhatsApp is our primary channel for bookings and support. When you open a chat with us (including via pre-filled links from this site), your message is processed through WhatsApp’s own service under Meta’s terms and privacy practices.',
        'Please avoid sending unnecessary sensitive data (for example, full payment card numbers) over WhatsApp. Prefer email for formal documents when appropriate.',
      ],
    },
    {
      heading: '5. Cookies, analytics, and advertising',
      paragraphs: [
        'We may use essential cookies to keep the site working, and optional analytics or marketing technologies such as Google Tag Manager (GTM), Google Analytics 4 (GA4), and Meta/Facebook Pixel when those IDs or snippets are enabled in our site settings.',
        'These tools help us understand how visitors use the site and may support remarketing or conversion measurement. For details and control options, see our Cookie Policy.',
      ],
    },
    {
      heading: '6. Sharing and processors',
      paragraphs: [
        'We may share information with service providers who help us run the business—for example hosting, domain/email providers, analytics platforms, and payment or invoicing tools—only as needed to deliver services.',
        'We may disclose information if required by applicable law in Bangladesh or to protect our rights, safety, or property.',
      ],
    },
    {
      heading: '7. Data retention',
      paragraphs: [
        'Inquiry and project records are kept as long as needed to fulfill the engagement, provide after-sales support, and meet accounting or legal obligations. Analytics data is retained according to each tool’s settings and our operational needs.',
      ],
    },
    {
      heading: '8. Your choices',
      paragraphs: [
        'You may ask us to update or delete contact details we hold about you, subject to legitimate business and legal retention needs.',
        'You can control many cookies and tracking preferences through your browser settings. Blocking some cookies may affect site features.',
        'To exercise a privacy request, contact us via WhatsApp or email using the details above.',
      ],
    },
    {
      heading: '9. Security',
      paragraphs: [
        'We take reasonable technical and organizational measures to protect personal information. No method of transmission or storage is completely secure; please use strong passwords for any admin dashboards we provide and do not share demo credentials publicly.',
      ],
    },
    {
      heading: '10. Children’s privacy',
      paragraphs: [
        'Our services are directed at businesses and adults. We do not knowingly collect personal information from children for marketing purposes.',
      ],
    },
    {
      heading: '11. Changes',
      paragraphs: [
        'We may update this Privacy Policy from time to time. The “Last updated” date at the top of this page will change when we do. Continued use of the site after updates constitutes acceptance of the revised policy.',
      ],
    },
  ],
}

export const termsOfServiceContent = {
  title: 'Terms of Service',
  subtitle:
    'The terms that govern use of the IoTProgrammers website and engagement of our web design, demo, and development services.',
  lastUpdated: legalContact.lastUpdated,
  sections: [
    {
      heading: '1. Agreement',
      paragraphs: [
        'By accessing this website or engaging IoTProgrammers for portfolio websites, landing pages, demo showcases, admin dashboards, or related digital services, you agree to these Terms of Service and our Privacy Policy and Cookie Policy.',
        'If you are accepting on behalf of a business, you confirm you have authority to bind that business.',
      ],
    },
    {
      heading: '2. Services',
      paragraphs: [
        'We offer custom and template-based MERN and related web deliverables for Bangladeshi agencies, startups, and SMEs—such as portfolio sites, clinic or ecommerce demos, landing pages, review sections, galleries, WhatsApp lead flows, and admin-editable content.',
        'Scope, timeline, pricing (typically in BDT), milestones, and deliverables for a specific project are confirmed in writing via WhatsApp, email, or a separate proposal/contract. Those project terms prevail over these general website terms where they conflict.',
      ],
    },
    {
      heading: '3. Quotes, payments, and currency',
      paragraphs: [
        'Prices shown on this site (if any) are indicative and may change. Final fees depend on scope, revisions, integrations (for example GTM, GA4, or Meta Pixel), hosting, and third-party costs.',
        'Unless otherwise agreed, invoices and payments are in Bangladeshi Taka (BDT). Deposits or milestone payments may be required before work begins or before go-live.',
        'Refunds and cancellations are described in our Refund Policy.',
      ],
    },
    {
      heading: '4. Client responsibilities',
      paragraphs: [
        'You agree to provide timely content, feedback, brand assets, and accurate business information needed to complete the project.',
        'You are responsible for the legality of content you supply (text, images, videos, claims about your business) and for obtaining any licenses for materials you ask us to use.',
        'For admin dashboards, you are responsible for keeping login credentials secure and for content published after handover.',
      ],
    },
    {
      heading: '5. Demos and portfolio materials',
      paragraphs: [
        'Live demos, sample admin accounts, gallery media, and case-style showcases on this site are for illustration. Features, data, and credentials shown in demos may be reset, limited, or fictional and are not a guarantee of identical production results unless written into your project agreement.',
        'Do not use demo credentials for production or share them in ways that compromise site security.',
      ],
    },
    {
      heading: '6. Intellectual property',
      paragraphs: [
        'Until full payment as agreed, IoTProgrammers retains ownership of custom work product we create. Upon full payment, you receive a license or ownership rights as stated in your project agreement (commonly a transferable license to use the delivered site for your business).',
        'We may display completed public work in our portfolio and marketing unless you reasonably request otherwise in writing before launch.',
        'Third-party libraries, stock media, fonts, and platforms remain subject to their own licenses.',
      ],
    },
    {
      heading: '7. Website use',
      paragraphs: [
        'You may not misuse this site—including attempting unauthorized access to admin areas, scraping in a way that harms performance, introducing malware, or using our contact forms/WhatsApp to spam or harass.',
        'We may suspend access or refuse service where we reasonably believe these terms are violated.',
      ],
    },
    {
      heading: '8. Third-party tools',
      paragraphs: [
        'Projects may integrate WhatsApp, Google Tag Manager, analytics, social pixels, maps, hosting, domains, or payment tools. Those services are governed by their own terms. We are not responsible for outages, policy changes, or fees charged by third parties.',
      ],
    },
    {
      heading: '9. Disclaimer and limitation of liability',
      paragraphs: [
        'This marketing site and any demos are provided “as is.” While we aim for accurate descriptions, we do not warrant uninterrupted availability or that demos match every future client build.',
        'To the fullest extent permitted by applicable law, IoTProgrammers is not liable for indirect, incidental, or consequential damages (including lost profits or data) arising from use of this site or from project delays caused by late client feedback, third-party failures, or force majeure. Our aggregate liability for a paid project is limited to fees you paid us for that project in the three months preceding the claim, unless a written contract states otherwise.',
      ],
    },
    {
      heading: '10. Governing law',
      paragraphs: [
        'These terms are governed by the laws of Bangladesh. Disputes should first be raised with us via WhatsApp or email so we can try to resolve them amicably.',
      ],
    },
    {
      heading: '11. Contact',
      paragraphs: [
        'Questions about these Terms of Service:',
        ...contactBlock,
      ],
    },
  ],
}

export const cookiePolicyContent = {
  title: 'Cookie Policy',
  subtitle:
    'How IoTProgrammers uses cookies and similar technologies on this lead-generation and portfolio website.',
  lastUpdated: legalContact.lastUpdated,
  sections: [
    {
      heading: '1. What are cookies?',
      paragraphs: [
        'Cookies are small text files stored on your device. Similar technologies include local storage, pixels, and tags loaded through scripts such as Google Tag Manager. They help websites function, remember preferences, and measure or improve marketing performance.',
      ],
    },
    {
      heading: '2. How we use them',
      paragraphs: [
        'Essential / functional: needed for basic site operation, security, and remembering session-related behavior (for example admin login on our systems when you are an authorized user).',
        'Analytics: when configured, Google Tag Manager and/or Google Analytics 4 may set cookies or use similar identifiers to understand traffic, page views, and engagement on our marketing pages.',
        'Marketing: when a Meta/Facebook Pixel ID or equivalent tag is enabled in site settings, cookies or pixels may be used to measure ads, build audiences, or track conversions (for example WhatsApp click or contact intent events).',
        'Exact tags depend on what is currently enabled by IoTProgrammers in the site’s admin-managed tracking settings. Empty or disabled IDs mean those tools are not active.',
      ],
    },
    {
      heading: '3. Legal basis and choice',
      paragraphs: [
        'Essential technologies are used to provide the site you request. Analytics and marketing technologies are used to improve our services and measure campaigns. You can limit or block non-essential cookies through your browser settings as described below.',
      ],
    },
    {
      heading: '4. Managing cookies',
      paragraphs: [
        'Most browsers let you block or delete cookies. Look for Privacy or Site settings in Chrome, Firefox, Edge, Safari, or your mobile browser.',
        'You can also use industry opt-out tools for interest-based advertising where available (for example browser “Do Not Track” preferences and platform ad settings from Google or Meta).',
        'If you block all cookies, some parts of the site (including admin features) may not work correctly.',
      ],
    },
    {
      heading: '5. WhatsApp and external links',
      paragraphs: [
        'Links that open WhatsApp, Facebook, YouTube embeds, or Google Maps may allow those platforms to process data under their own policies. We do not control cookies set by third-party sites after you leave ours.',
      ],
    },
    {
      heading: '6. More information',
      paragraphs: [
        'Personal data processed via cookies and tags is also described in our Privacy Policy. Use the Legal links in the site footer, or the related links below, to open that page. For questions:',
        ...contactBlock,
      ],
    },
  ],
}

export const refundPolicyContent = {
  title: 'Refund Policy',
  subtitle:
    'Honest refund and cancellation rules for IoTProgrammers digital web design and development services in Bangladesh.',
  lastUpdated: legalContact.lastUpdated,
  sections: [
    {
      heading: '1. Scope',
      paragraphs: [
        'This Refund Policy applies to custom website projects, landing pages, demo/portfolio products, admin dashboard setups, and related digital services sold by IoTProgrammers, usually priced and invoiced in BDT.',
        'Specific written agreements (WhatsApp confirmations, email quotes, or contracts) may add project-specific payment schedules; those terms control where they clearly differ from this policy.',
      ],
    },
    {
      heading: '2. Custom web and development work',
      paragraphs: [
        'Deposits and milestone payments: we typically require an advance deposit and/or progress payments before starting or continuing work. Deposits secure scheduling and cover initial discovery, design, and setup.',
        'When a refund may apply: if we cancel a project before substantial work begins, or if we are unable to deliver the agreed scope for reasons solely within our control and no acceptable alternative is offered, we may refund unused prepaid amounts after deducting documented work already completed.',
        'When refunds generally do not apply: work already delivered (designs, code, staging sites, content migration, training); change of mind after work has started; delays caused by missing client assets or feedback; third-party costs we have already paid on your behalf (domains, hosting, stock assets, paid APIs, SMS/WhatsApp Business fees, ad spend); or completed milestones you have approved.',
        'Partial refunds, if any, are calculated based on completed milestones and reasonable effort expended, communicated in writing before processing.',
      ],
    },
    {
      heading: '3. Demo and portfolio products',
      paragraphs: [
        'Pre-built demos, showcase templates, and portfolio-style packages are digital deliverables. Once access credentials, source files, or a deployed instance have been provided, they are generally non-refundable, because the product can be copied or reused immediately.',
        'If a purchased demo package is defective or access cannot be granted due to our error, we will first attempt to fix or re-provision access. If we cannot, a refund or replacement may be offered at our discretion.',
      ],
    },
    {
      heading: '4. Revisions and cancellations by the client',
      paragraphs: [
        'Agreed revision rounds are included as stated in your quote. Extra revisions or scope changes may be billed separately and are not refundable once performed.',
        'If you cancel after work has started, prepaid amounts for completed or in-progress work are not refundable. Any unused prepaid balance beyond completed work may be refunded or credited toward a future project at our discretion.',
      ],
    },
    {
      heading: '5. How to request a refund',
      paragraphs: [
        'Contact us within a reasonable time (preferably within 7 days of the issue) via WhatsApp or email. Include your name, project or invoice reference, payment proof, and a clear reason.',
        `WhatsApp / Phone: ${legalContact.whatsapp}`,
        `Email: ${legalContact.email}`,
        'We will review the request, confirm eligibility under this policy and your project terms, and reply with the outcome. Approved refunds are returned via the original payment method or another mutually agreed channel in Bangladesh, typically within a commercially reasonable timeframe after approval.',
      ],
    },
    {
      heading: '6. Chargebacks',
      paragraphs: [
        'Please contact us first to resolve billing issues. Unwarranted chargebacks for delivered digital work may lead to suspension of services and recovery of costs where permitted by law.',
      ],
    },
    {
      heading: '7. Contact',
      paragraphs: contactBlock,
    },
  ],
}

export const legalPagesBySlug = {
  'privacy-policy': privacyPolicyContent,
  'terms-of-service': termsOfServiceContent,
  'cookie-policy': cookiePolicyContent,
  'refund-policy': refundPolicyContent,
}
