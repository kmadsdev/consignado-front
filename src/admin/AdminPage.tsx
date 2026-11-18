import Alert from '@cloudscape-design/components/alert'
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import FormField from '@cloudscape-design/components/form-field'
import Header from '@cloudscape-design/components/header'
import Input from '@cloudscape-design/components/input'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Link from '@cloudscape-design/components/link'
import Modal from '@cloudscape-design/components/modal'
import ProgressBar from '@cloudscape-design/components/progress-bar'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import Tabs from '@cloudscape-design/components/tabs'
import Toggle from '@cloudscape-design/components/toggle'
import { useCallback, useEffect, useState } from 'react'
import {
  ApiError, adminDeleteUser, adminGetState, adminListContacts, adminListSessions, adminListUsers, adminSetPaused, adminSetWindowSettings, adminStopEngine, adminUserAction, WINDOW_MINUTES,
  type AdminSession, type AdminUserAction,
} from '../api/client'
import type { AdminState, AdminUser, ContactRequest } from '../api/types'
import { CopyId, EngineStatus, Gate, Mono } from '../app/common'
import { DataTable, type Column } from '../app/DataTable'
import { dateTime, duration, moneyIn, relativeTime } from '../app/format'
import { useShell } from '../shell/context'
import { Explain } from '../app/Explain'
import { A } from './strings'
import { windowCostIn } from '../app/cost'
import { toBudget } from '../api/map'


function Admin() {
  const { notify, refreshEngine } = useShell()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [sessions, setSessions] = useState<AdminSession[] | null>(null)
  const [state, setState] = useState<AdminState | null>(null)
  const [contacts, setContacts] = useState<ContactRequest[] | null>(null)
  // One error per table: a failed call shows its own error and a retry, never an empty table.
  const [failed, setFailed] = useState<Partial<Record<'users' | 'sessions' | 'state' | 'contacts', string>>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<'grant' | 'block' | 'pause' | 'stop' | 'settings' | 'delete' | null>(null)
  const [grant, setGrant] = useState('1')
  const [maxText, setMaxText] = useState('3')
  const [minutesText, setMinutesText] = useState('15')

  const loadOne = useCallback((key: 'users' | 'sessions' | 'state' | 'contacts') => {
    setFailed((f) => ({ ...f, [key]: undefined }))
    const fail = (err: unknown) => setFailed((f) => ({ ...f, [key]: err instanceof Error ? err.message : A.loadFailed }))
    if (key === 'users') adminListUsers().then(setUsers).catch(fail)
    if (key === 'sessions') adminListSessions().then(setSessions).catch(fail)
    if (key === 'state') adminGetState().then(setState).catch(fail)
    if (key === 'contacts') adminListContacts().then(setContacts).catch(fail)
  }, [])
  const load = useCallback(() => { (['users', 'sessions', 'state', 'contacts'] as const).forEach(loadOne) }, [loadOne])
  const tableError = (key: 'users' | 'sessions' | 'state' | 'contacts') => (
    <Alert type="error" header={A.extra.tableFailed} action={<Button onClick={() => loadOne(key)}>{A.retry}</Button>}>{failed[key]}</Alert>
  )
  const deleteUser = async () => {
    if (!user) return
    setBusy(true)
    try {
      await adminDeleteUser(user.id)
      setUsers((list) => list?.filter((u) => u.id !== user.id) ?? null)
      notify({ type: 'success', content: A.extra.deleted(user.name || user.email) })
      setUserId(null); setModal(null)
      loadOne('sessions'); loadOne('contacts')
    } catch (err) {
      const text = err instanceof ApiError && err.code === 'self-delete' ? A.extra.selfDelete
        : err instanceof ApiError && (err.status === 404 || err.status === 400) && err.code !== 'not-found' ? A.extra.notAvailable
          : err instanceof Error ? err.message : A.loadFailed
      notify({ type: 'error', header: A.users.failed, content: text })
    } finally { setBusy(false) }
  }
  useEffect(() => {
    load()
    const t = window.setInterval(() => { adminGetState().then(setState).catch(() => undefined) }, 5000)
    return () => window.clearInterval(t)
  }, [load])

  const user = users?.find((u) => u.id === userId) ?? null
  const grantNumber = Number(grant)
  const grantValid = Number.isInteger(grantNumber) && grantNumber >= 1 && grantNumber <= 10

  const act = async (action: AdminUserAction, windows?: number) => {
    if (!user) return
    setBusy(true)
    try {
      const next = await adminUserAction(user.id, action, windows)
      setUsers((list) => list?.map((u) => (u.id === next.id ? { ...u, ...next } : u)) ?? null)
      notify({ type: 'success', content: A.users.done(next.name || next.email, A.users.doneWhat[action]) })
      setModal(null)
    } catch (err) {
      notify({ type: 'error', header: A.users.failed, content: err instanceof Error ? err.message : A.loadFailed })
    } finally { setBusy(false) }
  }
  const W = A.windowSettings
  const maxNumber = Number(maxText), minutesNumber = Number(minutesText)
  const maxValid = maxText.trim() !== '' && Number.isInteger(maxNumber) && maxNumber >= 0 && maxNumber <= 50
  const minutesValid = minutesText.trim() !== '' && Number.isInteger(minutesNumber) && minutesNumber >= 5 && minutesNumber <= 60
  const saveSettings = async () => {
    if (!user || !maxValid || !minutesValid) return
    setBusy(true)
    try {
      const next = await adminSetWindowSettings(user.id, { windowsMax: maxNumber, windowMinutes: minutesNumber })
      setUsers((list) => list?.map((u) => (u.id === next.id ? { ...u, ...next } : u)) ?? null)
      notify({ type: 'success', content: W.done(next.name || next.email) })
      setModal(null)
    } catch (err) {
      notify({ type: 'error', header: A.users.failed, content: err instanceof Error ? err.message : A.loadFailed })
    } finally { setBusy(false) }
  }
  const engineAct = async (fn: () => Promise<AdminState>) => {
    setBusy(true)
    try {
      setState(await fn())
      refreshEngine()
      notify({ type: 'success', content: A.engine.done })
      adminListSessions().then(setSessions).catch(() => undefined)
      setModal(null)
    } catch (err) {
      notify({ type: 'error', header: A.users.failed, content: err instanceof Error ? err.message : A.loadFailed })
    } finally { setBusy(false) }
  }

  const userColumns: Column<AdminUser>[] = [
    {
      id: 'name', header: A.users.colName, sortingField: 'name', isRowHeader: true, minWidth: 180,
      cell: (u) => (
        <SpaceBetween size="xs" direction="horizontal" alignItems="center">
          <span>{u.name || <Box display="inline" color="text-status-inactive">{A.users.noProfile}</Box>}</span>
          {u.role === 'admin' && <Badge color="blue">{A.users.roleAdmin}</Badge>}
        </SpaceBetween>
      ),
    },
    { id: 'email', header: A.users.colEmail, cell: (u) => <Mono>{u.email}</Mono>, sortingField: 'email', minWidth: 220 },
    {
      id: 'status', header: A.users.colStatus, sortingField: 'status',
      cell: (u) => <StatusIndicator type={u.status === 'active' ? 'success' : u.status === 'held' ? 'warning' : 'error'}>{A.users.status[u.status]}</StatusIndicator>,
    },
    {
      id: 'flags', header: A.users.colFlags, minWidth: 230,
      cell: (u) => u.flags.length === 0
        ? <Box color="text-status-inactive">{A.users.noFlags}</Box>
        : <SpaceBetween size="xxs" direction="horizontal">{u.flags.map((f) => <Badge key={f} color={f === 'disposable-email' ? 'severity-medium' : 'severity-low'}>{A.users.flags[f]}</Badge>)}</SpaceBetween>,
    },
    { id: 'windows', header: A.users.colWindows, cell: (u) => <Mono>{A.windowSettings.colWindows(u.windowsUsed, u.windowsMax)}</Mono>, sortingField: 'windowsUsed' },
    { id: 'minutes', header: A.windowSettings.colMinutes, cell: (u) => <Mono>{A.windowSettings.minutesValue(u.windowMinutes ?? WINDOW_MINUTES)}</Mono>, sortingField: 'windowMinutes' },
    { id: 'company', header: A.users.colCompany, cell: (u) => u.company || '-', sortingField: 'company' },
    { id: 'linkedin', header: A.users.colLinkedin, cell: (u) => u.linkedin ? <Link href={u.linkedin} external>{A.users.linkedin}</Link> : '-' },
    { id: 'lastSeen', header: A.users.colLastSeen, cell: (u) => <span title={dateTime(u.lastSeenAt)}>{relativeTime(u.lastSeenAt)}</span>, sortingField: 'lastSeenAt' },
    { id: 'created', header: A.users.colCreated, cell: (u) => dateTime(u.createdAt), sortingField: 'createdAt', hiddenByDefault: true },
  ]
  const sessionColumns: Column<AdminSession>[] = [
    { id: 'id', header: A.sessions.colId, cell: (s) => <SpaceBetween size="xxs" direction="horizontal" alignItems="center"><Mono>{s.id}</Mono><CopyId value={s.id} /></SpaceBetween>, sortingField: 'id', isRowHeader: true },
    { id: 'user', header: A.sessions.colUser, cell: (s) => s.userName, sortingField: 'userName', minWidth: 160 },
    {
      id: 'state', header: A.sessions.colState, sortingField: 'state',
      cell: (s) => <StatusIndicator type={s.state === 'ended' ? 'stopped' : s.state === 'ready' ? 'success' : s.state === 'starting' ? 'in-progress' : 'error'}>{A.sessions.state[s.state]}</StatusIndicator>,
    },
    { id: 'requested', header: A.sessions.colRequested, cell: (s) => dateTime(s.requestedAt), sortingField: 'requestedAt' },
    { id: 'cold', header: A.sessions.colCold, cell: (s) => s.coldStartMs ? <Mono>{duration(s.coldStartMs)}</Mono> : '-', sortingField: 'coldStartMs' },
    { id: 'duration', header: A.sessions.colDuration, cell: (s) => s.readyAt && s.endedAt ? <Mono>{duration(new Date(s.endedAt).getTime() - new Date(s.readyAt).getTime())}</Mono> : '-' },
    { id: 'requests', header: A.sessions.colRequests, cell: (s) => <Mono>{s.requests ?? s.requestCount}</Mono>, sortingField: 'requestCount' },
  ]

  // Amounts in the currency that the gateway sends (the billing currency, BRL); never assumed to be US dollars.
  const budget = state ? toBudget(state.budget) : null
  const money = (n: number) => (budget ? moneyIn(n, budget.currency) : '')
  const percent = budget && budget.limit > 0 ? Math.min(100, (budget.spent / budget.limit) * 100) : 0
  const left = budget ? Math.max(0, budget.limit - budget.spent) : 0
  const windowCost = budget ? windowCostIn(budget.currency) : null
  const mark = (at: number, text: string) => ({
    label: `${at}% (${budget ? money((budget.limit * at) / 100) : ''})`,
    value: (
      <SpaceBetween size="xxs">
        <StatusIndicator type={percent >= at ? (at === 100 ? 'error' : 'warning') : 'pending'}>{percent >= at ? A.engine.reached : A.engine.notReached}</StatusIndicator>
        <Box color="text-body-secondary" fontSize="body-s">{text}</Box>
      </SpaceBetween>
    ),
  })

  return (
    <ContentLayout header={<Header variant="h1" description={A.description}>{A.title}</Header>}>
      <SpaceBetween size="m">
        <Tabs
          activeTabId={tab}
          onChange={(e) => setTab(e.detail.activeTabId)}
          ariaLabel={A.tabsLabel}
          tabs={[
            {
              id: 'users', label: A.users.tab,
              content: (
                failed.users ? tableError('users') : <DataTable
                  title={A.users.title} description={A.users.hint}
                  items={users ?? []} columns={userColumns} trackBy="id" loading={!users}
                  filterPlaceholder={A.users.find} filterAriaLabel={A.users.find}
                  emptyTitle={A.users.empty} emptyText={A.users.emptyText}
                  selected={user} onSelect={(u) => setUserId(u?.id ?? null)} selectionLabel={(u) => u.email}
                  defaultSort={{ field: 'lastSeenAt', descending: true }}
                  actions={
                    <ButtonDropdown
                      variant="primary"
                      loading={busy}
                      disabled={!user}
                      disabledReason={A.users.select}
                      items={[
                        { id: 'approve', text: A.users.approve, disabled: !user || user.role === 'admin' || (user.status === 'active' && user.flags.length === 0), disabledReason: user?.role === 'admin' ? A.users.isAdmin : A.users.already(A.users.status.active.toLowerCase()) },
                        { id: 'hold', text: A.users.hold, disabled: !user || user.role === 'admin' || user.status === 'held', disabledReason: user?.role === 'admin' ? A.users.isAdmin : A.users.already(A.users.status.held.toLowerCase()) },
                        { id: 'block', text: A.users.block, disabled: !user || user.role === 'admin' || user.status === 'blocked', disabledReason: user?.role === 'admin' ? A.users.isAdmin : A.users.already(A.users.status.blocked.toLowerCase()) },
                        { id: 'grant', text: A.users.grant },
                        { id: 'settings', text: A.windowSettings.action },
                        { id: 'delete', text: A.extra.deleteAction, disabled: !user || user.role === 'admin', disabledReason: A.extra.selfDelete },
                      ]}
                      onItemClick={(e) => {
                        if (e.detail.id === 'grant') { setGrant('1'); setModal('grant') }
                        else if (e.detail.id === 'settings' && user) { setMaxText(String(user.windowsMax)); setMinutesText(String(user.windowMinutes ?? WINDOW_MINUTES)); setModal('settings') }
                        else if (e.detail.id === 'block') setModal('block')
                        else if (e.detail.id === 'delete') setModal('delete')
                        else void act(e.detail.id as AdminUserAction)
                      }}
                    >
                      {A.users.actions}
                    </ButtonDropdown>
                  }
                />
              ),
            },
            {
              id: 'sessions', label: A.sessions.tab,
              content: (
                failed.sessions ? tableError('sessions') : <DataTable
                  title={A.sessions.title} description={A.sessions.hint}
                  items={sessions ?? []} columns={sessionColumns} trackBy="id" loading={!sessions}
                  filterPlaceholder={A.sessions.find} filterAriaLabel={A.sessions.find}
                  emptyTitle={A.sessions.empty} emptyText={A.sessions.emptyText}
                  defaultSort={{ field: 'requestedAt', descending: true }}
                />
              ),
            },
            {
              id: 'engine', label: A.engine.tab,
              content: failed.state && !state ? tableError('state') : !state ? <StatusIndicator type="loading">{A.engine.title}</StatusIndicator> : (
                <ColumnLayout columns={2}>
                  <Container fitHeight header={<Header variant="h2" description={A.engine.hint}>{A.engine.title}</Header>}>
                    <SpaceBetween size="l">
                      <KeyValuePairs
                        columns={3}
                        items={[
                          { label: A.engine.state, value: <EngineStatus state={state.engine.state} /> },
                          { label: A.engine.since, value: relativeTime(state.engine.since) },
                          { label: A.engine.open, value: <Mono>{state.engine.activeSessions}</Mono> },
                        ]}
                      />
                      <FormField label={A.engine.pause} description={A.engine.pauseHint}>
                        <Toggle checked={state.paused} onChange={() => setModal('pause')}>{state.paused ? A.engine.paused : A.engine.notPaused}</Toggle>
                      </FormField>
                      <Box>
                        <Button
                          iconName="status-stopped"
                          disabled={state.engine.state !== 'running' && state.engine.state !== 'starting'}
                          disabledReason={A.engine.stopReason}
                          onClick={() => setModal('stop')}
                        >
                          {A.engine.stop}
                        </Button>
                      </Box>
                    </SpaceBetween>
                  </Container>
                  <Container fitHeight header={<Header variant="h2" description={A.engine.budgetHint(relativeTime(state.budget.asOf))}>{A.engine.budget}</Header>}>
                    <SpaceBetween size="l">
                      <ProgressBar
                        value={percent}
                        label={A.engine.spent}
                        description={budget ? A.engine.spentOf(money(budget.spent), money(budget.limit)) : ''}
                        additionalInfo={A.engine.rule}
                        status={percent >= 100 ? 'error' : 'in-progress'}
                        resultText={A.engine.mark100}
                      />
                      <KeyValuePairs columns={3} items={[mark(50, A.engine.mark50), mark(80, A.engine.mark80), mark(100, A.engine.mark100)]} />
                      <KeyValuePairs
                        columns={2}
                        items={[
                          { label: A.engine.left, value: <Mono>{money(left)}</Mono> },
                          { label: A.engine.windowsLeft, value: <Mono>{windowCost ? Math.floor(left / windowCost) : '-'}</Mono> },
                        ]}
                      />
                    </SpaceBetween>
                  </Container>
                </ColumnLayout>
              ),
            },
            {
              id: 'contacts', label: A.contacts.tab,
              content: (
                failed.contacts ? tableError('contacts') : <Table
                  header={<Header variant="h2" counter={contacts ? `(${contacts.length})` : undefined} description={A.contacts.hint}>{A.contacts.title}</Header>}
                  items={contacts ?? []}
                  loading={!contacts}
                  loadingText={A.contacts.title}
                  trackBy="id"
                  wrapLines
                  columnDefinitions={[
                    { id: 'id', header: A.contacts.colId, cell: (c) => <Mono>{c.id}</Mono>, isRowHeader: true },
                    { id: 'kind', header: A.contacts.colKind, cell: (c) => <Badge color={c.kind === 'more-windows' ? 'blue' : 'grey'}>{A.contacts.kind[c.kind]}</Badge> },
                    { id: 'from', header: A.contacts.colFrom, minWidth: 200, cell: (c) => <><Box>{c.name}</Box><Box color="text-body-secondary" fontSize="body-s"><Mono>{c.email}</Mono></Box></> },
                    {
                      id: 'account', header: A.extra.colAccount,
                      cell: (c) => {
                        const owner = c.userId ? users?.find((u) => u.id === c.userId) : undefined
                        if (owner) return <Link onFollow={(e) => { e.preventDefault(); setUserId(owner.id); setTab('users') }} href="#">{owner.name || owner.email}</Link>
                        return c.userId ? <Mono>{c.userId}</Mono> : <Box color="text-body-secondary">{A.extra.guest}</Box>
                      },
                    },
                    { id: 'message', header: A.contacts.colMessage, minWidth: 320, cell: (c) => c.message },
                    { id: 'created', header: A.contacts.colCreated, cell: (c) => <span title={dateTime(c.createdAt)}>{relativeTime(c.createdAt)}</span> },
                  ]}
                  empty={
                    <Box textAlign="center" color="inherit" padding={{ vertical: 'm' }}>
                      <Box variant="strong" color="inherit">{A.contacts.empty}</Box>
                      <Box color="text-body-secondary">{A.contacts.emptyText}</Box>
                    </Box>
                  }
                />
              ),
            },
          ]}
        />
        <Explain text={A.explain} variant="container" />
      </SpaceBetween>

      {modal === 'delete' && user && (
        <Modal
          visible onDismiss={() => setModal(null)} header={A.extra.deleteTitle}
          footer={<Box float="right"><SpaceBetween size="xs" direction="horizontal"><Button variant="link" onClick={() => setModal(null)}>{A.cancel}</Button><Button variant="primary" loading={busy} onClick={() => void deleteUser()}>{A.extra.deleteConfirm}</Button></SpaceBetween></Box>}
        >
          <SpaceBetween size="m">
            <Box>{A.extra.deleteText(user.name || user.email)}</Box>
            <Alert type="warning">{A.extra.deleteEntra}</Alert>
          </SpaceBetween>
        </Modal>
      )}
      {modal === 'settings' && user && (
        <Modal
          visible onDismiss={() => setModal(null)} header={W.title}
          footer={<Box float="right"><SpaceBetween size="xs" direction="horizontal"><Button variant="link" onClick={() => setModal(null)}>{A.cancel}</Button><Button variant="primary" loading={busy} disabled={!maxValid || !minutesValid} onClick={() => void saveSettings()}>{W.save}</Button></SpaceBetween></Box>}
        >
          <SpaceBetween size="m">
            <Box>{W.text(user.name || user.email, user.windowsUsed)}</Box>
            <FormField label={W.windows} description={W.windowsHint(user.windowsUsed)} errorText={maxValid ? '' : W.windowsErr}>
              <Input value={maxText} onChange={(e) => setMaxText(e.detail.value)} type="number" inputMode="numeric" />
            </FormField>
            <FormField label={W.minutes} description={W.minutesHint} errorText={minutesValid ? '' : W.minutesErr}>
              <Input value={minutesText} onChange={(e) => setMinutesText(e.detail.value)} type="number" inputMode="numeric" />
            </FormField>
          </SpaceBetween>
        </Modal>
      )}
      {modal === 'grant' && user && (
        <Modal
          visible onDismiss={() => setModal(null)} header={A.users.grantTitle}
          footer={<Box float="right"><SpaceBetween size="xs" direction="horizontal"><Button variant="link" onClick={() => setModal(null)}>{A.cancel}</Button><Button variant="primary" loading={busy} disabled={!grantValid} onClick={() => void act('grant-windows', grantNumber)}>{A.users.grantSubmit}</Button></SpaceBetween></Box>}
        >
          <SpaceBetween size="m">
            <Box>{A.users.grantText(user.name || user.email, user.windowsUsed, user.windowsMax)}</Box>
            <FormField label={A.users.grantLabel} description={A.users.grantHint} errorText={grantValid ? '' : A.users.grantErr}>
              <Input value={grant} onChange={(e) => setGrant(e.detail.value)} type="number" inputMode="numeric" />
            </FormField>
          </SpaceBetween>
        </Modal>
      )}
      {modal === 'block' && user && (
        <Modal
          visible onDismiss={() => setModal(null)} header={A.users.blockTitle}
          footer={<Box float="right"><SpaceBetween size="xs" direction="horizontal"><Button variant="link" onClick={() => setModal(null)}>{A.cancel}</Button><Button variant="primary" loading={busy} onClick={() => void act('block')}>{A.users.blockConfirm}</Button></SpaceBetween></Box>}
        >
          {A.users.blockText(user.name || user.email)}
        </Modal>
      )}
      {modal === 'pause' && state && (
        <Modal
          visible onDismiss={() => setModal(null)} header={state.paused ? A.engine.resumeTitle : A.engine.pauseTitle}
          footer={<Box float="right"><SpaceBetween size="xs" direction="horizontal"><Button variant="link" onClick={() => setModal(null)}>{A.cancel}</Button><Button variant="primary" loading={busy} onClick={() => void engineAct(() => adminSetPaused(!state.paused))}>{state.paused ? A.engine.resumeConfirm : A.engine.pauseConfirm}</Button></SpaceBetween></Box>}
        >
          {state.paused ? A.engine.resumeText : A.engine.pauseText}
        </Modal>
      )}
      {modal === 'stop' && state && (
        <Modal
          visible onDismiss={() => setModal(null)} header={A.engine.stopTitle}
          footer={<Box float="right"><SpaceBetween size="xs" direction="horizontal"><Button variant="link" onClick={() => setModal(null)}>{A.cancel}</Button><Button variant="primary" loading={busy} onClick={() => void engineAct(adminStopEngine)}>{A.engine.stopConfirm}</Button></SpaceBetween></Box>}
        >
          {A.engine.stopText(state.engine.activeSessions)}
        </Modal>
      )}
    </ContentLayout>
  )
}

export function AdminPage() {
  return <Gate need="admin" title={A.title}><Admin /></Gate>
}
