import { createContext, useContext, type ReactNode } from 'react'
import type { Engine, RequestTrace } from '../api/types'

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
export interface ShellValue {
  notices: StoredNotice[]
  notify: (notice: Notice) => string
  dismiss: (id: string) => void
  engine: Engine | null
  refreshEngine: () => void
  traceRecord: TraceRecord | null
  /** Stores the trace of the last request. `open` also opens the inspector panel. */
  showTrace: (record: TraceRecord, open?: boolean) => void
  inspectorOpen: boolean
  setInspectorOpen: (open: boolean) => void
}
export const ShellContext = createContext<ShellValue | null>(null)
export function useShell(): ShellValue {
  const value = useContext(ShellContext)
  if (!value) throw new Error('useShell must be used inside the shell provider')
  return value
}
