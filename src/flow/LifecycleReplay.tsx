// A recorded cluster start played again with the same transport as a request (100% = minutes).
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator, { type StatusIndicatorProps } from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import { useMemo } from 'react'
import { AKS_STAGES } from '../api/stages'
import type { LifecycleEvent } from '../api/types'
import { duration } from '../app/format'
import { ArchitectureDiagram, STAGE_NAMES } from '../diagram'
import { LOCALE } from '../i18n/lang.ts'
import { lifecycleEventsAt, lifecycleRun, type LifeRun } from './model'
import { F } from './strings'
import { Transport, useReplay } from './Transport'

/** The stages of a cluster start: everything before the countdown, plus the moment the window opens. */
export const START_STAGES: readonly string[] = AKS_STAGES.slice(0, AKS_STAGES.indexOf('window-open') + 1)
const AUTO_WALL_MS = 40_000
const TYPE: Record<string, StatusIndicatorProps.Type> = { done: 'success', error: 'error', active: 'in-progress', pending: 'pending' }
const clock = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' })

export function useLifeRun(events: LifecycleEvent[]): LifeRun {
  return useMemo(() => lifecycleRun(events, START_STAGES), [events])
}

/** The AKS lifecycle diagram, replayed. `autoPlay` false = show the end state first (the live window). */
export function LifecycleReplay({ events, runKey, height = 640, autoPlay = true, showDiagram = true, showChecklist = true }: { events: LifecycleEvent[]; runKey: string; height?: number; autoPlay?: boolean; showDiagram?: boolean; showChecklist?: boolean }) {
  const run = useLifeRun(events)
  const replay = useReplay(run.durationMs, runKey, AUTO_WALL_MS, autoPlay)
  const visible = lifecycleEventsAt(run, replay.pos)
  // A new array only when a stage changes: React Flow keeps its measured node sizes.
  const key = visible.map((e) => `${e.stage}:${e.status}`).join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useMemo(() => visible, [key])
  return (
    <SpaceBetween size="s">
      {showDiagram && <div className="diagram-frame"><ArchitectureDiagram view="aks" events={stable} height={height} /></div>}
      <Transport replay={replay} />
      {showChecklist && <LifecycleChecklist run={run} pos={replay.pos} />}
    </SpaceBetween>
  )
}

/** Every stage of the start with its time, duration and status (at the replay position). */
export function LifecycleChecklist({ run, pos }: { run: LifeRun; pos: number }) {
  const I = F.inspector
  const D = F.detail
  const rows = run.segments.map((s) => ({ ...s, shown: pos >= s.end && s.status !== 'active' ? s.status : pos >= s.start ? 'active' : 'pending' }))
  return (
    <Table
      variant="embedded"
      wrapLines
      header={<Box variant="h3">{I.clusterStages}</Box>}
      items={rows}
      trackBy="stage"
      columnDefinitions={[
        { id: 'stage', header: D.colStage, cell: (s) => STAGE_NAMES[s.stage] ?? s.stage, isRowHeader: true, minWidth: 160 },
        { id: 'status', header: D.colStatus, cell: (s) => <StatusIndicator type={TYPE[s.shown]} iconAriaLabel={D.statusText[s.shown] ?? s.shown} />, width: 76 },
        { id: 'ts', header: I.colTs, cell: (s) => <span className="mono">{clock.format(new Date(run.t0 + s.start))}</span>, width: 104 },
        { id: 'start', header: D.colStart, cell: (s) => <span className="mono">+{duration(s.start)}</span>, width: 112 },
        { id: 'ms', header: D.colDuration, cell: (s) => <span className="mono">{s.ms !== undefined ? duration(s.ms) : '-'}</span>, width: 112 },
        { id: 'detail', header: D.colDetail, cell: (s) => <Box fontSize="body-s" color="text-body-secondary">{s.detail ?? '-'}</Box>, minWidth: 200 },
      ]}
    />
  )
}
