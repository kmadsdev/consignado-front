import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator, { type StatusIndicatorProps } from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import type { HostKind, Metric, ServiceState, ServiceStatus } from '../api/types'
import { InlineRecord } from '../flow/InlineRecord'
import { RequestFlowView } from '../flow/RequestView'
import { requestStore, type NewRecord } from '../flow/session'
import { usePlatformStatus } from '../flow/status'
import type { CallRecord } from '../flow/store'
import { Mono, useNow } from './common'
import { Explain } from './Explain'
import { decimal } from './format'
import { T } from './strings'

/** One request as the page saw it: the trace of the gateway plus what the browser measured. */
export type FlowRecord = CallRecord

/** Adds a call to the requests of this session (the inspector lists it) and gives back the stored record. */
export function saveRecord(r: Omit<NewRecord, 'host'>): CallRecord {
  return requestStore.add({ ...r, host: r.trace.host })
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

/**
 * The path of one request on the real infrastructure: the inline record, the flow of the services that the request
 * touched (with the replay), and the live state of each service of the host.
 */
export function RequestFlow({ host, record }: { host: HostKind; record: FlowRecord | null }) {
  const F = T.flow
  const live = usePlatformStatus(host)
  const now = useNow(1000)
  return (
    <SpaceBetween size="m">
      {record && <InlineRecord record={record} />}
      {record && <RequestFlowView record={record} status={live.status} />}
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
      {!live.unavailable && <Explain text={T.explain.status} variant="default" />}
    </SpaceBetween>
  )
}
