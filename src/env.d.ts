/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK?: string
  readonly VITE_ENTRA_TENANT_ID?: string
  readonly VITE_ENTRA_SPA_CLIENT_ID?: string
  readonly VITE_ENTRA_API_SCOPE?: string
  readonly VITE_TURNSTILE_SITEKEY?: string
  readonly VITE_API_BASE?: string
  readonly VITE_CLUSTER_ORIGIN?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
