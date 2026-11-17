import Alert from '@cloudscape-design/components/alert'
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Grid from '@cloudscape-design/components/grid'
import Header from '@cloudscape-design/components/header'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActivity, getHosts, getSession, type ActivityItem, type HostStatus, type SessionView } from '../api/client'
import { useAuth } from '../auth'
import { ArchitectureDiagram } from '../diagram'
import { useShell } from '../shell/context'
import { EngineStatus, Gate, Mono, useNow } from './common'
import { duration, relativeTime } from './format'
import { T } from './strings'
import { openWindow } from './windowLink'
import { WindowSlots } from './WindowSlots'

function Overview() {
  const navigate = useNavigate()
  const { me } = useAuth()
  const { engine, traceRecord } = useShell()
  const [hosts, setHosts] = useState<HostStatus[] | null>(null)
  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [session, setSession] = useState<SessionView | null>(null)
  const now = useNow(5000)
  const activeId = me?.activeSessionId

  useEffect(() => {
    let alive = true
    const read = () => {
      Promise.all([getHosts(), getActivity()])
        .then(([h, a]) => { if (alive) { setHosts(h); setActivity(a); setFailed(false) } })
        .catch(() => { if (alive) setFailed(true) })
      if (activeId) getSession(activeId).then((s) => { if (alive) setSession(s) }).catch(() => undefined)
      else setSession(null)
    }
    read()
    const t = window.setInterval(read, 5000)
    return () => { alive = false; window.clearInterval(t) }
  }, [activeId])

  if (!me) return null
  const engineState = engine?.state ?? 'stopped'
  const functions = hosts?.find((h) => h.host === 'functions')
  const aks = hosts?.find((h) => h.host === 'aks')
  const left = Math.max(0, me.windowsMax - me.windowsUsed)

  return (
    <ContentLayout header={<Header variant="h1" description={T.overview.description}>{T.overview.title(me.name)}</Header>}>
      <SpaceBetween size="l">
        {me.status === 'held' && <Alert type="warning" header={T.held.title}>{T.held.text}</Alert>}
        {failed && <Alert type="error" header={T.overview.failedTitle}>{T.overview.failedText}</Alert>}
        <Grid gridDefinition={[{ colspan: { default: 12, s: 5 } }, { colspan: { default: 12, s: 7 } }]}>
          <Container fitHeight header={<Header variant="h2" description={T.overview.engineHint}>{T.overview.engine}</Header>}>
            <SpaceBetween size="s">
              <Box fontSize="heading-l" fontWeight="bold">{engine ? <EngineStatus state={engineState} /> : <StatusIndicator type="loading">{T.common.loading}</StatusIndicator>}</Box>
              <Box>{T.engine.meaning[engineState]}</Box>
              {engine && (
                <KeyValuePairs
                  columns={2}
                  items={[
                    { label: T.overview.since, value: relativeTime(engine.since, now) },
                    { label: T.overview.openWindows, value: <Mono>{engine.activeSessions}</Mono> },
                  ]}
                />
              )}
            </SpaceBetween>
          </Container>
          <Container
            fitHeight
            header={
              <Header
                variant="h2"
                description={T.overview.windowsHint(left, me.windowsMax)}
                actions={
                  activeId
                    ? <Button variant="primary" onClick={() => openWindow(navigate, activeId, me?.email)}>{T.overview.openLive}</Button>
                    : <Button onClick={() => navigate('/app/aks')}>{left > 0 ? T.overview.startWindow : T.overview.requestMore}</Button>
                }
              >
                {T.overview.windows}
              </Header>
            }
          >
            <WindowSlots me={me} activeExpiresAt={session?.expiresAt} activeStarting={session?.state === 'starting'} />
          </Container>
        </Grid>

        <ColumnLayout columns={2}>
          <Container
            fitHeight
            header={<Header variant="h2" description={T.overview.functionsHint} actions={<Button onClick={() => navigate('/app/operations')}>{T.overview.openOperations}</Button>}>{T.host.functions}</Header>}
          >
            <KeyValuePairs
              columns={3}
              items={[
                {
                  label: T.overview.state,
                  value: !functions ? <StatusIndicator type="loading">{T.common.loading}</StatusIndicator>
                    : functions.state === 'warm' ? <StatusIndicator type="success">{T.overview.warm}</StatusIndicator>
                    : <StatusIndicator type="pending">{T.overview.cold}</StatusIndicator>,
                },
                {
                  label: T.overview.lastLatency,
                  value: functions?.lastMs !== undefined
                    ? <SpaceBetween size="xs" direction="horizontal" alignItems="center"><Mono>{duration(functions.lastMs)}</Mono>{functions.lastCold && functions.host === 'functions' && <Badge color="blue">{T.inspector.cold}</Badge>}</SpaceBetween>
                    : <Box color="text-body-secondary">{T.overview.noRequest}</Box>,
                },
                { label: T.overview.availability, value: T.overview.alwaysOn },
              ]}
            />
          </Container>
          <Container
            fitHeight
            header={<Header variant="h2" description={T.overview.aksHint} actions={<Button onClick={() => (activeId ? openWindow(navigate, activeId, me?.email) : navigate('/app/aks'))}>{activeId ? T.overview.openLive : T.overview.openAks}</Button>}>{T.host.aks}</Header>}
          >
            <KeyValuePairs
              columns={3}
              items={[
                { label: T.overview.state, value: aks ? <EngineStatus state={engineState} /> : <StatusIndicator type="loading">{T.common.loading}</StatusIndicator> },
                {
                  label: T.overview.lastLatency,
                  value: aks?.lastMs !== undefined ? <Mono>{duration(aks.lastMs)}</Mono> : <Box color="text-body-secondary">{T.overview.noRequest}</Box>,
                },
                { label: T.overview.availability, value: T.overview.onDemand },
              ]}
            />
          </Container>
        </ColumnLayout>

        <Grid gridDefinition={[{ colspan: { default: 12, m: 7 } }, { colspan: { default: 12, m: 5 } }]}>
          <Container fitHeight header={<Header variant="h2" description={T.overview.diagramHint}>{T.overview.diagram}</Header>}>
            <div className="diagram-frame">
              <ArchitectureDiagram view="overview" events={traceRecord?.trace.events ?? []} height={340} />
            </div>
          </Container>
          <Container fitHeight header={<Header variant="h2" description={T.overview.activityHint}>{T.overview.activity}</Header>}>
            {!activity && <StatusIndicator type="loading">{T.common.loading}</StatusIndicator>}
            {activity && activity.length === 0 && <Box color="text-body-secondary">{T.overview.noActivity}</Box>}
            {activity && activity.length > 0 && (
              <ul className="activity-list">
                {activity.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <span>
                      <Box variant="strong">{item.actor}</Box> {item.text}{' '}
                      <Badge color={item.host === 'aks' ? 'blue' : 'grey'}>{T.hostShort[item.host]}</Badge>
                    </span>
                    <Box color="text-body-secondary" fontSize="body-s"><span style={{ whiteSpace: 'nowrap' }}>{relativeTime(item.ts, now)}</span></Box>
                  </li>
                ))}
              </ul>
            )}
          </Container>
        </Grid>
      </SpaceBetween>
    </ContentLayout>
  )
}

export function OverviewPage() {
  return <Gate title={T.overview.gateTitle}><Overview /></Gate>
}
