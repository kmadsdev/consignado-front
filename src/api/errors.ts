import type { RequestTrace } from './types'

/** An error from the gateway or from the API host, safe to show: `message` is written for the viewer. */
export class ApiError extends Error {
  /** The HTTP status. 0 = the network did not answer. */
  status: number
  trace?: RequestTrace
  /** The short code of the body, for example `cooldown` or `margin-exceeded`. */
  code?: string
  retryAfterSeconds?: number
  /** Method and path of the call that failed. */
  label?: string
  constructor(status: number, message: string, trace?: RequestTrace, code?: string, retryAfterSeconds?: number, label?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.trace = trace
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
    this.label = label
  }
}
