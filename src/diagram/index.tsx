// CONTRACT (owned by the diagram worker): the public surface of the diagrams.
import type { LifecycleEvent } from '../api/types'

export type DiagramView = 'overview' | 'aks' | 'functions'
export interface ArchitectureDiagramProps {
  view: DiagramView
  /** Events so far. The diagram lights each stage as its events arrive. */
  events: LifecycleEvent[]
  height?: number
  onStageSelect?: (stage: string) => void
}
export function ArchitectureDiagram(props: ArchitectureDiagramProps) {
  return <div style={{ height: props.height ?? 480, display: 'grid', placeItems: 'center', border: '1px dashed #8c8c94' }}>diagram: {props.view} ({props.events.length} events)</div>
}
export interface LifecycleTimelineProps { view: Exclude<DiagramView, 'overview'>; events: LifecycleEvent[] }
export function LifecycleTimeline(props: LifecycleTimelineProps) {
  return <ol>{props.events.map((e, i) => <li key={i}>{e.stage}: {e.status}</li>)}</ol>
}
/** Fake but realistic event stream, for guests and for the design preview. */
export function useDemoTimeline(_view: Exclude<DiagramView, 'overview'>, _opts?: { speed?: number; loop?: boolean; autoStart?: boolean }): { events: LifecycleEvent[]; running: boolean; start: () => void; reset: () => void } {
  return { events: [], running: false, start: () => {}, reset: () => {} }
}
