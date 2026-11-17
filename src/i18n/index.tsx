import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { LANG, saveLang, type Lang } from './lang.ts'

export { LANG, LOCALE, pick, type Lang } from './lang.ts'

interface LangValue {
  lang: Lang
  /** Saves the choice and loads the page again in the new language. */
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangValue>({ lang: LANG, setLang: () => {} })

/** Before the first paint: `<html lang>` and the description follow the active language. */
export function applyDocumentLang(description: string): void {
  document.documentElement.lang = LANG
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
}

export function LangProvider(props: { children: ReactNode }) {
  const value = useMemo<LangValue>(() => ({
    lang: LANG,
    setLang: (lang) => {
      if (lang === LANG) return
      saveLang(lang)
      document.documentElement.lang = lang
      window.location.reload()
    },
  }), [])
  return <LangContext.Provider value={value}>{props.children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
