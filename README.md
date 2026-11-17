# consignado-front

The website of the consignado platform, live at <https://consignado.kmads.dev>.

One Spring Boot API ([`kmadsdev/consignado-api`](https://github.com/kmadsdev/consignado-api)) runs on two Azure hosts: an Azure Function and pods on an AKS cluster. A Java gateway ([`kmadsdev/consignado-serverless`](https://github.com/kmadsdev/consignado-serverless)) is in front of both. This site lets a visitor use the API on both hosts and shows each request as a live architecture diagram, drawn from the trace that the gateway returns.

The data is synthetic. This is a technical demonstration, not a credit offer.

This repository also holds `edge/`: the Cloudflare Worker `consignado-edge` that serves the site and forwards `/api/*` to the gateway.

Platform documentation (architecture, decisions, runbook, security): [consignado-api/docs/platform](https://github.com/kmadsdev/consignado-api/blob/main/docs/platform/README.md).

## Routes

| Path | Page | Who |
|---|---|---|
| `/` | Landing page: what the platform is, the architecture, the contact form | Everyone |
| `/privacy`, `/terms` | Privacy notice and terms | Everyone |
| `/app/simulate` | Loan preview on the serverless host, the request diagram, the masked data table, a replay of a cluster start | Everyone (guests use it with no account) |
| `/app` | Overview: profile, engine state, access windows | Signed-in user |
| `/app/operations` | Agreements, customers, simulations, contracts on the serverless host | Signed-in user |
| `/app/aks` | Start an access window on the Kubernetes host | Signed-in user |
| `/app/<session id>/aks` | One live access window: start stages, countdown, operations on the Kubernetes host | The owner of the window |
| `/admin` | Users, sessions, engine state and budget, contact requests | Admin |

A real access window opens on the second host name, `https://cluster.consignado.kmads.dev/app/<session id>/aks/`. Both host names go to the same Worker and the same build.

## Access levels

| Level | How | What it can do |
|---|---|---|
| Guest | No account | The stateless loan preview (`POST /api/fn/api/v1/simulations/preview`) and the masked snapshot. What a guest types stays in the browser. Never the Kubernetes host. |
| User | Microsoft Entra ID sign-in (self-service sign-up with an email one-time code), then a profile form with a Turnstile check | The serverless host at any time. The Kubernetes host only inside an own 15-minute access window, 3 windows per account. |
| Admin | The owner's account | Everything above, plus `/admin`. The Admin navigation item shows only for `role === 'admin'`. |

The site only hides what a level cannot use. The gateway enforces every rule.

## Two modes

`src/config.ts` is the one place that decides the mode.

| Mode | When | Behaviour |
|---|---|---|
| Real | `VITE_ENTRA_SPA_CLIENT_ID` is set and `VITE_MOCK` is not `true` | MSAL sign-in (redirect flow, `sessionStorage`), the real gateway under `/api`, Turnstile on the forms. |
| Mock | `VITE_MOCK=true`, or no `VITE_ENTRA_SPA_CLIENT_ID` | Mock data and a mock sign-in in the browser (`src/api/mock.ts`), and a "Preview as" control to see the site as a guest, a user or the admin. No request leaves the page. |

The client code is the same in both modes: `src/api/client.ts` selects `real.ts` or `mock.ts` with the same signatures.

## Build-time variables

None of these is a secret. No `.env` file is committed.

| Variable | Needed | Meaning |
|---|---|---|
| `VITE_ENTRA_SPA_CLIENT_ID` | Real mode | Client id of the app registration `consignado-spa`. Not set = mock mode. |
| `VITE_ENTRA_TENANT_ID` | Real mode | Tenant id for the sign-in authority. |
| `VITE_ENTRA_API_SCOPE` | Real mode | The gateway scope (`.../access_as_user`). |
| `VITE_TURNSTILE_SITEKEY` | Optional | Turnstile site key. Not set = a placeholder and no token. |
| `VITE_MOCK` | Optional | `true` forces mock mode. |
| `VITE_API_BASE` | Optional | Default `/api`. |
| `VITE_CLUSTER_ORIGIN` | Optional | Default `https://cluster.consignado.kmads.dev`. Ignored in mock mode, in `pnpm dev` and on `localhost` (the window page stays on the same origin). |

## Project layout

| Path | Content |
|---|---|
| `src/api/` | The gateway client: `real.ts`, `mock.ts`, `client.ts` (selects one), `map.ts` (API JSON to frontend types, both directions, and the trace parser), `errors.ts` (typed `ApiError`), `stages.ts` (the stage ids contract), `fingerprint.ts`, `strings.ts`, unit tests in `__tests__/`. |
| `src/auth/` | MSAL setup and the `AuthProvider`. |
| `src/diagram/` | The architecture diagram (React Flow, `@xyflow/react`): the hand-made layout of the three views in `model.ts`, and a review page (`diagram-demo.html`). |
| `src/shell/` | Layouts, top bar, theme (light and dark), Turnstile widget, the "not found" page. |
| `src/app/` | The signed-in pages: overview, operations, simulate, the access window page, the request inspector. |
| `src/admin/` | The admin page. |
| `src/landing/` | The landing page, the contact form, the privacy and terms pages, and a review page (`landing-demo.html`). |
| `edge/` | The Cloudflare Worker `consignado-edge` (`src/index.ts`, `wrangler.jsonc`). See [edge/README.md](edge/README.md). |
| `.github/workflows/deploy.yml` | Build, and publish to Blob Storage from `main`. |

## Run and test

Needs Node 24 and pnpm.

```bash
pnpm install
VITE_MOCK=true pnpm dev     # the whole site with mock data, no Azure needed
pnpm build                  # type check + production build into dist/
pnpm test                   # unit tests (node --test, src/api/__tests__)
pnpm lint                   # oxlint
```

`pnpm dev` with no variables also runs in mock mode, because no client id is set. To run the real mode on a local machine, set the three `VITE_ENTRA_*` variables; the gateway must then answer under `/api`.

## Deploy

**Site.** `.github/workflows/deploy.yml` builds on every push and pull request. On `main` it signs in to Azure with GitHub OIDC (no stored password) and uploads `dist/` to the static website (`$web`) of the storage account named in the repository variable `STATIC_STORAGE_ACCOUNT` (`stconsigwebkm01`). The hashed files under `assets/` go first and the HTML last, so a page never points to a file that is not there yet. The workflow does not run `pnpm test`.

**Edge Worker.** Deployed by hand with Wrangler, because a Cloudflare token is not stored in this repository:

```bash
cd edge && npm install
npx wrangler deploy --dry-run
npx wrangler deploy
# The shared key: read it from Key Vault and pipe it in. Never print it.
az keyvault secret show --vault-name kv-consig-km01 -n edge-key --query value -o tsv | npx wrangler secret put EDGE_KEY
```

Rotation of the key and the Cloudflare zone rules: see [edge/README.md](edge/README.md).

## The edge, in short

- `/api/*` goes to the gateway, never cached. Only `GET`, `POST`, `PUT` and `PATCH` pass. A declared body above 64 KB gets 413. Six request headers are forwarded (`accept`, `accept-language`, `authorization`, `content-type`, `idempotency-key`, `x-fingerprint`); the Worker adds `X-Edge-Key`, `CF-Connecting-IP` and `X-Forwarded-Host`, and removes `Set-Cookie` from answers.
- Every other path goes to the static website. A path with no file extension is served as `index.html`. Files under `/assets/` are cached for one year; other files for 60 seconds at the edge.
- Every answer gets HSTS, `nosniff`, a strict referrer policy, `X-Frame-Options: DENY` and a permissions policy. Pages also get a content security policy that allows only the own origin, Turnstile and the Entra ID sign-in.
- Rules set in the Cloudflare zone, not in this repository: see [edge/README.md](edge/README.md).

## Design decisions

- **Cloudscape** (`@cloudscape-design/components`) for the console pages: tables, forms, status and dark mode come ready and accessible. The landing page and the diagram carry their own brand, "Consignado Cloud".
- **The diagrams show real requests.** The gateway returns `x-consignado-host` and `x-consignado-trace` (the stages of the request with measured milliseconds). `map.ts` parses the trace and the diagram lights the path that the request took. A call with no trace header gets a trace with only what the browser measured.
- **Stage ids are a contract.** `src/api/stages.ts` lists the ids that the gateway emits and the diagrams draw (`request`, `edge`, `gateway`, `identity`, `keyvault`, then the host stages). A new stage needs a change on both sides.
- **The `cold` badge comes from the gateway.** Only the Functions host can be cold. A slow call that is not cold shows a grey "slow call" badge.
- **The access window page shows the real start.** It reads `GET /api/sessions/{id}` every 2 s while the window starts and every 10 s when it is ready, and shows each stage from real signals. After 8 minutes it says that the start is slower than usual.

## Measured times (live, 2026-11-17, in the browser)

| What | Time |
|---|---|
| Serverless host, cold call | 18.6 to 18.9 s |
| Serverless host, warm call | 0.25 to 0.9 s |
| Kubernetes host, warm call | about 0.76 s (median of 12 calls) |
| Start of a stopped cluster | Not verified at the time of writing. |

## Known limits

- **No "end the window now".** The gateway has no route for it, so the button does not exist. A window ends after 15 minutes.
- **No silent token renewal in a hidden iframe.** The edge sends `X-Frame-Options: DENY`. Renewal by refresh token works; when it does not, the site redirects to sign in.
- **CPF in the tables is the API mask** (`***.***.***-NN`, the 2 check digits). The API never returns a full CPF. The add-customer form takes a full synthetic CPF.
- **Listings show the newest 100 rows.**
- **Admin pages with a real token: not verified at the time of writing.** They were tested in mock mode only.
