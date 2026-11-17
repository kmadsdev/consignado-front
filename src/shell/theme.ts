import { applyMode, Mode } from '@cloudscape-design/global-styles'

export type ThemeMode = 'light' | 'dark'
const KEY = 'consignado.theme'

/** The stored choice, or the system setting when the viewer did not choose. */
export function initialTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
export function hasStoredTheme(): boolean {
  try { return localStorage.getItem(KEY) !== null } catch { return false }
}
export function setTheme(mode: ThemeMode, store: boolean) {
  applyMode(mode === 'dark' ? Mode.Dark : Mode.Light)
  document.documentElement.style.colorScheme = mode
  if (store) { try { localStorage.setItem(KEY, mode) } catch { /* ignore */ } }
}
