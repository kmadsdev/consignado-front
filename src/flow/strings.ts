// Every user-visible string of the request flow, the replay and the request inspector, in English.
// The pt-BR table is in strings.pt.ts.
import { pick } from '../i18n/lang.ts'
import { ptBR } from './strings.pt.ts'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const en = {
  /** Short stage names: checklist rows and the one-line path of an inline record. */
  stage: {
    request: 'browser', edge: 'edge', gateway: 'gateway', identity: 'Entra ID', quota: 'quota', keyvault: 'Key Vault',
    'function-cold-start': 'cold start', 'jvm-start': 'JVM start', 'functions-host': 'Functions host', 'load-balancer': 'load balancer',
    app: 'app', database: 'database', response: 'host and response',
  } as Record<string, string>,
  /** Long stage names of the checklist table. */
  stageLong: {
    request: 'Browser sends the request',
    edge: 'Cloudflare edge checks and forwards the request',
    gateway: 'Gateway accepts the request',
    identity: 'Gateway checks the Entra ID token',
    quota: 'Gateway checks the access window and the budget',
    keyvault: 'Gateway reads its secrets from Key Vault',
    'function-cold-start': 'Azure starts a function instance',
    'jvm-start': 'JVM and Spring Boot start',
    'functions-host': 'Functions host passes the call (network both ways)',
    'load-balancer': 'Internal load balancer passes the call (network both ways)',
    app: 'Spring Boot runs the business rules',
    database: 'PostgreSQL runs the statements',
    response: 'Response returns to the browser',
  } as Record<string, string>,
  /** The main text of the detail column, per stage id. The gateway's own detail is the second, raw line. */
  stageDetail: {
    request: 'The browser sent the request.',
    edge: 'Cloudflare applied the firewall rules and the rate limit.',
    gateway: 'Gateway work without the calls below.',
    identity: 'The Entra ID token is valid.',
    quota: 'The access window is open.',
    keyvault: 'Secrets from the cache or from Key Vault.',
    'function-cold-start': 'Azure gave an instance and started the JVM, measured together.',
    'jvm-start': 'Part of the cold start above.',
    'functions-host': 'Network and Functions host, both ways.',
    'load-balancer': 'Network, load balancer and Service, both ways.',
    app: 'Time in Spring Boot without the database time.',
    database: 'The JDBC statements of this request.',
    response: 'The answer came back with its HTTP status.',
  } as Record<string, string>,
  stageFailed: 'This stage failed.',
  /** Metric names by the stable key of the status answer (the gateway's label is English). */
  metricLabel: {
    requests: 'Requests', errors: 'Failed requests', 'latency-avg': 'Average response time', 'latency-p95': 'Response time p95', cpu: 'CPU',
    memory: 'Memory', connections: 'Connections', restarts: 'Restarts', replicas: 'Pods ready', instances: 'Instances',
  } as Record<string, string>,
  node: {
    browser: 'Browser', edge: 'Cloudflare edge', gateway: 'Gateway', identity: 'Entra ID', keyvault: 'Key Vault',
    fnhost: 'Functions host', app: 'Spring Boot API', lb: 'Load balancer', service: 'Service', pod: 'Pod', database: 'PostgreSQL',
  } as Record<string, string>,
  nodeSub: {
    browser: 'measures the total', edge: 'firewall, rate limit', gateway: 'checks and routes', identity: 'token check', keyvault: 'gateway secrets',
    fnhost: 'Flex Consumption', app: 'business rules', lb: 'private address', service: 'ClusterIP', pod: 'Spring Boot API', database: 'shared loan data',
  } as Record<string, string>,
  nodeWhat: {
    browser: 'Your browser sent the request and measured the total time. It is the only point that sees the whole round trip.',
    edge: 'The Cloudflare Worker ends TLS, applies the firewall rules and a limit of 40 requests per 10 s per IP, then adds the edge key. The gateway accepts calls only from Cloudflare with that key, so this is the only way in.',
    gateway: 'The gateway checks the token, the account state and the access window, then forwards the call to one host. It is the only public backend, so the API has no login of its own.',
    identity: 'The gateway checked the signature, issuer, audience and scope of your Entra ID token. A guest sends no token, so a guest request has no such stage.',
    keyvault: 'The gateway reads its secrets from Key Vault with its managed identity. After the first read it keeps them in memory, and the stage shows "cached".',
    fnhost: 'Azure Functions passes the call to the API on the same instance. The time includes the network between the gateway and the host, both ways.',
    app: 'Spring Boot ran the business rules of this request. The API reports this time itself, database time included.',
    lb: 'The internal Azure load balancer gives the cluster a private address with no public IP. The time includes the network both ways.',
    service: 'The Kubernetes Service sends the call to a pod that is Ready.',
    pod: 'A pod runs the same build artifact as the serverless host, an executable Spring Boot JAR.',
    database: 'Azure Database for PostgreSQL holds the shared data of both hosts. The API reports the time of its statements.',
  } as Record<string, string>,
  close: 'Close',
  liveMetric: (key: string, value: string) => (key === 'latency-avg' ? `avg ${value} (5 min)` : key === 'replicas' ? `${value} pods ready` : `CPU ${value}`),
  edgeNetwork: 'edge + network',
  noInstanceId: 'the Functions host does not report an instance id',
  cached: 'cached',
  answered: 'answered',
  otherPod: 'other pod',
  statements: (n: number) => plural(n, 'statement', 'statements'),
  kinds: { select: 'select', insert: 'insert', update: 'update', delete: 'delete', other: 'other' },
  noDatabase: 'This request ran no SQL statement.',
  oldTrace: 'The API did not report its own timing for this request (an older image). The path ends at the host.',
  live: { up: 'up', degraded: 'degraded', down: 'down', stopped: 'stopped', starting: 'starting', unknown: 'unknown' } as Record<string, string>,
  diagramLabel: (label: string) => `Path of the request ${label}`,
  // ---- transport
  transport: {
    label: 'Replay',
    play: 'Play',
    pause: 'Pause',
    restart: 'Restart',
    position: 'Position in the run',
    speed: 'Speed',
    speedHint: 'At 100% the replay takes the measured time',
    elapsed: (now: string, total: string) => `${now} of ${total}`,
    speedOption: (n: number) => `${n}%`,
    lasts: (wall: string) => `lasts ${wall}`,
  },
  // ---- request detail
  detail: {
    request: 'Request',
    status: 'HTTP status',
    host: 'Host',
    instance: 'Instance that answered',
    browserTotal: 'Browser total',
    gatewayTotal: 'Gateway total',
    edgeNetwork: 'Edge + network',
    edgeHint: 'Browser total minus gateway total. The gateway cannot measure the edge and the internet path.',
    build: 'Commit that answered',
    noBuild: 'not reported',
    unknown: 'not reported',
    cold: 'cold', warm: 'warm', slow: 'slow call',
    copy: 'Copy the trace as JSON',
    copied: 'Trace copied',
    copyFailed: 'Copy failed',
    stagesTitle: 'Stages',
    colStage: 'Stage', colStatus: 'Status', colStart: 'Start', colDuration: 'Duration', colShare: 'Share of total', colDetail: 'Detail',
    statusText: { done: 'done', error: 'failed', active: 'running', pending: 'waiting' } as Record<string, string>,
    flowTitle: 'Flow',
    noError: 'Completed',
  },
  db: {
    title: 'Database',
    time: 'Database time',
    statements: 'Statements',
    byKind: 'By kind',
    connection: 'Connection wait',
    share: 'Share of the gateway total',
    server: 'Server',
    region: 'Region',
    hostRegion: 'Host region',
    otherRegion: (db: string, host: string) => `The database is in ${db} and the hosts are in ${host}. Each statement crosses that distance, so most of the database time is network time.`,
    fromDetail: 'Counts read from the stage detail. The API did not send the timing header.',
    none: 'This request ran no SQL statement.',
  },
  // ---- inspector drawer
  inspector: {
    title: 'Request Inspector',
    trigger: 'Open the Request Inspector',
    close: 'Close the Request Inspector',
    resize: 'Resize the Request Inspector',
    tabRequests: 'Requests',
    tabCluster: 'Cluster start',
    listTitle: (n: number) => `Requests of this session (${n})`,
    empty: 'No request yet. Each API call of this browser session shows here, newest first.',
    clear: 'Clear the list',
    colTime: 'Time', colMethod: 'Method', colPath: 'Path', colHost: 'Host', colStatus: 'Status', colTotal: 'Total', colSpeed: 'Cold or warm',
    selected: 'Selected request',
    selectHint: 'Select a request in the list.',
    clusterTitle: 'Cluster start of this window',
    clusterEmpty: 'Open a live window to see its cluster start here.',
    clusterStages: 'Lifecycle checklist',
    colTs: 'Time',
    errorMark: 'error',
  },
  // ---- inline record
  inline: {
    open: 'Open in the Request Inspector',
    cold: 'cold', warm: 'warm', slow: 'slow call',
    failed: (status: number, code?: string) => (status ? `HTTP ${status}${code ? ` (${code})` : ''}` : 'no answer'),
    ok: (status: number) => `HTTP ${status}`,
  },
  // ---- second layer
  explain: {
    trace: {
      title: 'How to read this trace',
      body: [
        'Three places measure the time of this request. The gateway measures its own stages: token, access window, secrets and the call to the host. The API reports app (the time inside Spring Boot, database included) and database (the JDBC statements) in a response header. The browser measures the total.',
        'Nothing measures the Cloudflare edge and the internet path alone. Edge + network is the browser total minus the gateway total.',
        'Cold means that the host had to start before it ran the request: a new function instance, a JVM and Spring Boot, about 19 s. Warm means that an instance was already running. A slow call is warm but long, for example a contract activation that writes many rows.',
        'The replay plays the stages again with their measured times. At 100% it takes as long as the request took. At 1%, a 50 ms request lasts 5 s, so you can follow each stage.',
      ],
    },
    db: {
      title: 'Why the database time is high',
      body: [
        'The database is an Azure Database for PostgreSQL 16, size B1ms, in North Central US. Both hosts are in Belgium Central. Belgium Central had no capacity for that size, so each statement crosses the Atlantic and back. A contract activation writes many rows and takes about 4.5 s.',
        'The fix is a database in the region of the hosts when that size is available there. The database has a public endpoint with TLS and the "Azure services" firewall rule. A private endpoint costs about US$8 more per month, so I did not add it. A bank uses a private network.',
      ],
    },
  },
}

export const F = pick(en, ptBR)
