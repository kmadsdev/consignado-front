// Live service status (GET /api/status) for the flow nodes and the database block.
import { useEffect, useState } from 'react'
import { getStatus } from '../api/client'
import type { HostKind, Metric, PlatformStatus, ServiceId, ServiceStatus } from '../api/types'
import type { FlowNodeKind } from './model'

const POLL_MS = 10_000

export interface LiveStatus { status: PlatformStatus | null; readAt: number; unavailable: boolean; failed: boolean }

/** Reads GET /api/status every 10 s while the tab is visible and `enabled` is true. `unavailable` = no such route. */
export function usePlatformStatus(host: HostKind | null, enabled = true): LiveStatus {
  const [value, setValue] = useState<LiveStatus>({ status: null, readAt: 0, unavailable: false, failed: false })
  useEffect(() => {
    if (!host || !enabled) return
    let alive = true
    let timer = 0
    const read = async () => {
      window.clearTimeout(timer)
      if (document.hidden) return
      try {
        const status = await getStatus(host)
        if (!alive) return
        setValue(status ? { status, readAt: Date.now(), unavailable: false, failed: false } : { status: null, readAt: 0, unavailable: true, failed: false })
      } catch {
        if (alive) setValue((v) => ({ ...v, failed: true }))
      }
      if (alive && !document.hidden) timer = window.setTimeout(read, POLL_MS)
    }
    const onVisible = () => { if (!document.hidden) void read() }
    void read()
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [host, enabled])
  return value
}

/** Which service of the status answer belongs to a flow node. */
export const SERVICE_OF: Partial<Record<FlowNodeKind, ServiceId>> = {
  edge: 'edge', gateway: 'gateway', identity: 'identity', keyvault: 'keyvault', fnhost: 'functions', lb: 'load-balancer', pod: 'pods', database: 'database',
}

export function serviceOf(status: PlatformStatus | null | undefined, id: ServiceId): ServiceStatus | undefined {
  return status?.services.find((s) => s.id === id)
}

/** Ready pods and pod names from the status answer (host aks). */
export function podsOf(status: PlatformStatus | null | undefined): { podCount?: number; podNames?: string[] } {
  const pods = serviceOf(status, 'pods')
  if (!pods) return {}
  const replicas = pods.metrics.find((m) => m.key === 'replicas')?.value
  return { podCount: replicas ?? pods.instances?.length, podNames: pods.instances }
}

/** The commit of the build that answers, from `build` of the status answer. Only a hex sha is a commit. */
export function buildCommit(status: PlatformStatus | null | undefined): string | undefined {
  const b = status?.build
  if (!b) return undefined
  const raw = typeof b === 'string' ? b : b.commit ?? b.sha ?? b.tag ?? b.image
  const m = raw ? /([0-9a-f]{7,40})$/i.exec(raw.trim()) : null
  return m ? m[1].toLowerCase() : undefined
}

export function metricText(m: Metric, noData: string, decimal: (n: number, d?: number) => string): string {
  if (m.value === null) return noData
  const n = decimal(m.value, Number.isInteger(m.value) ? 0 : 1)
  return m.unit === 'ms' ? `${n} ms` : m.unit === '%' ? `${n}%` : m.unit === 'MB' ? `${n} MB` : m.unit === 'rpm' ? `${n}/min` : n
}
