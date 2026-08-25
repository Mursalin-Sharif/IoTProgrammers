#!/usr/bin/env node
/**
 * Push professional Bangla landing page content to MongoDB via PUT /api/content.
 * Usage: node server/scripts/update-landing-bangla.js
 */
const { landingDefaults } = require('../landingDefaults');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

async function login() {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Login failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  if (!data.token) throw new Error('Login response missing token');
  return data.token;
}

async function main() {
  const token = await login();

  const getRes = await fetch(`${API_BASE}/api/content`);
  if (!getRes.ok) throw new Error(`GET /api/content failed (${getRes.status})`);
  const existing = await getRes.json();

  const payload = {
    siteSettings: existing.siteSettings,
    home: existing.home,
    landing: landingDefaults,
    contact: existing.contact,
    reviewsPage: existing.reviewsPage,
    pricing: existing.pricing,
  };

  const putRes = await fetch(`${API_BASE}/api/content`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`PUT /api/content failed (${putRes.status}): ${err}`);
  }

  const saved = await putRes.json();
  console.log('Landing Bangla content synced to MongoDB.');
  console.log('  headline:', saved.landing?.headline);
  console.log('  faqTitle:', saved.landing?.faqTitle);
  console.log('  pricing:', saved.landing?.pricing?.titlePrefix, saved.landing?.pricing?.titleHighlight);
  console.log('  demoCards:', saved.landing?.demoCards?.length);
  console.log('  gallery:', saved.landing?.gallery?.length, 'items');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
