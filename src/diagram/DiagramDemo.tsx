// Review page of the diagrams: three views, Play / Reset, timeline, light / dark switch.
// URL parameters for screenshots: ?view=overview|aks|functions &mode=light|dark &host=aks|functions &auto=1
import { useEffect, useState } from 'react'
import { applyMode, Mode } from '@cloudscape-design/global-styles'
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Container from '@cloudscape-design/components/container'
import Grid from '@cloudscape-design/components/grid'
import Header from '@cloudscape-design/components/header'
import SegmentedControl from '@cloudscape-design/components/segmented-control'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Tabs from '@cloudscape-design/components/tabs'
import Toggle from '@cloudscape-design/components/toggle'
import type { HostKind } from '../api/types'
import { ArchitectureDiagram, LifecycleTimeline, STAGE_NAMES, useDemoTimeline, type DiagramView } from './index'
import { UI } from './strings'

const T = UI.demo
const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
const initialView = (['overview', 'aks', 'functions'] as const).find((v) => v === params.get('view')) ?? 'overview'
const initialDark = params.has('mode') ? params.get('mode') === 'dark' : typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
const initialHost: HostKind = params.get('host') === 'functions' ? 'functions' : 'aks'
const auto = params.get('auto') === '1'

export function DiagramDemo() {
  const [view, setView] = useState<DiagramView>(initialView)
  const [dark, setDark] = useState(initialDark)
  const [host, setHost] = useState<HostKind>(initialHost)
  const [selected, setSelected] = useState<string | null>(null)
  const aks = useDemoTimeline('aks')
  const fn = useDemoTimeline('functions')

  useEffect(() => { applyMode(dark ? Mode.Dark : Mode.Light) }, [dark])

  const lane: HostKind = view === 'overview' ? host : view
  const demo = lane === 'aks' ? aks : fn
  const other = lane === 'aks' ? fn : aks

  useEffect(() => {
    if (auto) demo.start()
    // Play once on load, only for the screenshot URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const play = () => { other.reset(); setSelected(null); demo.start() }
  const reset = () => { aks.reset(); fn.reset(); setSelected(null) }
  const change = (next: DiagramView) => { reset(); setView(next) }

  const diagram = (v: DiagramView, height: number) => (
    <ArchitectureDiagram view={v} events={demo.events} host={lane} height={height} onStageSelect={setSelected} />
  )
  const withTimeline = (v: 'aks' | 'functions', height: number) => (
    <Grid gridDefinition={[{ colspan: { default: 12, l: 9 } }, { colspan: { default: 12, l: 3 } }]}>
      {diagram(v, height)}
      <Container header={<Header variant="h3" counter={v === 'functions' && fn.events.length > 0 ? (fn.run === 0 ? '(cold run)' : `(warm run ${fn.run})`) : undefined}>{T.timeline}</Header>}>
        <LifecycleTimeline view={v} events={demo.events} />
      </Container>
    </Grid>
  )

  return (
    <Box padding={{ horizontal: 'l', vertical: 'm' }}>
      <SpaceBetween size="m">
        <Header
          variant="h1"
          info={<Badge color="blue">{T.simulation}</Badge>}
          description={T.simulationText}
          actions={
            <SpaceBetween direction="horizontal" size="s" alignItems="center">
              <Toggle checked={dark} onChange={({ detail }) => setDark(detail.checked)}>{T.dark}</Toggle>
              <Button onClick={reset} disabled={demo.events.length === 0}>{T.reset}</Button>
              <Button variant="primary" iconName="caret-right-filled" onClick={play}>{demo.events.length > 0 ? T.replay : T.play}</Button>
            </SpaceBetween>
          }
        >
          {T.title}
        </Header>
        <Tabs
          activeTabId={view}
          onChange={({ detail }) => change(detail.activeTabId as DiagramView)}
          tabs={[
            {
              id: 'overview',
              label: T.overview,
              content: (
                <SpaceBetween size="s">
                  <SegmentedControl
                    selectedId={host}
                    onChange={({ detail }) => { reset(); setHost(detail.selectedId as HostKind) }}
                    label="Host of the simulated request"
                    options={[{ id: 'aks', text: T.hostAks }, { id: 'functions', text: T.hostFn }]}
                  />
                  {diagram('overview', 620)}
                </SpaceBetween>
              ),
            },
            { id: 'aks', label: T.aks, content: withTimeline('aks', 640) },
            { id: 'functions', label: T.functions, content: withTimeline('functions', 520) },
          ]}
        />
        <Box variant="small" color="text-body-secondary">
          {selected ? `${T.selected}: ${STAGE_NAMES[selected] ?? selected}. ` : ''}{T.footer}
        </Box>
      </SpaceBetween>
    </Box>
  )
}
