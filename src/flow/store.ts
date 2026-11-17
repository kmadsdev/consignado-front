// The requests of this browser session, newest first, shared by all pages (the request inspector lists them).
// Kept in sessionStorage so a reload keeps them; cleared on sign-out; at most 200 entries.
// Type-only imports: `node --test` loads this file as it is.
import type { HostKind, RequestTrace } from '../api/types'

export const MAX_RECORDS = 200
const KEY = 'consignado.requests.v1'

/** One finished API call: the trace of the gateway plus what the browser saw. */
export interface CallRecord {
  id: string
  /** Wall clock (ms since 1970) when the answer came. */
  at: number
  /** Method and path: `POST /api/fn/api/v1/customers`. */
  label: string
  host: HostKind
  ok: boolean
  /** HTTP status. 0 = no answer. */
  status?: number
  code?: string
  message?: string
  /** Time the browser measured from send to answer. */
  browserMs?: number
  trace: RequestTrace
}

export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

/** Adds a record in front. Same id = replaced. Keeps at most `max`. */
export function addRecord(list: readonly CallRecord[], record: CallRecord, max = MAX_RECORDS): CallRecord[] {
  return [record, ...list.filter((r) => r.id !== record.id)].slice(0, max)
}

export function splitLabel(label: string): { method: string; path: string } {
  const m = /^([A-Z]+)\s+(\S.*)$/.exec(label.trim())
  return m ? { method: m[1], path: m[2] } : { method: '', path: label }
}

/** A small external store (subscribe / get), for `useSyncExternalStore`. */
export class RequestStore {
  private list: CallRecord[] = []
  private owner = ''
  private listeners = new Set<() => void>()
  private seq = 0
  private readonly storage: StorageLike | null
  private readonly max: number
  constructor(storage: StorageLike | null, max = MAX_RECORDS) {
    this.storage = storage
    this.max = max
    try {
      const raw = storage?.getItem(KEY)
      const parsed = raw ? (JSON.parse(raw) as { owner?: string; list?: CallRecord[] }) : null
      if (parsed && Array.isArray(parsed.list)) { this.list = parsed.list.slice(0, max); this.owner = parsed.owner ?? '' }
    } catch { /* a broken entry is ignored */ }
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  get = (): CallRecord[] => this.list
  find = (id: string | null | undefined): CallRecord | undefined => (id ? this.list.find((r) => r.id === id) : undefined)
  /** Adds one call. Gives it an id when it has none. */
  add(record: Omit<CallRecord, 'id'> & { id?: string }): CallRecord {
    const full: CallRecord = { ...record, id: record.id ?? `r${record.at.toString(36)}${(++this.seq).toString(36)}` }
    this.set(addRecord(this.list, full, this.max))
    return full
  }
  clear() { this.set([]) }
  /** The viewer of these records. A different viewer (sign-out, other account) clears the list. */
  setOwner(owner: string) {
    if (owner === this.owner) return
    this.owner = owner
    this.set([])
  }
  private set(list: CallRecord[]) {
    this.list = list
    try { this.storage?.setItem(KEY, JSON.stringify({ owner: this.owner, list })) } catch { /* storage full or blocked: keep it in memory */ }
    for (const fn of this.listeners) fn()
  }
}
