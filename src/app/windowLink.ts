import type { NavigateFunction } from 'react-router-dom'
import { CLUSTER_ORIGIN } from '../config'

/**
 * Opens the live page of an access window. In production it is on the cluster host
 * (another origin, which signs in by itself with the email as a hint). In mock mode and
 * in local development it stays on the same origin.
 */
export function openWindow(navigate: NavigateFunction, sessionId: string, email?: string): void {
  if (CLUSTER_ORIGIN && window.location.origin !== CLUSTER_ORIGIN) {
    const hint = email ? `?hint=${encodeURIComponent(email)}` : ''
    window.location.assign(`${CLUSTER_ORIGIN}/app/${encodeURIComponent(sessionId)}/aks/${hint}`)
    return
  }
  navigate(`/app/${sessionId}/aks`)
}
