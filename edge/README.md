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
- It forwards only the headers that the gateway needs, and adds `X-Edge-Key`. The gateway
  refuses a request without that key, so the function cannot be called around the edge.
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
