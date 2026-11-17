# edge: the Cloudflare Worker in front of Azure

```
Browser -> Cloudflare (DNS, TLS, DDoS protection, WAF rules) -> Worker consignado-edge
              /api/*  -> gateway (Azure Function)            never cached, adds the edge key
              other   -> Azure Blob Storage static website   cached, every route is index.html
```

## Why Cloudflare and not Azure Front Door

The plan was Azure Front Door Standard. Azure refuses it on this subscription type:
`Free Trial and Student account is forbidden for Azure Frontdoor resources`. The classic
Azure CDN cannot be created any more (it retires on 2027-09-30). Blob Storage alone cannot
serve a custom domain over HTTPS. So the edge is Cloudflare, which the owner chose as the
fallback. The Terraform code for Front Door stays in `consignado-api/infra/terraform/modules/edge`
behind `enable_front_door`, for a pay-as-you-go subscription.

Trade-off: one part of the request path is not Azure. What it gives: a free CDN, TLS
certificates for both hosts, network-level DDoS protection and WAF rules, at no cost.

## What the Worker does and does not do

- It routes, caches static files, rewrites application routes to `index.html`, and sets the
  security headers (HSTS, CSP, no framing, no content sniffing).
- On `/api/*` it accepts only `GET`, `POST`, `PUT` and `PATCH`, and refuses a declared body
  above 64 KB (413).
- It forwards only the headers that the gateway needs (`accept`, `accept-language`,
  `authorization`, `content-type`, `idempotency-key`, `x-fingerprint`), and adds `X-Edge-Key`,
  `CF-Connecting-IP` and `X-Forwarded-Host`. The gateway refuses a request without the key, so
  the function cannot be called around the edge. The gateway function app also accepts only the
  Cloudflare address ranges.
- It takes no access decision and holds no user data. Tokens, quotas and limits are checked
  by the gateway.

## Deploy

```bash
cd edge && npm install
npx wrangler deploy --dry-run        # check
npx wrangler deploy                  # needs a Cloudflare API token with Workers and DNS rights on kmads.dev
# the shared key: read it from Key Vault and pipe it in, never print it
az keyvault secret show --vault-name kv-consig-km01 -n edge-key --query value -o tsv | npx wrangler secret put EDGE_KEY
```

The Worker is deployed by hand: a Cloudflare token is not stored in this repository.

## Rotate the edge key

The key is made by Terraform in `consignado-api/infra/terraform` (`random_password.edge_key`)
and stored in Key Vault as `edge-key`. Make a new value there, then run the `wrangler secret put`
line above right after it. The gateway caches the key for 5 minutes, so the API can answer 403
for up to 5 minutes. Do it at a quiet time. Not executed on the live platform at the time of writing.

## Rules in the Cloudflare zone

These are zone settings, made in the Cloudflare dashboard, not in this repository. They apply
to the two host names only.

| Rule | Effect |
|---|---|
| Rate limit | 40 requests per 10 seconds per IP address on `/api/`. |
| Method allow-list | Other methods are blocked before the Worker runs. A `DELETE` gets the Cloudflare block page (HTML, not JSON). |
| Managed challenge | Non-browser clients get a challenge on `/api/contact` and `/api/me/profile`. |

The free plan has custom rules and rate limits, not the managed WAF rule sets.
