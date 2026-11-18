// Run: npm test (node --test, Node 23.6 or later strips the types).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/index.ts'

const env = { STATIC_ORIGIN: 'https://static.example', GATEWAY_ORIGIN: 'https://gateway.example', EDGE_KEY: 'k' }

type Seen = { url: string; headers: Headers }

async function call(init: RequestInit & { path: string }, answer: () => Response): Promise<{ seen: Seen; res: Response }> {
  const original = globalThis.fetch
  let seen: Seen | undefined
  globalThis.fetch = (async (url: string, opts: RequestInit) => {
    seen = { url, headers: new Headers(opts.headers) }
    return answer()
  }) as typeof fetch
  try {
    const res = await worker.fetch(new Request('https://consignado.example' + init.path, init) as never, env)
    return { seen: seen!, res }
  } finally {
    globalThis.fetch = original
  }
}

test('if-match and if-none-match reach the gateway', async () => {
  const { seen } = await call(
    { path: '/api/fn/api/v1/contracts/c1/approve', method: 'POST', headers: { 'if-match': '"3"', 'if-none-match': '"2"', cookie: 'x=1' } },
    () => new Response('{}', { status: 200 }),
  )
  assert.equal(seen.url, 'https://gateway.example/api/fn/api/v1/contracts/c1/approve')
  assert.equal(seen.headers.get('if-match'), '"3"')
  assert.equal(seen.headers.get('if-none-match'), '"2"')
  assert.equal(seen.headers.get('cookie'), null, 'cookies stay at the edge')
})

test('etag and location survive, set-cookie does not, and the answer is no-store', async () => {
  const { res } = await call(
    { path: '/api/fn/api/v1/contracts', method: 'POST', body: '{}' },
    () => new Response('{}', {
      status: 201,
      headers: { etag: '"1"', location: '/api/fn/api/v1/contracts/c9', 'set-cookie': 'a=b', 'cache-control': 'public, max-age=600' },
    }),
  )
  assert.equal(res.status, 201)
  assert.equal(res.headers.get('etag'), '"1"')
  assert.equal(res.headers.get('location'), '/api/fn/api/v1/contracts/c9')
  assert.equal(res.headers.get('set-cookie'), null)
  assert.equal(res.headers.get('cache-control'), 'no-store')
})

test('a 412 from the gateway passes with its body', async () => {
  const { res } = await call(
    { path: '/api/fn/api/v1/contracts/c1/settle', method: 'POST', headers: { 'if-match': '"1"' } },
    () => new Response('{"code":"precondition-failed"}', { status: 412, headers: { 'content-type': 'application/json' } }),
  )
  assert.equal(res.status, 412)
  assert.equal(await res.text(), '{"code":"precondition-failed"}')
  assert.equal(res.headers.get('cache-control'), 'no-store')
})
