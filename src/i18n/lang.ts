// The language of the page. No React and no DOM at import time, so `node --test` can load it.
// The language is fixed for the life of a page: many string tables are read at module scope
// (diagram nodes, table columns), so a change of language saves the choice and loads the page again.
export type Lang = 'en' | 'pt-BR'
export const LANGS: readonly Lang[] = ['en', 'pt-BR']
const KEY = 'consignado.lang'

/** Order: the saved choice, then the browser language (`pt*` gives pt-BR), then English. */
export function detectLang(saved: string | null | undefined, browser: readonly string[]): Lang {
  if (saved === 'en' || saved === 'pt-BR') return saved
  const first = browser.find((l) => typeof l === 'string' && l.length > 0)
  return first && first.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

function readSaved(): string | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY) } catch { return null }
}
function browserLangs(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages?.length ? navigator.languages : [navigator.language]
}

export const LANG: Lang = detectLang(readSaved(), browserLangs())
/** The locale for `Intl`: dates, numbers and money. Money stays BRL in both languages. */
export const LOCALE = LANG === 'pt-BR' ? 'pt-BR' : 'en-GB'

/** Selects the string table of the active language. The pt-BR table must have the shape of the English one. */
export function pick<T>(en: T, ptBR: NoInfer<T>): T {
  return LANG === 'pt-BR' ? ptBR : en
}

export function saveLang(lang: Lang): void {
  try { localStorage.setItem(KEY, lang) } catch { /* ignore */ }
}
