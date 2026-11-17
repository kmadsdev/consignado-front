// The ONE provider file. `src/config.ts` decides which provider runs:
// mock mode -> a "Preview as" persona; real mode -> MSAL (Microsoft Entra ID).
// `useAuth()` has the same shape in both.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, getMe } from '../api/client'
import { resetMock, setPersona as setMockPersona } from '../api/mock'
import { E } from '../api/strings'
import type { Me } from '../api/types'
import { MOCK } from '../config'
import { AuthContext, type AuthValue, type PersonaId } from './context'
import { initAuth, pendingHint, signIn as msalSignIn, signInFailed, signOut as msalSignOut, takeHintFromUrl } from './msal'

const KEY = 'consignado.preview.persona'
const PERSONAS: PersonaId[] = ['guest', 'recruiter', 'recruiter-new', 'recruiter-held', 'recruiter-spent', 'admin']

function storedPersona(): PersonaId {
  try {
    const v = localStorage.getItem(KEY) as PersonaId | null
    if (v && PERSONAS.includes(v)) return v
  } catch { /* ignore */ }
  return 'guest'
}

function MockAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [persona, setPersonaState] = useState<PersonaId>(() => {
    const p = storedPersona()
    setMockPersona(p)
    return p
  })
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [epoch, setEpoch] = useState(0)

  const refresh = useCallback(async () => {
    try { setMe(await getMe()) } catch { setMe(null) }
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    getMe()
      .then((next) => { if (alive) setMe(next) })
      .catch(() => { if (alive) setMe(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [persona, epoch])

  const setPersona = useCallback((p: PersonaId) => {
    setMockPersona(p)
    try { localStorage.setItem(KEY, p) } catch { /* ignore */ }
    setLoading(true)
    setPersonaState(p)
  }, [])

  const value = useMemo<AuthValue>(() => ({
    me,
    role: me?.role ?? 'guest',
    loading,
    signIn: (returnTo) => { setPersona('recruiter'); if (returnTo) navigate(returnTo) },
    signOut: () => setPersona('guest'),
    refresh,
    authError: '',
    persona,
    setPersona,
    resetDemoData: () => { resetMock(); setEpoch((n) => n + 1) },
  }), [me, loading, persona, refresh, setPersona, navigate])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const noop = () => undefined

function RealAuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setMe(await getMe())
      setAuthError('')
    } catch (err) {
      // A short network problem must not sign the viewer out of the page.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) { setMe(null); setAuthError(err.message) }
    }
  }, [])

  useEffect(() => {
    let alive = true
    let leaving = false
    void (async () => {
      try {
        const account = await initAuth()
        if (!account) {
          // The window page on the cluster host: sign in here too, with the email that the main host sent.
          const hint = pendingHint()
          if (hint && !signInFailed()) { leaving = true; await msalSignIn(undefined, hint); return }
          if (alive && signInFailed()) setAuthError(E.authFailed)
          return
        }
        const next = await getMe()
        if (alive) setMe(next)
      } catch (err) {
        leaving = false
        if (alive) setAuthError(err instanceof ApiError ? err.message : E.authFailed)
      } finally {
        if (alive && !leaving) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const value = useMemo<AuthValue>(() => ({
    me,
    role: me?.role ?? 'guest',
    loading,
    signIn: (returnTo) => { void msalSignIn(returnTo).catch(() => setAuthError(E.authFailed)) },
    signOut: () => { void msalSignOut().catch(() => undefined) },
    refresh,
    authError,
    persona: 'guest',
    setPersona: noop,
    resetDemoData: noop,
  }), [me, loading, authError, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

if (!MOCK) takeHintFromUrl()

export const AuthProvider = MOCK ? MockAuthProvider : RealAuthProvider
