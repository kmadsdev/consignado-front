// The routes that the landing area links to. In its own file: both string tables read it.
export const ROUTES = {
  home: '/',
  contact: '/#contact',
  simulate: '/app/simulate',
  aks: '/app/aks',
  privacy: '/privacy',
  terms: '/terms',
} as const

// Documents and code that the landing page links to. Same links in both languages.
const API = 'https://github.com/kmadsdev/consignado-api/blob/main'
const API_SRC = `${API}/src/main/java/io/github/kmadsdev/consignado`
const GATEWAY_SRC = 'https://github.com/kmadsdev/consignado-serverless/blob/main/gateway/src/main/java/dev/kmads/consignado/gateway'
export const DOCS = {
  adr0002: `${API}/docs/adr/0002-money-and-rounding.md`,
  adr0003: `${API}/docs/adr/0003-contract-states-and-concurrency.md`,
  adr0004: `${API}/docs/adr/0004-idempotent-contract-creation.md`,
  adr0007: `${API}/docs/adr/0007-two-hosts-one-api.md`,
  adr0008: `${API}/docs/adr/0008-gateway-in-front-of-two-hosts.md`,
  adr0009: `${API}/docs/adr/0009-cold-cluster-and-access-windows.md`,
  adr0010: `${API}/docs/adr/0010-cloudflare-edge-instead-of-front-door.md`,
  adr0011: `${API}/docs/adr/0011-sign-up-in-the-workforce-tenant.md`,
  adr0012: `${API}/docs/adr/0012-budget-guard-and-abuse-limits.md`,
  adr0013: `${API}/docs/adr/0013-per-request-timing-headers.md`,
  decisions: `${API}/docs/platform/decisions.md`,
  security: `${API}/docs/platform/security-and-privacy.md`,
  terraform: `${API}/infra/terraform/README.md`,
  ci: `${API}/.github/workflows/ci.yml`,
  marginPolicy: `${API_SRC}/domain/MarginPolicy.java`,
  priceAmortization: `${API_SRC}/domain/PriceAmortization.java`,
  contractStatus: `${API_SRC}/domain/ContractStatus.java`,
  contractService: `${API_SRC}/application/ContractService.java`,
  requestTiming: `${API_SRC}/observability/RequestTiming.java`,
  engineService: `${GATEWAY_SRC}/core/EngineService.java`,
  tokenVerifier: `${GATEWAY_SRC}/adapters/EntraTokenVerifier.java`,
  userService: `${GATEWAY_SRC}/core/UserService.java`,
} as const
