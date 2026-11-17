// One request in full: the flow with the replay, the stage checklist, the database block, the build, the trace JSON.
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Link from '@cloudscape-design/components/link'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator, { type StatusIndicatorProps } from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import { useMemo } from 'react'
import { speedOf } from '../api/map'
import type { PlatformStatus } from '../api/types'
import { decimal, duration } from '../app/format'
import { T as AppT } from '../app/strings'
import { FlowDiagram, FLOW_VARS } from './FlowDiagram'
import { buildFlow, statementKinds, type DbInfo, type FlowModel } from './model'
import { buildOf, podsOf, serviceOf } from './status'
import type { CallRecord } from './store'
import { F } from './strings'
import { Transport, useReplay } from './Transport'

const STATUS_TYPE: Record<string, StatusIndicatorProps.Type> = { done: 'success', error: 'error', active: 'in-progress', pending: 'pending' }
const AUTO_WALL_MS = 3000
const mono = (text: string) => <span className="mono">{text}</span>
const monoNowrap = (text: string) => <span className="mono fl-nowrap">{text}</span>

export function useFlowModel(record: CallRecord | null, status: PlatformStatus | null | undefined): FlowModel | null {
  const pods = podsOf(status)
  return useMemo(() => (record ? buildFlow(record.trace, pods) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record, pods.podCount, pods.podNames?.join(',')])
}

/** The flow diagram of one request with its transport. Plays once (about 3 s) when a new request arrives. */
export function RequestFlowView({ record, status }: { record: CallRecord; status?: PlatformStatus | null }) {
  const model = useFlowModel(record, status)!
  const replay = useReplay(model.durationMs, record.id, AUTO_WALL_MS)
  return (
    <SpaceBetween size="xs">
      <FlowDiagram model={model} pos={replay.pos} status={status} label={record.label} dbDetail={model.db ? <DbBlock db={model.db} status={status} compact /> : undefined} edgeNetworkMs={record.browserMs !== undefined ? Math.max(0, record.browserMs - record.trace.totalMs) : undefined} />
      <Transport replay={replay} />
      {!model.db && <Box color="text-body-secondary" fontSize="body-s">{model.detailed ? F.noDatabase : `${F.noDatabase} ${F.oldTrace}`}</Box>}
    </SpaceBetween>
  )
}

/** Statements by kind, time, connection wait, share, server and region, and the honest sentence about the distance. */
export function DbBlock({ db, status, compact = false }: { db: DbInfo; status?: PlatformStatus | null; compact?: boolean }) {
  const server = serviceOf(status, 'database')
  const hostRegion = serviceOf(status, 'gateway')?.region ?? serviceOf(status, 'functions')?.region ?? serviceOf(status, 'pods')?.region
  const far = server?.region && hostRegion && server.region !== hostRegion
  const kinds = statementKinds(db, F.kinds)
  const items = [
    { label: F.db.time, value: mono(duration(db.ms)) },
    { label: F.db.statements, value: mono(String(db.statements)) },
    { label: F.db.byKind, value: kinds ? mono(kinds) : '-' },
    { label: F.db.connection, value: db.connectionMs !== undefined ? mono(`${decimal(db.connectionMs, 1)} ms`) : F.detail.unknown },
    { label: F.db.share, value: mono(`${decimal(db.share * 100, 0)}%`) },
    { label: F.db.server, value: server ? mono(server.name) : F.detail.unknown },
    { label: F.db.region, value: server?.region ? mono(server.region) : F.detail.unknown },
  ]
  return (
    <SpaceBetween size="xs">
      {compact
        ? <ul className="fl-pop-list">{items.map((i) => <li key={i.label}><span>{i.label}</span><span>{i.value}</span></li>)}</ul>
        : <KeyValuePairs columns={3} items={items} />}
      {far && <Box fontSize="body-s" color="text-body-secondary">{F.db.otherRegion(server!.region!, hostRegion!)}</Box>}
      {db.fromDetail && <Box fontSize="body-s" color="text-body-secondary">{F.db.fromDetail}</Box>}
    </SpaceBetween>
  )
}

/** The instance that answered. The Functions host reports no instance id: then the function app name and a note. */
function InstanceText({ model, status }: { model: FlowModel; status?: PlatformStatus | null }) {
  if (model.instance) return mono(model.instance)
  const app = model.host === 'functions' ? serviceOf(status, 'functions')?.name : undefined
  if (!app) return <>{F.detail.unknown}</>
  return <span>{mono(app)} <Box variant="span" color="text-body-secondary" fontSize="body-s">({F.noInstanceId})</Box></span>
}

/** The selected request in the inspector: summary, flow + replay, stage checklist, database, build, copy. */
export function RequestDetail({ record, status }: { record: CallRecord; status?: PlatformStatus | null }) {
  const D = F.detail
  const model = useFlowModel(record, status)!
  const trace = record.trace
  const speed = speedOf(trace)
  const edgeMs = record.browserMs !== undefined ? Math.max(0, record.browserMs - trace.totalMs) : undefined
  const build = buildOf(status)
  const total = model.totalMs || model.durationMs
  return (
    <SpaceBetween size="l">
      <KeyValuePairs
        columns={2}
        items={[
          { label: D.request, value: mono(record.label) },
          {
            label: D.status,
            value: record.ok
              ? <StatusIndicator type="success">{F.inline.ok(record.status ?? 200)}</StatusIndicator>
              : <StatusIndicator type="error">{F.inline.failed(record.status ?? 0, record.code)}{record.message ? `: ${record.message}` : ''}</StatusIndicator>,
          },
          { label: D.host, value: AppT.host[trace.host] },
          { label: D.instance, value: <InstanceText model={model} status={status} /> },
          {
            label: D.browserTotal,
            value: (
              <SpaceBetween size="xs" direction="horizontal" alignItems="center">
                {mono(record.browserMs !== undefined ? duration(record.browserMs) : '-')}
                <Badge color={speed === 'cold' ? 'blue' : speed === 'slow' ? 'grey' : 'green'}>{D[speed]}</Badge>
              </SpaceBetween>
            ),
          },
          { label: D.gatewayTotal, value: mono(duration(trace.totalMs)) },
          { label: D.edgeNetwork, value: <span title={D.edgeHint}>{mono(edgeMs !== undefined ? `${duration(edgeMs)}${record.browserMs ? ` (${decimal((edgeMs / record.browserMs) * 100, 0)}%)` : ''}` : '-')}</span> },
          {
            label: D.build,
            value: build
              ? <Link external href={`https://github.com/${build.repository}/commit/${build.commit}`}>{mono(build.commit.slice(0, 12))}</Link>
              : D.noBuild,
          },
        ]}
      />
      <RequestFlowView record={record} status={status} />
      <Table
        variant="embedded"
        wrapLines
        header={<Box variant="h3">{D.stagesTitle}</Box>}
        items={model.segments}
        trackBy="stage"
        columnDefinitions={[
          { id: 'stage', header: D.colStage, cell: (s) => F.stageLong[s.stage] ?? s.stage, isRowHeader: true, minWidth: 160 },
          { id: 'status', header: D.colStatus, cell: (s) => <StatusIndicator type={STATUS_TYPE[s.status] ?? 'info'} iconAriaLabel={D.statusText[s.status] ?? s.status} />, width: 76 },
          { id: 'start', header: D.colStart, cell: (s) => monoNowrap(`+${duration(s.start)}`), width: 104 },
          { id: 'ms', header: D.colDuration, cell: (s) => (s.timed ? monoNowrap(duration(s.ms)) : '-'), width: 104 },
          {
            id: 'share', header: D.colShare, width: 140,
            cell: (s) => {
              const pct = total > 0 ? Math.min(100, (s.ms / total) * 100) : 0
              return <span className="fl-share" style={FLOW_VARS}><span className="fl-share-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span><span className="mono">{decimal(pct, 0)}%</span></span>
            },
          },
          { id: 'detail', header: D.colDetail, minWidth: 200, cell: (s) => <Box fontSize="body-s" color={s.status === 'error' ? 'text-status-error' : 'text-body-secondary'}>{s.detail ?? '-'}</Box> },
        ]}
      />
      <SpaceBetween size="xs">
        <Box variant="h3">{F.db.title}</Box>
        {model.db ? <DbBlock db={model.db} status={status} /> : <Box color="text-body-secondary">{F.db.none}</Box>}
      </SpaceBetween>
      <CopyToClipboard variant="button" copyButtonText={D.copy} textToCopy={JSON.stringify({ label: record.label, status: record.status, browserMs: record.browserMs, trace }, null, 2)} copySuccessText={D.copied} copyErrorText={D.copyFailed} />
    </SpaceBetween>
  )
}
