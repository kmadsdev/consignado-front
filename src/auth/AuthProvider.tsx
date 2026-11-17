// The ONE provider file. Today: a mock with a "Preview as" persona.
// Later: replace the body with MSAL (`@azure/msal-browser`): `signIn` calls
// `loginRedirect`, `signOut` calls `logoutRedirect`, and `refresh` calls the
// gateway `getMe()` with the access token. `useAuth()` keeps its shape.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getMe } from '../api/client'
import { resetMock, setPersona as setMockPersona } from '../api/mock'
import type { Me } from '../api/types'
import { AuthContext, type AuthValue, type PersonaId } from './context'

const KEY = 'consignado.preview.persona'
const PERSONAS: PersonaId[] = ['guest', 'recruiter', 'recruiter-new', 'recruiter-held', 'recruiter-spent', 'admin']

function storedPersona(): PersonaId {
  try {
    const v = localStorage.getItem(KEY) as PersonaId | null
    if (v && PERSONAS.includes(v)) return v
  } catch { /* ignore */ }
  return 'guest'
}

export function AuthProvider({ children }: { children: ReactNode }) {
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
    signIn: () => setPersona('recruiter'),
    signOut: () => setPersona('guest'),
    refresh,
    persona,
    setPersona,
    resetDemoData: () => { resetMock(); setEpoch((n) => n + 1) },
  }), [me, loading, persona, refresh, setPersona])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
