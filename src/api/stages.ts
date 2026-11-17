// CONTRACT: the stage ids that the gateway emits and the diagrams draw.
export const AKS_STAGES = [
  'request',        // browser sends the request
  'edge',           // Cloudflare edge: CDN, WAF, TLS, rate limit
  'gateway',        // gateway function accepts it
  'identity',       // Entra ID token is checked
  'quota',          // access windows left, account not held, budget not paused
  'keyvault',       // gateway reads its secrets from Key Vault
  'arm-start',      // Azure Resource Manager accepts "start cluster"
  'control-plane',  // Kubernetes API server answers
  'node',           // node VM is Ready
  'image-pull',     // kubelet pulls the image from the registry
  'secrets-mount',  // CSI driver mounts the database password (workload identity)
  'container-start',// Spring Boot starts
  'database',       // Flyway check, connection pool to PostgreSQL
  'readiness',      // pods Ready, endpoints behind the Service
  'load-balancer',  // internal Azure Load Balancer probe is healthy
  'first-response', // first API call answers through the whole path
  'window-open',    // the 15-minute countdown runs
  'window-close',   // countdown ends
  'cluster-stop',   // cluster stops, cost goes to idle
] as const
export type AksStage = (typeof AKS_STAGES)[number]

export const FUNCTIONS_STAGES = [
  'request', 'edge', 'gateway', 'identity', 'keyvault',
  'function-cold-start', // Functions host allocates an instance (only when cold)
  'jvm-start',           // Spring Boot starts inside the function (only when cold)
  'database',            // PostgreSQL (signed-in users only; guests never reach it)
  'response',
] as const
export type FunctionsStage = (typeof FUNCTIONS_STAGES)[number]
