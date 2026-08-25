/**
 * One-off JWT flow check. Does not print secrets or password hashes.
 * Does not modify admin password.
 * Usage: node scripts/verify-jwt-flow.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const http = require('http');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 5000;
const JWT_SECRET = (process.env.JWT_SECRET || '').trim();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const DEFAULT_USER = 'admin';
const DEFAULT_PASS = 'admin123';

function request(method, path, { body, token } = {}) {
  const payload = body == null ? null : JSON.stringify(body);
  const headers = {};
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(payload);
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port: PORT, path, method, headers },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode, text, json });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  if (!JWT_SECRET) {
    console.error('FAIL: JWT_SECRET missing from server/.env');
    process.exit(1);
  }

  const results = [];

  const get = await request('GET', '/api/content');
  results.push(['GET /api/content public', get.status === 200]);

  const unauthPut = await request('PUT', '/api/content', { body: {} });
  results.push(['PUT without token → 401', unauthPut.status === 401]);

  const unauthUpload = await request('POST', '/api/upload');
  results.push(['POST /api/upload without token → 401', unauthUpload.status === 401]);

  const unauthDelete = await request('DELETE', '/api/upload/fake.png');
  results.push(['DELETE /api/upload without token → 401', unauthDelete.status === 401]);

  const unauthPw = await request('POST', '/api/auth/change-password', {
    body: { currentPassword: 'x', newPassword: 'yyyyyy' },
  });
  results.push(['POST change-password without token → 401', unauthPw.status === 401]);

  const minted = jwt.sign({ username: DEFAULT_USER, role: 'admin' }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  results.push(['minted JWT length > 20', minted.length > 20]);

  const verifyMinted = await request('GET', '/api/auth/verify', { token: minted });
  const mintedOk = verifyMinted.status === 200 && verifyMinted.json?.ok === true;
  results.push(['verify with env-minted JWT', mintedOk]);
  if (!mintedOk) {
    console.error(
      'HINT: API process JWT_SECRET may not match server/.env — restart the API after setting JWT_SECRET.'
    );
  }

  let authToken = null;
  if (mintedOk) {
    authToken = minted;
  }

  const login = await request('POST', '/api/auth/login', {
    body: { username: DEFAULT_USER, password: DEFAULT_PASS },
  });
  const loginOk = login.status === 200 && Boolean(login.json?.token);
  results.push(['POST /api/auth/login (default seed) → token', loginOk]);
  if (loginOk) {
    authToken = login.json.token;
  } else {
    console.error(
      'NOTE: Default admin/admin123 login failed (password may have been changed). Continuing with minted JWT if available.'
    );
  }

  if (authToken) {
    const content = await request('GET', '/api/content');
    const put = await request('PUT', '/api/content', {
      token: authToken,
      body: { siteSettings: content.json?.siteSettings },
    });
    results.push(['authenticated PUT /api/content', put.status === 200]);
  } else {
    results.push(['authenticated PUT /api/content', false]);
  }

  let failed = 0;
  for (const [label, ok] of results) {
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
    if (!ok) failed += 1;
  }
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
