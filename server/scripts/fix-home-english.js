#!/usr/bin/env node
/**
 * Reset Home page content and English site chrome in MongoDB when Bangla text crept in.
 * Usage: node server/scripts/fix-home-english.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { homeDefaults, englishSiteChromeSettings, hasBanglaText } = require('../homeDefaults');
const { homeComparisonDefaults } = require('../comparisonDefaults');
const { pricingDefaults } = require('../pricingDefaults');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iotprogrammers-portfolio';

const siteContentSchema = new mongoose.Schema({}, { strict: false, collection: 'sitecontents' });

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const SiteContent = mongoose.model('SiteContentFix', siteContentSchema);

  const doc = await SiteContent.findOne();
  if (!doc) {
    console.log('No SiteContent document found.');
    await mongoose.disconnect();
    return;
  }

  const payload = doc.toObject();
  const patch = {};

  const home = payload.home || {};
  const featureCards = Array.isArray(home.featureCards) ? home.featureCards : [];

  if (
    !Array.isArray(home.heroSlides) ||
    !home.heroSlides.length ||
    home.heroSlides.some(
      (slide) =>
        hasBanglaText(slide.badge) ||
        hasBanglaText(slide.title) ||
        hasBanglaText(slide.subtitle) ||
        hasBanglaText(slide.ctaText)
    )
  ) {
    patch['home.heroSlides'] = homeDefaults.heroSlides;
  }

  if (
    !featureCards.length ||
    featureCards.some((card) => hasBanglaText(card.title) || hasBanglaText(card.description))
  ) {
    patch['home.featureCards'] = homeDefaults.featureCards;
  }

  if (hasBanglaText(home.featureFooterText)) {
    patch['home.featureFooterText'] = homeDefaults.featureFooterText;
  }

  if (hasBanglaText(home.productsOfferText)) {
    patch['home.productsOfferText'] = homeDefaults.productsOfferText;
    patch['home.productsOfferLink'] = homeDefaults.productsOfferLink;
  }

  const comparison = home.comparison || {};
  if (
    hasBanglaText(comparison.titlePrefix) ||
    hasBanglaText(comparison.includedTitle) ||
    hasBanglaText(comparison.includedItems)
  ) {
    patch['home.comparison'] = homeComparisonDefaults;
  }

  const pricing = payload.pricing || {};
  if (hasBanglaText(pricing.titlePrefix) || hasBanglaText(pricing.subtitle)) {
    patch.pricing = pricingDefaults;
  }

  const settings = payload.siteSettings || {};
  if (
    hasBanglaText(settings.footerTagline) ||
    hasBanglaText(settings.footerAbout) ||
    hasBanglaText(settings.facebookLabel) ||
    hasBanglaText(settings.footerPrivacyLabel) ||
    hasBanglaText(settings.footerTermsLabel) ||
    hasBanglaText(settings.copyrightText)
  ) {
    Object.entries(englishSiteChromeSettings).forEach(([key, value]) => {
      patch[`siteSettings.${key}`] = value;
    });
  }

  if (!Object.keys(patch).length) {
    console.log('Home content already English — no changes needed.');
    await mongoose.disconnect();
    return;
  }

  await SiteContent.updateOne({ _id: doc._id }, { $set: patch });
  console.log('Updated fields:', Object.keys(patch).join(', '));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
