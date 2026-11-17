// Internal navigation for the landing area. Inside a react-router Router the
// links navigate on the client. With no Router they fall back to a page load.
import Box from '@cloudscape-design/components/box'
import Link from '@cloudscape-design/components/link'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { createContext, useContext, type ReactNode } from 'react'
import { useInRouterContext, useNavigate } from 'react-router-dom'
import { ROUTES, common } from './strings'

type Go = (href: string) => void

const plainGo: Go = (href) => window.location.assign(href)
const NavContext = createContext<Go>(plainGo)

function RouterNav({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  return <NavContext.Provider value={(href) => navigate(href)}>{children}</NavContext.Provider>
}

export function NavRoot({ children }: { children: ReactNode }) {
  return useInRouterContext() ? <RouterNav>{children}</RouterNav> : <>{children}</>
}

interface FollowEvent {
  preventDefault: () => void
  detail: { href?: string; external?: boolean }
}

/** `onFollow` handler for Cloudscape `Button` and `Link` with an internal `href`. */
export function useFollow() {
  const go = useContext(NavContext)
  return (event: FollowEvent) => {
    const href = event.detail.href
    if (!href || event.detail.external) return
    event.preventDefault()
    go(href)
  }
}

export function InternalLink({ href, children, fontSize }: { href: string; children: ReactNode; fontSize?: 'body-s' | 'body-m' | 'inherit' }) {
  const follow = useFollow()
  return (
    <Link href={href} onFollow={follow} fontSize={fontSize}>
      {children}
    </Link>
  )
}

/** Keeps running text at a readable line length (about 60 to 90 characters). */
export function Prose({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: '72ch' }}>{children}</div>
}

export function PageFooter({ showHome = false }: { showHome?: boolean }) {
  return (
    <footer>
      <Box padding={{ top: 'l', bottom: 'xxl' }} color="text-body-secondary" fontSize="body-s">
        <SpaceBetween size="xs" direction="horizontal" alignItems="center">
          <span>{common.footer}</span>
          <nav aria-label={common.footerNav}>
            <SpaceBetween size="s" direction="horizontal">
              {showHome && (
                <InternalLink href={ROUTES.home} fontSize="body-s">
                  {common.home}
                </InternalLink>
              )}
              <InternalLink href={ROUTES.privacy} fontSize="body-s">
                {common.privacy}
              </InternalLink>
              <InternalLink href={ROUTES.terms} fontSize="body-s">
                {common.terms}
              </InternalLink>
            </SpaceBetween>
          </nav>
        </SpaceBetween>
      </Box>
    </footer>
  )
}
