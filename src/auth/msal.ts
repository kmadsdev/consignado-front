// Microsoft Entra ID sign-in with MSAL (redirect flow, no popup, sessionStorage cache).
// Nothing here runs in mock mode: the application object is made on the first call.
import { InteractionRequiredAuthError, PublicClientApplication, type AccountInfo } from '@azure/msal-browser'
import { ENTRA } from '../config'

const HINT_KEY = 'consignado.login.hint'
const EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}$/

let app: PublicClientApplication | null = null
let ready: Promise<AccountInfo | null> | null = null
let failure = false

/** The redirect URI is the origin with a trailing slash. Each host (main, cluster) signs in by itself. */
const home = () => `${window.location.origin}/`

/**
 * The main host sends the user to the window page with `?hint=<email>`.
 * This keeps the hint for one sign-in and removes it from the address bar.
 */
export function takeHintFromUrl(): void {
  try {
    const url = new URL(window.location.href)
    const hint = url.searchParams.get('hint')
    if (hint === null) return
    if (EMAIL.test(hint)) sessionStorage.setItem(HINT_KEY, hint)
    url.searchParams.delete('hint')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  } catch { /* ignore */ }
}
function takeHint(): string {
  try {
    const hint = sessionStorage.getItem(HINT_KEY) ?? ''
    sessionStorage.removeItem(HINT_KEY)
    return hint
  } catch { return '' }
}

/** Starts MSAL once and finishes a sign-in redirect that is in progress. Gives the signed-in account, or null. */
export function initAuth(): Promise<AccountInfo | null> {
  if (!ready) {
    ready = (async () => {
      app = new PublicClientApplication({
        auth: {
          clientId: ENTRA.clientId,
          authority: `https://login.microsoftonline.com/${ENTRA.tenantId}`,
          redirectUri: home(),
          postLogoutRedirectUri: home(),
        },
        cache: { cacheLocation: 'sessionStorage' },
      })
      await app.initialize()
      let account: AccountInfo | null = null
      try {
        account = (await app.handleRedirectPromise())?.account ?? null
      } catch {
        failure = true // the viewer closed the Microsoft page, or the answer was not valid
      }
      account = account ?? app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null
      if (account) app.setActiveAccount(account)
      return account
    })()
  }
  return ready
}

/** True when the last sign-in redirect came back with an error. */
export function signInFailed(): boolean {
  return failure
}

/** A hint that waits for a sign-in (cluster host, no cached account). Read once. */
export function pendingHint(): string {
  return takeHint()
}

/** Leaves the page for the Microsoft sign-in page. MSAL brings the user back to `returnTo`. */
export async function signIn(returnTo?: string, loginHint?: string): Promise<void> {
  await initAuth()
  const target = new URL(returnTo ?? window.location.pathname + window.location.search, window.location.origin).href
  await app!.loginRedirect({ scopes: [ENTRA.scope], redirectStartPage: target, ...(loginHint ? { loginHint } : {}) })
}

export async function signOut(): Promise<void> {
  const account = await initAuth()
  await app!.logoutRedirect({ account: account ?? undefined, postLogoutRedirectUri: home() })
}

/** The access token for the gateway. Null for a guest. Refreshes silently; redirects when Entra ID asks for interaction. */
export async function getAccessToken(): Promise<string | null> {
  const account = await initAuth()
  if (!account || !app) return null
  try {
    return (await app.acquireTokenSilent({ scopes: [ENTRA.scope], account })).accessToken
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      await app.acquireTokenRedirect({ scopes: [ENTRA.scope], account, redirectStartPage: window.location.href })
      return null // the page is leaving
    }
    throw err
  }
}
