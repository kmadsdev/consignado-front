// CONTRACT: shared types of the consignado platform. Types only. Do not change
// a name here without changing docs/CONTRACT.md in the same commit.

export type Role = 'guest' | 'user' | 'admin'
export type HostKind = 'functions' | 'aks'
export type StageStatus = 'pending' | 'active' | 'done' | 'error'

/** One step of a request or of an engine start, as the gateway reports it. */
export interface LifecycleEvent {
  ts: string // ISO 8601, UTC
  stage: string // one of AKS_STAGES or FUNCTIONS_STAGES
  status: StageStatus
  detail?: string // short, human text: "pod consignado-api-7d9 Ready"
  ms?: number // duration of the stage, when it is known
}

export type EngineState = 'stopped' | 'starting' | 'running' | 'stopping' | 'cooldown' | 'paused'

export interface Engine {
  state: EngineState
  since: string
  activeSessions: number
  pausedReason?: 'budget' | 'admin'
  /** True when the engine is paused while a window is still open (state stays `running`): no new windows. */
  paused?: boolean
}

/** A 15-minute access window to the AKS host. `id` is the <clusterid> of the URL. */
export interface Session {
  id: string
  userId: string
  state: 'starting' | 'ready' | 'ended' | 'failed'
  requestedAt: string
  readyAt?: string // the countdown starts here
  expiresAt?: string // readyAt + 15 min
  events: LifecycleEvent[]
  /** Proxied requests of this window, counted by the gateway. Old gateways do not send it. */
  requests?: number
}

export interface Me {
  id: string
  email: string
  name: string
  role: Role
  profileComplete: boolean
  status: 'active' | 'held' | 'blocked' // held = possible duplicate account, waits for the admin
  windowsUsed: number
  windowsMax: number // 3 by default
  /** Minutes of one access window for this user (5 to 60). Old gateways do not send it: use WINDOW_MINUTES. */
  windowMinutes?: number
  activeSessionId?: string
}

export interface Profile {
  name: string
  company: string
  linkedin: string
  consent: boolean
}

/** Timing of one API call, from the gateway (header x-consignado-trace). */
export interface RequestTrace {
  host: HostKind
  cold: boolean
  totalMs: number
  events: LifecycleEvent[]
  /** Set by the browser client: the HTTP status of the answer that carried this trace. Not sent by the gateway. */
  status?: number
  /** CONTRACT-ADDENDUM-2 section 2: the parsed `X-Consignado-Timing` of the API host. Absent for an old API image. */
  api?: ApiTiming
}
/** What the Spring Boot API says it did for one request (header `X-Consignado-Timing`). No SQL text, no data values. */
export interface ApiTiming {
  instance?: string
  appMs?: number
  db?: DbTiming | null
}
export interface DbTiming {
  ms: number
  statements: number
  select: number
  insert: number
  update: number
  delete: number
  other: number
  connectionMs?: number
  transactions?: number
}

// ---- domain (the Spring Boot API, /api/v1) ---------------------------------
export interface Agreement { id: string; code: string; name: string; maxMarginPercent: number; maxTermMonths: number; monthlyInterestRate: number; createdAt: string }
export interface Customer { id: string; agreementId: string; name: string; cpf: string; monthlyIncome: number; createdAt: string }
export interface Margin { customerId: string; monthlyIncome: number; marginLimit: number; committed: number; available: number }
export interface Simulation { id: string; customerId: string; principal: number; termMonths: number; installment: number; totalAmount: number; monthlyInterestRate: number; expiresAt: string }
export type ContractStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'SETTLED' | 'CANCELLED'
export interface Contract { id: string; customerId: string; simulationId: string; status: ContractStatus; principal: number; termMonths: number; installment: number; createdAt: string }

// ---- admin ------------------------------------------------------------------
export interface AdminUser extends Me { company: string; linkedin: string; createdAt: string; lastSeenAt: string; flags: Array<'same-device' | 'same-ip' | 'disposable-email' | 'same-mailbox'> }
/**
 * The gateway sends the budget in the billing currency of the subscription: {limit, spent, currency, asOf}.
 * limitUsd and spentUsd are the old names of the same numbers (they were never US dollars); a gateway before
 * fix/budget-currency sends only those. Read it with toBudget (map.ts).
 */
export interface ApiBudget { limit?: number; spent?: number; currency?: string; asOf: string; limitUsd?: number; spentUsd?: number }
export interface Budget { limit: number; spent: number; currency: string; asOf: string }
export interface AdminState { engine: Engine; budget: ApiBudget; paused: boolean }
export interface ContactRequest { id: string; kind: 'contact' | 'more-windows'; name: string; email: string; message: string; createdAt: string; /** Entra object id of a signed-in sender; null for a guest. */ userId?: string | null }

// ---- live service status (GET /api/status?host=functions|aks, CONTRACT-ADDENDUM.md) ----------
export interface PlatformStatus {
  asOf: string                // ISO, UTC: when the gateway built this answer
  host: 'functions' | 'aks'
  services: ServiceStatus[]   // in request-path order
  /** The build that answers on this host, when the gateway sends it: the image tag is the commit. */
  build?: string | { commit?: string; sha?: string; image?: string; tag?: string } | null
}
export type ServiceId =
  | 'edge' | 'gateway' | 'identity' | 'keyvault'            // both paths
  | 'functions'                                             // serverless path
  | 'load-balancer' | 'cluster' | 'node' | 'pods'           // Kubernetes path
  | 'database'
export type ServiceState = 'up' | 'degraded' | 'down' | 'stopped' | 'starting' | 'unknown'
export type StatusSource = 'azure-monitor' | 'kubernetes' | 'resource-health' | 'arm' | 'gateway'
export interface ServiceStatus {
  id: ServiceId
  name: string                // the real Azure resource name; for edge and identity a plain name
  kind: string
  region?: string
  state: ServiceState
  detail: string              // one true sentence
  metrics: Metric[]           // may be empty
  source: StatusSource[]
  /** The build that answers (gateway3: on `pods` only): the image tag is the commit. */
  build?: { commit?: string; repository?: string } | null
  /** Pods only, when the gateway sends them: the names of the pods behind the Service. */
  instances?: string[]
}
export interface Metric {
  key: string                 // "requests", "errors", "latency-avg", "latency-p95", "cpu", "memory", "connections", "restarts", "replicas", "instances"
  label: string
  value: number | null        // null = Azure returned no data for the window
  unit: 'count' | 'ms' | '%' | 'MB' | 'rpm'
  window: string              // "last 5 min", "now"
}
