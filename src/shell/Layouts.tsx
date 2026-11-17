import AppLayout from '@cloudscape-design/components/app-layout'
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import BreadcrumbGroup, { type BreadcrumbGroupProps } from '@cloudscape-design/components/breadcrumb-group'
import Flashbar from '@cloudscape-design/components/flashbar'
import SideNavigation, { type SideNavigationProps } from '@cloudscape-design/components/side-navigation'
import SplitPanel from '@cloudscape-design/components/split-panel'
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { RequestInspector } from '../app/RequestInspector'
import { useAuth } from '../auth'
import { useShell } from './context'
import { S } from './strings'
import { TopBar } from './TopBar'

const LIVE_WINDOW = /^\/app\/[^/]+\/aks\/?$/

function FooterLine({ className }: { className: string }) {
  return (
    <footer className={className}>
      <Box color="text-body-secondary" fontSize="body-s">{S.footer}</Box>
    </footer>
  )
}

function useNotices() {
  const { notices, dismiss } = useShell()
  return (
    <Flashbar
      items={notices.map((n) => ({
        id: n.id,
        type: n.type,
        loading: n.loading,
        header: n.header,
        content: n.content,
        dismissible: !n.loading,
        onDismiss: () => dismiss(n.id),
      }))}
    />
  )
}

/** Landing, privacy, terms, not found: the same top navigation, full-width content. */
export function PublicShell() {
  const notices = useNotices()
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <>
      <TopBar />
      <AppLayout
        headerSelector="#top-nav"
        navigationHide
        toolsHide
        disableContentPaddings
        maxContentWidth={Number.MAX_VALUE}
        notifications={notices}
        ariaLabels={{ notifications: S.aria.notifications }}
        content={
          <>
            <Outlet />
            <FooterLine className="public-footer" />
          </>
        }
      />
    </>
  )
}

/** Every signed-in page (and the guest simulation): side navigation, breadcrumbs, inspector. */
export function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { role } = useAuth()
  const { traceRecord, inspectorOpen, setInspectorOpen } = useShell()
  const notices = useNotices()
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > 688)
  const [panelPosition, setPanelPosition] = useState<'bottom' | 'side'>('bottom')
  const [panelSize, setPanelSize] = useState(400)

  const isLive = LIVE_WINDOW.test(pathname) && pathname !== '/app/aks'
  const hasInspector = pathname.startsWith('/app/operations') || isLive
  const activeHref = isLive ? '/app/aks' : pathname.replace(/\/$/, '') || '/'

  const items: SideNavigationProps.Item[] = [
    { type: 'link', text: S.nav.overview, href: '/app' },
    { type: 'link', text: S.nav.operations, href: '/app/operations' },
    { type: 'link', text: S.nav.aks, href: '/app/aks' },
    { type: 'link', text: S.nav.simulate, href: '/app/simulate', info: <Badge color="grey">{S.nav.guestBadge}</Badge> },
    ...(role === 'admin' ? [{ type: 'link' as const, text: S.nav.admin, href: '/admin' }] : []),
    { type: 'divider' },
    { type: 'link', text: S.nav.docs, href: S.docsUrl, external: true, externalIconAriaLabel: 'Opens in a new tab' },
    { type: 'link', text: S.nav.privacy, href: '/privacy' },
    { type: 'link', text: S.nav.terms, href: '/terms' },
  ]

  const crumbs: BreadcrumbGroupProps.Item[] = [{ text: S.brand, href: '/' }]
  if (pathname.startsWith('/admin')) crumbs.push({ text: S.nav.admin, href: '/admin' })
  else {
    crumbs.push({ text: S.nav.overview, href: '/app' })
    if (pathname.startsWith('/app/operations')) crumbs.push({ text: S.nav.operations, href: '/app/operations' })
    else if (pathname.startsWith('/app/simulate')) crumbs.push({ text: S.nav.simulate, href: '/app/simulate' })
    else if (pathname.startsWith('/app/aks')) crumbs.push({ text: S.nav.aks, href: '/app/aks' })
    else if (isLive) { crumbs.push({ text: S.nav.aks, href: '/app/aks' }); crumbs.push({ text: S.nav.liveWindow, href: pathname }) }
  }

  const follow = (e: CustomEvent<{ href: string; external?: boolean }>) => {
    if (e.detail.external) return
    e.preventDefault()
    navigate(e.detail.href)
    if (window.innerWidth <= 688) setNavOpen(false)
  }

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <>
      <TopBar />
      <AppLayout
        headerSelector="#top-nav"
        navigation={
          <SideNavigation
            header={{ text: S.nav.header, href: '/app' }}
            activeHref={activeHref}
            items={items}
            onFollow={follow}
          />
        }
        navigationOpen={navOpen}
        onNavigationChange={(e) => setNavOpen(e.detail.open)}
        toolsHide
        breadcrumbs={<BreadcrumbGroup items={crumbs} ariaLabel={S.aria.breadcrumbs} onFollow={follow} />}
        notifications={notices}
        splitPanel={
          hasInspector ? (
            <SplitPanel header={traceRecord ? `${S.inspector.title}: ${traceRecord.label}` : S.inspector.title} closeBehavior="collapse">
              {traceRecord ? <RequestInspector record={traceRecord} diagramHeight={240} /> : <Box color="text-body-secondary">{S.inspector.empty}</Box>}
            </SplitPanel>
          ) : undefined
        }
        splitPanelOpen={hasInspector && inspectorOpen}
        onSplitPanelToggle={(e) => setInspectorOpen(e.detail.open)}
        splitPanelPreferences={{ position: panelPosition }}
        onSplitPanelPreferencesChange={(e) => setPanelPosition(e.detail.position)}
        splitPanelSize={panelSize}
        onSplitPanelResize={(e) => setPanelSize(e.detail.size)}
        ariaLabels={{
          navigation: S.aria.navigation,
          navigationClose: S.aria.navigationClose,
          navigationToggle: S.aria.navigationToggle,
          notifications: S.aria.notifications,
        }}
        content={
          <>
            <Outlet />
            <FooterLine className="footer-line" />
          </>
        }
      />
    </>
  )
}
