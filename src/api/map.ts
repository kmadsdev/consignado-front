// The ONE mapper between the JSON of the Spring Boot API (/api/v1, field names
// like `fullName`, `netMonthlySalary`, `installmentAmount`) and the frontend
// types of ./types.ts. Both directions: responses and request bodies.
// Pure functions, type-only imports: `node --test` runs this file as it is.
import type { Agreement, Contract, ContractStatus, Customer, HostKind, LifecycleEvent, Margin, RequestTrace, Simulation, StageStatus } from './types'

// ---- the API shapes (application/Views.java, api/Requests.java) ---------------
export interface ApiAgreement { id: string; code: string; name: string; maxMarginPercent: number | string; maxTermMonths: number; monthlyInterestRate: number | string; createdAt: string }
export interface ApiCustomer { id: string; cpf: string; fullName: string; agreementId: string; netMonthlySalary: number | string; createdAt: string }
export interface ApiMargin { customerId: string; netMonthlySalary: number | string; maxMarginPercent: number | string; committedInstallments: number | string; availableMargin: number | string }
export interface ApiSimulation {
  id: string; customerId: string; agreementId: string; principal: number | string; monthlyInterestRate: number | string; termMonths: number
  installmentAmount: number | string; totalPayable: number | string; availableMargin: number | string; createdAt: string; expiresAt: string
}
export interface ApiContract {
  id: string; simulationId: string; customerId: string; status: string; principal: number | string; monthlyInterestRate: number | string; termMonths: number
  installmentAmount: number | string; statusReason?: string | null; version: number; createdAt: string; updatedAt: string
}
export interface ApiPreview {
  principal: number | string; termMonths: number; monthlyInterestRate: number | string
  installment: number | string; totalAmount: number | string; totalInterest: number | string; marginLimit?: number | string; withinMargin?: boolean
}
/** The envelope of every paged listing: `?page=0&size=20` (size 1 to 100). */
export interface ApiPage<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
/** RFC 9457 problem details of the API host, or `{code, message}` of the gateway. */
export interface ApiProblem { code?: string; message?: string; detail?: string; title?: string; errors?: Array<{ field?: string; message?: string }> }

export interface PageInfo { page: number; size: number; totalElements: number; totalPages: number }
export const MAX_PAGE_SIZE = 100

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}
const round2 = (n: number) => Math.round(n * 100) / 100

// ---- responses ------------------------------------------------------------------
export function toAgreement(a: ApiAgreement): Agreement {
  return { id: a.id, code: a.code, name: a.name, maxMarginPercent: num(a.maxMarginPercent), maxTermMonths: a.maxTermMonths, monthlyInterestRate: num(a.monthlyInterestRate), createdAt: a.createdAt }
}
export function toCustomer(c: ApiCustomer): Customer {
  return { id: c.id, agreementId: c.agreementId, name: c.fullName ?? '', cpf: c.cpf ?? '', monthlyIncome: num(c.netMonthlySalary), createdAt: c.createdAt }
}
/** The API gives the committed and the available margin. The limit is their sum. */
export function toMargin(m: ApiMargin): Margin {
  const committed = num(m.committedInstallments)
  const available = num(m.availableMargin)
  return { customerId: m.customerId, monthlyIncome: num(m.netMonthlySalary), marginLimit: round2(committed + available), committed, available }
}
export function toSimulation(s: ApiSimulation): Simulation {
  return {
    id: s.id, customerId: s.customerId, principal: num(s.principal), termMonths: s.termMonths, installment: num(s.installmentAmount),
    totalAmount: num(s.totalPayable), monthlyInterestRate: num(s.monthlyInterestRate), expiresAt: s.expiresAt,
  }
}
const STATUSES: ContractStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'SETTLED', 'CANCELLED']
/** The API calls a new contract PROPOSED. The frontend type calls it PENDING. */
export function toContractStatus(status: string): ContractStatus {
  if (status === 'PROPOSED') return 'PENDING'
  return (STATUSES as string[]).includes(status) ? (status as ContractStatus) : 'PENDING'
}
export function toContract(c: ApiContract): Contract {
  return {
    id: c.id, customerId: c.customerId, simulationId: c.simulationId, status: toContractStatus(c.status), principal: num(c.principal),
    termMonths: c.termMonths, installment: num(c.installmentAmount), createdAt: c.createdAt,
  }
}
export function toPreview(p: ApiPreview): { installment: number; totalAmount: number; totalInterest: number; marginLimit: number; fitsMargin: boolean } {
  return { installment: num(p.installment), totalAmount: num(p.totalAmount), totalInterest: num(p.totalInterest), marginLimit: num(p.marginLimit), fitsMargin: p.withinMargin !== false }
}
/** A paged listing, or a plain array (the snapshot of the gateway holds plain arrays). */
export function toList<A, T>(body: ApiPage<A> | A[] | null | undefined, map: (a: A) => T): { items: T[]; page: PageInfo } {
  if (Array.isArray(body)) return { items: body.map(map), page: { page: 0, size: body.length, totalElements: body.length, totalPages: 1 } }
  const content = Array.isArray(body?.content) ? body.content : []
  return {
    items: content.map(map),
    page: { page: num(body?.page), size: num(body?.size) || content.length, totalElements: num(body?.totalElements) || content.length, totalPages: num(body?.totalPages) || 1 },
  }
}
/** `GET /api/snapshot` keeps the API field names. Names and CPF come masked from the gateway. */
export function toSnapshot(body: { asOf?: string; agreements?: ApiAgreement[]; customers?: ApiCustomer[]; contracts?: ApiContract[] } | null | undefined) {
  return {
    asOf: body?.asOf ?? new Date(0).toISOString(),
    agreements: (body?.agreements ?? []).map(toAgreement),
    // A guest sees the income rounded to the nearest R$ 100, never the exact value.
    customers: (body?.customers ?? []).map(toCustomer).map((c) => ({ ...c, monthlyIncome: Math.round(c.monthlyIncome / 100) * 100 })),
    contracts: (body?.contracts ?? []).map(toContract),
  }
}

// ---- requests -------------------------------------------------------------------
export function pageQuery(page = 0, size = MAX_PAGE_SIZE): string {
  const p = Math.max(0, Math.min(10_000, Math.floor(page)))
  const s = Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(size)))
  return `page=${p}&size=${s}`
}
function checkDigit(digits: number[]): number {
  const weightStart = digits.length + 1
  const sum = digits.reduce((acc, d, i) => acc + d * (weightStart - i), 0)
  const rest = (sum * 10) % 11
  return rest === 10 ? 0 : rest
}
/**
 * The form shows a masked CPF (`***.456.789-**`), because no real document goes into this demo.
 * The API needs 11 digits with correct check digits. This makes a synthetic number: the digits that
 * the form shows stay, the masked ones are random, and the two check digits are calculated.
 */
export function cpfForApi(value: string, random: () => number = Math.random): string {
  const all = value.replace(/\D/g, '')
  if (all.length === 11 && !value.includes('*')) return all
  const base: number[] = []
  for (const ch of value.replace(/[^\d*]/g, '').slice(0, 9).padEnd(9, '*')) {
    base.push(ch === '*' ? Math.floor(random() * 10) % 10 : Number(ch))
  }
  // The API refuses a CPF with 11 equal digits.
  if (base.every((d) => d === base[0])) base[8] = (base[8] + 1) % 10
  const d1 = checkDigit(base)
  const d2 = checkDigit([...base, d1])
  return [...base, d1, d2].join('')
}
/** True for 11 digits with correct check digits (and not 11 equal digits). */
export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11 || value.includes('*') || /^(\d)\1{10}$/.test(digits)) return false
  const d = [...digits].map(Number)
  return checkDigit(d.slice(0, 9)) === d[9] && checkDigit(d.slice(0, 10)) === d[10]
}
/** 11 digits as `000.000.000-00`. Other values come back as they are. */
export function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '')
  return d.length === 11 && !value.includes('*') ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : value
}
/** The mask of the API: only the 2 check digits show (`***.***.***-09`). */
export function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '')
  return d.length === 11 && !value.includes('*') ? `***.***.***-${d.slice(9)}` : value
}
export function customerToApi(input: { agreementId: string; name: string; cpf: string; monthlyIncome: number }, random?: () => number) {
  return { cpf: cpfForApi(input.cpf, random), fullName: input.name.trim(), agreementId: input.agreementId, netMonthlySalary: round2(input.monthlyIncome) }
}
export function incomeToApi(income: number) {
  return { monthlyIncome: round2(income) }
}
export function simulationToApi(input: { customerId: string; principal: number; termMonths: number }) {
  return { customerId: input.customerId, amount: round2(input.principal), termMonths: input.termMonths }
}
export function previewToApi(input: { principal: number; termMonths: number; monthlyInterestRate: number; monthlyIncome?: number }, maxMarginPercent = 35) {
  const body: Record<string, number> = { principal: round2(input.principal), termMonths: input.termMonths, monthlyInterestRate: Math.round(input.monthlyInterestRate * 1e6) / 1e6 }
  // The API wants both margin inputs, or none.
  if (input.monthlyIncome && input.monthlyIncome > 0) { body.monthlyIncome = round2(input.monthlyIncome); body.maxMarginPercent = maxMarginPercent }
  return body
}
export function contractToApi(simulationId: string) {
  return { simulationId }
}

/** A call that is not a cold start but takes longer than this gets the neutral text "slow call". */
export const SLOW_CALL_MS = 3000
const COLD_STAGES = ['function-cold-start', 'jvm-start']
/**
 * Only the Functions host has a cold start. A trace of the Kubernetes host is never cold,
 * and a trace that is not cold has no cold-start stages.
 */
export function normalizeTrace(trace: RequestTrace): RequestTrace {
  const cold = trace.cold === true && trace.host === 'functions'
  return { ...trace, cold, events: cold ? trace.events : trace.events.filter((e) => !COLD_STAGES.includes(e.stage)) }
}
export type Speed = 'cold' | 'slow' | 'warm'
export function speedOf(trace: { host: HostKind; cold: boolean; totalMs: number }): Speed {
  if (trace.cold && trace.host === 'functions') return 'cold'
  return trace.totalMs > SLOW_CALL_MS ? 'slow' : 'warm'
}

// ---- trace header -----------------------------------------------------------------
const STAGE_STATUS: StageStatus[] = ['pending', 'active', 'done', 'error']
function decodeBase64Url(value: string): string {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}
/** Reads the header `x-consignado-trace` (base64url JSON). Null when it is missing or not valid. */
export function parseTrace(header: string | null | undefined, hostHeader?: string | null): RequestTrace | null {
  if (!header) return null
  try {
    const raw = JSON.parse(decodeBase64Url(header.trim())) as Partial<RequestTrace>
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.events)) return null
    const host: HostKind = raw.host === 'aks' || raw.host === 'functions' ? raw.host : hostHeader === 'aks' ? 'aks' : 'functions'
    const events: LifecycleEvent[] = []
    for (const e of raw.events) {
      if (!e || typeof e.stage !== 'string') continue
      const event: LifecycleEvent = { ts: typeof e.ts === 'string' ? e.ts : new Date().toISOString(), stage: e.stage, status: STAGE_STATUS.includes(e.status) ? e.status : 'done' }
      if (typeof e.detail === 'string') event.detail = e.detail
      if (typeof e.ms === 'number' && Number.isFinite(e.ms)) event.ms = e.ms
      events.push(event)
    }
    return normalizeTrace({ host, cold: raw.cold === true, totalMs: num(raw.totalMs), events })
  } catch {
    return null
  }
}
/** The text of an error body: problem details (`detail`) or the gateway shape (`message`). */
export function problemText(body: ApiProblem | null | undefined): string {
  if (!body) return ''
  const fields = (body.errors ?? []).filter((e) => e && e.message).map((e) => (e.field ? `${e.field}: ${e.message}` : String(e.message)))
  if (fields.length > 0) return fields.slice(0, 4).join('; ')
  return body.detail ?? body.message ?? body.title ?? ''
}
