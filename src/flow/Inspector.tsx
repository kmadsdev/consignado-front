// The request inspector: the content of the right-side drawer of the AppLayout.
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import Tabs from '@cloudscape-design/components/tabs'
import { speedOf } from '../api/map'
import { duration } from '../app/format'
import { T as AppT } from '../app/strings'
import { LOCALE } from '../i18n/lang.ts'
import { useShell } from '../shell/context'
import { LifecycleReplay } from './LifecycleReplay'
import { RequestDetail } from './RequestView'
import { requestStore, useRequests } from './session'
import { usePlatformStatus } from './status'
import { splitLabel, type CallRecord } from './store'
import { F } from './strings'

const clock = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' })

export function InspectorContent() {
  const I = F.inspector
  const { inspectorSelected, selectRequest, clusterRun, inspectorTab, setInspectorTab } = useShell()
  const list = useRequests()
  const selected = list.find((r) => r.id === inspectorSelected) ?? list[0] ?? null
  const live = usePlatformStatus(selected?.trace.host ?? null, Boolean(selected))

  const requestsTab = (
    <SpaceBetween size="l">
      <Table<CallRecord>
        variant="embedded"
        header={
          <Header counter={`(${list.length})`} actions={<Button variant="inline-link" onClick={() => requestStore.clear()} disabled={list.length === 0}>{I.clear}</Button>}>
            {I.tabRequests}
          </Header>
        }
        items={list}
        trackBy="id"
        selectionType="single"
        selectedItems={selected ? [selected] : []}
        onSelectionChange={(e) => selectRequest(e.detail.selectedItems[0]?.id ?? null)}
        onRowClick={(e) => selectRequest(e.detail.item.id)}
        ariaLabels={{ selectionGroupLabel: I.tabRequests, itemSelectionLabel: (_s, r) => r.label, allItemsSelectionLabel: () => I.tabRequests }}
        empty={<Box color="text-body-secondary" padding="s">{I.empty}</Box>}
        wrapLines={false}
        stickyHeader={false}
        columnDefinitions={[
          { id: 'time', header: I.colTime, cell: (r) => <span className="mono">{clock.format(new Date(r.at))}</span> },
          {
            id: 'status', header: I.colStatus,
            cell: (r) => r.ok
              ? <StatusIndicator type="success">{r.status ?? 200}</StatusIndicator>
              : <StatusIndicator type="error">{r.status || I.errorMark}</StatusIndicator>,
          },
          { id: 'method', header: I.colMethod, cell: (r) => <span className="mono">{splitLabel(r.label).method}</span> },
          { id: 'path', header: I.colPath, cell: (r) => <span className="mono" title={r.label}>{splitLabel(r.label).path}</span> },
          { id: 'host', header: I.colHost, cell: (r) => <Badge color={r.trace.host === 'aks' ? 'blue' : 'grey'}>{AppT.hostShort[r.trace.host]}</Badge> },
          { id: 'total', header: I.colTotal, cell: (r) => <span className="mono">{duration(r.browserMs ?? r.trace.totalMs)}</span> },
          { id: 'speed', header: I.colSpeed, cell: (r) => { const s = speedOf(r.trace); return <Badge color={s === 'cold' ? 'blue' : s === 'slow' ? 'grey' : 'green'}>{F.inline[s]}</Badge> } },
        ]}
      />
      {selected
        ? (
          <SpaceBetween size="s">
            <Header variant="h3" description={selected.label}>{I.selected}</Header>
            <RequestDetail key={selected.id} record={selected} status={live.status} />
          </SpaceBetween>
        )
        : null}
    </SpaceBetween>
  )

  const clusterTab = clusterRun
    ? (
      <SpaceBetween size="s">
        <Header variant="h3">{I.clusterTitle}</Header>
        <LifecycleReplay events={clusterRun.events} runKey={`drawer-${clusterRun.key}`} autoPlay={false} showDiagram={false} />
      </SpaceBetween>
    )
    : <Box color="text-body-secondary">{I.clusterEmpty}</Box>

  return (
    <Box padding={{ horizontal: 'l', bottom: 'l' }}>
      <SpaceBetween size="s">
        <Box variant="h2" padding={{ top: 'm' }}>{I.title}</Box>
        {clusterRun
          ? (
            <Tabs
              activeTabId={inspectorTab}
              onChange={(e) => setInspectorTab(e.detail.activeTabId as 'requests' | 'cluster')}
              tabs={[
                { id: 'requests', label: I.tabRequests, content: requestsTab },
                { id: 'cluster', label: I.tabCluster, content: clusterTab },
              ]}
            />
          )
          : requestsTab}
      </SpaceBetween>
    </Box>
  )
}
