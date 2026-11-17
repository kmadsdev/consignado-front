import '@cloudscape-design/global-styles/index.css'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initialTheme, setTheme } from './shell/theme'

// Before the first paint, so the page does not flash in the wrong mode.
setTheme(initialTheme(), false)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
