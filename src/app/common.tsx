import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Spinner from '@cloudscape-design/components/spinner'
import StatusIndicator, { type StatusIndicatorProps } from '@cloudscape-design/components/status-indicator'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ContractStatus, EngineState, LifecycleEvent } from '../api/types'
import { useAuth } from '../auth'
import { reducedMotion } from './format'
import { ProfilePage } from './ProfilePage'
import { T } from './strings'

export function Mono({ children }: { children: ReactNode }) {
  return <span className="mono">{children}</span>
}

/** A monospace id with a small copy button. */
export function CopyId({ value, label }: { value: string; label?: string }) {
  return (
    <CopyToClipboard
      variant="icon"
      textToCopy={value}
      copyButtonAriaLabel={`${T.common.copy} ${label ?? value}`}
      copySuccessText={T.common.copied}
      copyErrorText={T.common.copyFailed}
    />
  )
}

const ENGINE_TYPE: Record<EngineState, StatusIndicatorProps.Type> = {
  stopped: 'stopped', starting: 'in-progress', running: 'success', stopping: 'in-progress', cooldown: 'pending', paused: 'warning',
}
export function EngineStatus({ state }: { state: EngineState }) {
  return <StatusIndicator type={ENGINE_TYPE[state]}>{T.engine.label[state]}</StatusIndicator>
}

const CONTRACT_TYPE: Record<ContractStatus, StatusIndicatorProps.Type> = {
  PENDING: 'pending', APPROVED: 'info', ACTIVE: 'success', SETTLED: 'stopped', REJECTED: 'error', CANCELLED: 'stopped',
}
export function ContractStatusText({ status }: { status: ContractStatus }) {
  return <StatusIndicator type={CONTRACT_TYPE[status]}>{T.contractStatus[status]}</StatusIndicator>
}

/** The current time, read again every `everyMs`. */
export function useNow(everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), everyMs)
    return () => window.clearInterval(t)
  }, [everyMs])
  return now
}

/** Shows the events of a finished request one after the other, so the diagram can draw the path. */
export function useReplay(events: LifecycleEvent[], key: number): LifecycleEvent[] {
  const [count, setCount] = useState(() => (reducedMotion() ? events.length : 0))
  useEffect(() => {
    if (reducedMotion()) { setCount(events.length); return }
    setCount(0)
    let i = 0
    const step = Math.max(120, Math.min(320, 2200 / Math.max(1, events.length)))
    const t = window.setInterval(() => {
      i += 1
      setCount(i)
      if (i >= events.length) window.clearInterval(t)
    }, step)
    return () => window.clearInterval(t)
  }, [events, key])
  return events.slice(0, count)
}

export function CenteredSpinner({ text }: { text: string }) {
  return (
    <Box textAlign="center" padding={{ vertical: 'xxl' }} color="text-body-secondary">
      <Spinner /> {text}
    </Box>
  )
}

function StatusPage({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <ContentLayout header={<Header variant="h1">{title}</Header>}>
      <Container>
        <SpaceBetween size="m">
          {children}
          {actions}
        </SpaceBetween>
      </Container>
    </ContentLayout>
  )
}

/**
 * Decides what a signed-in page shows for the current viewer:
 * guest -> sign-in prompt, new account -> profile form, blocked -> status page.
 */
export function Gate({ need = 'user', title, children }: { need?: 'user' | 'admin'; title: string; children: ReactNode }) {
  const { me, loading, signIn } = useAuth()
  const navigate = useNavigate()
  if (loading) return <CenteredSpinner text={T.common.loadingAccount} />
  if (!me) {
    return (
      <StatusPage
        title={title}
        actions={
          <SpaceBetween size="xs" direction="horizontal">
            <Button variant="primary" onClick={signIn}>{T.gate.signIn}</Button>
            <Button onClick={() => navigate('/app/simulate')}>{T.gate.guestCta}</Button>
          </SpaceBetween>
        }
      >
        <Box variant="h2">{T.gate.guestTitle}</Box>
        <Box>{need === 'admin' ? T.gate.adminText : T.gate.guestText}</Box>
        <Box color="text-body-secondary">{T.gate.signInHow}</Box>
      </StatusPage>
    )
  }
  if (me.status === 'blocked') {
    return (
      <StatusPage title={title}>
        <Alert type="error" header={T.gate.blockedTitle}>{T.gate.blockedText}</Alert>
      </StatusPage>
    )
  }
  if (!me.profileComplete) return <ProfilePage />
  if (need === 'admin' && me.role !== 'admin') {
    return (
      <StatusPage title={title} actions={<Button onClick={() => navigate('/app')}>{T.gate.backToOverview}</Button>}>
        <Alert type="warning" header={T.gate.notAdminTitle}>{T.gate.notAdminText}</Alert>
      </StatusPage>
    )
  }
  return <>{children}</>
}
