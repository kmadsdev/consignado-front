import TopNavigation, { type TopNavigationProps } from '@cloudscape-design/components/top-navigation'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, type PersonaId } from '../auth'
import { MOCK } from '../config'
import { useLang, type Lang } from '../i18n/index.tsx'
import { useShell } from './context'
import { GLYPH_SRC, MOON_ICON, SUN_ICON } from './Glyph'
import { S } from './strings'
import { hasStoredTheme, initialTheme, setTheme, type ThemeMode } from './theme'

const ENGINE_ICON: Record<string, 'status-positive' | 'status-stopped' | 'status-in-progress' | 'status-warning' | 'status-pending'> = {
  running: 'status-positive', stopped: 'status-stopped', starting: 'status-in-progress', stopping: 'status-in-progress', cooldown: 'status-pending', paused: 'status-warning',
}
const COOLDOWN_MS = 15 * 60_000
const only = (on: boolean, utility: TopNavigationProps.Utility): TopNavigationProps.Utility[] => (on ? [utility] : [])
const PERSONA_ORDER: PersonaId[] = ['guest', 'recruiter', 'recruiter-new', 'recruiter-held', 'recruiter-spent', 'admin']

export function TopBar() {
  const navigate = useNavigate()
  const { me, persona, setPersona, signIn, signOut, resetDemoData } = useAuth()
  const { engine, notify } = useShell()
  const { lang, setLang } = useLang()
  const [mode, setMode] = useState<ThemeMode>(() => initialTheme())

  useEffect(() => { setTheme(mode, false) }, [mode])
  // Follow the system until the viewer makes a choice.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = () => { if (!hasStoredTheme()) setMode(mq.matches ? 'dark' : 'light') }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const engineState = engine?.state ?? 'stopped'
  // The gateway sets `since` to the stop time when the cool-down starts. The cool-down lasts 15 minutes.
  const cooldownMin = engineState === 'cooldown' && engine ? Math.ceil((Date.parse(engine.since) + COOLDOWN_MS - Date.now()) / 60_000) : 0
  const engineLabel = engine?.paused && engineState !== 'paused' ? S.engine.pausedNoNew
    : engineState === 'paused' && engine?.pausedReason ? S.engine.pausedBy[engine.pausedReason]
    : cooldownMin > 0 ? S.engine.cooldownLeft(cooldownMin)
    : S.engine.states[engineState]
  const utilities: TopNavigationProps.Utility[] = [
    {
      type: 'button',
      iconName: ENGINE_ICON[engineState],
      text: S.engine.chip(engineLabel),
      title: S.engine.chipTitle,
      ariaLabel: `${S.engine.chipTitle}: ${engineLabel}`,
      disableUtilityCollapse: true,
      onClick: () => navigate('/app'),
    },
    ...only(MOCK, {
      type: 'menu-dropdown',
      iconName: 'view-full',
      text: S.preview.label(S.preview.short[persona]),
      title: S.preview.title,
      description: S.preview.description,
      ariaLabel: S.preview.title,
      items: [
        {
          id: 'personas', text: S.preview.groupPersonas,
          items: PERSONA_ORDER.map((p) => ({ id: `persona:${p}`, text: S.preview.personas[p], itemType: 'checkbox' as const, checked: p === persona })),
        },
        { id: 'data', text: S.preview.groupData, items: [{ id: 'reset', text: S.preview.reset, iconName: 'refresh' as const }] },
      ],
      onItemClick: (e) => {
        const id = e.detail.id
        if (id === 'reset') { resetDemoData(); notify({ type: 'success', content: S.preview.resetDone }) }
        else if (id.startsWith('persona:')) setPersona(id.slice(8) as PersonaId)
      },
    }),
    {
      type: 'menu-dropdown',
      text: S.lang.label,
      title: S.lang.title,
      ariaLabel: S.lang.title,
      items: [
        { id: 'en', text: S.lang.en, lang: 'en', itemType: 'checkbox', checked: lang === 'en' },
        { id: 'pt-BR', text: S.lang.pt, lang: 'pt-BR', itemType: 'checkbox', checked: lang === 'pt-BR' },
      ],
      onItemClick: (e) => setLang(e.detail.id as Lang),
    },
    {
      type: 'button',
      iconSvg: mode === 'dark' ? SUN_ICON : MOON_ICON,
      text: mode === 'dark' ? S.theme.toLight : S.theme.toDark,
      title: S.theme.title,
      ariaLabel: mode === 'dark' ? S.theme.toLight : S.theme.toDark,
      onClick: () => {
        const next = mode === 'dark' ? 'light' : 'dark'
        setTheme(next, true)
        setMode(next)
      },
    },
    me
      ? {
          type: 'menu-dropdown',
          iconName: 'user-profile',
          text: me.name || S.user.noName,
          description: me.email,
          title: S.user.menuTitle,
          ariaLabel: S.user.menuTitle,
          items: [{ id: 'signout', text: S.user.signOut }],
          onItemClick: (e) => { if (e.detail.id === 'signout') { signOut(); navigate('/') } },
        }
      : {
          type: 'button',
          variant: 'primary-button',
          text: S.user.signIn,
          ariaLabel: S.user.signIn,
          onClick: () => signIn('/app'),
        },
  ]

  return (
    <div id="top-nav">
      <TopNavigation
        identity={{
          href: '/',
          title: S.brand,
          logo: { src: GLYPH_SRC, alt: S.brandAlt },
          onFollow: (e) => { e.preventDefault(); navigate('/') },
        }}
        utilities={utilities}
        i18nStrings={{
          overflowMenuTriggerText: S.aria.overflow,
          overflowMenuTitleText: S.aria.overflowTitle,
          overflowMenuBackIconAriaLabel: S.aria.overflowBack,
          overflowMenuDismissIconAriaLabel: S.aria.overflowDismiss,
        }}
      />
    </div>
  )
}
