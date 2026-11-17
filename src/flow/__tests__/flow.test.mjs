// Unit checks of the pure parts of the request flow: trace -> flow model, the replay clock, the session store.
// Run: `pnpm test` (node --test, no extra dependency). All values are synthetic.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildFlow, dbFromDetail, frameAt, lifecycleEventsAt, lifecycleRun, pathSteps, statementKinds } from '../model.ts'
import { autoSpeed, createClock, isEnded, pause, play, positionAt, restart, seek, setSpeed, settle, SPEEDS, wallMs } from '../clock.ts'
import { addRecord, MAX_RECORDS, RequestStore, splitLabel } from '../store.ts'
import { parseTrace } from '../../api/map.ts'

const ts = '2026-11-17T20:00:00.000Z'
const ev = (stage, ms, detail, status = 'done') => ({ ts, stage, status, ms, detail })

const aksCustomer = {
  host: 'aks', cold: false, totalMs: 125,
  events: [ev('request', 5), ev('edge', 12), ev('gateway', 30), ev('identity', 11), ev('quota', 6), ev('keyvault', 0, 'secret read from the cache'),
    ev('load-balancer', 9), ev('app', 6, 'Spring Boot handled the request in consignado-api-5d897fb475-ffmb4'), ev('database', 31, '3 statements: 2 select, 1 insert'), ev('response', 15)],
  api: { instance: 'consignado-api-5d897fb475-ffmb4', appMs: 37, db: { ms: 31, statements: 3, select: 2, insert: 1, update: 0, delete: 0, other: 0, connectionMs: 1.2, transactions: 1 } },
}
const guestPreview = {
  host: 'functions', cold: false, totalMs: 70,
  events: [ev('request', 5), ev('edge', 12), ev('gateway', 20), ev('keyvault', 0, 'secret read from the cache'), ev('functions-host', 18), ev('app', 7, 'Spring Boot handled the request in a3f9c1d27b4e'), ev('response', 8)],
  api: { instance: 'a3f9c1d27b4e', appMs: 7, db: null },
}
const oldAks = { host: 'aks', cold: false, totalMs: 400, events: [ev('request', 5), ev('edge', 12), ev('gateway', 40), ev('identity', 20), ev('quota', 8), ev('keyvault', 10), ev('load-balancer', 290), ev('response', 15)] }
const oldFn = { host: 'functions', cold: false, totalMs: 90, events: [ev('request', 5), ev('edge', 12), ev('gateway', 20), ev('identity', 9), ev('keyvault', 6), ev('response', 38)] }

test('flow: AKS write shows only the touched services, in path order, with the database', () => {
  const f = buildFlow(aksCustomer, { podCount: 2, podNames: ['consignado-api-5d897fb475-ffmb4', 'consignado-api-5d897fb475-q8kzn'] })
  assert.deepEqual(f.main, ['browser', 'edge', 'gateway', 'lb', 'service', 'pod-a', 'database'])
  assert.deepEqual(f.nodes.map((n) => n.kind).sort(), ['browser', 'database', 'edge', 'gateway', 'identity', 'keyvault', 'lb', 'pod', 'pod', 'service'].sort())
  for (const k of ['arm', 'cp', 'acr', 'csi', 'kubelet', 'window']) assert.ok(!f.nodes.some((n) => n.id === k), `${k} must not be in a request flow`)
  const podA = f.nodes.find((n) => n.id === 'pod-a')
  assert.equal(podA.sub, 'consignado-api-5d897fb475-ffmb4')
  assert.equal(podA.answered, true)
  assert.equal(f.nodes.find((n) => n.id === 'pod-b').sub, 'consignado-api-5d897fb475-q8kzn')
  assert.equal(f.nodes.find((n) => n.id === 'keyvault').cached, true)
  assert.equal(f.nodes.find((n) => n.id === 'database').ms, 31)
  assert.equal(f.db.statements, 3)
  assert.equal(f.db.fromDetail, false)
  assert.ok(Math.abs(f.db.share - 31 / 125) < 1e-9)
  assert.equal(f.durationMs, 125)
  assert.equal(statementKinds(f.db), '1 insert, 2 select')
})

test('flow: guest preview has no Entra ID node and no database node', () => {
  const f = buildFlow(guestPreview)
  assert.deepEqual(f.main, ['browser', 'edge', 'gateway', 'fnhost', 'app'])
  assert.ok(!f.nodes.some((n) => n.kind === 'identity'))
  assert.ok(!f.nodes.some((n) => n.kind === 'database'))
  assert.equal(f.db, undefined)
  assert.equal(f.instance, 'a3f9c1d27b4e')
  assert.equal(f.detailed, true)
})

test('flow: old traces (no app, no database stage) give the path up to the host, without error', () => {
  const a = buildFlow(oldAks, { podCount: 1 })
  assert.deepEqual(a.main, ['browser', 'edge', 'gateway', 'lb', 'service', 'pod-a'])
  assert.equal(a.detailed, false)
  assert.equal(a.db, undefined)
  assert.ok(a.nodes.every((n) => n.status === 'done'))
  const f = buildFlow(oldFn)
  assert.deepEqual(f.main, ['browser', 'edge', 'gateway', 'fnhost'])
  assert.equal(f.durationMs, 90)
})

test('flow: database counts from the stage detail when the api block is missing', () => {
  assert.deepEqual(dbFromDetail('3 statements: 2 select, 1 insert'), { statements: 3, select: 2, insert: 1, update: 0, delete: 0, other: 0 })
  assert.equal(dbFromDetail('PostgreSQL answered'), null)
  const { api, ...noApi } = aksCustomer
  const f = buildFlow(noApi)
  assert.equal(f.db.statements, 3)
  assert.equal(f.db.fromDetail, true)
})

test('flow: the frame at a position lights the current stage and the stages before it', () => {
  const f = buildFlow(aksCustomer)
  const db = f.segments.find((s) => s.stage === 'database')
  const mid = frameAt(f, db.start + db.ms / 2)
  assert.equal(mid.current.stage, 'database')
  assert.ok(Math.abs(mid.progress - 0.5) < 1e-9)
  assert.equal(mid.nodeState.database, 'active')
  assert.equal(mid.nodeState.gateway, 'done')
  const start = frameAt(f, 0)
  assert.equal(start.nodeState.database, 'idle')
  const end = frameAt(f, f.durationMs)
  assert.equal(end.finished, true)
  assert.ok(Object.values(end.nodeState).every((s) => s === 'done'))
})

test('flow: the one-line path of an inline record', () => {
  const steps = pathSteps(buildFlow(aksCustomer))
  assert.deepEqual(steps.map((s) => s.stage), ['edge', 'gateway', 'identity', 'quota', 'keyvault', 'load-balancer', 'app', 'database'])
  assert.equal(steps.at(-1).extra, '1 insert, 2 select')
})

test('trace header: the api block is kept, broken values are dropped', () => {
  const raw = { ...aksCustomer, api: { instance: 'pod-1', appMs: 41.3, db: { ms: 28.7, statements: 3, select: 2, insert: 1, update: 0, delete: 0, other: 0, connectionMs: 1.2, transactions: 1 } } }
  const header = Buffer.from(JSON.stringify(raw)).toString('base64url')
  const t = parseTrace(header)
  assert.equal(t.api.instance, 'pod-1')
  assert.equal(t.api.db.statements, 3)
  const header2 = Buffer.from(JSON.stringify({ ...oldAks, api: 'x' })).toString('base64url')
  assert.equal(parseTrace(header2).api, undefined)
})

test('lifecycle: a recorded start replays from its time stamps', () => {
  const t0 = Date.parse(ts)
  const at = (s) => new Date(t0 + s * 1000).toISOString()
  const events = [
    { ts: at(0), stage: 'arm-start', status: 'active' }, { ts: at(12), stage: 'arm-start', status: 'done', ms: 12000 },
    { ts: at(12), stage: 'control-plane', status: 'active' }, { ts: at(266), stage: 'control-plane', status: 'done', ms: 254000 },
    { ts: at(266), stage: 'window-close', status: 'done' },
  ]
  const run = lifecycleRun(events, ['arm-start', 'control-plane'])
  assert.equal(run.durationMs, 266000)
  assert.deepEqual(lifecycleEventsAt(run, 100000).map((e) => `${e.stage}:${e.status}`), ['arm-start:done', 'control-plane:active'])
})

test('clock: exactly the 9 speed steps', () => {
  assert.deepEqual([...SPEEDS], [1, 5, 10, 25, 50, 100, 200, 400, 800])
})

test('clock: the wall time follows the speed at every step', () => {
  for (const s of SPEEDS) {
    const c = createClock(30, s, 1000, true, 0)
    const wall = wallMs(30, s)
    assert.ok(Math.abs(positionAt(c, 1000 + wall / 2) - 15) < 1e-9, `half way at ${s}%`)
    assert.equal(isEnded(c, 1000 + wall - 0.001), false)
    assert.equal(isEnded(c, 1000 + wall), true)
  }
  assert.equal(wallMs(30, 1), 3000)
  assert.equal(wallMs(30, 800), 3.75)
  assert.equal(wallMs(433_000, 10), 4_330_000)
})

test('clock: the automatic speed is the step nearest to the target', () => {
  assert.equal(autoSpeed(30, 3000), 1)        // 30 ms -> 3 s
  assert.equal(autoSpeed(150, 3000), 5)
  assert.equal(autoSpeed(600, 3000), 25)      // ideal 20%
  assert.equal(autoSpeed(4500, 3000), 200)    // ideal 150%: log-nearest of 100 and 200
  assert.equal(autoSpeed(433_000, 40_000), 800) // cluster start of 7 min 13 s: 800% lasts 54 s, the nearest step to 40 s
})

test('clock: play, pause, seek, speed change, restart and settle', () => {
  let c = createClock(1000, 100, 0)
  assert.equal(positionAt(c, 500), 0)
  c = play(c, 0)
  assert.equal(positionAt(c, 400), 400)
  c = pause(c, 400)
  assert.equal(positionAt(c, 9999), 400)
  c = setSpeed(play(c, 500), 50, 500)
  assert.equal(positionAt(c, 700), 500)
  c = seek(c, 900, 700)
  assert.equal(positionAt(c, 900), 1000)
  c = settle(c, 900)
  assert.equal(c.playing, false)
  assert.equal(positionAt(c, 5000), 1000)
  c = play(c, 5000) // play at the end starts again
  assert.equal(positionAt(c, 5000), 0)
  c = restart(pause(c, 5100), 6000)
  assert.equal(positionAt(c, 6000), 0)
  assert.equal(c.playing, true)
})

function memoryStorage() {
  const m = new Map()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }
}
const rec = (i) => ({ at: 1000 + i, label: `GET /api/fn/api/v1/customers?${i}`, host: 'functions', ok: true, status: 200, trace: oldFn })

test('store: newest first, at most 200, same id replaced', () => {
  let list = []
  for (let i = 0; i < 250; i++) list = addRecord(list, { ...rec(i), id: `r${i}` })
  assert.equal(list.length, MAX_RECORDS)
  assert.equal(list[0].id, 'r249')
  assert.equal(list.at(-1).id, 'r50')
  list = addRecord(list, { ...rec(1), id: 'r100' })
  assert.equal(list[0].id, 'r100')
  assert.equal(list.length, MAX_RECORDS)
})

test('store: survives a reload, clears for another viewer (sign-out)', () => {
  const storage = memoryStorage()
  const a = new RequestStore(storage)
  a.setOwner('user:1')
  let calls = 0
  a.subscribe(() => { calls++ })
  const r = a.add(rec(1))
  assert.ok(r.id)
  assert.equal(calls, 1)
  const b = new RequestStore(storage)
  assert.equal(b.get().length, 1)
  b.setOwner('user:1')
  assert.equal(b.get().length, 1)
  b.setOwner('guest:guest')
  assert.equal(b.get().length, 0)
  assert.equal(new RequestStore(storage).get().length, 0)
})

test('store: method and path of a label', () => {
  assert.deepEqual(splitLabel('POST /api/aks/api/v1/customers'), { method: 'POST', path: '/api/aks/api/v1/customers' })
})

// Traces made by the real gateway code (reports/gateway3.md, examples 3 and 4).
const g = (stage, ms, detail, status = 'done') => (ms === undefined ? { ts, stage, status, detail } : { ts, stage, status, ms, detail })
const gwAks = { host: 'aks', cold: false, totalMs: 58, events: [
  g('request', undefined, 'browser sent the request'), g('edge', undefined, 'Cloudflare edge: WAF, rate limit'), g('gateway', 8), g('identity', 3), g('quota', undefined),
  g('keyvault', 0, 'not needed for this host'), g('load-balancer', 25), g('app', 12, 'Spring Boot handled the request in consignado-api-5d897fb475-ffmb4'),
  g('database', 10, '2 statements: 1 select, 1 insert'), g('response', undefined, 'HTTP 201 from the API host')],
  api: { instance: 'consignado-api-5d897fb475-ffmb4', appMs: 22.4, db: { ms: 9.6, statements: 2, select: 1, insert: 1, update: 0, delete: 0, other: 0, connectionMs: 0.4, transactions: 1 } } }
const gwCold = { host: 'functions', cold: true, totalMs: 11850, events: [
  g('request', undefined), g('edge', undefined), g('gateway', 50), g('keyvault', 0, 'cached'), g('function-cold-start', 11388), g('jvm-start', undefined), g('functions-host', undefined),
  g('app', 412, 'Spring Boot handled the request in a1b2c3d4e5f6'), g('response', undefined)], api: { instance: 'a1b2c3d4e5f6', appMs: 412.4, db: null } }

test('gateway3 shapes: untimed stages show no time, Key Vault "not needed" is not drawn, times add up', () => {
  const a = buildFlow(gwAks)
  assert.ok(!a.nodes.some((n) => n.kind === 'keyvault'))
  assert.equal(a.nodes.find((n) => n.id === 'browser').ms, undefined)
  assert.equal(a.nodes.find((n) => n.id === 'edge').ms, undefined)
  assert.equal(a.durationMs, 58)
  assert.equal(a.db.statements, 2)
  assert.deepEqual(pathSteps(a).map((s) => s.stage), ['gateway', 'identity', 'load-balancer', 'app', 'database'])
  const c = buildFlow(gwCold)
  assert.deepEqual(c.main, ['browser', 'edge', 'gateway', 'fnhost', 'app'])
  assert.equal(c.nodes.find((n) => n.id === 'fnhost').ms, 11388)
  assert.equal(c.durationMs, 11850)
  assert.equal(c.db, undefined)
})

test('strings: the pt-BR table of the flow has every key of the English one', async () => {
  const { en } = await import('../strings.ts')
  const { ptBR } = await import('../strings.pt.ts')
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}:${typeof v}`])).sort()
  assert.deepEqual(keys(ptBR), keys(en))
})

test('instance "local" (Functions custom handler) is not shown as a name', () => {
  const live = { ...guestPreview, events: guestPreview.events.map((e) => (e.stage === 'app' ? { ...e, detail: 'Spring Boot handled the request in local' } : e)), api: { instance: 'local', appMs: 3, db: null } }
  const f = buildFlow(live)
  assert.equal(f.instance, undefined)
  assert.equal(f.nodes.find((n) => n.id === 'app').sub, undefined)
})
