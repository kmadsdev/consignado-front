import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import FormField from '@cloudscape-design/components/form-field'
import Header from '@cloudscape-design/components/header'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import Textarea from '@cloudscape-design/components/textarea'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WINDOW_MINUTES, getSession, listMySessions, sendContact, startSession, type SessionView } from '../api/client'
import { useAuth } from '../auth'
import { MOCK, POLL } from '../config'
import { useShell } from '../shell/context'
import { CopyId, EngineStatus, Gate, Mono } from './common'
import { Explain } from './Explain'
import { dateTime, duration } from './format'
import { T } from './strings'
import { openWindow } from './windowLink'
import { WindowSlots } from './WindowSlots'

function RequestMore() {
  const { me } = useAuth()
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentId, setSentId] = useState('')
  const [failure, setFailure] = useState('')
  const error = reason.trim().length >= 20 ? '' : T.aks.moreErr
  if (!me) return null
  if (sentId) {
    return <Alert type="success" header={T.aks.moreSentTitle}>{T.aks.moreSentText} <Mono>{sentId}</Mono></Alert>
  }
  const submit = async () => {
    setTouched(true)
    if (error) return
    setSending(true); setFailure('')
    try {
      const req = await sendContact({ kind: 'more-windows', name: me.name, email: me.email, message: reason.trim() })
      setSentId(req.id)
    } catch (err) {
      setFailure(err instanceof Error ? err.message : T.common.failed)
    } finally { setSending(false) }
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <SpaceBetween size="m">
        <Alert type="info" header={T.aks.noneLeftTitle}>{T.aks.noneLeftText(me.windowsMax)}</Alert>
        {Boolean(failure) && <Alert type="error">{failure}</Alert>}
        <FormField label={T.aks.moreLabel} description={T.aks.moreHint} errorText={touched ? error : ''} constraintText={T.aks.moreConstraint(reason.trim().length)} stretch>
          <Textarea value={reason} onChange={(e) => setReason(e.detail.value)} rows={4} placeholder={T.aks.morePlaceholder} />
        </FormField>
        <Button variant="primary" loading={sending}>{T.aks.moreSubmit}</Button>
      </SpaceBetween>
    </form>
  )
}

function Aks() {
  const navigate = useNavigate()
  const { me, refresh } = useAuth()
  const { engine, notify, refreshEngine } = useShell()
  const [sessions, setSessions] = useState<SessionView[] | null>(null)
  const [active, setActive] = useState<SessionView | null>(null)
  const [starting, setStarting] = useState(false)
  const activeId = me?.activeSessionId
  const minutes = me?.windowMinutes ?? WINDOW_MINUTES

  useEffect(() => {
    let alive = true
    listMySessions().then((s) => { if (alive) setSessions(s) }).catch(() => { if (alive) setSessions([]) })
    return () => { alive = false }
  }, [activeId])
  useEffect(() => {
    let alive = true
    if (!activeId) { setActive(null); return }
    const read = () => getSession(activeId).then((s) => { if (alive) setActive(s) }).catch(() => undefined)
    void read()
    const t = window.setInterval(() => { void read(); void refresh() }, POLL.me)
    return () => { alive = false; window.clearInterval(t) }
  }, [activeId, refresh])

  if (!me) return null
  const engineState = engine?.state ?? 'stopped'
  const left = Math.max(0, me.windowsMax - me.windowsUsed)
  const held = me.status === 'held'
  const paused = engineState === 'paused'

  const start = async () => {
    setStarting(true)
    try {
      const session = await startSession()
      await refresh()
      refreshEngine()
      openWindow(navigate, session.id, me?.email)
    } catch (err) {
      notify({ type: 'error', header: T.aks.startFailed, content: err instanceof Error ? err.message : T.common.failed })
    } finally { setStarting(false) }
  }

  let action
  if (activeId) {
    action = (
      <SpaceBetween size="s">
        <Alert type="success" header={active?.state === 'starting' ? T.aks.activeStartingTitle : T.aks.activeTitle}
          action={<Button variant="primary" onClick={() => openWindow(navigate, activeId, me.email)}>{T.aks.openLive}</Button>}>
          {T.aks.activeText} <Mono>{activeId}</Mono>
        </Alert>
      </SpaceBetween>
    )
  } else if (held) {
    action = <Alert type="warning" header={T.held.title}>{T.held.aksText}</Alert>
  } else if (paused) {
    action = <Alert type="warning" header={T.aks.pausedTitle}>{engine?.pausedReason === 'budget' ? T.aks.pausedBudget : T.aks.pausedAdmin}</Alert>
  } else if (left === 0) {
    action = <RequestMore />
  } else {
    action = (
      <SpaceBetween size="s">
        <Box>
          <Button variant="primary" iconName="caret-right-filled" loading={starting} onClick={() => void start()}>{T.aks.start(minutes)}</Button>
        </Box>
        <Box color="text-body-secondary" fontSize="body-s">{T.aks.startHint(left)}</Box>
      </SpaceBetween>
    )
  }

  return (
    <ContentLayout header={<Header variant="h1" description={T.aks.description(minutes)}>{T.aks.title}</Header>}>
      <SpaceBetween size="l">
        <Container
          header={<Header variant="h2" description={T.aks.howHint}>{T.aks.how}</Header>}
          footer={<SpaceBetween size="s"><Explain text={T.explain.window} /><Explain text={T.explain.start} /></SpaceBetween>}
        >
          <KeyValuePairs
            columns={4}
            items={[
              { label: T.aks.whatStarts, value: T.aks.whatStartsText },
              { label: T.aks.coldStart, value: T.aks.coldStartText },
              { label: T.aks.window, value: T.aks.windowText(minutes) },
              { label: T.aks.cost, value: T.aks.costText },
            ]}
          />
        </Container>
        <Container
          header={
            <Header variant="h2" description={T.aks.yoursHint(me.windowsUsed, me.windowsMax)} info={<Box display="inline" color="text-body-secondary" fontSize="body-s">{T.aks.engineIs} <EngineStatus state={engineState} /></Box>}>
              {T.aks.yours}
            </Header>
          }
        >
          <SpaceBetween size="l">
            <WindowSlots me={me} activeExpiresAt={active?.expiresAt} activeStarting={active?.state === 'starting'} />
            {action}
            <Box color="text-body-secondary" fontSize="body-s">
              {MOCK ? T.aks.urlNote : T.aks.urlNoteReal} <Mono>https://cluster.consignado.kmads.dev/app/&lt;id&gt;/aks/</Mono>
            </Box>
          </SpaceBetween>
        </Container>
        <Table
          header={<Header variant="h2" counter={sessions ? `(${sessions.length})` : undefined} description={me && sessions && me.windowsUsed > sessions.length ? `${T.aks.pastHint} ${T.aks.pastElsewhere(me.windowsUsed, sessions.length)}` : T.aks.pastHint}>{T.aks.past}</Header>}
          loading={!sessions}
          loadingText={T.common.loading}
          items={sessions ?? []}
          trackBy="id"
          columnDefinitions={[
            { id: 'id', header: T.aks.colId, cell: (s) => <SpaceBetween size="xxs" direction="horizontal" alignItems="center"><Mono>{s.id}</Mono><CopyId value={s.id} /></SpaceBetween>, isRowHeader: true },
            { id: 'requested', header: T.aks.colRequested, cell: (s) => dateTime(s.requestedAt) },
            { id: 'state', header: T.aks.colState, cell: (s) => s.state === 'ended' ? <StatusIndicator type="stopped">{T.sessionState.ended}</StatusIndicator> : s.state === 'ready' ? <StatusIndicator type="success">{T.sessionState.ready}</StatusIndicator> : s.state === 'starting' ? <StatusIndicator type="in-progress">{T.sessionState.starting}</StatusIndicator> : <StatusIndicator type="error">{T.sessionState.failed}</StatusIndicator> },
            { id: 'cold', header: T.aks.colCold, cell: (s) => s.coldStartMs ? <Mono>{duration(s.coldStartMs)}</Mono> : '-' },
            { id: 'requests', header: T.aks.colRequests, cell: (s) => <Mono>{s.requestCount}</Mono> },
          ]}
          empty={
            <Box textAlign="center" color="inherit" padding={{ vertical: 'm' }}>
              <Box variant="strong" color="inherit">{T.aks.noPast}</Box>
              <Box color="text-body-secondary">{T.aks.noPastText}</Box>
            </Box>
          }
        />
      </SpaceBetween>
    </ContentLayout>
  )
}

export function AksPage() {
  return <Gate title={T.aks.title}><Aks /></Gate>
}
