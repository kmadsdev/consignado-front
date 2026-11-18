// API refusals (RFC 9457 problem+json from the Spring Boot API, `code` = the last part of `type`).
// Known codes get the frontend's own text in the page language, with the numbers of the body.
// An unknown code gets '' here, and the caller shows the API's own text as it is.
// Codes: consignado-api ApiExceptionHandler and the exceptions it maps (2026-11-18).
import { LOCALE } from '../i18n/lang.ts'
import { E } from './strings.ts'

export interface ProblemBody {
  code?: string
  type?: string
  detail?: string
  errors?: Array<{ field?: string; message?: string }>
  [key: string]: unknown
}

type Texts = typeof E.problem

/** The code of a problem: `code`, else the end of `type` (`urn:consignado:problem:<code>`). */
export function problemCode(body: ProblemBody | null | undefined): string {
  if (!body) return ''
  if (typeof body.code === 'string' && body.code) return body.code
  const m = typeof body.type === 'string' ? /problem:([a-z0-9-]+)$/.exec(body.type) : null
  return m ? m[1] : ''
}

/** The frontend text of a known API refusal, or '' for an unknown code. */
export function knownProblemText(body: ProblemBody | null | undefined, P: Texts = E.problem, locale: string = LOCALE): string {
  const money = (v: unknown): string => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
    return Number.isFinite(n) ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(n) : '-'
  }
  const status = (v: unknown) => (typeof v === 'string' ? P.status[v] ?? v : '-')
  switch (problemCode(body)) {
    case 'margin-exceeded': return P.marginExceeded(money(body?.installment), money(body?.availableMargin))
    case 'income-below-committed-margin': return P.incomeBelowMargin(money(body?.marginLimit), money(body?.committedInstallments))
    case 'illegal-status-transition': return P.transition(status(body?.currentStatus), status(body?.requestedStatus))
    case 'term-above-agreement-limit': return P.termAboveAgreement(/at most (\d+) months/.exec(body?.detail ?? '')?.[1] ?? '')
    case 'term-too-long-for-amount': return P.termTooLong
    case 'customer-already-exists': return P.customerExists
    case 'agreement-not-found': return P.agreementMissing
    case 'customer-not-found': return P.customerMissing
    case 'simulation-not-found': return P.simulationMissing
    case 'simulation-expired': return P.simulationExpired
    case 'simulation-already-used': return P.simulationUsed
    case 'agreement-code-taken': return P.agreementCodeTaken
    case 'invalid-cpf': return P.invalidCpf
    case 'idempotency-key-reused': return P.idempotencyReused
    case 'data-conflict': return P.dataConflict
    case 'validation-failed': {
      const names = Array.from(new Set((body?.errors ?? []).map((e) => e?.field).filter((f): f is string => typeof f === 'string' && f.length > 0)))
      return names.length > 0 ? P.fields(names.slice(0, 6).join(', ')) : ''
    }
    default: return ''
  }
}
