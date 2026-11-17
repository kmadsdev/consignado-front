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
}

// ---- domain (the Spring Boot API, /api/v1) ---------------------------------
export interface Agreement { id: string; code: string; name: string; maxMarginPercent: number; maxTermMonths: number; monthlyInterestRate: number; createdAt: string }
export interface Customer { id: string; agreementId: string; name: string; cpf: string; monthlyIncome: number; createdAt: string }
export interface Margin { customerId: string; monthlyIncome: number; marginLimit: number; committed: number; available: number }
export interface Simulation { id: string; customerId: string; principal: number; termMonths: number; installment: number; totalAmount: number; monthlyInterestRate: number; expiresAt: string }
export type ContractStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'SETTLED' | 'CANCELLED'
export interface Contract { id: string; customerId: string; simulationId: string; status: ContractStatus; principal: number; termMonths: number; installment: number; createdAt: string }

// ---- admin ------------------------------------------------------------------
export interface AdminUser extends Me { company: string; linkedin: string; createdAt: string; lastSeenAt: string; flags: Array<'same-device' | 'same-ip' | 'disposable-email'> }
export interface AdminState { engine: Engine; budget: { limitUsd: number; spentUsd: number; asOf: string }; paused: boolean }
export interface ContactRequest { id: string; kind: 'contact' | 'more-windows'; name: string; email: string; message: string; createdAt: string }
