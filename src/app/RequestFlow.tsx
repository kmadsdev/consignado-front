import Alert from '@cloudscape-design/components/alert'
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Grid from '@cloudscape-design/components/grid'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator, { type StatusIndicatorProps } from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import { useEffect, useMemo, useState } from 'react'
import { getStatus, speedOf } from '../api/client'
import type { HostKind, LifecycleEvent, Metric, PlatformStatus, ServiceId, ServiceState, ServiceStatus } from '../api/types'
import { ArchitectureDiagram, STAGE_NAMES, type NodeStatus } from '../diagram'
import type { TraceRecord } from '../shell/context'
import { Mono, useNow, useReplay } from './common'
import { decimal, duration } from './format'
import { T } from './strings'

/** One request as the page saw it: the trace of the gateway plus what the browser measured. */
export interface FlowRecord extends TraceRecord { browserMs?: number; status?: number; code?: string }

const POLL_MS = 10_000
const EMPTY: LifecycleEvent[] = []
/** Where each service of GET /api/status sits on the diagram of its path. */
const NODE_OF: Record<HostKind, Partial<Record<ServiceId, string>>> = {
  aks: { edge: 'frontdoor', gateway: 'gateway', identity: 'entra', keyvault: 'keyvault', 'load-balancer': 'lb', cluster: 'cp', node: 'kubelet', pods: 'pod', database: 'pg' },
  functions: { edge: 'frontdoor', gateway: 'gateway', identity: 'entra', keyvault: 'keyvault', functions: 'fnhost', database: 'pg' },
}
const INDICATOR: Record<ServiceState, StatusIndicatorProps.Type> = { up: 'success', degraded: 'warning', down: 'error', stopped: 'stopped', starting: 'in-progress', unknown: 'pending' }

function metricValue(m: Metric): string {
  if (m.value === null) return T.flow.noData
  const n = decimal(m.value, Number.isInteger(m.value) ? 0 : 1)
  return m.unit === 'ms' ? `${n} ms` : m.unit === '%' ? `${n}%` : m.unit === 'MB' ? `${n} MB` : m.unit === 'rpm' ? `${n}/min` : n
}
/** One or two numbers that matter most for this service, in a short form. */
function keyMetrics(s: ServiceStatus, max = 2): string {
  const by = (key: string) => s.metrics.find((m) => m.key === key && m.value !== null)
  const out: string[] = []
  const lat = by('latency-avg'), err = by('errors'), cpu = by('cpu'), pods = by('replicas'), conn = by('connections'), inst = by('instances')
  if (lat) out.push(T.flow.avg(metricValue(lat)))
  if (err) out.push(T.flow.errors(err.value!))
  if (pods) out.push(T.flow.pods(pods.value!))
  if (cpu && out.length < 2) out.push(T.flow.cpu(metricValue(cpu)))
  if (conn && out.length < 2) out.push(T.flow.connections(conn.value!))
  if (inst && out.length < 2) out.push(T.flow.instances(inst.value!))
  return out.slice(0, max).join(' · ')
}
function toNodeStatus(s: ServiceStatus): NodeStatus {
  const F = T.flow
  return {
    state: s.state,
    stateText: F.state[s.state],
    name: s.name,
    summary: [s.region, keyMetrics(s, 1)].filter(Boolean).join('\n'),
    rows: [
      { label: F.rowKind, value: s.kind },
      { label: F.rowName, value: s.name },
      ...(s.region ? [{ label: F.rowRegion, value: s.region }] : []),
      { label: F.rowState, value: F.state[s.state] },
      { label: F.rowDetail, value: s.detail },
      ...s.metrics.map((m) => ({ label: m.label, value: `${metricValue(m)} (${m.window})` })),
      { label: F.rowSource, value: s.source.map((x) => F.source[x]).join(', ') },
    ],
  }
}

/** Reads GET /api/status every 10 s while the tab is visible. `unavailable` = the gateway has no such route yet. */
function usePlatformStatus(host: HostKind) {
  const [value, setValue] = useState<{ status: PlatformStatus | null; readAt: number; unavailable: boolean; failed: boolean }>({ status: null, readAt: 0, unavailable: false, failed: false })
  useEffect(() => {
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
  }, [host])
  return value
}

/** The path of one request on the real infrastructure: live state of each service, the trace of the last call, its timings. */
export function RequestFlow({ host, record, diagramHeight = 520 }: { host: HostKind; record: FlowRecord | null; diagramHeight?: number }) {
  const F = T.flow
  const live = usePlatformStatus(host)
  const now = useNow(1000)
  const replayed = useReplay(record?.trace.events ?? EMPTY, record?.at ?? 0)
  // useReplay returns a new array at each render. The parent re-renders 4 times a second (the countdown), and a new
  // array makes React Flow drop the measured node sizes and hide the nodes: keep one array per replay step.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const events = useMemo(() => replayed, [replayed.length, record])
  const nodeStatus = useMemo(() => {
    const out: Record<string, NodeStatus> = {}
    for (const s of live.status?.services ?? []) {
      const node = NODE_OF[host][s.id]
      if (node) out[node] = toNodeStatus(s)
    }
    return out
  }, [live.status, host])

  const trace = record?.trace
  const failedStage = trace?.events.find((e) => e.status === 'error')
  const edgeMs = record?.browserMs !== undefined && trace ? Math.max(0, record.browserMs - trace.totalMs) : undefined
  const speed = trace ? speedOf(trace) : 'warm'

  return (
    <SpaceBetween size="m">
      {record && trace && (
        <KeyValuePairs
          columns={4}
          items={[
            { label: T.inspector.request, value: <Mono>{record.label}</Mono> },
            {
              label: T.inspector.result,
              value: record.ok
                ? <StatusIndicator type="success">{T.inspector.ok}</StatusIndicator>
                : <StatusIndicator type="error">{F.httpError(record.status ?? 0, F.httpWords(record.status ?? 0), record.code)}</StatusIndicator>,
            },
            {
              label: F.browserTotal,
              value: (
                <SpaceBetween size="xs" direction="horizontal" alignItems="center">
                  <Mono>{record.browserMs !== undefined ? duration(record.browserMs) : '-'}</Mono>
                  <Badge color={speed === 'cold' ? 'blue' : speed === 'slow' ? 'grey' : 'green'}>{T.inspector[speed]}</Badge>
                </SpaceBetween>
              ),
            },
            { label: F.gatewayTotal, value: <Mono>{duration(trace.totalMs)}</Mono> },
            { label: F.edgeNetwork, value: <span title={F.edgeHint}><Mono>{edgeMs !== undefined ? duration(edgeMs) : '-'}</Mono></span> },
            ...(failedStage ? [{ label: F.failedStage, value: <Box color="text-status-error"><Mono>{STAGE_NAMES[failedStage.stage] ?? failedStage.stage}</Mono>{failedStage.detail ? `: ${failedStage.detail}` : ''}</Box> }] : []),
          ]}
        />
      )}
      <Grid gridDefinition={[{ colspan: 12 }, { colspan: 12 }]}>
        <div className="diagram-frame">
          <ArchitectureDiagram view={host} events={events} height={diagramHeight} nodeStatus={nodeStatus} />
        </div>
        {trace
          ? (
            <div>
              <Box variant="awsui-key-label">{T.inspector.timeline}</Box>
              <SpaceBetween size="xxs">
                {events.map((e, i) => (
                  <SpaceBetween key={i} size="xs" direction="horizontal" alignItems="center">
                    <StatusIndicator type={e.status === 'error' ? 'error' : e.status === 'done' ? 'success' : 'in-progress'}>{STAGE_NAMES[e.stage] ?? e.stage}</StatusIndicator>
                    {e.ms !== undefined && <Mono>{duration(e.ms)}</Mono>}
                    {e.detail && <Box color={e.status === 'error' ? 'text-status-error' : 'text-body-secondary'} fontSize="body-s">{e.detail}</Box>}
                  </SpaceBetween>
                ))}
              </SpaceBetween>
            </div>
          )
          : <span />}
      </Grid>
      {live.unavailable
        ? <Alert type="info" header={F.unavailable}>{F.unavailableText}</Alert>
        : (
          <SpaceBetween size="xs">
            {live.failed && <StatusIndicator type="warning">{F.failed}</StatusIndicator>}
            <Box color="text-body-secondary" fontSize="body-s">
              {live.status ? F.fresh(Math.max(0, Math.round((now - live.readAt) / 1000))) : F.loading}
              {live.status ? ` ${F.clickHint}` : ''}
            </Box>
          </SpaceBetween>
        )}
      {!live.unavailable && (
        <Table
          variant="embedded"
          header={<Box variant="h3">{F.services}</Box>}
          loading={!live.status && !live.failed}
          loadingText={F.loading}
          items={live.status?.services ?? []}
          trackBy="id"
          columnDefinitions={[
            { id: 'state', header: F.colState, cell: (s) => <StatusIndicator type={INDICATOR[s.state]}>{F.state[s.state]}</StatusIndicator>, isRowHeader: true },
            { id: 'name', header: F.colName, cell: (s) => <Mono>{s.name}</Mono> },
            { id: 'kind', header: F.colKind, cell: (s) => s.kind },
            { id: 'region', header: F.colRegion, cell: (s) => s.region ? <Mono>{s.region}</Mono> : '-' },
            { id: 'metrics', header: F.colMetrics, cell: (s) => keyMetrics(s) || <Box color="text-body-secondary">{s.detail}</Box> },
            { id: 'source', header: F.colSource, cell: (s) => s.source.map((x) => F.source[x]).join(', ') },
          ]}
        />
      )}
    </SpaceBetween>
  )
}
