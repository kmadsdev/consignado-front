import Box from '@cloudscape-design/components/box'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Header from '@cloudscape-design/components/header'
import Link from '@cloudscape-design/components/link'
import SegmentedControl from '@cloudscape-design/components/segmented-control'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HostKind } from '../api/types'
import { useAuth } from '../auth'
import { useShell } from '../shell/context'
import { Gate } from './common'
import { Operations } from './Operations'
import { T } from './strings'

function OperationsBody() {
  const { me } = useAuth()
  const { engine } = useShell()
  const navigate = useNavigate()
  const [host, setHost] = useState<HostKind>('functions')
  if (!me) return null
  const aksReady = Boolean(me.activeSessionId) && engine?.state === 'running'
  const aksReason = me.activeSessionId ? T.opsPage.aksStarting : T.opsPage.aksNoWindow
  const effectiveHost: HostKind = host === 'aks' && !aksReady ? 'functions' : host
  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description={T.opsPage.description}
          actions={
            <SegmentedControl
              label={T.opsPage.hostLabel}
              selectedId={effectiveHost}
              onChange={(e) => setHost(e.detail.selectedId as HostKind)}
              options={[
                { id: 'functions', text: T.host.functions },
                { id: 'aks', text: T.host.aks, disabled: !aksReady, disabledReason: aksReason },
              ]}
            />
          }
        >
          {T.opsPage.title}
        </Header>
      }
    >
      <SpaceBetween size="m">
        <Box color="text-body-secondary">
          {effectiveHost === 'functions' ? T.opsPage.onFunctions : T.opsPage.onAks}{' '}
          {!aksReady && (
            <>
              {aksReason}{' '}
              <Link href="/app/aks" onFollow={(e) => { e.preventDefault(); navigate(me.activeSessionId ? `/app/${me.activeSessionId}/aks` : '/app/aks') }}>
                {me.activeSessionId ? T.opsPage.openLive : T.opsPage.goAks}
              </Link>
            </>
          )}
        </Box>
        <Operations key={effectiveHost} host={effectiveHost} canWrite={me.status === 'active'} readOnlyReason={T.held.readOnly} />
      </SpaceBetween>
    </ContentLayout>
  )
}

export function OperationsPage() {
  return <Gate title={T.opsPage.title}><OperationsBody /></Gate>
}
