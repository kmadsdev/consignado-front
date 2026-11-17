import { createContext, useContext, type ReactNode } from 'react'
import type { Engine, LifecycleEvent, RequestTrace } from '../api/types'

export interface Notice {
  id?: string
  type: 'success' | 'error' | 'info' | 'warning' | 'in-progress'
  header?: string
  content: ReactNode
  loading?: boolean
}
export interface StoredNotice extends Notice { id: string }
/** One finished API call, as the request inspector draws it. */
export interface TraceRecord {
  label: string
  trace: RequestTrace
  ok: boolean
  message?: string
  at: number
}
export interface ClusterRun {
  /** Changes when a new run is recorded (the session id). */
  key: string
  events: LifecycleEvent[]
}
export type InspectorTab = 'requests' | 'cluster'
export interface ShellValue {
  notices: StoredNotice[]
  notify: (notice: Notice) => string
  dismiss: (id: string) => void
  engine: Engine | null
  refreshEngine: () => void
  /** The newest request of this session (for the overview diagram). */
  traceRecord: TraceRecord | null
  /** Opens the request inspector drawer; with an id, on that request. */
  openInspector: (id?: string) => void
  inspectorOpen: boolean
  setInspectorOpen: (open: boolean) => void
  inspectorSelected: string | null
  selectRequest: (id: string | null) => void
  inspectorTab: InspectorTab
  setInspectorTab: (tab: InspectorTab) => void
  /** The recorded cluster start of the open access window (tab "Cluster start" of the inspector). */
  clusterRun: ClusterRun | null
  setClusterRun: (run: ClusterRun | null) => void
}
export const ShellContext = createContext<ShellValue | null>(null)
export function useShell(): ShellValue {
  const value = useContext(ShellContext)
  if (!value) throw new Error('useShell must be used inside the shell provider')
  return value
}
