#!/usr/bin/env node
/**
 * Patch landing demoCards and gallery whatsappText in MongoDB (UTF-8 Bangla).
 * Usage: node server/scripts/patch-landing-whatsapp-cta.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { landingWhatsappCta } = require('../landingDefaults');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iotprogrammers-portfolio';

const staleLandingWhatsappTexts = new Set([
  'ডেমো দেখতে WhatsApp করুন',
  'কোটেশন নিন',
  'Contact now',
]);

const needsWhatsappCtaUpdate = (text) => {
  const value = String(text || '').trim();
  return !value || staleLandingWhatsappTexts.has(value);
};

const siteContentSchema = new mongoose.Schema({}, { strict: false, collection: 'sitecontents' });

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const SiteContent = mongoose.model('SiteContentWhatsappPatch', siteContentSchema);

  const doc = await SiteContent.findOne();
  if (!doc) {
    console.log('No SiteContent document found.');
    await mongoose.disconnect();
    return;
  }

  const payload = doc.toObject();
  const landing = payload.landing || {};
  const patch = {};

  const demoCards = Array.isArray(landing.demoCards) ? landing.demoCards : [];
  if (demoCards.some((card) => needsWhatsappCtaUpdate(card.whatsappText))) {
    patch['landing.demoCards'] = demoCards.map((card) => ({
      ...card,
      whatsappText: landingWhatsappCta,
    }));
  }

  const gallery = Array.isArray(landing.gallery) ? landing.gallery : [];
  if (gallery.some((item) => needsWhatsappCtaUpdate(item.whatsappText))) {
    patch['landing.gallery'] = gallery.map((item) => ({
      ...item,
      whatsappText: landingWhatsappCta,
    }));
  }

  if (!Object.keys(patch).length) {
    console.log('Landing WhatsApp CTA already up to date.');
    console.log('  CTA:', landingWhatsappCta);
    await mongoose.disconnect();
    return;
  }

  await SiteContent.updateOne({ _id: doc._id }, { $set: patch });
  console.log('Patched landing WhatsApp CTA in MongoDB.');
  console.log('  Updated fields:', Object.keys(patch).join(', '));
  console.log('  CTA:', landingWhatsappCta);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
