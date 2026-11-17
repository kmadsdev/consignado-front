import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Grid from '@cloudscape-design/components/grid'
import Header from '@cloudscape-design/components/header'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Modal from '@cloudscape-design/components/modal'
import ProgressBar from '@cloudscape-design/components/progress-bar'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, COMPRESSED_START_MS, WINDOW_MINUTES, endSession, getSession, type SessionView } from '../api/client'
import { AKS_STAGES } from '../api/stages'
import { useAuth } from '../auth'
import { POLL } from '../config'
import { ArchitectureDiagram, LifecycleTimeline } from '../diagram'
import { useShell } from '../shell/context'
import { CenteredSpinner, CopyId, Gate, Mono, useNow } from './common'
import { clock, dateTime, duration } from './format'
import { Operations } from './Operations'
import { T } from './strings'
import { WindowPreview } from './WindowPreview'

/** The stages of a cluster start, from the request to the first answer of the API. */
const START_STAGES: readonly string[] = AKS_STAGES.slice(0, AKS_STAGES.indexOf('window-open'))
/** After a window ends, the page waits this long for the "cluster stopped" event. Then it stops reading. */
const MAX_READS_AFTER_END = 60

function LiveWindow({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate()
  const { me, refresh } = useAuth()
  const { refreshEngine } = useShell()
  const [session, setSession] = useState<SessionView | null>(null)
  const [failure, setFailure] = useState<{ status: number; message: string } | null>(null)
  const lastState = useRef<string>('')
  const now = useNow(250)

  const [pollProblem, setPollProblem] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endProblem, setEndProblem] = useState('')
  const endNow = async () => {
    setEnding(true); setEndProblem('')
    try {
      setSession(await endSession(sessionId))
      setConfirmEnd(false)
      refreshEngine(); void refresh()
    } catch (err) {
      // A 404 with no code: the gateway has no such route yet.
      setEndProblem(err instanceof ApiError && err.status === 404 && !err.code ? T.live.endNotAvailable : err instanceof Error ? err.message : T.common.failed)
    } finally { setEnding(false) }
  }

  useEffect(() => {
    let alive = true
    let timer = 0
    let readsAfterEnd = 0
    let seen = false
    const read = async () => {
      try {
        const s = await getSession(sessionId)
        if (!alive) return
        seen = true
        setSession(s); setFailure(null); setPollProblem(false)
        if (s.state !== lastState.current) { lastState.current = s.state; refreshEngine(); void refresh() }
        const stopped = s.events.some((e) => e.stage === 'cluster-stop' && e.status === 'done')
        const over = s.state === 'ended' || s.state === 'failed'
        if (over) readsAfterEnd += 1
        if (!stopped && readsAfterEnd < MAX_READS_AFTER_END) timer = window.setTimeout(read, s.state === 'starting' ? POLL.sessionStarting : POLL.sessionReady)
      } catch (err) {
        if (!alive) return
        const status = err instanceof ApiError ? err.status : 0
        // A short problem (network, a busy gateway) must not take the page away: keep the last state and read again.
        const transient = status === 0 || status === 429 || status >= 500
        if (seen && transient) setPollProblem(true)
        else setFailure({ status, message: err instanceof Error ? err.message : T.common.failed })
        if (transient) timer = window.setTimeout(read, 5000)
      }
    }
    void read()
    return () => { alive = false; window.clearTimeout(timer) }
  }, [sessionId, refresh, refreshEngine])

  const header = (
    <Header
      variant="h1"
      description={T.live.description(me?.windowMinutes ?? WINDOW_MINUTES)}
    >
      {T.live.title}{' '}
      <Box display="inline" fontSize="heading-m" color="text-body-secondary"><Mono>{sessionId}</Mono></Box>{' '}
      <CopyId value={sessionId} label={T.live.sessionId} />
    </Header>
  )

  if (failure && !session) {
    return (
      <ContentLayout header={header}>
        <Container>
          <SpaceBetween size="m">
            <Alert type={failure.status === 404 ? 'info' : 'error'} header={failure.status === 404 ? T.live.notFoundTitle : T.live.failedTitle}>
              {failure.status === 404 ? T.live.notFoundText : failure.message}
            </Alert>
            <Button onClick={() => navigate('/app/aks')}>{T.live.backToAks}</Button>
          </SpaceBetween>
        </Container>
      </ContentLayout>
    )
  }
  if (!session) return <ContentLayout header={header}><CenteredSpinner text={T.live.loading} /></ContentLayout>

  const requestedAt = new Date(session.requestedAt).getTime()
  const expiresAt = session.expiresAt ? new Date(session.expiresAt).getTime() : 0
  const remaining = session.state === 'ready' ? Math.max(0, expiresAt - now) : 0
  // The window length of this session (per user since the admin setting); before it is ready: the owner's setting.
  const windowMs = session.readyAt && expiresAt ? expiresAt - new Date(session.readyAt).getTime() : (me?.windowMinutes ?? WINDOW_MINUTES) * 60_000
  const doneStages = new Set(session.events.filter((e) => e.status === 'done' && START_STAGES.includes(e.stage)).map((e) => e.stage)).size
  // The mock plays a fixed 40 s. A real start has no fixed length: the bar shows the stages that are done.
  const startPercent = session.compressed
    ? Math.min(100, ((now - requestedAt) / COMPRESSED_START_MS) * 100)
    : Math.min(100, (doneStages / START_STAGES.length) * 100)
  const elapsed = clock(Math.max(0, now - requestedAt))
  const currentStage = [...session.events].reverse().find((e) => e.status === 'active')
  const readyNote = !session.compressed && session.coldStartMs !== undefined && session.coldStartMs < 60_000 ? ` (${T.live.alreadyRunning})` : ''
  // After 8 minutes a real start is slower than usual: say so, with the last signal of the gateway.
  const lastSignal = session.events[session.events.length - 1]
  const slowStart = !session.compressed && now - requestedAt > 8 * 60_000 && lastSignal ? T.live.slowStart(lastSignal.detail ?? lastSignal.stage) : ''
  const failedStage = [...session.events].reverse().find((e) => e.status === 'error') ?? session.events[session.events.length - 1]
  const windowLength = session.readyAt && session.endedAt ? new Date(session.endedAt).getTime() - new Date(session.readyAt).getTime() : 0
  const stopped = session.events.some((e) => e.stage === 'cluster-stop' && e.status === 'done')

  return (
    <ContentLayout header={header}>
      <SpaceBetween size="l">
        {pollProblem && <Alert type="warning">{T.live.pollProblem}</Alert>}
        {session.state === 'failed' && (
          <Container header={<Header variant="h2">{T.live.failedStartTitle}</Header>}>
            <SpaceBetween size="m">
              <Alert type="error">{T.live.failedStartText}</Alert>
              <KeyValuePairs
                columns={3}
                items={[
                  { label: T.live.failedStage, value: failedStage ? <><Mono>{failedStage.stage}</Mono>{failedStage.detail ? `: ${failedStage.detail}` : ''}</> : '-' },
                  { label: T.live.endedAt, value: session.endedAt ? dateTime(session.endedAt) : '-' },
                  { label: T.live.next, value: T.live.nextText(me ? Math.max(0, me.windowsMax - me.windowsUsed) : 0) },
                ]}
              />
              <SpaceBetween size="xs" direction="horizontal">
                <Button variant="primary" onClick={() => navigate('/app/aks')}>{T.live.backToAks}</Button>
                <Button onClick={() => navigate('/app/operations')}>{T.live.toOperations}</Button>
              </SpaceBetween>
            </SpaceBetween>
          </Container>
        )}
        {session.state === 'starting' && (
          <Container>
            <Grid gridDefinition={[{ colspan: { default: 12, s: 4 } }, { colspan: { default: 12, s: 8 } }]}>
              <div>
                <Box variant="awsui-key-label">{T.live.countdown}</Box>
                <Box color="text-status-inactive"><span className="mono countdown">{clock(windowMs)}</span></Box>
                <Box color="text-body-secondary" fontSize="body-s">{T.live.countdownWaits}</Box>
              </div>
              <SpaceBetween size="s">
                {Boolean(slowStart) && <Alert type="info">{slowStart}</Alert>}
                <ProgressBar
                  value={startPercent}
                  label={T.live.starting}
                  description={currentStage?.detail ?? T.live.startingHint}
                  additionalInfo={session.compressed ? T.live.compressedNote : T.live.realStartNote(elapsed, doneStages, START_STAGES.length)}
                />
                <Box><Button onClick={() => { setEndProblem(''); setConfirmEnd(true) }}>{T.live.end}</Button></Box>
              </SpaceBetween>
            </Grid>
          </Container>
        )}
        {session.state === 'ready' && (
          <Container>
            <Grid gridDefinition={[{ colspan: { default: 12, s: 4 } }, { colspan: { default: 12, s: 8 } }]}>
              <div aria-live="off">
                <Box variant="awsui-key-label">{T.live.countdown}</Box>
                <Box color={remaining < 60_000 ? 'text-status-warning' : 'text-status-success'}><span className="mono countdown">{clock(remaining)}</span></Box>
                <Box color="text-body-secondary" fontSize="body-s">{T.live.countdownRuns(dateTime(session.expiresAt!))}</Box>
              </div>
              <SpaceBetween size="s">
                <KeyValuePairs
                  columns={3}
                  items={[
                    { label: T.live.state, value: <StatusIndicator type="success">{T.live.ready}</StatusIndicator> },
                    { label: T.live.coldStart, value: <><Mono>{duration(session.coldStartMs ?? 0)}</Mono>{readyNote}</> },
                    { label: T.live.requests, value: <Mono>{session.requestCount}</Mono> },
                  ]}
                />
                <ProgressBar value={(remaining / windowMs) * 100} ariaLabel={T.live.countdown} additionalInfo={remaining < 60_000 ? T.live.lastMinute : session.compressed ? T.live.compressedNote : T.live.realReadyNote} status="in-progress" />
                <Box><Button onClick={() => { setEndProblem(''); setConfirmEnd(true) }}>{T.live.end}</Button></Box>
              </SpaceBetween>
            </Grid>
          </Container>
        )}
        {(session.state === 'starting' || session.state === 'ready') && <WindowPreview ready={session.state === 'ready'} />}
        {session.state === 'ended' && (
          <Container header={<Header variant="h2" description={T.live.endedHint}>{T.live.endedTitle}</Header>}>
            <SpaceBetween size="l">
              <KeyValuePairs
                columns={4}
                items={[
                  { label: T.live.coldStart, value: session.coldStartMs ? <><Mono>{duration(session.coldStartMs)}</Mono>{readyNote}</> : T.live.neverReady },
                  { label: T.live.windowLength, value: <Mono>{windowLength ? duration(windowLength) : '-'}</Mono> },
                  { label: T.live.requests, value: <Mono>{session.requestCount}</Mono> },
                  { label: T.live.endedAt, value: session.endedAt ? dateTime(session.endedAt) : '-' },
                ]}
              />
              <div>
                <Box variant="awsui-key-label">{T.live.next}</Box>
                <SpaceBetween size="xs">
                  {stopped
                    ? <StatusIndicator type="stopped">{T.live.clusterStopped}</StatusIndicator>
                    : <StatusIndicator type="in-progress">{T.live.clusterStopping}</StatusIndicator>}
                  <Box>{T.live.nextText(me ? Math.max(0, me.windowsMax - me.windowsUsed) : 0)}</Box>
                </SpaceBetween>
              </div>
              <SpaceBetween size="xs" direction="horizontal">
                <Button variant="primary" onClick={() => navigate('/app/operations')}>{T.live.toOperations}</Button>
                <Button onClick={() => navigate('/app/aks')}>{T.live.backToAks}</Button>
              </SpaceBetween>
            </SpaceBetween>
          </Container>
        )}

        <Container header={<Header variant="h2" description={T.live.diagramHint}>{T.live.diagram}</Header>}>
          <div className="diagram-frame">
            <ArchitectureDiagram view="aks" events={session.events} height={640} />
          </div>
        </Container>
        <Container header={<Header variant="h2" description={T.live.timelineHint}>{T.live.timeline}</Header>}>
          <LifecycleTimeline view="aks" events={session.events} />
        </Container>

        {session.state === 'ready' && me && (
          <SpaceBetween size="m">
            <Header variant="h2" description={T.live.opsHint}>{T.live.ops}</Header>
            <Operations host="aks" canWrite={me.status === 'active'} readOnlyReason={T.held.readOnly} />
          </SpaceBetween>
        )}
        {confirmEnd && (session.state === 'ready' || session.state === 'starting') && (
          <Modal
            visible onDismiss={() => setConfirmEnd(false)} header={T.live.endTitle}
            footer={<Box float="right"><SpaceBetween size="xs" direction="horizontal"><Button variant="link" onClick={() => setConfirmEnd(false)}>{T.common.cancel}</Button><Button variant="primary" loading={ending} onClick={() => void endNow()}>{T.live.endConfirm}</Button></SpaceBetween></Box>}
          >
            <SpaceBetween size="m">
              <Box>{T.live.endText}</Box>
              {Boolean(endProblem) && <Alert type="info">{endProblem}</Alert>}
            </SpaceBetween>
          </Modal>
        )}
      </SpaceBetween>
    </ContentLayout>
  )
}

export function LiveWindowPage() {
  const { sessionId = '' } = useParams()
  return <Gate title={T.live.title}><LiveWindow key={sessionId} sessionId={sessionId} /></Gate>
}
