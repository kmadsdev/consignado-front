import { LOCALE } from '../i18n/lang.ts'
import { T } from './strings.ts'

// Dates, numbers and money follow the active language. Money is BRL in both languages.
const TZ = 'America/Sao_Paulo'
const BRL = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BRL' })
const BRL_ROUND = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const USD = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD' })
const DATE_TIME = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ })
const DATE = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: TZ })
const RELATIVE = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto', style: 'short' })
const fixed = (digits: number) => new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits })
const FIXED = [fixed(0), fixed(1), fixed(2), fixed(3), fixed(4)]

/** A number with a fixed count of decimals, with the decimal mark of the active language. */
export const decimal = (n: number, digits = 2) => (FIXED[digits] ?? fixed(digits)).format(n)
export const brl = (n: number) => BRL.format(n)
/** A rounded amount with no cents: R$ 5.200 */
export const brlRound = (n: number) => BRL_ROUND.format(n)
export const usd = (n: number) => USD.format(n)
/** An amount in the currency that the server names (ISO 4217); an unknown code shows the number and the code. */
export function moneyIn(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(n)
  } catch {
    return `${decimal(n, 2)} ${currency}`
  }
}
export const percent = (rate: number, digits = 2) => `${decimal(rate * 100, digits)}%`
export const dateTime = (isoText: string) => DATE_TIME.format(new Date(isoText))
export const dateOnly = (isoText: string) => DATE.format(new Date(isoText))

/** 184 ms, 9.2 s, 4 min 36 s. */
export function duration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${decimal(ms / 1000, ms < 10_000 ? 1 : 0)} s`
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)} min ${String(total % 60).padStart(2, '0')} s`
}
/** 14:07 */
export function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
/** just now, 5 min ago, 3 hr ago, yesterday, 4 days ago: in the active language. */
export function relativeTime(isoText: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(isoText).getTime()) / 1000))
  if (s < 45) return T.common.justNow
  if (s < 3600) return RELATIVE.format(-Math.round(s / 60), 'minute')
  if (s < 86_400) return RELATIVE.format(-Math.round(s / 3600), 'hour')
  return RELATIVE.format(-Math.round(s / 86_400), 'day')
}
export function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
