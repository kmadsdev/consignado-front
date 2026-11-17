// The real client: `fetch` to the gateway under /api. Same function names and
// signatures as ./mock.ts, so the pages do not know which one runs.
// All JSON of the Spring Boot API goes through ./map.ts.
import { getAccessToken } from '../auth/msal'
import { API_BASE } from '../config'
import { ApiError } from './errors'
import { deviceFingerprint } from './fingerprint'
import {
  contractToApi, customerToApi, incomeToApi, normalizeTrace, pageQuery, parseTrace, previewToApi, problemText, simulationToApi,
  toAgreement, toContract, toCustomer, toList, toMargin, toPreview, toSimulation, toSnapshot,
  type ApiAgreement, type ApiContract, type ApiCustomer, type ApiMargin, type ApiPage, type ApiPreview, type ApiProblem, type ApiSimulation,
} from './map'
import type {
  ActivityItem, AdminSession, AdminUserAction, ApiResult, ContactInput, ContractAction, CustomerInput, HostStatus, IncomeResult,
  PreviewInput, PreviewResult, SessionView, SimulationInput, SimulationResult, Snapshot,
} from './mock'
import { E } from './strings'
import type { AdminState, AdminUser, Agreement, ContactRequest, Contract, Customer, Engine, HostKind, Margin, Me, Profile, RequestTrace, Session, Simulation } from './types'

type Auth = 'required' | 'optional' | 'none'
interface Options { method?: string; body?: unknown; auth?: Auth; headers?: Record<string, string>; host?: HostKind; label?: string }
interface Raw<T> { data: T; trace: RequestTrace | null }

const FUNCTION_IDLE_MS = 10 * 60_000
const last: Partial<Record<HostKind, { ms: number; at: number; cold: boolean }>> = {}
const aksCalls = new Map<string, number>()
let openSessionId = ''

/** A trace for a call that came back with no trace header: only what the browser measured. */
function measuredTrace(host: HostKind, label: string, ms: number, status: number): RequestTrace {
  const ts = new Date().toISOString()
  return normalizeTrace({
    host, cold: false, totalMs: ms,
    events: [
      { ts, stage: 'request', status: 'done', detail: label },
      { ts, stage: 'response', status: status >= 200 && status < 400 ? 'done' : 'error', detail: `${status || 'no answer'}: ${E.trace.noTrace}`, ms },
    ],
  })
}

function toError(status: number, body: ApiProblem | null, trace: RequestTrace | null, retryAfter: number, label: string): ApiError {
  const code = body?.code
  const text = problemText(body)
  let message: string
  if (status === 401) message = code === 'invalid-token' ? E.invalidToken : E.unauthorized
  else if (status === 403) message = code === 'blocked' ? E.blocked : code === 'no-session' ? E.noSession : code === 'bot-check-failed' ? E.botCheck : E.forbidden
  // A 404 with no JSON body did not come from the gateway: the gateway is not behind this path.
  else if (status === 404) message = !body ? E.badGateway : code && code !== 'not-found' && text ? text : E.notFound
  else if (status === 409) {
    if (code === 'paused') message = E.paused
    else if (code === 'held') message = E.held
    else if (code === 'blocked') message = E.blocked
    else if (code === 'no-windows') message = E.noWindows
    else if (code === 'profile-incomplete') message = E.profileIncomplete
    else if (code === 'cooldown') message = E.cooldown(retryAfter > 0 ? Math.ceil(retryAfter / 60) : 0)
    else message = text || E.conflict
  } else if (status === 413) message = E.tooLarge
  else if (status === 429) message = E.tooMany
  else if (status === 502 || status === 503) message = E.badGateway
  else if (status === 504) message = E.timeout
  else if (status >= 500) message = E.internal
  else if (status === 400 || status === 412 || status === 422) message = text || E.validation
  else message = text || E.unknown(status)
  return new ApiError(status, message, trace ?? undefined, code, retryAfter > 0 ? retryAfter : undefined, label)
}

async function request<T>(path: string, o: Options = {}): Promise<Raw<T>> {
  const method = o.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json', ...o.headers }
  if (o.body !== undefined) headers['Content-Type'] = 'application/json'
  const auth = o.auth ?? 'required'
  if (auth !== 'none') {
    let token: string | null
    try { token = await getAccessToken() } catch { throw new ApiError(401, E.invalidToken, undefined, 'invalid-token') }
    if (token) headers.Authorization = `Bearer ${token}`
    else if (auth === 'required') throw new ApiError(401, E.unauthorized, undefined, 'unauthorized')
  }
  const label = o.label ?? `${method} /api${path.split('?')[0]}`
  const started = performance.now()
  let res: Response
  try {
    res = await fetch(API_BASE + path, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body), cache: 'no-store', credentials: 'omit' })
  } catch {
    throw new ApiError(0, E.network, o.host ? measuredTrace(o.host, label, Math.round(performance.now() - started), 0) : undefined, 'network', undefined, label)
  }
  const ms = Math.round(performance.now() - started)
  const trace = parseTrace(res.headers.get('x-consignado-trace'), res.headers.get('x-consignado-host')) ?? (o.host ? measuredTrace(o.host, label, ms, res.status) : null)
  if (trace && o.host) last[trace.host] = { ms: trace.totalMs || ms, at: Date.now(), cold: trace.cold }
  const text = await res.text().catch(() => '')
  let body: unknown = null
  let json = text === ''
  if (text) { try { body = JSON.parse(text); json = true } catch { body = null } }
  if (!res.ok) throw toError(res.status, body as ApiProblem | null, trace, Number(res.headers.get('retry-after')) || 0, label)
  // A page of the static site in place of JSON: the gateway is not behind this path.
  if (!json) throw new ApiError(502, E.badGateway, trace ?? undefined, 'not-json', undefined, label)
  return { data: body as T, trace }
}

/** One call to the Spring Boot API through the proxy of a host. */
async function domain<T>(host: HostKind, method: string, path: string, body?: unknown, o: Partial<Options> = {}): Promise<{ data: T; trace: RequestTrace; label: string }> {
  const label = `${method} /api/${host === 'functions' ? 'fn' : 'aks'}/api/v1${path.split('?')[0]}`
  const res = await request<T>(`/${host === 'functions' ? 'fn' : 'aks'}/api/v1${path}`, { method, body, host, label, ...o })
  if (host === 'aks' && openSessionId) aksCalls.set(openSessionId, (aksCalls.get(openSessionId) ?? 0) + 1)
  return { data: res.data, trace: res.trace ?? measuredTrace(host, label, 0, 200), label }
}

// ---- sessions remembered by this browser (the gateway has no "my sessions" route) ----
const SESSIONS_KEY = 'consignado.sessions'
function rememberedSessions(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]') as unknown
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string' && /^[a-z0-9]{8,40}$/.test(x)).slice(0, 10) : []
  } catch { return [] }
}
function rememberSession(id: string) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify([id, ...rememberedSessions().filter((x) => x !== id)].slice(0, 10))) } catch { /* ignore */ }
}
function viewSession(s: Session): SessionView {
  const ready = s.readyAt ? new Date(s.readyAt).getTime() : 0
  const closed = [...s.events].reverse().find((e) => e.stage === 'window-close')
  const lastEvent = s.events[s.events.length - 1]
  if (s.state === 'ready') openSessionId = s.id
  else if (openSessionId === s.id) openSessionId = ''
  return {
    ...s,
    events: s.events ?? [],
    requestCount: aksCalls.get(s.id) ?? 0,
    coldStartMs: ready ? Math.max(0, ready - new Date(s.requestedAt).getTime()) : undefined,
    endedAt: s.state === 'ended' || s.state === 'failed' ? closed?.ts ?? lastEvent?.ts : undefined,
    compressed: false,
  }
}

// ---- gateway calls ----------------------------------------------------------------
export async function getMe(): Promise<Me | null> {
  const token = await getAccessToken().catch(() => null)
  if (!token) return null
  return (await request<Me>('/me')).data
}
export async function saveProfile(p: Profile, extra?: { turnstileToken?: string }): Promise<Me> {
  const fingerprint = await deviceFingerprint()
  const body = { name: p.name.trim(), company: p.company.trim(), linkedin: p.linkedin.trim(), consent: p.consent, fingerprint, turnstileToken: extra?.turnstileToken ?? '' }
  return (await request<Me>('/me/profile', { method: 'PUT', body })).data
}
export async function getEngine(): Promise<Engine> {
  return (await request<Engine>('/engine', { auth: 'none' })).data
}
export async function getHosts(): Promise<HostStatus[]> {
  const engine = await getEngine()
  const f = last.functions
  const a = last.aks
  return [
    { host: 'functions', state: f && Date.now() - f.at < FUNCTION_IDLE_MS ? 'warm' : 'cold', lastMs: f?.ms, lastAt: f ? new Date(f.at).toISOString() : undefined, lastCold: f?.cold },
    { host: 'aks', state: engine.state === 'running' ? 'running' : engine.state === 'starting' ? 'starting' : engine.state === 'paused' ? 'paused' : 'stopped', lastMs: a?.ms, lastAt: a ? new Date(a.at).toISOString() : undefined, lastCold: false },
  ]
}
/** The gateway has no activity route. The list stays empty in the real mode. */
export async function getActivity(): Promise<ActivityItem[]> {
  return []
}
export async function startSession(): Promise<Session> {
  const s = (await request<Session>('/sessions', { method: 'POST', body: {} })).data
  rememberSession(s.id)
  return viewSession(s)
}
export async function getSession(id: string): Promise<SessionView> {
  const s = (await request<Session>(`/sessions/${encodeURIComponent(id)}`)).data
  rememberSession(s.id)
  return viewSession(s)
}
export async function listMySessions(): Promise<SessionView[]> {
  const me = await getMe().catch(() => null)
  const ids = rememberedSessions()
  if (me?.activeSessionId && !ids.includes(me.activeSessionId)) ids.unshift(me.activeSessionId)
  const found = await Promise.all(ids.map((id) => getSession(id).catch(() => null)))
  return found.filter((s): s is SessionView => s !== null && (!me || s.userId === me.id)).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}
export async function sendContact(input: ContactInput): Promise<ContactRequest> {
  const body = { kind: input.kind, name: input.name.trim(), email: input.email.trim(), message: input.message.trim(), turnstileToken: input.turnstileToken ?? '' }
  return (await request<ContactRequest>('/contact', { method: 'POST', body, auth: 'optional' })).data
}

// ---- domain calls -------------------------------------------------------------------
export async function listAgreements(host: HostKind): Promise<ApiResult<Agreement[]>> {
  const res = await domain<ApiAgreement[]>(host, 'GET', '/agreements')
  return { data: toList(res.data, toAgreement).items, trace: res.trace, label: res.label }
}
export async function listCustomers(host: HostKind): Promise<ApiResult<Customer[]>> {
  const res = await domain<ApiPage<ApiCustomer>>(host, 'GET', `/customers?${pageQuery()}`)
  const list = toList(res.data, toCustomer)
  return { data: list.items, trace: res.trace, label: res.label, page: list.page }
}
export async function listSimulations(host: HostKind): Promise<ApiResult<Simulation[]>> {
  const res = await domain<ApiPage<ApiSimulation>>(host, 'GET', `/simulations?${pageQuery()}`)
  const list = toList(res.data, toSimulation)
  return { data: list.items, trace: res.trace, label: res.label, page: list.page }
}
export async function listContracts(host: HostKind): Promise<ApiResult<Contract[]>> {
  const res = await domain<ApiPage<ApiContract>>(host, 'GET', `/contracts?${pageQuery()}`)
  const list = toList(res.data, toContract)
  return { data: list.items, trace: res.trace, label: res.label, page: list.page }
}
export async function createCustomer(host: HostKind, input: CustomerInput): Promise<ApiResult<Customer>> {
  const res = await domain<ApiCustomer>(host, 'POST', '/customers', customerToApi(input))
  return { data: toCustomer(res.data), trace: res.trace, label: res.label }
}
async function marginOf(host: HostKind, id: string): Promise<Margin> {
  return toMargin((await domain<ApiMargin>(host, 'GET', `/customers/${encodeURIComponent(id)}/margin`)).data)
}
export async function changeIncome(host: HostKind, id: string, income: number): Promise<ApiResult<IncomeResult>> {
  const res = await domain<ApiCustomer>(host, 'PATCH', `/customers/${encodeURIComponent(id)}/income`, incomeToApi(income))
  return { data: { customer: toCustomer(res.data), margin: await marginOf(host, id) }, trace: res.trace, label: res.label }
}
export async function getMargin(host: HostKind, id: string): Promise<ApiResult<Margin>> {
  const res = await domain<ApiMargin>(host, 'GET', `/customers/${encodeURIComponent(id)}/margin`)
  return { data: toMargin(res.data), trace: res.trace, label: res.label }
}
/** The API stores a simulation only when it fits the margin (422 `margin-exceeded` when it does not). */
export async function simulate(host: HostKind, input: SimulationInput): Promise<ApiResult<SimulationResult>> {
  const res = await domain<ApiSimulation>(host, 'POST', '/simulations', simulationToApi(input))
  return { data: { simulation: toSimulation(res.data), margin: await marginOf(host, input.customerId), fitsMargin: true }, trace: res.trace, label: res.label }
}
export async function createContract(host: HostKind, simulationId: string): Promise<ApiResult<Contract>> {
  const res = await domain<ApiContract>(host, 'POST', '/contracts', contractToApi(simulationId), { headers: { 'Idempotency-Key': crypto.randomUUID() } })
  return { data: toContract(res.data), trace: res.trace, label: res.label }
}
export async function contractAction(host: HostKind, id: string, action: ContractAction): Promise<ApiResult<Contract>> {
  const body = action === 'reject' ? { reason: E.reason.reject } : action === 'cancel' ? { reason: E.reason.cancel } : undefined
  const res = await domain<ApiContract>(host, 'POST', `/contracts/${encodeURIComponent(id)}/${action}`, body)
  return { data: toContract(res.data), trace: res.trace, label: res.label }
}

// ---- guest calls ----------------------------------------------------------------------
export async function previewSimulation(input: PreviewInput): Promise<ApiResult<PreviewResult>> {
  const res = await domain<ApiPreview>('functions', 'POST', '/simulations/preview', previewToApi(input), { auth: 'optional' })
  return { data: toPreview(res.data), trace: res.trace, label: res.label }
}
export async function getSnapshot(): Promise<ApiResult<Snapshot>> {
  const started = performance.now()
  const res = await request<Parameters<typeof toSnapshot>[0]>('/snapshot', { auth: 'none' })
  return { data: toSnapshot(res.data), trace: res.trace ?? measuredTrace('functions', 'GET /api/snapshot', Math.round(performance.now() - started), 200), label: 'GET /api/snapshot' }
}

// ---- admin ------------------------------------------------------------------------------
export async function adminListUsers(): Promise<AdminUser[]> {
  return (await request<AdminUser[]>('/admin/users')).data
}
export async function adminUserAction(id: string, action: AdminUserAction, windows?: number): Promise<AdminUser> {
  const body = action === 'grant-windows' ? { action: 'grant', windows: Math.max(1, Math.min(20, Math.round(windows ?? 1))) } : { action }
  return (await request<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, { method: 'POST', body })).data
}
export async function adminListSessions(): Promise<AdminSession[]> {
  const [sessions, users] = await Promise.all([request<Session[]>('/admin/sessions'), request<AdminUser[]>('/admin/users').catch(() => ({ data: [] as AdminUser[] }))])
  const byId = new Map(users.data.map((u) => [u.id, u]))
  return sessions.data
    .map((s) => ({ ...viewSession(s), userName: byId.get(s.userId)?.name ?? '', userEmail: byId.get(s.userId)?.email ?? '' }))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}
export async function adminGetState(): Promise<AdminState> {
  return (await request<AdminState>('/admin/state')).data
}
export async function adminSetPaused(paused: boolean): Promise<AdminState> {
  return (await request<AdminState>('/admin/pause', { method: 'POST', body: { paused } })).data
}
export async function adminStopEngine(): Promise<AdminState> {
  return (await request<AdminState>('/admin/engine/stop', { method: 'POST', body: {} })).data
}
export async function adminListContacts(): Promise<ContactRequest[]> {
  return (await request<ContactRequest[]>('/admin/contacts')).data
}
