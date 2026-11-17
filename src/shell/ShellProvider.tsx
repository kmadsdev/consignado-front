import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getEngine } from '../api/client'
import type { Engine } from '../api/types'
import { useAuth } from '../auth'
import { POLL } from '../config'
import { requestStore, useRequests } from '../flow/session'
import { ShellContext, type ClusterRun, type InspectorTab, type Notice, type ShellValue, type StoredNotice, type TraceRecord } from './context'

const OPEN_KEY = 'consignado.inspector.open'
function readOpen(): boolean {
  try { return localStorage.getItem(OPEN_KEY) === '1' } catch { return false }
}

/** State that every page shares: notifications, the engine state, the requests of this session, the inspector. */
export function ShellProvider({ children }: { children: ReactNode }) {
  const { persona, me, loading } = useAuth()
  const [notices, setNotices] = useState<StoredNotice[]>([])
  const [engine, setEngine] = useState<Engine | null>(null)
  const [inspectorOpen, setOpenState] = useState(readOpen)
  const [inspectorSelected, selectRequest] = useState<string | null>(null)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('requests')
  const [clusterRun, setClusterRun] = useState<ClusterRun | null>(null)
  const seq = useRef(0)
  const timers = useRef(new Map<string, number>())
  const requests = useRequests()

  const setInspectorOpen = useCallback((open: boolean) => {
    setOpenState(open)
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0') } catch { /* ignore */ }
  }, [])

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
    const t = window.setInterval(refreshEngine, POLL.engine)
    return () => window.clearInterval(t)
  }, [refreshEngine])

  // A new viewer (sign-out, another account, another preview persona): old notices and requests are not theirs.
  useEffect(() => {
    setNotices([])
    refreshEngine()
  }, [persona, refreshEngine])
  const meId = me?.id
  useEffect(() => {
    if (loading) return
    const owner = `${persona}:${meId ?? 'guest'}`
    requestStore.setOwner(owner)
  }, [loading, meId, persona])

  const openInspector = useCallback((id?: string) => {
    if (id) selectRequest(id)
    setInspectorTab('requests')
    setInspectorOpen(true)
  }, [setInspectorOpen])

  const newest = requests[0]
  const traceRecord = useMemo<TraceRecord | null>(
    () => (newest ? { label: newest.label, trace: newest.trace, ok: newest.ok, message: newest.message, at: newest.at } : null),
    [newest],
  )

  const value = useMemo<ShellValue>(
    () => ({
      notices, notify, dismiss, engine, refreshEngine, traceRecord, openInspector, inspectorOpen, setInspectorOpen,
      inspectorSelected, selectRequest, inspectorTab, setInspectorTab, clusterRun, setClusterRun,
    }),
    [notices, notify, dismiss, engine, refreshEngine, traceRecord, openInspector, inspectorOpen, setInspectorOpen, inspectorSelected, inspectorTab, clusterRun],
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}
