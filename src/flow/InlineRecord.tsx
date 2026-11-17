// The compact record that an action leaves where it happened: status, host, HTTP status, time, the path with the
// per-stage times, cold or warm, and a link that opens the request inspector on it.
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Link from '@cloudscape-design/components/link'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import { speedOf } from '../api/map'
import { duration } from '../app/format'
import { T as AppT } from '../app/strings'
import { useShell } from '../shell/context'
import { FLOW_VARS } from './FlowDiagram'
import { buildFlow, pathSteps, statementKinds } from './model'
import type { CallRecord } from './store'
import { F } from './strings'

/** "edge 12 ms > gateway 4 ms > load balancer 9 ms > app 6 ms > database 31 ms (1 insert, 2 select)" */
export function pathLine(record: CallRecord): string {
  const model = buildFlow(record.trace)
  return pathSteps(model).map((s) => {
    const extra = s.stage === 'database' && model.db && model.db.statements > 0 ? ` (${statementKinds(model.db, F.kinds)})` : ''
    return `${F.stage[s.stage] ?? s.stage} ${duration(s.ms)}${extra}`
  }).join(' > ')
}

export function InlineRecord({ record, onOpen }: { record: CallRecord | null | undefined; onOpen?: () => void }) {
  const { openInspector } = useShell()
  if (!record) return null
  const speed = speedOf(record.trace)
  const total = record.browserMs ?? record.trace.totalMs
  return (
    <div className={`fl-inline${record.ok ? '' : ' fl-inline-error'}`} style={FLOW_VARS} data-record={record.id}>
      <SpaceBetween size="xxs">
        <SpaceBetween size="xs" direction="horizontal" alignItems="center">
          {record.ok
            ? <StatusIndicator type="success">{F.inline.ok(record.status ?? 200)}</StatusIndicator>
            : <StatusIndicator type="error">{F.inline.failed(record.status ?? 0, record.code)}</StatusIndicator>}
          <Badge color={record.trace.host === 'aks' ? 'blue' : 'grey'}>{AppT.hostShort[record.trace.host]}</Badge>
          <span className="mono">{duration(total)}</span>
          <Badge color={speed === 'cold' ? 'blue' : speed === 'slow' ? 'grey' : 'green'}>{F.inline[speed]}</Badge>
          <span className="mono">{record.label}</span>
          <Link onFollow={() => { onOpen?.(); openInspector(record.id) }} ariaLabel={`${F.inline.open}: ${record.label}`}>{F.inline.open}</Link>
        </SpaceBetween>
        {!record.ok && record.message && <Box color="text-status-error" fontSize="body-s">{record.message}</Box>}
        <div className="fl-inline-path mono">{pathLine(record)}</div>
      </SpaceBetween>
    </div>
  )
}
