// Second entry (diagram-demo.html): the review page of the diagrams. The main entry is not touched.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@cloudscape-design/global-styles/index.css'
import { DiagramDemo } from './DiagramDemo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DiagramDemo />
  </StrictMode>,
)
