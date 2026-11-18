// Mock of the future gateway. In-memory state (kept in sessionStorage so a hard
// reload does not lose it), realistic timing, traces built from src/api/stages.ts.
// The real client replaces this file; the function signatures in client.ts stay.
import type {
  AdminState, AdminUser, Agreement, ContactRequest, Contract, ContractStatus, Customer, Engine,
  EngineState, HostKind, LifecycleEvent, Margin, Me, Metric, PlatformStatus, Profile, RequestTrace, ServiceStatus, Session, Simulation,
} from './types'
import { ApiError } from './errors'
import { E } from './strings'
import { changeWithVersion, checkIfMatch, rememberEtag } from './versions'
import { cpfForApi, formatCpf, maskCpf, type PageInfo } from './map'
import { BRL_PER_USD, BUDGET_BRL, WINDOW_COST_USD } from '../app/cost.ts'

// ---- types that the contract does not have yet (listed in the report) ---------
export type PersonaId = 'guest' | 'recruiter' | 'recruiter-new' | 'recruiter-held' | 'recruiter-spent' | 'admin'
export type ContractAction = 'approve' | 'reject' | 'activate' | 'settle' | 'cancel'
export type AdminUserAction = 'approve' | 'hold' | 'block' | 'grant-windows'
/** `page` is set by the real client for a paged listing. */
export interface ApiResult<T> { data: T; trace: RequestTrace; page?: PageInfo; /** Method and path of the call, for example `POST /api/fn/api/v1/customers`. */ label: string }
export interface CustomerInput { agreementId: string; name: string; cpf: string; monthlyIncome: number }
export interface SimulationInput { customerId: string; principal: number; termMonths: number }
export interface SimulationResult { simulation: Simulation; margin: Margin; fitsMargin: boolean }
export interface PreviewInput { principal: number; termMonths: number; monthlyInterestRate: number; monthlyIncome: number }
export interface PreviewResult { installment: number; totalAmount: number; totalInterest: number; marginLimit: number; fitsMargin: boolean }
export interface IncomeResult { customer: Customer; margin: Margin }
export interface SessionView extends Session { requestCount: number; coldStartMs?: number; endedAt?: string; compressed: boolean }
export interface AdminSession extends SessionView { userName: string; userEmail: string }
export interface HostStatus { host: HostKind; state: 'warm' | 'cold' | 'stopped' | 'starting' | 'running' | 'paused'; lastMs?: number; lastAt?: string; lastCold?: boolean }
export interface ActivityItem { id: string; ts: string; actor: string; text: string; host: HostKind }
export interface Snapshot { asOf: string; customers: Customer[]; contracts: Contract[]; agreements: Agreement[] }
export interface ContactInput { kind: ContactRequest['kind']; name: string; email: string; message: string; turnstileToken?: string }

export { ApiError }

/** Which contract actions the state machine allows from each status. */
export const CONTRACT_TRANSITIONS: Record<ContractStatus, Partial<Record<ContractAction, ContractStatus>>> = {
  PENDING: { approve: 'APPROVED', reject: 'REJECTED', cancel: 'CANCELLED' },
  APPROVED: { activate: 'ACTIVE', cancel: 'CANCELLED' },
  ACTIVE: { settle: 'SETTLED' },
  REJECTED: {},
  SETTLED: {},
  CANCELLED: {},
}

export const WINDOW_MINUTES = 15
const WINDOW_MS = WINDOW_MINUTES * 60_000
/** The mock plays the cluster cold start in 40 s. The `ms` values keep the real size. */
export const COMPRESSED_START_MS = 40_000
const FUNCTION_IDLE_MS = 10 * 60_000
const STOP_MS = 15_000

// [stage, compressed start (s), compressed end (s), real duration (ms), detail]
const START_PLAN: Array<[string, number, number, number, string]> = [
  ['request', 0, 0.4, 42, 'POST /gateway/sessions'],
  ['edge', 0.4, 0.9, 31, 'Cloudflare edge: WAF rules passed, rate limit ok'],
  ['gateway', 0.9, 1.5, 118, 'gateway function accepted the request'],
  ['identity', 1.5, 2.1, 84, 'Entra ID token is valid'],
  ['quota', 2.1, 2.6, 27, 'access window granted, budget ok'],
  ['keyvault', 2.6, 3.2, 141, 'gateway secrets read from Key Vault'],
  // Measured on 2026-11-17 (stopped cluster to first answer, 7 min 13 s): control plane 4 min 26 s,
  // node 2 min 13 s, Spring Boot and database 26 s, load balancer 8 s. The 40 s play keeps these proportions.
  ['arm-start', 3.2, 4.4, 12_400, 'Resource Manager accepted "start cluster"'],
  ['control-plane', 4.4, 26.4, 253_600, 'Kubernetes API server answers'],
  ['node', 26.4, 34.6, 111_900, 'node aks-system-31807245-vmss000000 Ready'],
  ['image-pull', 34.6, 35.9, 17_800, 'pulled consignado-api:1.4.2 from the registry'],
  ['secrets-mount', 35.9, 36.3, 3_300, 'CSI driver mounted the database password'],
  ['container-start', 36.3, 37.6, 17_400, 'Spring Boot started in 16.9 s'],
  ['database', 37.6, 38, 2_900, 'Flyway: schema is up to date, pool of 5 connections'],
  ['readiness', 38, 38.6, 5_700, 'pod consignado-api-7d9f8c-x2kqp Ready (2/2)'],
  ['load-balancer', 38.6, 39.6, 7_700, 'internal Load Balancer probe is healthy'],
  ['first-response', 39.6, 40, 300, 'GET /api/v1/agreements answered 200'],
]
const REAL_COLD_START_MS = START_PLAN.reduce((sum, p) => sum + p[3], 0)

// ---- deterministic random for the seed ----------------------------------------
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = (min: number, max: number) => Math.round(min + Math.random() * (max - min))
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const iso = (ms: number) => new Date(ms).toISOString()
const round2 = (n: number) => Math.round(n * 100) / 100

const FIRST = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elaine', 'Fábio', 'Gabriela', 'Heitor', 'Isabela', 'João', 'Karina', 'Leandro', 'Marina', 'Nelson', 'Olívia', 'Paulo', 'Renata', 'Sérgio', 'Tatiane', 'Vinícius', 'Yara', 'Wagner', 'Lúcia', 'Rafael', 'Simone', 'Túlio']
const LAST = ['Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Farias', 'Gouveia', 'Honorato', 'Lacerda', 'Macedo', 'Nogueira', 'Pacheco', 'Queiroz', 'Rezende', 'Sampaio', 'Teixeira', 'Valadares', 'Xavier', 'Moraes', 'Bittencourt']

export function randomCpfMasked(r: () => number = Math.random): string {
  return `***.***.***-${String(Math.floor(r() * 100)).padStart(2, '0')}`
}
export function randomCustomerInput(agreements: Agreement[]): CustomerInput {
  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
  return {
    agreementId: pick(agreements).id,
    name: `${pick(FIRST)} ${pick(LAST)} ${pick(LAST)}`,
    cpf: formatCpf(cpfForApi('***.***.***-**')),
    monthlyIncome: rnd(18, 140) * 100,
  }
}

export function installmentOf(principal: number, monthlyRate: number, months: number): number {
  if (monthlyRate <= 0) return round2(principal / months)
  const f = Math.pow(1 + monthlyRate, months)
  return round2((principal * monthlyRate * f) / (f - 1))
}

// ---- state ----------------------------------------------------------------------
interface SessionRec { id: string; userId: string; requestedAt: number; endedAt?: number; requestCount: number; coldStartMs: number; /** The owner's window length when it started. Old records: WINDOW_MS. */ windowMs?: number }
interface Db {
  v: number
  seq: number
  agreements: Agreement[]
  customers: Customer[]
  simulations: Simulation[]
  contracts: Contract[]
  users: AdminUser[]
  sessions: SessionRec[]
  paused: boolean
  pausedReason?: 'budget' | 'admin'
  budget: { limit: number; spent: number; currency: string }
  contacts: ContactRequest[]
  activity: ActivityItem[]
  functionsLastAt: number
  last: Partial<Record<HostKind, { ms: number; at: number; cold: boolean }>>
}

const DB_KEY = 'consignado.mock.v3'
const PERSONA_USER: Record<Exclude<PersonaId, 'guest'>, string> = {
  recruiter: 'u-1042', 'recruiter-new': 'u-1057', 'recruiter-held': 'u-1049', 'recruiter-spent': 'u-1038', admin: 'u-1000',
}

function seed(): Db {
  const r = mulberry32(20261117)
  const now = Date.now()
  const day = 86_400_000
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  const agreements: Agreement[] = [
    { id: 'agr-01', code: 'INSS', name: 'INSS retirees and pensioners', maxMarginPercent: 35, maxTermMonths: 84, monthlyInterestRate: 0.0166, createdAt: iso(now - 210 * day) },
    { id: 'agr-02', code: 'SIAPE', name: 'Federal civil servants', maxMarginPercent: 35, maxTermMonths: 96, monthlyInterestRate: 0.0172, createdAt: iso(now - 205 * day) },
    { id: 'agr-03', code: 'GOV-SP', name: 'State of São Paulo servants', maxMarginPercent: 30, maxTermMonths: 96, monthlyInterestRate: 0.0189, createdAt: iso(now - 160 * day) },
    { id: 'agr-04', code: 'PRIV-CLT', name: 'Private payroll (CLT)', maxMarginPercent: 30, maxTermMonths: 48, monthlyInterestRate: 0.0249, createdAt: iso(now - 90 * day) },
  ]
  const customers: Customer[] = []
  for (let i = 0; i < 52; i++) {
    customers.push({
      id: `cus-${String(1001 + i)}`,
      agreementId: pick(agreements).id,
      name: `${pick(FIRST)} ${pick(LAST)} ${pick(LAST)}`,
      cpf: randomCpfMasked(r),
      monthlyIncome: Math.round(1800 + r() * 12_000),
      createdAt: iso(now - Math.floor(r() * 150 * day) - 3_600_000),
    })
  }
  const statuses: ContractStatus[] = ['PENDING', 'PENDING', 'PENDING', 'APPROVED', 'APPROVED', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'SETTLED', 'SETTLED', 'REJECTED', 'CANCELLED']
  const simulations: Simulation[] = []
  const contracts: Contract[] = []
  for (let i = 0; i < 31; i++) {
    const customer = customers[Math.floor(r() * customers.length)]
    const agreement = agreements.find((a) => a.id === customer.agreementId)!
    const limit = (customer.monthlyIncome * agreement.maxMarginPercent) / 100
    const termMonths = pick([12, 24, 36, 48, 60, 72, 84].filter((m) => m <= agreement.maxTermMonths))
    const targetInstallment = limit * (0.12 + r() * 0.2)
    const f = Math.pow(1 + agreement.monthlyInterestRate, termMonths)
    const principal = Math.round((targetInstallment * (f - 1)) / (agreement.monthlyInterestRate * f) / 100) * 100
    const installment = installmentOf(principal, agreement.monthlyInterestRate, termMonths)
    const createdAt = now - Math.floor(r() * 60 * day) - 7_200_000
    const simId = `sim-${String(5001 + i)}`
    simulations.push({ id: simId, customerId: customer.id, principal, termMonths, installment, totalAmount: round2(installment * termMonths), monthlyInterestRate: agreement.monthlyInterestRate, expiresAt: iso(createdAt + 2 * day) })
    contracts.push({ id: `ctr-${String(8001 + i)}`, customerId: customer.id, simulationId: simId, status: pick(statuses), principal, termMonths, installment, createdAt: iso(createdAt) })
  }
  // A few open simulations with no contract yet.
  for (let i = 0; i < 6; i++) {
    const customer = customers[i * 7]
    const agreement = agreements.find((a) => a.id === customer.agreementId)!
    const termMonths = pick([24, 36, 48])
    const principal = Math.round((customer.monthlyIncome * (1.5 + r() * 2)) / 100) * 100
    const installment = installmentOf(principal, agreement.monthlyInterestRate, termMonths)
    simulations.push({ id: `sim-${String(5040 + i)}`, customerId: customer.id, principal, termMonths, installment, totalAmount: round2(installment * termMonths), monthlyInterestRate: agreement.monthlyInterestRate, expiresAt: iso(now + (1 + i) * 6 * 3_600_000) })
  }
  const user = (id: string, name: string, email: string, company: string, over: Partial<AdminUser> = {}): AdminUser => ({
    id, email, name, role: 'user', profileComplete: true, status: 'active', windowsUsed: 0, windowsMax: 3, company,
    linkedin: `https://www.linkedin.com/in/${name.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(/ /g, '-')}-demo`,
    createdAt: iso(now - Math.floor(r() * 40 * day) - day), lastSeenAt: iso(now - Math.floor(r() * 6 * day) - 600_000), flags: [], ...over,
  })
  const users: AdminUser[] = [
    user('u-1000', 'Kaique Souza', 'owner@consignado.example', 'Consignado Cloud', { role: 'admin', windowsMax: 99, windowsUsed: 7, lastSeenAt: iso(now - 120_000) }),
    user('u-1042', 'Helena Prado', 'helena.prado@talentbridge.example', 'TalentBridge Recruiting', { windowsUsed: 1, lastSeenAt: iso(now - 300_000) }),
    user('u-1057', '', 'marcos.vidal@northwind.example', '', { profileComplete: false, linkedin: '', lastSeenAt: iso(now - 60_000), createdAt: iso(now - 60_000) }),
    user('u-1049', 'Helena Prado', 'h.prado.2@mailbox-temp.example', 'TalentBridge', { status: 'held', flags: ['same-device', 'disposable-email'], lastSeenAt: iso(now - 2_400_000) }),
    user('u-1038', 'Otávio Lins', 'otavio.lins@corebank.example', 'CoreBank Engineering', { windowsUsed: 3, lastSeenAt: iso(now - 5_400_000) }),
    user('u-1031', 'Priya Raman', 'priya.raman@fintechhire.example', 'FintechHire', { windowsUsed: 2 }),
    user('u-1033', 'Daniel Okafor', 'd.okafor@cloudscale.example', 'CloudScale Labs', { windowsUsed: 1 }),
    user('u-1036', 'Camila Ferraz', 'camila.ferraz@bancoaurora.example', 'Banco Aurora', { windowsUsed: 3, windowsMax: 5 }),
    user('u-1044', 'Tomás Rivas', 'tomas.rivas@stackforge.example', 'StackForge', {}),
    user('u-1046', 'Julia Wendt', 'julia.wendt@payrollworks.example', 'PayrollWorks', { windowsUsed: 1, flags: ['same-ip'] }),
    user('u-1051', 'R. Test', 'rt-8841@inbox-drop.example', 'n/a', { status: 'blocked', flags: ['disposable-email', 'same-ip'], windowsUsed: 3 }),
    user('u-1053', 'Sofia Marques', 'sofia.marques@lumenrh.example', 'Lumen RH', { windowsUsed: 2 }),
    user('u-1055', 'Ethan Brooks', 'ethan.brooks@harborsearch.example', 'Harbor Search', { status: 'held', flags: ['same-ip'] }),
  ]
  const sessions: SessionRec[] = []
  const sessionUsers = ['u-1042', 'u-1031', 'u-1031', 'u-1033', 'u-1036', 'u-1036', 'u-1036', 'u-1046', 'u-1053', 'u-1053', 'u-1038', 'u-1038', 'u-1038', 'u-1000']
  sessionUsers.forEach((userId, i) => {
    const requestedAt = now - (i + 1) * 1.7 * day - Math.floor(r() * 5 * 3_600_000)
    const early = r() < 0.3
    sessions.push({
      id: Math.floor(r() * 0xffffffff).toString(16).padStart(8, '0') + Math.floor(r() * 0xff).toString(16).padStart(2, '0'),
      userId, requestedAt, requestCount: Math.floor(4 + r() * 38), coldStartMs: Math.round(415_000 + r() * 40_000),
      endedAt: requestedAt + COMPRESSED_START_MS + (early ? Math.floor(WINDOW_MS * (0.3 + r() * 0.5)) : WINDOW_MS),
    })
  })
  const contacts: ContactRequest[] = [
    { id: 'req-0007', kind: 'more-windows', name: 'Otávio Lins', email: 'otavio.lins@corebank.example', message: 'I want to show the cluster start to two colleagues of the platform team on Thursday.', createdAt: iso(now - 5 * 3_600_000) },
    { id: 'req-0006', kind: 'contact', name: 'Priya Raman', email: 'priya.raman@fintechhire.example', message: 'We have a senior backend opening (Java, Azure). Can we talk this week?', createdAt: iso(now - 26 * 3_600_000) },
    { id: 'req-0005', kind: 'contact', name: 'Daniel Okafor', email: 'd.okafor@cloudscale.example', message: 'How do you keep the AKS cost so low? I would like to read the Terraform.', createdAt: iso(now - 3 * day) },
    { id: 'req-0004', kind: 'more-windows', name: 'Camila Ferraz', email: 'camila.ferraz@bancoaurora.example', message: 'Second interview round. The panel wants to see the live window again.', createdAt: iso(now - 6 * day) },
  ]
  const names = ['Helena Prado', 'Priya Raman', 'Daniel Okafor', 'Camila Ferraz', 'Julia Wendt', 'Sofia Marques']
  const activity: ActivityItem[] = contracts.slice(0, 9).map((c, i) => ({
    id: `act-${i}`, ts: iso(now - (i + 1) * 47 * 60_000 - Math.floor(r() * 900_000)), actor: pick(names),
    text: [`created contract ${c.id}`, `approved contract ${c.id}`, `ran a simulation for ${c.customerId}`, `changed the income of ${c.customerId}`, `activated contract ${c.id}`][i % 5],
    host: i % 4 === 2 ? 'aks' : 'functions',
  }))
  return {
    v: 4, seq: 100, agreements, customers, simulations, contracts, users, sessions, paused: false,
    budget: { limit: BUDGET_BRL, spent: 128.7, currency: 'BRL' }, contacts, activity, functionsLastAt: 0, last: {},
  }
}

function load(): Db {
  try {
    const raw = sessionStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed.v === 4) return parsed
    }
  } catch { /* storage is not available: use memory only */ }
  return seed()
}
let db = load()
function persist() {
  try { sessionStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { /* ignore */ }
}

let persona: PersonaId = 'guest'
export function setPersona(next: PersonaId) { persona = next }
export function resetMock() { db = seed(); persist() }

function currentUser(): AdminUser | null {
  if (persona === 'guest') return null
  const id = PERSONA_USER[persona]
  return db.users.find((u) => u.id === id) ?? null
}
function requireUser(): AdminUser {
  const u = currentUser()
  if (!u) throw new ApiError(401, 'Sign in to use this function.')
  if (u.status === 'blocked') throw new ApiError(403, 'This account is blocked.')
  return u
}
function requireAdmin(): AdminUser {
  const u = requireUser()
  if (u.role !== 'admin') throw new ApiError(403, 'Only the administrator can do this.')
  return u
}
const nextId = (prefix: string) => `${prefix}-${String(++db.seq + 9000)}`

// ---- sessions and engine ---------------------------------------------------------
function sessionEnd(s: SessionRec): number {
  return s.endedAt ?? s.requestedAt + COMPRESSED_START_MS + (s.windowMs ?? WINDOW_MS)
}
function viewSession(s: SessionRec, now = Date.now()): SessionView {
  const elapsed = (now - s.requestedAt) / 1000
  const readyAtMs = s.requestedAt + COMPRESSED_START_MS
  const endMs = sessionEnd(s)
  const ended = now >= endMs
  const endedDuringStart = endMs < readyAtMs
  const events: LifecycleEvent[] = []
  const limit = ended ? (endMs - s.requestedAt) / 1000 : elapsed
  for (const [stage, from, to, realMs, detail] of START_PLAN) {
    if (from > limit) break
    events.push({ ts: iso(s.requestedAt + from * 1000), stage, status: 'active', detail })
    if (to <= limit) events.push({ ts: iso(s.requestedAt + to * 1000), stage, status: 'done', detail, ms: realMs })
  }
  const ready = limit >= COMPRESSED_START_MS / 1000
  if (ready) events.push({ ts: iso(readyAtMs), stage: 'window-open', status: ended ? 'done' : 'active', detail: `${Math.round((s.windowMs ?? WINDOW_MS) / 60_000)}-minute window`, ms: ended ? endMs - readyAtMs : undefined })
  if (ended) {
    events.push({ ts: iso(endMs), stage: 'window-close', status: 'done', detail: s.endedAt && s.endedAt < readyAtMs + (s.windowMs ?? WINDOW_MS) ? 'window ended early' : 'countdown reached zero' })
    const stopped = now >= endMs + STOP_MS
    events.push({ ts: iso(endMs), stage: 'cluster-stop', status: 'active', detail: 'Resource Manager accepted "stop cluster"' })
    if (stopped) events.push({ ts: iso(endMs + STOP_MS), stage: 'cluster-stop', status: 'done', detail: 'cluster stopped, compute cost is zero', ms: 96_000 })
  }
  return {
    id: s.id, userId: s.userId, requestedAt: iso(s.requestedAt),
    state: ended ? 'ended' : ready ? 'ready' : 'starting',
    readyAt: ready && !endedDuringStart ? iso(readyAtMs) : undefined,
    expiresAt: ready && !endedDuringStart ? iso(readyAtMs + (s.windowMs ?? WINDOW_MS)) : undefined,
    events, requestCount: s.requestCount, coldStartMs: ready ? s.coldStartMs : undefined,
    endedAt: ended ? iso(endMs) : undefined, compressed: true,
  }
}
function liveSessions(now = Date.now()) { return db.sessions.filter((s) => now < sessionEnd(s)) }
function engineNow(now = Date.now()): Engine {
  const live = liveSessions(now)
  let state: EngineState = 'stopped'
  let since = db.sessions.reduce((max, s) => Math.max(max, Math.min(sessionEnd(s) + STOP_MS, now)), 0) || now - 3 * 86_400_000
  if (live.length > 0) {
    const anyReady = live.some((s) => now >= s.requestedAt + COMPRESSED_START_MS)
    state = anyReady ? 'running' : 'starting'
    since = anyReady ? Math.min(...live.map((s) => s.requestedAt + COMPRESSED_START_MS)) : Math.min(...live.map((s) => s.requestedAt))
  } else {
    const lastEnd = db.sessions.reduce((max, s) => Math.max(max, sessionEnd(s)), 0)
    if (lastEnd && now < lastEnd + STOP_MS) { state = 'stopping'; since = lastEnd }
    else if (db.paused) { state = 'paused' }
  }
  if (db.paused && state === 'stopped') state = 'paused'
  return { state, since: iso(since), activeSessions: live.length, pausedReason: db.paused ? db.pausedReason ?? 'admin' : undefined, paused: db.paused && state !== 'paused' ? true : undefined }
}
function toMe(u: AdminUser): Me {
  const active = liveSessions().find((s) => s.userId === u.id)
  return {
    id: u.id, email: u.email, name: u.name, role: u.role, profileComplete: u.profileComplete, status: u.status,
    windowsUsed: u.windowsUsed, windowsMax: u.windowsMax, windowMinutes: u.windowMinutes ?? WINDOW_MINUTES, activeSessionId: active?.id,
  }
}

// ---- traces ----------------------------------------------------------------------
// The shape of CONTRACT-ADDENDUM-2: the API host reports its own time and its SQL work (`api` block, stages
// `app` and `database`). One trace in five comes in the OLD shape (an API image without the timing header), so the
// pages are seen with both.
interface Sql { select?: number; insert?: number; update?: number; delete?: number }
interface TraceOptions { label: string; errorAt?: string; errorDetail?: string; staticOnly?: boolean; sql?: Sql; appMs?: [number, number]; dbMs?: [number, number]; old?: boolean }
// The Functions custom handler sets no instance variable: the live API reports "local" there.
const FN_INSTANCE = 'local'
const PODS = ['consignado-api-5d897fb475-ffmb4', 'consignado-api-5d897fb475-q8kzn']
/** The commit of the API image in the mock: a real commit of kmadsdev/consignado-api (main). */
const MOCK_BUILD = '594601afdead4aef48db779d327174d5429f19d3'
const OLD_SHAPE_SHARE = 0.2

function sqlDetail(sql: Required<Sql>, n: number): string {
  const kinds = (['select', 'insert', 'update', 'delete'] as const).filter((k) => sql[k] > 0).map((k) => `${sql[k]} ${k}`)
  return `${n} statement${n === 1 ? '' : 's'}: ${kinds.join(', ')}`
}

// The shapes follow reports/gateway3.md (traces made by the real gateway code): `request` and `edge` carry no `ms`
// (the gateway cannot measure them), the stage times add up to `totalMs`, `response` has no `ms` when `app` is there.
type Part = [string, number | undefined, string]
function buildTrace(host: HostKind, opts: TraceOptions): RequestTrace {
  const now = Date.now()
  const parts: Part[] = []
  let cold = false
  const guest = persona === 'guest'
  const old = opts.old ?? Math.random() < OLD_SHAPE_SHARE
  parts.push(['request', undefined, 'browser sent the request'])
  parts.push(['edge', undefined, 'Cloudflare edge: WAF, rate limit'])
  if (opts.staticOnly) {
    parts.push(['gateway', rnd(14, 38), 'gateway function served the masked snapshot'])
    parts.push(['response', rnd(6, 14), '200, masked snapshot from Blob Storage'])
    return finish(host, false, parts, opts, now)
  }
  parts.push(['gateway', host === 'aks' ? rnd(6, 18) : rnd(10, 30), 'gateway work without the calls below'])
  if (!guest) parts.push(['identity', rnd(2, 9), 'Entra ID token verified'])
  if (host === 'aks') parts.push(['quota', undefined, 'access window is open'])
  if (host === 'aks') parts.push(['keyvault', 0, 'not needed for this host'])
  else {
    const fromCache = Math.random() < 0.85
    parts.push(['keyvault', fromCache ? 0 : rnd(18, 42), fromCache ? 'cached' : 'secret read from Key Vault'])
  }
  if (host === 'functions') {
    cold = now - db.functionsLastAt > FUNCTION_IDLE_MS
    db.functionsLastAt = now
  }
  const sql: Required<Sql> = { select: 0, insert: 0, update: 0, delete: 0, ...opts.sql }
  const statements = sql.select + sql.insert + sql.update + sql.delete
  const dbMs = statements === 0 ? 0 : opts.dbMs ? rnd(opts.dbMs[0], opts.dbMs[1]) : Math.round(statements * (9 + Math.random() * 11))
  const ownMs = opts.appMs ? rnd(opts.appMs[0], opts.appMs[1]) : rnd(3, 14)
  const appMs = Math.round((ownMs + dbMs) * 10) / 10
  const hop = host === 'aks' ? rnd(18, 40) : rnd(25, 50)
  const coldMs = cold ? rnd(16800, 21700) : 0
  const instance = host === 'aks' ? PODS[Math.random() < 0.5 ? 0 : 1] : FN_INSTANCE
  const status = opts.errorAt ? 0 : 200
  if (old) {
    // An API image without the timing header: the gateway sees only the upstream total, in `response`.
    if (cold) {
      parts.push(['function-cold-start', coldMs, 'cold block: instance allocation and JVM start, measured together'])
      parts.push(['jvm-start', undefined, 'inside the cold block of function-cold-start'])
    }
    if (host === 'aks') parts.push(['load-balancer', undefined, 'internal load balancer to pod, and the way back'])
    parts.push(['response', hop + Math.round(appMs), `HTTP ${status || 200} from the API host`])
    return finish(host, cold, parts, opts, now)
  }
  if (cold) {
    parts.push(['function-cold-start', coldMs + hop, 'cold block: instance allocation and JVM start, measured together'])
    parts.push(['jvm-start', undefined, 'inside the cold block of function-cold-start'])
    parts.push(['functions-host', undefined, 'inside the cold block of function-cold-start'])
  } else {
    parts.push([host === 'aks' ? 'load-balancer' : 'functions-host', hop, host === 'aks' ? 'internal load balancer to pod, and the way back' : 'Functions host: network, host routing and the way back'])
  }
  parts.push(['app', ownMs, `Spring Boot handled the request in ${instance}`])
  if (statements > 0) parts.push(['database', dbMs, sqlDetail(sql, statements)])
  parts.push(['response', undefined, 'HTTP 200 from the API host'])
  const trace = finish(host, cold, parts, opts, now)
  trace.api = {
    instance, appMs,
    db: statements === 0 ? null : { ms: dbMs, statements, ...sql, other: 0, connectionMs: Math.round((0.2 + Math.random() * 1.6) * 10) / 10, transactions: sql.insert + sql.update + sql.delete > 0 ? 1 : 0 },
  }
  return trace
}
function finish(host: HostKind, cold: boolean, parts: Part[], opts: TraceOptions, now: number): RequestTrace {
  const events: LifecycleEvent[] = []
  let total = 0
  for (const [stage, ms, detail] of parts) {
    const failed = opts.errorAt === stage
    const e: LifecycleEvent = { ts: iso(now), stage, status: failed ? 'error' : 'done', detail: failed ? opts.errorDetail ?? 'failed' : detail }
    if (ms !== undefined) e.ms = ms
    events.push(e)
    total += ms ?? 0
    if (failed) break
  }
  return { host, cold, totalMs: total, events, status: 200 }
}
/** The ready window of the signed-in user. The gateway answers 403 `no-session` when there is none. */
function openWindowOfUser(): SessionRec {
  const u = requireUser()
  const now = Date.now()
  const s = liveSessions(now).find((x) => x.userId === u.id && now >= x.requestedAt + COMPRESSED_START_MS)
  if (!s) throw new ApiError(403, 'This access window has ended.', undefined, 'no-session')
  return s
}
function record(trace: RequestTrace) {
  db.last[trace.host] = { ms: trace.totalMs, at: Date.now(), cold: trace.cold }
}
function checkHost(host: HostKind): SessionRec | null {
  const u = requireUser()
  if (!u.profileComplete) throw new ApiError(403, 'Complete your profile first.')
  if (host === 'functions') return null
  const now = Date.now()
  const s = liveSessions(now).find((x) => x.userId === u.id && now >= x.requestedAt + COMPRESSED_START_MS)
  if (!s) throw new ApiError(409, 'The Kubernetes host is not running for you. Start a 15-minute window first.')
  return s
}
/** Runs one domain call on a host: waits the traced time, then applies `fn`. */
async function call<T>(host: HostKind, shortLabel: string, fn: () => T, opts: Partial<TraceOptions> = {}): Promise<ApiResult<T>> {
  const label = shortLabel.replace(' /api/v1', ` /api/${host === 'functions' ? 'fn' : 'aks'}/api/v1`)
  const session = checkHost(host)
  const trace = buildTrace(host, { label, ...opts })
  await sleep(trace.totalMs + rnd(18, 60)) // the edge and the internet path: the browser sees more than the gateway
  if (session) session.requestCount += 1
  record(trace)
  if (/^POST \/api\/v1\/(customers|simulations|contracts)$/.test(shortLabel)) trace.status = 201
  let data: T
  try {
    data = fn()
  } catch (err) {
    if (err instanceof ApiError) {
      const last = trace.events[trace.events.length - 1]
      last.status = 'error'
      last.detail = `${err.status}: ${err.message}`
      trace.status = err.status
      err.trace = trace
      err.label = label
    }
    persist()
    throw err
  }
  persist()
  return { data, trace, label }
}
function requireWriter() {
  const u = requireUser()
  if (u.status !== 'active') throw new ApiError(403, 'Your account is on hold. You can read, but not write.')
  return u
}
function log(text: string, host: HostKind) {
  const u = currentUser()
  db.activity.unshift({ id: nextId('act'), ts: iso(Date.now()), actor: u?.name || 'A recruiter', text, host })
  db.activity = db.activity.slice(0, 30)
}
function marginOf(customerId: string): Margin {
  const customer = db.customers.find((c) => c.id === customerId)
  if (!customer) throw new ApiError(404, `Customer ${customerId} does not exist.`)
  const agreement = db.agreements.find((a) => a.id === customer.agreementId)!
  const marginLimit = round2((customer.monthlyIncome * agreement.maxMarginPercent) / 100)
  const committed = round2(db.contracts.filter((c) => c.customerId === customerId && (c.status === 'PENDING' || c.status === 'APPROVED' || c.status === 'ACTIVE')).reduce((sum, c) => sum + c.installment, 0))
  return { customerId, monthlyIncome: customer.monthlyIncome, marginLimit, committed, available: round2(marginLimit - committed) }
}

// ---- gateway calls (no domain trace) ------------------------------------------------
export async function getMe(): Promise<Me | null> {
  await sleep(rnd(60, 140))
  const u = currentUser()
  return u ? toMe(u) : null
}
export async function saveProfile(p: Profile, _extra?: { turnstileToken?: string }): Promise<Me> {
  await sleep(rnd(180, 320))
  const u = requireUser()
  if (!p.consent) throw new ApiError(422, 'Consent is necessary.')
  u.name = p.name.trim(); u.company = p.company.trim(); u.linkedin = p.linkedin.trim(); u.profileComplete = true
  persist()
  return toMe(u)
}
export async function getEngine(): Promise<Engine> {
  await sleep(rnd(40, 110))
  return engineNow()
}
export async function getHosts(): Promise<HostStatus[]> {
  await sleep(rnd(40, 110))
  const now = Date.now()
  const engine = engineNow(now)
  const f = db.last.functions
  const a = db.last.aks
  return [
    { host: 'functions', state: now - db.functionsLastAt > FUNCTION_IDLE_MS ? 'cold' : 'warm', lastMs: f?.ms, lastAt: f ? iso(f.at) : undefined, lastCold: f?.cold },
    { host: 'aks', state: engine.state === 'running' ? 'running' : engine.state === 'starting' ? 'starting' : engine.state === 'paused' ? 'paused' : 'stopped', lastMs: a?.ms, lastAt: a ? iso(a.at) : undefined, lastCold: false },
  ]
}
export async function getActivity(): Promise<ActivityItem[]> {
  await sleep(rnd(60, 140))
  return db.activity.slice(0, 12)
}
export async function startSession(): Promise<Session> {
  await sleep(rnd(220, 420))
  const u = requireUser()
  if (!u.profileComplete) throw new ApiError(403, 'Complete your profile first.')
  if (u.status !== 'active') throw new ApiError(403, 'Your account is on hold. The owner must approve it first.')
  if (db.paused) throw new ApiError(503, 'The engine is paused. No new window can start now.')
  const live = liveSessions().find((s) => s.userId === u.id)
  if (live) return viewSession(live)
  if (u.windowsUsed >= u.windowsMax) throw new ApiError(429, 'You have no access window left.')
  const id = Array.from({ length: 10 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  const rec: SessionRec = { id, userId: u.id, requestedAt: Date.now(), requestCount: 0, coldStartMs: REAL_COLD_START_MS, windowMs: (u.windowMinutes ?? WINDOW_MINUTES) * 60_000 }
  db.sessions.unshift(rec)
  u.windowsUsed += 1
  db.budget.spent = round2(db.budget.spent + WINDOW_COST_USD * BRL_PER_USD)
  persist()
  return viewSession(rec)
}
export async function getSession(id: string): Promise<SessionView> {
  await sleep(rnd(30, 70))
  const rec = db.sessions.find((s) => s.id === id)
  if (!rec) throw new ApiError(404, 'This access window does not exist.')
  const u = currentUser()
  if (!u) throw new ApiError(401, 'Sign in to open an access window.')
  if (rec.userId !== u.id && u.role !== 'admin') throw new ApiError(403, 'This access window belongs to another account.')
  return viewSession(rec)
}
export async function endSession(id: string): Promise<SessionView> {
  await sleep(rnd(150, 300))
  const rec = db.sessions.find((s) => s.id === id)
  if (!rec) throw new ApiError(404, 'This access window does not exist.')
  if (Date.now() < sessionEnd(rec)) rec.endedAt = Date.now()
  persist()
  return viewSession(rec)
}
export async function listMySessions(): Promise<SessionView[]> {
  await sleep(rnd(60, 140))
  const u = requireUser()
  return db.sessions.filter((s) => s.userId === u.id).sort((a, b) => b.requestedAt - a.requestedAt).map((s) => viewSession(s))
}
export async function sendContact(input: ContactInput): Promise<ContactRequest> {
  await sleep(rnd(250, 480))
  const req: ContactRequest = { id: `req-${String(++db.seq).padStart(4, '0')}`, kind: input.kind, name: input.name, email: input.email, message: input.message, createdAt: iso(Date.now()), userId: currentUser()?.id ?? null }
  db.contacts.unshift(req)
  persist()
  return req
}

// ---- domain calls ---------------------------------------------------------------------
export function listAgreements(host: HostKind) {
  return call(host, 'GET /api/v1/agreements', () => [...db.agreements], { sql: { select: 1 }, dbMs: [20, 40] })
}
export function listCustomers(host: HostKind) {
  return call(host, 'GET /api/v1/customers', () => [...db.customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), { sql: { select: 2 }, dbMs: [24, 52] })
}
export function listSimulations(host: HostKind) {
  return call(host, 'GET /api/v1/simulations', () => [...db.simulations].sort((a, b) => b.id.localeCompare(a.id)), { sql: { select: 2 }, dbMs: [24, 52] })
}
export async function listContracts(host: HostKind) {
  const res = await call(host, 'GET /api/v1/contracts', () => [...db.contracts].map(withEtag).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), { sql: { select: 2 }, dbMs: [24, 56] })
  for (const c of res.data) rememberEtag(host, c.id, null, c.etag)
  return res
}
export function createCustomer(host: HostKind, input: CustomerInput) {
  return call(host, 'POST /api/v1/customers', () => {
    requireWriter()
    if (!db.agreements.some((a) => a.id === input.agreementId)) throw new ApiError(422, 'The agreement does not exist.')
    if (input.name.trim().length < 3) throw new ApiError(422, 'The name is too short.')
    if (!(input.monthlyIncome > 0)) throw new ApiError(422, 'The monthly income must be more than zero.')
    const customer: Customer = { id: nextId('cus'), agreementId: input.agreementId, name: input.name.trim(), cpf: maskCpf(input.cpf), monthlyIncome: round2(input.monthlyIncome), createdAt: iso(Date.now()) }
    db.customers.push(customer)
    log(`added customer ${customer.id}`, host)
    return customer
  }, { sql: { select: 2, insert: 1 }, dbMs: [34, 70] })
}
export function changeIncome(host: HostKind, id: string, income: number) {
  return call<IncomeResult>(host, `PATCH /api/v1/customers/${id}/income`, () => {
    requireWriter()
    const customer = db.customers.find((c) => c.id === id)
    if (!customer) throw new ApiError(404, `Customer ${id} does not exist.`)
    if (!(income > 0)) throw new ApiError(422, 'The monthly income must be more than zero.')
    customer.monthlyIncome = round2(income)
    log(`changed the income of ${id}`, host)
    return { customer: { ...customer }, margin: marginOf(id) }
  }, { sql: { select: 2, update: 1, insert: 1 }, dbMs: [40, 80] })
}
export function getMargin(host: HostKind, id: string) {
  return call(host, `GET /api/v1/customers/${id}/margin`, () => marginOf(id), { sql: { select: 2 }, dbMs: [22, 50] })
}
export function simulate(host: HostKind, input: SimulationInput) {
  return call<SimulationResult>(host, 'POST /api/v1/simulations', () => {
    requireWriter()
    const customer = db.customers.find((c) => c.id === input.customerId)
    if (!customer) throw new ApiError(404, `Customer ${input.customerId} does not exist.`)
    const agreement = db.agreements.find((a) => a.id === customer.agreementId)!
    if (!(input.principal >= 500)) throw new ApiError(422, 'The amount must be R$ 500,00 or more.')
    if (!Number.isInteger(input.termMonths) || input.termMonths < 6 || input.termMonths > agreement.maxTermMonths) throw new ApiError(422, `The term must be 6 to ${agreement.maxTermMonths} months for ${agreement.code}.`)
    const installment = installmentOf(input.principal, agreement.monthlyInterestRate, input.termMonths)
    const simulation: Simulation = { id: nextId('sim'), customerId: customer.id, principal: round2(input.principal), termMonths: input.termMonths, installment, totalAmount: round2(installment * input.termMonths), monthlyInterestRate: agreement.monthlyInterestRate, expiresAt: iso(Date.now() + 2 * 86_400_000) }
    db.simulations.push(simulation)
    const margin = marginOf(customer.id)
    log(`ran a simulation for ${customer.id}`, host)
    return { simulation, margin, fitsMargin: installment <= margin.available }
  }, { sql: { select: 3, insert: 1 }, dbMs: [40, 84] })
}
export function createContract(host: HostKind, simulationId: string) {
  return call(host, 'POST /api/v1/contracts', () => {
    requireWriter()
    const simulation = db.simulations.find((s) => s.id === simulationId)
    if (!simulation) throw new ApiError(404, `Simulation ${simulationId} does not exist.`)
    if (db.contracts.some((c) => c.simulationId === simulationId)) throw new ApiError(409, 'This simulation already has a contract.')
    if (new Date(simulation.expiresAt).getTime() < Date.now()) throw new ApiError(422, 'This simulation is expired. Run a new one.')
    const margin = marginOf(simulation.customerId)
    if (simulation.installment > margin.available) throw new ApiError(422, 'The installment is more than the available margin of the customer.')
    const contract: Contract = { id: nextId('ctr'), customerId: simulation.customerId, simulationId, status: 'PENDING', principal: simulation.principal, termMonths: simulation.termMonths, installment: simulation.installment, createdAt: iso(Date.now()) }
    db.contracts.push(contract)
    log(`created contract ${contract.id}`, host)
    return withEtag(contract)
  }, { sql: { select: 3, insert: 2 }, dbMs: [48, 96] }).then((res) => { rememberEtag(host, res.data.id, null, res.data.etag); return res })
}
// The version of a mock contract, like the JPA @Version of the API: 0 at creation, +1 per state change.
// A row saved before this field existed has version 0.
function versionOf(c: Contract): number {
  const n = Number((c.etag ?? '"0"').replace(/"/g, ''))
  return Number.isInteger(n) && n >= 0 ? n : 0
}
function withEtag(c: Contract): Contract {
  return { ...c, etag: `"${versionOf(c)}"` }
}
/** One contract with its ETag, like `GET /api/v1/contracts/{id}`. */
export async function getContract(host: HostKind, id: string): Promise<ApiResult<Contract> & { etag: string | null }> {
  const res = await call(host, `GET /api/v1/contracts/${id}`, () => {
    const contract = db.contracts.find((c) => c.id === id)
    if (!contract) throw new ApiError(404, `Contract ${id} does not exist.`)
    return withEtag(contract)
  }, { sql: { select: 1 }, dbMs: [8, 20] })
  return { ...res, etag: res.data.etag ?? null }
}
const ACTION_PAST: Record<ContractAction, string> = { approve: 'approved', reject: 'rejected', activate: 'activated', settle: 'settled', cancel: 'cancelled' }
/** A state change with `If-Match`, the same flow as real mode (versions.ts). */
export async function contractAction(host: HostKind, id: string, action: ContractAction): Promise<ApiResult<Contract>> {
  const res = await changeWithVersion({ get: getContract, act: postAction, messages: { stale: E.staleVersion, missing: E.versionMissing } }, host, id, action)
  return { data: res.data, trace: res.trace, label: res.label }
}
async function postAction(host: HostKind, id: string, action: ContractAction, ifMatch: string): Promise<ApiResult<Contract> & { etag: string | null }> {
  // Activation writes the installment schedule (two rows per month) and the outbox event: about 4 to 5 s, not a cold start.
  const sqlOpts: Partial<TraceOptions> = action === 'activate'
    ? { sql: { select: 3, insert: 2 * (db.contracts.find((c) => c.id === id)?.termMonths ?? 48) + 2, update: 1 }, dbMs: [3900, 4700], appMs: [120, 260] }
    : { sql: { select: 2, update: 1, insert: 1 }, dbMs: [36, 80] }
  return call(host, `POST /api/v1/contracts/${id}/${action}`, () => {
    requireWriter()
    const contract = db.contracts.find((c) => c.id === id)
    if (!contract) throw new ApiError(404, `Contract ${id} does not exist.`)
    // The gateway rule (428) and the API rule (412), before any change.
    const check = checkIfMatch(versionOf(contract), ifMatch)
    if (check === 'missing') throw new ApiError(428, 'If-Match is required: send the ETag of your last read of this contract', undefined, 'precondition-required')
    if (check === 'stale') throw new ApiError(412, `Contract ${id} changed: version ${versionOf(contract)} is current.`, undefined, 'precondition-failed')
    const next = CONTRACT_TRANSITIONS[contract.status][action]
    if (!next) throw new ApiError(409, `A contract in state ${contract.status} cannot be ${ACTION_PAST[action]}.`)
    contract.status = next
    contract.etag = `"${versionOf(contract) + 1}"`
    log(`${ACTION_PAST[action]} contract ${id}`, host)
    return { ...contract }
  }, sqlOpts).then((res) => ({ ...res, etag: res.data.etag ?? null }))
}

// ---- guest calls (stateless, no database) ------------------------------------------------
export async function previewSimulation(input: PreviewInput, host: HostKind = 'functions'): Promise<ApiResult<PreviewResult>> {
  const bad = !(input.principal >= 500) || !(input.termMonths >= 6 && input.termMonths <= 96) || !(input.monthlyInterestRate > 0 && input.monthlyInterestRate <= 0.05) || !(input.monthlyIncome > 0)
  const label = `POST /api/${host === 'functions' ? 'fn' : 'aks'}/api/v1/simulations/preview`
  const session = host === 'aks' ? openWindowOfUser() : null
  const failAt = bad ? { errorAt: 'response', errorDetail: '422: the values are out of range' } : {}
  const trace = buildTrace(host, { label, ...failAt, ...(host === 'aks' ? { appMs: [4, 12] as [number, number] } : {}) })
  if (bad) { trace.status = 422; trace.api = undefined }
  await sleep(trace.totalMs + rnd(25, 80)) // the edge and the network: the browser sees more than the gateway trace
  if (session) session.requestCount += 1
  record(trace)
  persist()
  if (bad) throw new ApiError(422, 'The values are out of range. Amount from R$ 500,00, term 6 to 96 months, rate up to 5% per month.', trace, undefined, undefined, label)
  const installment = installmentOf(input.principal, input.monthlyInterestRate, input.termMonths)
  const totalAmount = round2(installment * input.termMonths)
  const marginLimit = round2(input.monthlyIncome * 0.35)
  return { data: { installment, totalAmount, totalInterest: round2(totalAmount - input.principal), marginLimit, fitsMargin: installment <= marginLimit }, trace, label }
}
export async function getSnapshot(): Promise<ApiResult<Snapshot>> {
  const label = 'GET /api/snapshot'
  const trace = buildTrace('functions', { label, staticOnly: true })
  await sleep(trace.totalMs)
  const maskName = (name: string) => name.split(' ').map((w) => `${w[0]}${'*'.repeat(Math.max(2, Math.min(5, w.length - 1)))}`).join(' ')
  const customers = db.customers.slice(0, 20).map((c) => ({ ...c, name: maskName(c.name), cpf: '***.***.***-**', monthlyIncome: Math.round(c.monthlyIncome / 100) * 100 }))
  const ids = new Set(customers.map((c) => c.id))
  return { data: { asOf: iso(Date.now() - 37 * 60_000), customers, contracts: db.contracts.filter((c) => ids.has(c.customerId)), agreements: [...db.agreements] }, trace, label }
}

// ---- live service status (GET /api/status) --------------------------------------------------
const STATUS_REGION = 'belgiumcentral'
const DB_REGION = 'northcentralus'
const anyOf = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)]
function metric(key: string, label: string, value: number | null, unit: Metric['unit'], window = 'last 5 min'): Metric { return { key, label, value, unit, window } }
/** Numbers that move a little at each read, and one service `degraded` now and then. */
export async function getStatus(host: HostKind): Promise<PlatformStatus> {
  await sleep(rnd(60, 160))
  if (host === 'aks') requireUser()
  const now = Date.now()
  const engine = engineNow(now).state
  const slowOne = Math.random() < 0.15 ? anyOf(host === 'aks' ? ['keyvault', 'pods', 'database'] : ['keyvault', 'functions', 'database']) : ''
  const lat = (id: string, min: number, max: number) => slowOne === id ? rnd(max * 3, max * 6) : rnd(min, max)
  const st = (id: string): ServiceStatus['state'] => slowOne === id ? 'degraded' : 'up'
  const fnReq = rnd(18, 64)
  const services: ServiceStatus[] = [
    { id: 'edge', name: 'consignado-edge', kind: 'Cloudflare Worker', state: 'up', detail: 'Cloudflare Worker consignado-edge, rate limit 40 requests / 10 s per IP', metrics: [], source: ['gateway'] },
    {
      id: 'gateway', name: 'func-consignado-gw-km01', kind: 'Azure Function (Java)', region: STATUS_REGION, state: 'up', detail: 'Resource health: Available',
      metrics: [metric('requests', 'Requests', fnReq + rnd(10, 40), 'count'), metric('errors', 'HTTP 5xx', 0, 'count'), metric('latency-avg', 'Average response time', rnd(70, 190), 'ms')], source: ['azure-monitor', 'resource-health'],
    },
    { id: 'identity', name: 'Microsoft Entra ID', kind: 'Microsoft Entra ID', state: 'up', detail: `signing keys fetched ${rnd(1, 40)} min ago`, metrics: [], source: ['gateway'] },
    {
      id: 'keyvault', name: 'kv-consig-km01', kind: 'Key Vault', region: STATUS_REGION, state: st('keyvault'),
      detail: slowOne === 'keyvault' ? 'Resource health: Available; latency is higher than usual' : 'Resource health: Available',
      metrics: [metric('requests', 'Service API hits', rnd(4, 20), 'count'), metric('latency-avg', 'Service API latency', lat('keyvault', 9, 28), 'ms'), metric('availability', 'Availability', 100, '%')], source: ['azure-monitor', 'resource-health'],
    },
  ]
  if (host === 'functions') {
    services.push({
      id: 'functions', name: 'func-consignado-api-km01', kind: 'Azure Function (custom handler)', region: STATUS_REGION, state: st('functions'),
      detail: slowOne === 'functions' ? 'Resource health: Available; responses are slower than usual' : 'Resource health: Available',
      metrics: [metric('requests', 'Requests', fnReq, 'count'), metric('errors', 'HTTP 5xx', 0, 'count'), metric('latency-avg', 'Average response time', lat('functions', 90, 240), 'ms'), metric('instances', 'Instances', now - db.functionsLastAt > FUNCTION_IDLE_MS ? 0 : 1, 'count', 'now')],
      source: ['azure-monitor', 'resource-health'],
    })
  } else {
    const running = engine === 'running'
    const starting = engine === 'starting'
    const off: ServiceStatus['state'] = starting ? 'starting' : 'stopped'
    services.push(
      running
        ? { id: 'load-balancer', name: 'kubernetes-internal', kind: 'Internal load balancer', region: STATUS_REGION, state: 'up', detail: 'readiness probe from the gateway answered 200', metrics: [metric('latency-avg', 'Probe latency', rnd(3, 11), 'ms', 'now')], source: ['gateway'] }
        : { id: 'load-balancer', name: 'kubernetes-internal', kind: 'Internal load balancer', region: STATUS_REGION, state: off, detail: starting ? 'no healthy backend yet' : 'no backend: the cluster is stopped', metrics: [], source: ['gateway'] },
      { id: 'cluster', name: 'aks-consignado', kind: 'AKS cluster', region: STATUS_REGION, state: running ? 'up' : off, detail: running ? 'Power state Running, provisioning Succeeded' : starting ? 'Power state Starting' : 'Power state Stopped', metrics: [], source: ['arm'] },
    )
    if (running) {
      const restarts = slowOne === 'pods' ? 1 : 0
      services.push(
        { id: 'node', name: 'aks-system-31415926-vmss000000', kind: 'Node', region: STATUS_REGION, state: 'up', detail: 'Ready, Standard_D2as_v4', metrics: [metric('cpu', 'CPU', rnd(9, 34), '%', 'now'), metric('memory', 'Memory', rnd(41, 63), '%', 'now')], source: ['kubernetes'] },
        { id: 'pods', name: 'consignado-api', kind: 'Pods', region: STATUS_REGION, state: st('pods'), detail: `2 of 2 pods Ready, ${restarts} restart${restarts === 1 ? '' : 's'}, image 1.4.2`, metrics: [metric('replicas', 'Ready pods', 2, 'count', 'now'), metric('restarts', 'Restarts', restarts, 'count', 'now')], source: ['kubernetes'], instances: [...PODS], build: { commit: MOCK_BUILD, repository: 'kmadsdev/consignado-api' } },
      )
    } else {
      services.push(
        { id: 'node', name: 'aks-system-31415926-vmss000000', kind: 'Node', region: STATUS_REGION, state: off, detail: starting ? 'node VM is starting' : 'no node: the cluster is stopped', metrics: [], source: ['kubernetes'] },
        { id: 'pods', name: 'consignado-api', kind: 'Pods', region: STATUS_REGION, state: off, detail: starting ? '0 of 2 pods Ready' : 'no pod: the cluster is stopped', metrics: [metric('replicas', 'Ready pods', 0, 'count', 'now')], source: ['kubernetes'] },
      )
    }
  }
  services.push({
    id: 'database', name: 'psql-consignado-km01', kind: 'PostgreSQL flexible server', region: DB_REGION, state: st('database'),
    detail: slowOne === 'database' ? 'Server state Ready; CPU is higher than usual' : 'Server state Ready',
    metrics: [metric('cpu', 'CPU', slowOne === 'database' ? rnd(78, 92) : rnd(3, 14), '%'), metric('connections', 'Active connections', rnd(4, 12), 'count'), metric('memory', 'Memory', rnd(28, 40), '%')], source: ['azure-monitor', 'arm'],
  })
  return { asOf: iso(now - rnd(1, 9) * 1000), host, services }
}

// ---- admin ---------------------------------------------------------------------------------
export async function adminListUsers(): Promise<AdminUser[]> {
  await sleep(rnd(120, 260)); requireAdmin()
  return db.users.map((u) => ({ ...u, ...toMe(u) }))
}
export async function adminUserAction(id: string, action: AdminUserAction, windows?: number): Promise<AdminUser> {
  await sleep(rnd(180, 340)); requireAdmin()
  const u = db.users.find((x) => x.id === id)
  if (!u) throw new ApiError(404, 'This user does not exist.')
  if (u.role === 'admin' && action !== 'grant-windows') throw new ApiError(409, 'The administrator account cannot be held or blocked.')
  if (action === 'approve') { u.status = 'active'; u.flags = [] }
  if (action === 'hold') u.status = 'held'
  if (action === 'block') u.status = 'blocked'
  if (action === 'grant-windows') u.windowsMax += Math.max(1, Math.min(10, Math.round(windows ?? 1)))
  persist()
  return { ...u }
}
/** Admin action `set`: access windows (0 to 50) and minutes per window (5 to 60). An open window keeps its length. */
export async function adminSetWindowSettings(id: string, settings: { windowsMax?: number; windowMinutes?: number }): Promise<AdminUser> {
  await sleep(rnd(180, 340)); requireAdmin()
  const u = db.users.find((x) => x.id === id)
  if (!u) throw new ApiError(404, 'This user does not exist.')
  const { windowsMax, windowMinutes } = settings
  if (windowsMax !== undefined && !(Number.isInteger(windowsMax) && windowsMax >= 0 && windowsMax <= 50)) throw new ApiError(400, 'Access windows must be a whole number from 0 to 50.')
  if (windowMinutes !== undefined && !(Number.isInteger(windowMinutes) && windowMinutes >= 5 && windowMinutes <= 60)) throw new ApiError(400, 'Minutes per window must be a whole number from 5 to 60.')
  if (windowsMax !== undefined) u.windowsMax = windowsMax
  if (windowMinutes !== undefined) u.windowMinutes = windowMinutes
  persist()
  return { ...u, ...toMe(u) }
}
export async function adminListSessions(): Promise<AdminSession[]> {
  await sleep(rnd(120, 260)); requireAdmin()
  return [...db.sessions].sort((a, b) => b.requestedAt - a.requestedAt).map((s) => {
    const u = db.users.find((x) => x.id === s.userId)
    return { ...viewSession(s), requests: s.requestCount, userName: u?.name || '(profile not complete)', userEmail: u?.email ?? '' }
  })
}
export async function adminGetState(): Promise<AdminState> {
  await sleep(rnd(100, 220)); requireAdmin()
  return { engine: engineNow(), budget: { ...db.budget, asOf: iso(Date.now() - 4 * 3_600_000) }, paused: db.paused }
}
export async function adminSetPaused(paused: boolean): Promise<AdminState> {
  await sleep(rnd(200, 380)); requireAdmin()
  db.paused = paused
  db.pausedReason = paused ? 'admin' : undefined
  persist()
  return { engine: engineNow(), budget: { ...db.budget, asOf: iso(Date.now() - 4 * 3_600_000) }, paused: db.paused }
}
export async function adminStopEngine(): Promise<AdminState> {
  await sleep(rnd(300, 520)); requireAdmin()
  const now = Date.now()
  for (const s of liveSessions(now)) s.endedAt = now
  persist()
  return { engine: engineNow(), budget: { ...db.budget, asOf: iso(Date.now() - 4 * 3_600_000) }, paused: db.paused }
}
/** Admin action `delete`: the user row, the windows and the contact requests. The Entra account stays. */
export async function adminDeleteUser(id: string): Promise<void> {
  await sleep(rnd(200, 380))
  const admin = requireAdmin()
  if (admin.id === id) throw new ApiError(409, 'The administrator cannot delete his own account.', undefined, 'self-delete')
  const u = db.users.find((x) => x.id === id)
  if (!u) throw new ApiError(404, 'This user does not exist.', undefined, 'not-found')
  db.users = db.users.filter((x) => x.id !== id)
  db.sessions = db.sessions.filter((s) => s.userId !== id)
  db.contacts = db.contacts.filter((c) => c.userId !== id && c.email.toLowerCase() !== u.email.toLowerCase())
  persist()
}
export async function adminListContacts(): Promise<ContactRequest[]> {
  await sleep(rnd(120, 260)); requireAdmin()
  return [...db.contacts]
}
