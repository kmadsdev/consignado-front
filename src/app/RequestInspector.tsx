import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Grid from '@cloudscape-design/components/grid'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import { ArchitectureDiagram, LifecycleTimeline } from '../diagram'
import { speedOf } from '../api/client'
import type { TraceRecord } from '../shell/context'
import { Mono, useReplay } from './common'
import { duration } from './format'
import { T } from './strings'

/** The trace of one request: where it went, how long each stage took, cold or warm. */
export function RequestInspector({ record, diagramHeight = 300, stacked = false }: { record: TraceRecord; diagramHeight?: number; stacked?: boolean }) {
  const { trace } = record
  const speed = speedOf(trace)
  const events = useReplay(trace.events, record.at)
  return (
    <SpaceBetween size="m">
      <KeyValuePairs
        columns={4}
        items={[
          { label: T.inspector.request, value: <Mono>{record.label}</Mono> },
          { label: T.inspector.host, value: T.host[trace.host] },
          {
            label: T.inspector.totalTime,
            value: (
              <SpaceBetween size="xs" direction="horizontal" alignItems="center">
                <Mono>{duration(trace.totalMs)}</Mono>
                <Badge color={speed === 'cold' ? 'blue' : speed === 'slow' ? 'grey' : 'green'}>{T.inspector[speed]}</Badge>
              </SpaceBetween>
            ),
          },
          {
            label: T.inspector.result,
            value: record.ok
              ? <StatusIndicator type="success">{T.inspector.ok}</StatusIndicator>
              : <StatusIndicator type="error">{record.message ?? T.inspector.failed}</StatusIndicator>,
          },
        ]}
      />
      {speed === 'cold' && <Box color="text-body-secondary" fontSize="body-s">{T.inspector.coldNote}</Box>}
      <Grid gridDefinition={stacked ? [{ colspan: 12 }, { colspan: 12 }] : [{ colspan: { default: 12, s: 8 } }, { colspan: { default: 12, s: 4 } }]}>
        <div className="diagram-frame">
          <ArchitectureDiagram view={trace.host} events={events} height={diagramHeight} />
        </div>
        <div>
          <Box variant="awsui-key-label">{T.inspector.timeline}</Box>
          <LifecycleTimeline view={trace.host} events={events} />
        </div>
      </Grid>
    </SpaceBetween>
  )
}
