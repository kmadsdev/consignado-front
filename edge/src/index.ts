// Consignado Cloud edge.
//   /api/*  -> the gateway (Azure Function). Never cached. Adds the edge key.
//   other   -> the static site in Azure Blob Storage. Cached. SPA fallback.
// The Worker holds no user data and takes no decision about access: the
// gateway checks the Entra ID token, the quota and the edge key.

export interface Env {
  STATIC_ORIGIN: string
  GATEWAY_ORIGIN: string
  EDGE_KEY: string
}

const MAX_BODY_BYTES = 64 * 1024
const API_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH'])
// Request headers that the gateway needs. Everything else stays at the edge.
// if-match / if-none-match carry the contract version (ETag) for the API's optimistic concurrency.
const FORWARD = ['accept', 'accept-language', 'authorization', 'content-type', 'idempotency-key', 'if-match',
  'if-none-match', 'x-fingerprint']

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'", // Cloudscape injects style tags
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://login.microsoftonline.com",
  'frame-src https://challenges.cloudflare.com https://login.microsoftonline.com',
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ')

function secure(headers: Headers): Headers {
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains')
  headers.set('x-content-type-options', 'nosniff')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  headers.set('x-frame-options', 'DENY')
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  headers.delete('x-powered-by')
  headers.delete('server')
  return headers
}

function json(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: secure(new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' })),
  })
}

async function api(request: Request, url: URL, env: Env): Promise<Response> {
  if (!API_METHODS.has(request.method)) return json(405, 'method-not-allowed', 'Method not allowed.')
  const length = Number(request.headers.get('content-length') ?? '0')
  if (length > MAX_BODY_BYTES) return json(413, 'too-large', 'The request body is too large.')

  const headers = new Headers()
  for (const name of FORWARD) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  headers.set('x-edge-key', env.EDGE_KEY)
  // Cloudflare sets this header itself; a client cannot send its own value through.
  headers.set('cf-connecting-ip', request.headers.get('cf-connecting-ip') ?? '')
  headers.set('x-forwarded-host', url.host)

  const hasBody = request.method !== 'GET'
  let upstream: Response
  try {
    upstream = await fetch(env.GATEWAY_ORIGIN + url.pathname + url.search, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
    })
  } catch {
    return json(502, 'gateway-unreachable', 'The gateway did not answer.')
  }
  // Every gateway response header goes on (etag and location included), except cookies.
  // no-store wins over an ETag: an API answer is never cached by the edge or the browser.
  const out = secure(new Headers(upstream.headers))
  out.set('cache-control', 'no-store')
  out.delete('set-cookie')
  return new Response(upstream.body, { status: upstream.status, headers: out })
}

async function site(request: Request, url: URL, env: Env): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json(405, 'method-not-allowed', 'Method not allowed.')
  const lastSegment = url.pathname.split('/').pop() ?? ''
  const isFile = lastSegment.includes('.')
  // Every application route is the same document: the router runs in the browser.
  const path = isFile ? url.pathname : '/index.html'
  const immutable = path.startsWith('/assets/')

  const upstream = await fetch(env.STATIC_ORIGIN + path, {
    method: request.method,
    cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': immutable ? 31536000 : 60, '404': 10, '500-599': 0 } },
  })
  const out = secure(new Headers())
  for (const name of ['content-type', 'content-length', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name)
    if (value) out.set(name, value)
  }
  out.set('cache-control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache')
  out.set('content-security-policy', CSP)
  return new Response(upstream.body, { status: upstream.ok ? 200 : upstream.status === 404 ? 404 : 502, headers: out })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.protocol === 'http:') {
      url.protocol = 'https:'
      return Response.redirect(url.toString(), 308)
    }
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return api(request, url, env)
    return site(request, url, env)
  },
} satisfies ExportedHandler<Env>
