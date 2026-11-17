// The one request store of this browser session, and the helpers that turn an API answer into a record.
import { useSyncExternalStore } from 'react'
import { ApiError } from '../api/errors'
import type { HostKind, RequestTrace } from '../api/types'
import { RequestStore, type CallRecord, type StorageLike } from './store'

function sessionStore(): StorageLike | null {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage } catch { return null }
}

export const requestStore = new RequestStore(sessionStore())

export function useRequests(): CallRecord[] {
  return useSyncExternalStore(requestStore.subscribe, requestStore.get, requestStore.get)
}

export type NewRecord = Omit<CallRecord, 'id'>

/** A record of an answer that came back (2xx). */
export function okRecord(res: { label: string; trace: RequestTrace }, browserMs?: number): NewRecord {
  return { at: Date.now(), label: res.label, host: res.trace.host, ok: true, status: res.trace.status ?? 200, browserMs, trace: res.trace }
}
/** A record of a failed call. Null when the error has no trace (the call never left the browser). */
export function errorRecord(err: unknown, browserMs?: number): NewRecord | null {
  if (!(err instanceof ApiError) || !err.trace) return null
  return {
    at: Date.now(), label: err.label ?? '', host: err.trace.host, ok: false, status: err.status, code: err.code, message: err.message, browserMs, trace: err.trace,
  }
}

/**
 * Runs one API call, measures it in the browser, and adds it to the session store.
 * Gives back the answer (or the error) and the stored record.
 */
export async function tracked<R extends { label: string; trace: RequestTrace }>(fn: () => Promise<R>): Promise<{ res?: R; err?: unknown; record: CallRecord | null }> {
  const started = performance.now()
  try {
    const res = await fn()
    return { res, record: requestStore.add(okRecord(res, Math.round(performance.now() - started))) }
  } catch (err) {
    const rec = errorRecord(err, Math.round(performance.now() - started))
    return { err, record: rec ? requestStore.add(rec) : null }
  }
}

export function hostOfRecord(r: CallRecord): HostKind { return r.trace.host }
