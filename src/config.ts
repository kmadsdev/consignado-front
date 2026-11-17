// The ONE place that decides the mode of the build.
// Mock mode: mock data, mock login, the "Preview as" control.
// Real mode: MSAL sign-in and the gateway under /api. No preview control exists.
const env = import.meta.env

/** True when the build has no Entra ID client, or when VITE_MOCK=true. */
export const MOCK: boolean = env.VITE_MOCK === 'true' || !env.VITE_ENTRA_SPA_CLIENT_ID

export const API_BASE: string = (env.VITE_API_BASE ?? '/api').replace(/\/+$/, '')

export const ENTRA = {
  tenantId: env.VITE_ENTRA_TENANT_ID ?? '',
  clientId: env.VITE_ENTRA_SPA_CLIENT_ID ?? '',
  scope: env.VITE_ENTRA_API_SCOPE ?? '',
}

/** Empty = no widget: the forms show the placeholder. Mock mode never loads the third-party script. */
export const TURNSTILE_SITEKEY: string = MOCK ? '' : env.VITE_TURNSTILE_SITEKEY ?? ''

const isLocal = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)

/**
 * The origin that shows a live access window. Empty = stay on the same origin
 * (mock mode, `pnpm dev`, a local preview).
 */
export const CLUSTER_ORIGIN: string =
  MOCK || env.DEV || isLocal ? '' : (env.VITE_CLUSTER_ORIGIN ?? 'https://cluster.consignado.kmads.dev').replace(/\/+$/, '')

/** How often the pages read the gateway (ms). The mock answers at once, so it polls faster. */
export const POLL = MOCK
  ? { engine: 4000, sessionStarting: 1000, sessionReady: 1000, me: 5000 }
  : { engine: 15_000, sessionStarting: 2000, sessionReady: 10_000, me: 15_000 }
