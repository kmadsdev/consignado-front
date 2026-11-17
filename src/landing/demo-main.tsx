// Preview entry of the landing area only (landing-demo.html). Not the product shell.
import '@cloudscape-design/global-styles/index.css'
import Box from '@cloudscape-design/components/box'
import SegmentedControl from '@cloudscape-design/components/segmented-control'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { Mode, applyMode } from '@cloudscape-design/global-styles'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { LandingPage, PrivacyPage, TermsPage } from './index'

type ModeId = 'light' | 'dark'

function initialMode(): ModeId {
  const fromQuery = new URLSearchParams(window.location.search).get('mode')
  if (fromQuery === 'light' || fromQuery === 'dark') return fromQuery
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function Demo() {
  const [mode, setMode] = useState<ModeId>(initialMode)
  useEffect(() => applyMode(mode === 'dark' ? Mode.Dark : Mode.Light), [mode])

  return (
    <HashRouter>
      <Box padding={{ horizontal: 'l', vertical: 'xs' }}>
        <SpaceBetween size="l" direction="horizontal" alignItems="center">
          <Box variant="strong">landing demo</Box>
          <Link to="/">landing</Link>
          <Link to="/privacy">privacy</Link>
          <Link to="/terms">terms</Link>
          <SegmentedControl
            selectedId={mode}
            onChange={({ detail }) => setMode(detail.selectedId as ModeId)}
            label="Color mode"
            options={[
              { id: 'light', text: 'Light' },
              { id: 'dark', text: 'Dark' },
            ]}
          />
        </SpaceBetween>
      </Box>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Box padding="l">This route belongs to the application shell.</Box>} />
      </Routes>
    </HashRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
)
