import '@cloudscape-design/global-styles/index.css'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { applyDocumentLang } from './i18n/index.tsx'
import { S } from './shell/strings'
import { initialTheme, setTheme } from './shell/theme'

// Before the first paint, so the page does not flash in the wrong mode.
setTheme(initialTheme(), false)
// `<html lang>` and the description follow the language of the page.
applyDocumentLang(S.metaDescription, S.docTitle)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
