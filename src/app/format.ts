const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const DATE_TIME = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
const DATE = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' })

export const brl = (n: number) => BRL.format(n)
export const usd = (n: number) => USD.format(n)
export const percent = (rate: number, digits = 2) => `${(rate * 100).toFixed(digits)}%`
export const dateTime = (isoText: string) => DATE_TIME.format(new Date(isoText))
export const dateOnly = (isoText: string) => DATE.format(new Date(isoText))

/** 184 ms, 9.2 s, 4 min 36 s. */
export function duration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)} min ${String(total % 60).padStart(2, '0')} s`
}
/** 14:07 */
export function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
export function relativeTime(isoText: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(isoText).getTime()) / 1000))
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`
  const d = Math.round(s / 86_400)
  return d === 1 ? 'yesterday' : `${d} days ago`
}
export function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
