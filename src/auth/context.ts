import { createContext, useContext } from 'react'
import type { Me, Role } from '../api/types'

/** The states that the "Design preview" control can show. The real build has no personas. */
export type PersonaId = 'guest' | 'recruiter' | 'recruiter-new' | 'recruiter-held' | 'recruiter-spent' | 'admin'

export interface AuthValue {
  me: Me | null
  role: Role
  /** True while the identity is not known yet. */
  loading: boolean
  /** Starts the sign-in. `returnTo` is the path to show after it (default: the current page). */
  signIn: (returnTo?: string) => void
  signOut: () => void
  /** Reads `me` again (after the profile is saved, after a window starts). */
  refresh: () => Promise<void>
  /** A calm text when the sign-in or the first read of the account failed. Empty when all is well. */
  authError: string
  /** Design preview only (mock mode). */
  persona: PersonaId
  setPersona: (p: PersonaId) => void
  resetDemoData: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside the auth provider')
  return value
}
