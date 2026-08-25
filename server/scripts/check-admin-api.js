/* Quick health check for admin JWT + content/upload flows */
const http = require('http')

const API = 'http://localhost:5000'

const request = (method, path, { token, body, headers = {} } = {}) =>
  new Promise((resolve, reject) => {
    const url = new URL(path, API)
    const payload = body == null ? null : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let json = null
          try {
            json = JSON.parse(text)
          } catch {
            /* ignore */
          }
          resolve({ status: res.statusCode, text, json })
        })
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })

const main = async () => {
  const results = []

  const health = await request('GET', '/api/health')
  results.push(['health', health.status])

  const content = await request('GET', '/api/content')
  results.push([
    'GET /api/content',
    health.status === 200 && content.status === 200
      ? `200 demos=${content.json?.landing?.demoCards?.length ?? 0} gallery=${content.json?.landing?.gallery?.length ?? 0} faq=${content.json?.landing?.faqItems?.length ?? 0} reviews=${content.json?.reviewsPage?.reviews?.length ?? 0}`
      : content.status,
  ])

  const badPut = await request('PUT', '/api/content', { body: {} })
  results.push(['PUT no token', badPut.status])

  const badLogin = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'wrong-password' },
  })
  results.push(['login bad password', badLogin.status])

  const login = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'admin123' },
  })
  results.push(['login admin123', login.status, login.json?.token ? `token=${login.json.token.slice(0, 12)}…` : login.json?.message])

  if (!login.json?.token) {
    console.log(results.map((r) => r.join(' | ')).join('\n'))
    console.log('ABORT: cannot login')
    process.exit(1)
  }

  const token = login.json.token
  const verify = await request('GET', '/api/auth/verify', { token })
  results.push(['verify', verify.status])

  // Round-trip PUT: keep content identical (safe)
  const put = await request('PUT', '/api/content', { token, body: content.json })
  results.push(['PUT with token', put.status, put.json?.landing ? 'has landing' : put.text.slice(0, 120)])

  // Upload tiny png
  const boundary = '----iotbound' + Date.now()
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="dot.png"\r\nContent-Type: image/png\r\n\r\n`
  )
  const closing = Buffer.from(`\r\n--${boundary}--\r\n`)
  const form = Buffer.concat([preamble, png, closing])

  const upload = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/upload',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': form.length,
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let json = null
          try {
            json = JSON.parse(text)
          } catch {
            /* ignore */
          }
          resolve({ status: res.statusCode, text, json })
        })
      }
    )
    req.on('error', reject)
    req.write(form)
    req.end()
  })
  results.push(['upload png', upload.status, upload.json?.url || upload.text.slice(0, 100)])

  console.log(results.map((r) => r.filter(Boolean).join(' | ')).join('\n'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
