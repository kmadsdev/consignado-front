import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getEngine } from '../api/client'
import type { Engine } from '../api/types'
import { useAuth } from '../auth'
import { ShellContext, type Notice, type ShellValue, type StoredNotice, type TraceRecord } from './context'

/** State that every page shares: notifications, the engine state, the last request trace. */
export function ShellProvider({ children }: { children: ReactNode }) {
  const { persona } = useAuth()
  const [notices, setNotices] = useState<StoredNotice[]>([])
  const [engine, setEngine] = useState<Engine | null>(null)
  const [traceRecord, setTraceRecord] = useState<TraceRecord | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const seq = useRef(0)
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    setNotices((list) => list.filter((n) => n.id !== id))
    const t = timers.current.get(id)
    if (t) { window.clearTimeout(t); timers.current.delete(id) }
  }, [])

  const notify = useCallback((notice: Notice) => {
    const id = notice.id ?? `n${++seq.current}`
    setNotices((list) => [{ ...notice, id }, ...list.filter((n) => n.id !== id)].slice(0, 3))
    const old = timers.current.get(id)
    if (old) { window.clearTimeout(old); timers.current.delete(id) }
    if (notice.type === 'success' || notice.type === 'info') {
      timers.current.set(id, window.setTimeout(() => dismiss(id), 7000))
    }
    return id
  }, [dismiss])

  const refreshEngine = useCallback(() => {
    getEngine().then(setEngine).catch(() => undefined)
  }, [])

  useEffect(() => {
    const t = window.setInterval(refreshEngine, 4000)
    return () => window.clearInterval(t)
  }, [refreshEngine])

  // A new persona is a new viewer: old notices and traces are not theirs.
  useEffect(() => {
    setNotices([])
    setTraceRecord(null)
    setInspectorOpen(false)
    refreshEngine()
  }, [persona, refreshEngine])

  const showTrace = useCallback((record: TraceRecord, open?: boolean) => {
    setTraceRecord(record)
    if (open) setInspectorOpen(true)
  }, [])

  const value = useMemo<ShellValue>(
    () => ({ notices, notify, dismiss, engine, refreshEngine, traceRecord, showTrace, inspectorOpen, setInspectorOpen }),
    [notices, notify, dismiss, engine, refreshEngine, traceRecord, showTrace, inspectorOpen],
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}
