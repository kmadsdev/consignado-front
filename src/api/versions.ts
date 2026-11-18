// The version check of contract state changes (ADR 0003 of the API, M2 of the panel review).
// The API gives each contract a version: `GET /contracts/{id}` and each state change answer with
// `ETag: "<version>"`, and the rows of a listing carry `version`. A state change sends the ETag of the last
// read as `If-Match`; a stale value gets 412, and the gateway answers 428 when it is missing.
// Pure module (type-only imports): `node --test` runs it as it is. Mock mode and real mode use the same flow.
import type { Contract, HostKind } from './types'
import type { ContractAction } from './mock'
import { ApiError } from './errors.ts'

/** The entity tag of an API version number, as the API writes it (`"3"`). Undefined for anything else. */
export function etagOf(version: unknown): string | undefined {
  return typeof version === 'number' && Number.isInteger(version) && version >= 0 ? `"${version}"` : undefined
}

// The last ETag this browser saw per host and contract. One page of the demo, a few hundred rows at most.
const tags = new Map<string, string>()
const key = (host: HostKind, id: string) => `${host}:${id}`

/** Keeps the ETag of a response header, else the one of the body. Nothing to keep: no change. */
export function rememberEtag(host: HostKind, id: string, header?: string | null, fromBody?: string): void {
  const tag = header && header.trim() ? header.trim() : fromBody
  if (tag) tags.set(key(host, id), tag)
}
export function knownEtag(host: HostKind, id: string): string | undefined {
  return tags.get(key(host, id))
}
/** For the tests. */
export function forgetEtags(): void {
  tags.clear()
}

/** The rule of the API, for mock mode: `ok`, `stale` (412) or `missing` (428, the gateway rule). */
export function checkIfMatch(current: number, ifMatch: string | undefined): 'ok' | 'stale' | 'missing' {
  const value = ifMatch?.trim()
  if (!value || value === '*') return 'missing'
  const n = Number(value.replace(/^W\//, '').replace(/"/g, ''))
  return Number.isInteger(n) && n === current ? 'ok' : 'stale'
}

/** A state change refused because the contract changed (412) or had no version (428). `current` is the new read. */
export class StaleVersionError extends ApiError {
  current?: Contract
  constructor(from: ApiError, message: string, current?: Contract) {
    super(from.status, message, from.trace, 'stale-version', undefined, from.label)
    this.name = 'StaleVersionError'
    this.current = current
  }
}

export interface VersionedResult { data: Contract; etag?: string | null }
export interface VersionDeps<R extends VersionedResult> {
  get: (host: HostKind, id: string) => Promise<R>
  act: (host: HostKind, id: string, action: ContractAction, ifMatch: string) => Promise<R>
  /** The texts of a refused change, in the page language. */
  messages: { stale: string; missing: string }
}

/**
 * One state change with the version check. The ETag comes from the last read of this contract; with no read
 * yet, it reads the contract once. On 412 or 428 it reads the contract again (so the page can show the
 * current state) and throws StaleVersionError with that state and a plain message. The trace and the label
 * stay the ones of the refused call, so the request record shows the 412 like any other answer.
 */
export async function changeWithVersion<R extends VersionedResult>(deps: VersionDeps<R>, host: HostKind, id: string, action: ContractAction): Promise<R> {
  let tag = knownEtag(host, id)
  if (!tag) {
    const read = await deps.get(host, id)
    rememberEtag(host, id, read.etag, read.data.etag)
    tag = knownEtag(host, id)
  }
  try {
    const res = await deps.act(host, id, action, tag ?? '')
    rememberEtag(host, id, res.etag, res.data.etag)
    return res
  } catch (err) {
    if (!(err instanceof ApiError) || (err.status !== 412 && err.status !== 428)) throw err
    let current: Contract | undefined
    try {
      const read = await deps.get(host, id)
      rememberEtag(host, id, read.etag, read.data.etag)
      current = read.data
    } catch { /* the message still says what happened; the next load shows the state */ }
    throw new StaleVersionError(err, err.status === 412 ? deps.messages.stale : deps.messages.missing, current)
  }
}
