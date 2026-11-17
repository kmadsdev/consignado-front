// The request flow model: from one trace of the gateway to the nodes, edges and timed segments that a request
// diagram draws. Only what the request touched is in the model (CONTRACT-ADDENDUM-2 section 3).
// Pure functions, type-only imports: `node --test` loads this file as it is.
import type { DbTiming, HostKind, LifecycleEvent, RequestTrace, StageStatus } from '../api/types'

export type FlowNodeKind = 'browser' | 'edge' | 'gateway' | 'identity' | 'keyvault' | 'fnhost' | 'app' | 'lb' | 'service' | 'pod' | 'database'
/** Where a node sits: on the main path, above or below the gateway, or one of two pods in the same column. */
export type FlowPlace = 'main' | 'above' | 'below' | 'pod-a' | 'pod-b'

export interface FlowNode {
  id: string
  kind: FlowNodeKind
  place: FlowPlace
  /** Index on the main path (side nodes have the index of the node they hang from). */
  col: number
  /** Stage ids drawn on this node. */
  stages: string[]
  /** Sum of the stage times of this node, when the trace has them. */
  ms?: number
  status: StageStatus | 'idle'
  /** The pod or instance name, the Key Vault "cached" mark. */
  sub?: string
  cached?: boolean
  /** Pods: true for the pod that answered. */
  answered?: boolean
}
export interface FlowEdge {
  id: string
  from: string
  to: string
  /** The stage whose time this edge shows. */
  stage?: string
  ms?: number
}
/** One stage on the time line of the run. `path` is the list of node ids that the moving dot visits. */
export interface FlowSegment {
  stage: string
  start: number
  end: number
  ms: number
  /** False when the trace gave no time for this stage (shown as "-"). */
  timed: boolean
  status: StageStatus
  detail?: string
  nodes: string[]
  path: string[]
}
export interface DbInfo extends DbTiming {
  /** Share of the gateway total, 0 to 1. */
  share: number
  /** True when the numbers come from the stage detail only (no `api` block). */
  fromDetail: boolean
}
export interface FlowModel {
  host: HostKind
  nodes: FlowNode[]
  edges: FlowEdge[]
  segments: FlowSegment[]
  /** Sum of the stage times: the length of a replay at 100%. */
  durationMs: number
  totalMs: number
  /** The main path, left to right. */
  main: string[]
  instance?: string
  db?: DbInfo
  /** True when the trace has the stages of CONTRACT-ADDENDUM-2 (`app`). False for an old trace. */
  detailed: boolean
}

export interface FlowOptions {
  /** Pod names from the live status (host aks). */
  podNames?: string[]
  /** Ready pods from the live status (host aks). Two or more: both pods are drawn. */
  podCount?: number
}

const STATEMENTS = /(\d+)\s+statements?/i
const KIND = /(\d+)\s+(select|insert|update|delete|other)/gi

/** Statement counts from the detail text of the `database` stage: "3 statements: 2 select, 1 insert". */
export function dbFromDetail(detail: string | undefined): Omit<DbTiming, 'ms'> | null {
  if (!detail) return null
  const m = STATEMENTS.exec(detail)
  if (!m) return null
  const out = { statements: Number(m[1]), select: 0, insert: 0, update: 0, delete: 0, other: 0 }
  for (const k of detail.matchAll(KIND)) out[k[2].toLowerCase() as 'select'] += Number(k[1])
  return out
}

interface StageTime { stage: string; ms: number; timed: boolean; status: StageStatus; detail?: string }
function stageMs(events: LifecycleEvent[]): StageTime[] {
  // A request trace has one event per stage. If a stage comes twice (active, then done), the last one wins.
  // A stage with no `ms` (the gateway cannot measure `request` and `edge`) counts as 0 and shows no time.
  const order: string[] = []
  const by = new Map<string, StageTime>()
  for (const e of events) {
    if (!by.has(e.stage)) order.push(e.stage)
    const prev = by.get(e.stage)
    const timed = e.ms !== undefined || Boolean(prev?.timed)
    by.set(e.stage, { stage: e.stage, ms: Math.max(0, e.ms ?? prev?.ms ?? 0), timed, status: e.status, detail: e.detail ?? prev?.detail })
  }
  return order.map((s) => by.get(s)!)
}

/** Builds the flow of one request from its trace. Old traces (no `app` stage) give the path up to the host. */
export function buildFlow(trace: RequestTrace, opts: FlowOptions = {}): FlowModel {
  // Key Vault "not needed for this host" (AKS: the pods read their secret themselves): the request did not touch it.
  const stages = stageMs(trace.events).filter((x) => !(x.stage === 'keyvault' && /not needed/i.test(x.detail ?? '')))
  const get = (id: string) => stages.find((s) => s.stage === id)
  const has = (id: string) => get(id) !== undefined
  // "local" = the API host set no instance variable (Azure Functions custom handler): not a name to show.
  const rawInstance = trace.api?.instance ?? instanceFromDetail(get('app')?.detail)
  const instance = rawInstance && rawInstance !== 'local' ? rawInstance : undefined
  const detailed = has('app')

  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []
  const main: string[] = []
  const node = (id: string, kind: FlowNodeKind, place: FlowPlace, own: string[], extra: Partial<FlowNode> = {}) => {
    const col = place === 'main' || place === 'pod-a' ? main.length : Math.max(0, main.length - 1)
    if (place === 'main' || place === 'pod-a') main.push(id)
    nodes.push({ id, kind, place, col, stages: own.filter(has), status: 'idle', ...extra })
  }
  const edge = (from: string, to: string, stage?: string) => edges.push({ id: `${from}>${to}`, from, to, stage: stage && get(stage)?.timed ? stage : undefined })

  node('browser', 'browser', 'main', ['request', 'response'])
  node('edge', 'edge', 'main', ['edge'])
  edge('browser', 'edge', 'request')
  node('gateway', 'gateway', 'main', ['gateway', 'quota'])
  edge('edge', 'gateway')
  if (has('identity')) { node('identity', 'identity', 'above', ['identity']); edge('gateway', 'identity') }
  if (has('keyvault')) {
    const cached = /cache/i.test(get('keyvault')?.detail ?? '')
    node('keyvault', 'keyvault', 'below', ['keyvault'], { cached })
    edge('gateway', 'keyvault')
  }
  let last: string
  if (trace.host === 'functions') {
    node('fnhost', 'fnhost', 'main', ['functions-host', 'function-cold-start'])
    edge('gateway', 'fnhost', get('functions-host')?.timed ? 'functions-host' : 'function-cold-start')
    last = 'fnhost'
    if (detailed || has('jvm-start') || instance) {
      node('app', 'app', 'main', ['app', 'jvm-start'], { sub: instance })
      edge('fnhost', 'app')
      last = 'app'
    }
  } else {
    node('lb', 'lb', 'main', ['load-balancer'])
    edge('gateway', 'lb', 'load-balancer')
    node('service', 'service', 'main', [])
    edge('lb', 'service')
    const two = (opts.podCount ?? opts.podNames?.length ?? 0) >= 2
    const other = opts.podNames?.find((n) => n !== instance)
    node('pod-a', 'pod', 'pod-a', ['app'], { sub: instance, answered: true })
    edge('service', 'pod-a')
    if (two) {
      node('pod-b', 'pod', 'pod-b', [], { sub: other, answered: false })
      edge('service', 'pod-b')
    }
    last = 'pod-a'
  }
  if (has('database')) {
    node('database', 'database', 'main', ['database'])
    edge(last, 'database', 'database')
  }

  // Which nodes each stage lights, and the way of the moving dot.
  const back = [...main].filter((id) => id !== 'database').reverse()
  const hostPath = trace.host === 'functions' ? ['gateway', 'fnhost', ...(nodes.some((n) => n.id === 'app') ? ['app'] : [])] : ['gateway', 'lb', 'service', 'pod-a']
  const WAY: Record<string, { nodes: string[]; path: string[] }> = {
    request: { nodes: ['browser'], path: ['browser', 'edge'] },
    edge: { nodes: ['edge'], path: [] },
    gateway: { nodes: ['gateway'], path: ['edge', 'gateway'] },
    identity: { nodes: ['identity'], path: ['gateway', 'identity', 'gateway'] },
    quota: { nodes: ['gateway'], path: [] },
    keyvault: { nodes: ['keyvault'], path: ['gateway', 'keyvault', 'gateway'] },
    'function-cold-start': { nodes: ['fnhost'], path: ['gateway', 'fnhost'] },
    'jvm-start': { nodes: ['app'], path: ['fnhost', 'app'] },
    'functions-host': { nodes: ['fnhost'], path: hostPath },
    'load-balancer': { nodes: detailed ? ['lb', 'service'] : ['lb', 'service', 'pod-a'], path: hostPath },
    app: { nodes: [trace.host === 'aks' ? 'pod-a' : 'app'], path: [] },
    database: { nodes: ['database'], path: [trace.host === 'aks' ? 'pod-a' : 'app', 'database', trace.host === 'aks' ? 'pod-a' : 'app'] },
    response: { nodes: ['browser'], path: back.slice(back.indexOf(hostPath[hostPath.length - 1]) >= 0 ? back.indexOf(hostPath[hostPath.length - 1]) : 0) },
  }
  const known = new Set(nodes.map((n) => n.id))
  const segments: FlowSegment[] = []
  let t = 0
  for (const s of stages) {
    const way = WAY[s.stage] ?? { nodes: [], path: [] }
    const path = way.path.filter((id) => known.has(id))
    segments.push({ stage: s.stage, start: t, end: t + s.ms, ms: s.ms, timed: s.timed, status: s.status, detail: s.detail, nodes: way.nodes.filter((id) => known.has(id)), path: path.length >= 2 ? path : [] })
    t += s.ms
  }
  const failed = stages.some((s) => s.status === 'error')
  for (const n of nodes) {
    const own = stages.filter((s) => n.stages.includes(s.stage) && s.stage !== 'response')
    if (own.some((s) => s.timed)) n.ms = own.reduce((sum, s) => sum + s.ms, 0)
    // A node with no stage of its own was reached when the request did not fail on the way.
    n.status = own.some((s) => s.status === 'error') ? 'error' : own.length || !failed ? 'done' : 'idle'
  }
  for (const e of edges) if (e.stage) e.ms = get(e.stage)?.ms

  const totalMs = trace.totalMs > 0 ? trace.totalMs : t
  return { host: trace.host, nodes, edges, segments, durationMs: Math.max(1, t), totalMs, main, instance, db: dbInfo(trace, totalMs), detailed }
}

function instanceFromDetail(detail: string | undefined): string | undefined {
  const m = detail ? /\bin\s+([\w.-]+)\s*$/.exec(detail) : null
  return m ? m[1] : undefined
}

/** The database block: from the `api` block when present, else from the `database` stage. Undefined when no SQL ran. */
export function dbInfo(trace: RequestTrace, totalMs = trace.totalMs): DbInfo | undefined {
  const stage = trace.events.find((e) => e.stage === 'database')
  const db = trace.api?.db
  if (db && db.statements > 0) return { ...db, share: totalMs > 0 ? db.ms / totalMs : 0, fromDetail: false }
  if (!stage) return undefined
  const counts = dbFromDetail(stage.detail)
  const ms = stage.ms ?? 0
  return { ms, select: 0, insert: 0, update: 0, delete: 0, other: 0, statements: 0, ...counts, share: totalMs > 0 ? ms / totalMs : 0, fromDetail: true }
}

/** "1 insert, 2 select": kinds with 0 are left out. */
export function statementKinds(db: Pick<DbTiming, 'select' | 'insert' | 'update' | 'delete' | 'other'>, words: Record<'select' | 'insert' | 'update' | 'delete' | 'other', string> = { select: 'select', insert: 'insert', update: 'update', delete: 'delete', other: 'other' }): string {
  return (['insert', 'update', 'delete', 'select', 'other'] as const).filter((k) => db[k] > 0).map((k) => `${db[k]} ${words[k]}`).join(', ')
}

/** What the replay shows at `pos` ms of the run: the current segment, how far it is, and the state of each node. */
export interface FlowFrame {
  current: FlowSegment | null
  /** 0 to 1 inside the current segment. */
  progress: number
  nodeState: Record<string, StageStatus | 'idle'>
  edgeState: Record<string, 'idle' | 'active' | 'done'>
  finished: boolean
}
export function frameAt(model: FlowModel, pos: number): FlowFrame {
  const finished = pos >= model.durationMs
  const nodeState: Record<string, StageStatus | 'idle'> = {}
  const edgeState: Record<string, 'idle' | 'active' | 'done'> = {}
  for (const n of model.nodes) nodeState[n.id] = 'idle'
  for (const e of model.edges) edgeState[e.id] = 'idle'
  let current: FlowSegment | null = null
  let progress = 0
  const mark = (path: string[], value: 'active' | 'done') => {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i]
      const id = model.edges.find((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a))?.id
      if (id && !(value === 'done' && edgeState[id] === 'active')) edgeState[id] = value
    }
  }
  for (const s of model.segments) {
    if (pos >= s.end && !(s.ms === 0 && pos < s.start)) {
      for (const n of s.nodes) nodeState[n] = s.status === 'error' ? 'error' : nodeState[n] === 'error' ? 'error' : 'done'
      mark(s.path, 'done')
    } else if (pos >= s.start && pos < s.end) {
      current = s
      progress = s.ms > 0 ? (pos - s.start) / s.ms : 1
      for (const n of s.nodes) nodeState[n] = 'active'
      mark(s.path, 'active')
    }
  }
  if (finished) {
    for (const n of model.nodes) if (n.status === 'done' && nodeState[n.id] === 'idle') nodeState[n.id] = 'done'
  } else if (pos > 0) {
    nodeState.browser = nodeState.browser === 'idle' ? 'done' : nodeState.browser
  }
  return { current, progress, nodeState, edgeState, finished }
}

/** The steps of the one-line path of an inline record: stage, time, extra text. Response and request are left out. */
export interface PathStep { stage: string; ms: number; extra?: string }
export function pathSteps(model: FlowModel): PathStep[] {
  const out: PathStep[] = []
  const order = ['edge', 'gateway', 'identity', 'quota', 'keyvault', 'function-cold-start', 'jvm-start', 'functions-host', 'load-balancer', 'app', 'database']
  for (const id of order) {
    const s = model.segments.find((x) => x.stage === id)
    if (!s || !s.timed) continue
    out.push({ stage: id, ms: s.ms, extra: id === 'database' && model.db && model.db.statements > 0 ? statementKinds(model.db) : undefined })
  }
  // An old trace has no host stage: the host time is inside `response`.
  const resp = model.segments.find((x) => x.stage === 'response')
  if (!model.detailed && resp?.timed) out.push({ stage: 'response', ms: resp.ms })
  return out
}

// ---- recorded cluster start (lifecycle of an access window) --------------------------------------
export interface LifeSegment { stage: string; start: number; end: number; status: StageStatus; detail?: string; ms?: number }
export interface LifeRun { t0: number; durationMs: number; segments: LifeSegment[] }

/**
 * The time line of a recorded run from its events (ISO `ts`). A stage starts at its first event (or at its done event
 * minus `ms`) and ends at its done or error event. `until` keeps only the stages in that list (the cluster start).
 */
export function lifecycleRun(events: LifecycleEvent[], until?: readonly string[]): LifeRun {
  const by = new Map<string, LifeSegment>()
  const order: string[] = []
  const times = events.map((e) => Date.parse(e.ts)).filter(Number.isFinite)
  const t0 = times.length ? Math.min(...times) : 0
  for (const e of events) {
    if (until && !until.includes(e.stage)) continue
    const t = Date.parse(e.ts) - t0
    if (!Number.isFinite(t)) continue
    let seg = by.get(e.stage)
    if (!seg) {
      const start = e.status === 'active' || e.ms === undefined ? t : Math.max(0, t - e.ms)
      seg = { stage: e.stage, start, end: start, status: e.status }
      by.set(e.stage, seg); order.push(e.stage)
    }
    if (e.status === 'done' || e.status === 'error') { seg.end = Math.max(seg.start, t); seg.status = e.status; seg.ms = e.ms ?? seg.end - seg.start }
    else seg.status = seg.status === 'done' ? 'done' : e.status
    if (e.detail) seg.detail = e.detail
  }
  let segments = order.map((s) => by.get(s)!)
  let durationMs = Math.max(1, ...segments.map((s) => s.end))
  // A compressed record (the mock plays a 7-minute start in 40 s) keeps the real `ms` of each stage:
  // when the stage times add up to much more than the time stamps, the stage times decide.
  const sumMs = segments.reduce((n, s) => n + (s.ms ?? 0), 0)
  if (segments.every((s) => s.status !== 'done' || s.ms !== undefined) && sumMs > durationMs * 2) {
    let t = 0
    segments = segments.map((s) => {
      const ms = s.ms ?? 0
      const seg = { ...s, start: t, end: t + ms }
      t += ms
      return seg
    })
    durationMs = Math.max(1, t)
  }
  return { t0, durationMs, segments }
}

/** The events that the lifecycle diagram should show at `pos` ms of a recorded run. */
export function lifecycleEventsAt(run: LifeRun, pos: number): LifecycleEvent[] {
  const out: LifecycleEvent[] = []
  for (const s of run.segments) {
    if (pos < s.start) continue
    const ts = new Date(run.t0 + s.start).toISOString()
    if (pos >= s.end && s.status !== 'active') out.push({ ts: new Date(run.t0 + s.end).toISOString(), stage: s.stage, status: s.status, detail: s.detail, ms: s.ms })
    else out.push({ ts, stage: s.stage, status: 'active', detail: s.detail })
  }
  return out
}
