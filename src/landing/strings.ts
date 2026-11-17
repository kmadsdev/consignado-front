// Every user-visible string of the landing area, in English. The pt-BR table is in strings.pt.ts.
import { pick } from '../i18n/lang.ts'
import { DOCS, ROUTES } from './routes.ts'
import { ptBR } from './strings.pt.ts'

export { DOCS, ROUTES }

export const NOTICE_DATE = '2026-11-17'

export interface Fact {
  label: string
  value: string
  /** Show the value in monospace (durations, counts). */
  mono?: boolean
}

export interface Link {
  text: string
  href: string
}

/** One expandable block of the landing page: the detail for the engineer. */
export interface Topic {
  title: string
  paragraphs: string[]
  /** A list shown after the first paragraph. */
  items?: string[]
  links: Link[]
}

export interface LegalSection {
  title: string
  paragraphs?: string[]
  items?: string[]
  /** Paragraphs shown after the list. */
  after?: string[]
  /** A link shown after the text of the section. */
  link?: Link
}

const commonEn = {
  product: 'Consignado Cloud',
  footer: 'Technical demo. Not a credit offer. All data is synthetic.',
  footerNav: 'Legal',
  privacy: 'Privacy',
  terms: 'Terms',
  home: 'Home',
  lastUpdated: 'Last updated',
  backHome: 'Back to the home page',
}

const landingEn = {
  header: {
    title: 'Consignado Cloud',
    tagline:
      'A payroll-loan API that runs on Azure Functions and on AKS, behind one gateway. The site draws each request you send, with the measured time of every step.',
    about:
      'A technical demo by Kaique Souza, backend engineer. I wrote the loan API, the Java gateway in front of it, the Terraform for Azure and this site. The loan screens send real requests. You can follow each one through the edge, the token check, the host and the database.',
    sourceLabel: 'Source code',
    repos: [
      { name: 'kmadsdev/consignado-api', href: 'https://github.com/kmadsdev/consignado-api' },
      { name: 'kmadsdev/consignado-front', href: 'https://github.com/kmadsdev/consignado-front' },
      { name: 'kmadsdev/consignado-serverless', href: 'https://github.com/kmadsdev/consignado-serverless' },
    ],
    primaryAction: 'Try a loan preview',
    secondaryAction: 'Sign in to use the Kubernetes host',
    signInNote:
      'The preview needs no account. Sign-in uses Microsoft Entra ID with a one-time code sent to your email. To make an account, select "No account? Create one" on the Microsoft page, then "Sign up with email".',
  },

  diagram: {
    title: 'Request path',
    badge: 'Recorded replay',
    description: 'One request on the serverless host, recorded and played in a loop. Each step lights up when its event arrives.',
    caption: 'In the app, the same diagram draws your own requests from the events that the gateway sends.',
  },

  product: {
    title: 'What the API does',
    description: 'Payroll loans: agreements, customers, margin, simulations and contracts.',
    intro:
      'In a payroll loan (consignado), the employer or the pension body deducts each installment from the salary or benefit, under an agreement with the lender. The agreement caps the term, the monthly rate and the share of net monthly income that installments can take: the margin. The API registers agreements and customers, simulates loans, and moves each contract from proposal to settlement.',
    topics: [
      {
        title: 'Margin, checked on every contract and every income change',
        paragraphs: [
          'The margin limit is net monthly income times the margin percent of the agreement, rounded down to the cent. It rounds down because the margin is a ceiling: one cent up would let an installment pass the limit.',
          'A simulation compares the largest installment of the schedule with the free margin. Approval checks it again. The API locks the customer row, adds the installments of the approved and active contracts, and then decides. Two approvals for one customer run one after the other, so they cannot both take the same margin.',
          'A change of income is the only update outside the contract flow. The API refuses it with 422 when the new limit is below the installments already committed.',
        ],
        links: [
          { text: 'ADR 0003: contract states and concurrency', href: DOCS.adr0003 },
          { text: 'MarginPolicy.java', href: DOCS.marginPolicy },
        ],
      },
      {
        title: 'Price (French) amortization and rounding',
        paragraphs: [
          'Every installment has the same amount, PMT = P × i × (1+i)^n / ((1+i)^n - 1), rounded to the cent. The interest of a month is the balance times the rate. The rest of the installment pays the principal.',
          'Amounts are BigDecimal with HALF_EVEN rounding. The last installment takes the rounding remainder, so the balance ends at 0.00. R$ 15,000.00 over 84 months at 1.85% per month gives 83 installments of 353.24 and a last one of 354.04. The margin check uses the largest one.',
          'The API does not compute IOF or CET. In a lending product a wrong CET is worse than no CET, so I left both out and wrote down why.',
        ],
        links: [
          { text: 'ADR 0002: money and rounding', href: DOCS.adr0002 },
          { text: 'PriceAmortization.java', href: DOCS.priceAmortization },
        ],
      },
      {
        title: 'Contract states',
        paragraphs: [
          'One table in ContractStatus holds every allowed move, and the API answers 409 to any other move.',
        ],
        items: [
          'PROPOSED goes to APPROVED, REJECTED or CANCELLED.',
          'APPROVED goes to ACTIVE or CANCELLED. Activation writes the installment schedule.',
          'ACTIVE goes to SETTLED or CANCELLED.',
          'Only APPROVED and ACTIVE contracts use margin.',
          'Each contract has a version, sent as its ETag. A stale If-Match gets 412 before anything changes.',
        ],
        links: [
          { text: 'ADR 0003: contract states and concurrency', href: DOCS.adr0003 },
          { text: 'ContractStatus.java', href: DOCS.contractStatus },
        ],
      },
      {
        title: 'Idempotent contract creation',
        paragraphs: [
          'A client that times out sends the request again, and a duplicate proposal is a real problem in lending. POST /contracts needs an Idempotency-Key header. A unique constraint on that key decides which request wins, with no lock in memory. A repeat with the same key gets the same contract with 200. In the integration test, 8 requests with one key at the same time create one row.',
        ],
        links: [
          { text: 'ADR 0004: idempotent contract creation', href: DOCS.adr0004 },
          { text: 'ContractService.java', href: DOCS.contractService },
        ],
      },
    ] as Topic[],
  },

  hosts: {
    title: 'Two hosts, one jar',
    description: 'The same Spring Boot 3.5 build runs on both, behind the same gateway, against the same database.',
    functions: {
      title: 'Azure Functions',
      subtitle: 'Serverless host',
      facts: [
        { label: 'Availability', value: 'Always, starts on demand' },
        { label: 'Who can use it', value: 'Guests and signed-in users' },
        { label: 'First call after idle', value: '18.6 to 18.9 s', mono: true },
        { label: 'Warm call', value: '0.25 to 0.9 s', mono: true },
        { label: 'Instances', value: '1 at most' },
        { label: 'Network', value: 'Accepts calls from the gateway only' },
      ] as Fact[],
      tradeOff:
        'It runs on demand, so its cost stays near the free grant of Azure Functions (an estimate). The first call after a pause waits while a new instance starts the JVM and Spring Boot. Times are end to end, measured through the edge.',
    },
    aks: {
      title: 'Azure Kubernetes Service',
      subtitle: 'Kubernetes host',
      facts: [
        { label: 'Availability', value: 'Stopped until someone opens an access window' },
        { label: 'Who can use it', value: 'Signed-in users, 3 windows of 15 minutes' },
        { label: 'Cold start', value: '7 min 13 s', mono: true },
        { label: 'Window on a running cluster', value: 'Ready in under 2 s', mono: true },
        { label: 'Size', value: '1 node Standard_D2as_v4, 2 to 3 pods' },
        { label: 'Network', value: 'Internal load balancer, no public address' },
      ] as Fact[],
      tradeOff:
        'The node costs US$0.104 per hour, about US$76 for a full month, which is more than the whole budget. So the cluster runs only during windows, and the first visitor waits for it to start.',
    },
    topics: [
      {
        title: 'Why the same jar runs on two hosts',
        paragraphs: [
          'A comparison of Kubernetes and serverless is fair only when both run the same program. On Azure Functions the jar runs as a custom handler: the Functions host starts a Java runtime that I build with jlink and a CDS archive, and forwards each HTTP request to Spring Boot. CI tests one artifact, and both hosts run that artifact.',
          'The cost is two deploy paths to keep working, and a 129 MB package whose Java runtime only a new build can patch. The outbox relay runs only on AKS, so an event written on the serverless host waits for a running pod.',
          'A bank would pick one host per service from load and cost data, and keep one deploy path.',
        ],
        links: [{ text: 'ADR 0007: two hosts, one API', href: DOCS.adr0007 }],
      },
      {
        title: 'The 7 min 13 s cold start, stage by stage',
        paragraphs: [
          'Measured from a stopped cluster to the first answer of the API:',
        ],
        items: [
          'Control plane start: 4 min 26 s',
          'Node ready: 2 min 13 s',
          'Spring Boot start and database connection: 26 s',
          'Internal load balancer sends traffic to the pods: 8 s',
        ],
        links: [
          { text: 'ADR 0009: cold cluster and access windows', href: DOCS.adr0009 },
          { text: 'EngineService.java', href: DOCS.engineService },
        ],
      },
      {
        title: 'Access windows and the cool-down',
        paragraphs: [
          'The gateway shows each stage of the start from real signals: the power state from Azure Resource Manager, pod conditions, Service endpoints, and one GET /actuator/health/readiness through the internal load balancer. The window opens when that call answers 200 and lasts 15 minutes from then.',
          'Each account gets 3 windows, and a window counts only when it opens, so a failed start costs the user nothing. I can change both numbers per account. All accounts together can open 12 new windows per day. One window costs about US$0.04 of node time.',
          'A timer runs every minute. When no window is starting or open, the gateway stops the cluster, and a cool-down of 15 minutes follows, as Azure advises between a stop and a start. The Azure role of the gateway can read, start and stop the cluster. It has no right to change or delete it.',
          'A bank would keep the cluster running with autoscaling and reserved capacity, because availability is worth more than the node.',
        ],
        links: [{ text: 'ADR 0009: cold cluster and access windows', href: DOCS.adr0009 }],
      },
    ] as Topic[],
  },

  access: {
    title: 'Access levels',
    description: 'Sign-in uses a one-time code sent to your email. There is no password.',
    columns: {
      level: 'Access level',
      serverless: 'Serverless host',
      kubernetes: 'Kubernetes host',
      data: 'Shared data',
      limits: 'Limits',
    },
    rows: [
      {
        level: 'Guest',
        serverless: 'Loan preview, no database',
        kubernetes: 'Recorded replay, marked as a simulation',
        data: 'Masked snapshot, read-only',
        limits: 'What you type stays in your browser',
      },
      {
        level: 'Signed-in user',
        serverless: 'The full API, at any time',
        kubernetes: '3 access windows of 15 minutes',
        data: 'Read all, write through the loan flow',
        limits: 'More windows on request',
      },
      {
        level: 'Owner',
        serverless: 'The full API, at any time',
        kubernetes: 'No window limit',
        data: 'Read all, write through the loan flow',
        limits: 'Admin pages: users, windows, engine and budget',
      },
    ],
  },

  path: {
    title: 'The path of one API call',
    description: 'In order. Each step can refuse the call.',
    steps: [
      { service: 'Browser', text: 'calls one public hostname over HTTPS.' },
      {
        service: 'Cloudflare edge',
        text: 'ends TLS, applies 3 firewall rules, one of them a limit of 40 requests per 10 seconds per IP on /api/, then adds the edge key.',
      },
      {
        service: 'Gateway',
        text: 'is Java 21 on Azure Functions and the only public backend. It accepts a call only from a Cloudflare address and only with the edge key.',
      },
      {
        service: 'Microsoft Entra ID',
        text: 'issued the token. The gateway checks its issuer, audience, signature, scope and client, then the account state and the access window.',
      },
      {
        service: 'Azure Key Vault',
        text: 'holds the secrets. The gateway reads them with its managed identity.',
      },
      {
        service: 'Serverless host',
        text: 'runs the API on Azure Functions.',
      },
      {
        service: 'Kubernetes host',
        text: 'gets the call through an internal load balancer in the virtual network. One of 2 pods answers.',
      },
      {
        service: 'PostgreSQL 16',
        text: 'holds the shared data. Only calls of signed-in users reach it.',
      },
    ],
    pageLoad: 'The site itself is static files in Azure Blob Storage, cached at the Cloudflare edge.',
    topics: [
      {
        title: 'Timing of each request',
        paragraphs: [
          'The API sends a response header with the time inside the application, the JDBC statements by kind, the database time, the wait for a pooled connection and the instance that answered. Only numbers leave the API, never SQL text or data. The gateway adds them to the trace as the stages app and database.',
          'The loan preview runs no SQL statement, and its header shows zero database work on every call.',
        ],
        links: [
          { text: 'ADR 0013: per-request timing headers', href: DOCS.adr0013 },
          { text: 'RequestTiming.java', href: DOCS.requestTiming },
        ],
      },
      {
        title: 'Why one gateway sits in front of both hosts',
        paragraphs: [
          'The token check, the quotas, the trace and the audit log live in one place, and the API stays unchanged. The gateway is plain Java with a ports-and-adapters core: the rules have no Azure type and run in 156 tests. It starts and stops the cluster through Azure Resource Manager with a managed identity.',
          'The cost is that the network is the only defence of the API, and the gateway is a single point of failure. A bank would add service-to-service authentication, mTLS or a token that the API checks, and use a managed API gateway.',
        ],
        links: [
          { text: 'ADR 0008: gateway in front of two hosts', href: DOCS.adr0008 },
          { text: 'EntraTokenVerifier.java', href: DOCS.tokenVerifier },
        ],
      },
    ] as Topic[],
  },

  identity: {
    title: 'Identity, secrets and cost guards',
    description: 'No stored password for deploys, pods or functions.',
    items: [
      'GitHub Actions deploys with OIDC. Pods use workload identity. Functions use managed identities.',
      'The edge key is the one secret that a system outside Azure shares. It is in Key Vault and in the Cloudflare Worker.',
      'Visitors sign up with an email one-time code. They become restricted guest accounts in my Entra ID tenant.',
      'Cloudflare Turnstile checks the contact form and the profile form.',
      'The gateway stores IP addresses and device fingerprints only as HMAC. An account on the same device or mailbox as another account waits for my review.',
      'The monthly budget is US$60. At 100 percent the gateway pauses the engine and stops the cluster. The site and the serverless host continue.',
      'An independent security review on 2026-11-17 found no critical or high issue. I fixed the medium findings.',
    ],
    topics: [
      {
        title: 'What the budget guard stops, and what it does not',
        paragraphs: [
          'At 50 and 80 percent of US$60 I get an email. At 100 percent an Azure action group calls a webhook of the gateway, which pauses the engine and stops the cluster. The running node is the largest variable cost, and a stop deletes nothing.',
          'An Azure budget is an alert, not a hard cap. It fires after the spend is recorded, and the fixed costs of database, registry, disk and public IP continue. A bank does not stop production on a budget alert. It sets budgets per team, with forecasts and anomaly detection, and pays for capacity in advance.',
        ],
        links: [{ text: 'ADR 0012: budget guard and abuse limits', href: DOCS.adr0012 }],
      },
      {
        title: 'One person, one trial',
        paragraphs: [
          'The limit of 3 windows is per account, so a second account is the easy way around it. The gateway holds a new account with the same device fingerprint or the same normalized mailbox as another one. The same IP address alone only adds a flag, because an office or a university shares one address.',
          'A new browser or a VPN passes this filter. A bank would verify identity at sign-up.',
        ],
        links: [
          { text: 'ADR 0012: budget guard and abuse limits', href: DOCS.adr0012 },
          { text: 'UserService.java', href: DOCS.userService },
        ],
      },
    ] as Topic[],
  },

  data: {
    title: 'Data rules',
    description: 'All data is synthetic and the shared data only grows.',
    items: [
      'The database holds 4 agreements, 50 customers, 60 simulations and 30 contracts, all synthetic.',
      'The API has no DELETE. The one change it allows is the income of a customer, and the margin guards it.',
      'Guests never reach the database. They get the stateless preview and a masked snapshot that the gateway refreshes every 10 minutes.',
      'The CPF is masked in every response. The database stores it in plain text. A real system would encrypt or tokenize it.',
    ],
  },

  delivery: {
    title: 'Delivery',
    description: 'Three repositories, and each one deploys on a push to main.',
    items: [
      'consignado-api: 281 tests and a coverage gate of 80 percent. The CI job builds the image, tags it with the commit and deploys it to AKS. Its rights cover one namespace.',
      'consignado-serverless: the gateway, with 156 tests, and the package of the serverless host.',
      'consignado-front: this site, built and copied to Blob Storage by GitHub Actions.',
      'Terraform describes every Azure resource. The remote state is in a storage account that accepts Entra ID sign-in only.',
      'The request inspector links each request to the commit of the image that answered it.',
    ],
    links: [
      { text: 'Terraform README', href: DOCS.terraform },
      { text: 'CI workflow of the API', href: DOCS.ci },
    ],
  },

  decisions: {
    title: 'Where Azure refused the first plan',
    description: 'Three parts of the design changed after Azure said no.',
    topics: [
      {
        title: 'Edge: a Cloudflare Worker in place of Azure Front Door',
        paragraphs: [
          'The plan was Front Door. Azure refused it on this subscription with "Free Trial and Student account is forbidden for Azure Frontdoor resources". The DNS zone was already at Cloudflare and a Worker costs nothing, so I moved the edge there. Front Door Standard would also have added US$35 per month.',
          'The cost: one part of the path is outside Azure, the free plan has no managed WAF rule set, and I update the list of Cloudflare addresses in the gateway by hand. The Terraform code for Front Door is still in the repository, behind a flag.',
          'A bank would use Front Door Premium or an equal product, with managed WAF rules and a private link to the origin.',
        ],
        links: [{ text: 'ADR 0010: Cloudflare edge instead of Front Door', href: DOCS.adr0010 }],
      },
      {
        title: 'Sign-up: guests in my own tenant in place of an External ID tenant',
        paragraphs: [
          'I planned a separate Microsoft Entra External ID tenant for visitors. The region policy of the subscription refused it. Visitors now sign up through a self-service flow with an email one-time code, as guest users of the tenant that also holds the subscription.',
          'To limit the risk, I set guest permissions to the most restricted level and allowed only admins to invite. A bank would keep customer identities in a separate tenant, with no link to the tenant that runs the infrastructure.',
        ],
        links: [{ text: 'ADR 0011: sign-up in the workforce tenant', href: DOCS.adr0011 }],
      },
      {
        title: 'Database: North Central US, with a public endpoint',
        paragraphs: [
          'Belgium Central had no capacity for the B1ms size, so the PostgreSQL 16 server is in North Central US and both hosts are in Belgium Central. Each statement crosses from Europe to the US. Activating a contract writes many rows and takes about 4.5 s.',
          'The endpoint is public, with TLS and the "Azure services" firewall rule. I chose that over a private endpoint to save about US$8 per month. The password has 28 random characters and exists only in Key Vault.',
          'A bank would use a private network, Entra ID sign-in for the database, and the same region as the callers.',
        ],
        links: [{ text: 'Decision table', href: DOCS.decisions }],
      },
    ] as Topic[],
  },

  limits: {
    title: 'Known limits',
    description: 'Gaps that I know about and did not close.',
    items: [
      'The free Cloudflare plan has no managed WAF rule set. The edge has 3 custom rules, the rate limit among them.',
      'The database endpoint is public. TLS, a firewall rule and a password in Key Vault protect it.',
      'Visitor accounts are in the same Entra ID tenant as the Azure subscription.',
      'Azure Monitor numbers arrive about 2 minutes late.',
      'A visitor who comes during the cool-down waits up to 15 minutes for the Kubernetes host.',
      'No lawyer reviewed the privacy notice or the terms.',
    ],
    links: [{ text: 'Security and privacy document', href: DOCS.security }],
  },

  stack: {
    title: 'Stack',
    groups: [
      { label: 'API', items: ['Java 21', 'Spring Boot 3.5', 'PostgreSQL 16'] },
      { label: 'Hosts', items: ['Azure Functions', 'AKS'] },
      { label: 'Edge and storage', items: ['Cloudflare Worker', 'Blob Storage'] },
      { label: 'Identity and secrets', items: ['Entra ID', 'Key Vault'] },
      { label: 'Infrastructure and deploys', items: ['Terraform', 'GitHub Actions'] },
      { label: 'Front end', items: ['React', 'Cloudscape'] },
    ],
  },

  contact: {
    title: 'Contact and more access windows',
    description: 'Ask about the project, or ask for more windows on the Kubernetes host. I read every message and answer by email.',
  },
}

const contactFormEn = {
  name: 'Name',
  namePlaceholder: 'Your name',
  email: 'Email',
  emailPlaceholder: 'you@example.com',
  emailConstraint: 'I answer to this address.',
  kind: 'Subject',
  kinds: {
    contact: 'Question about the project',
    'more-windows': 'More access windows',
  },
  message: 'Message',
  messagePlaceholder: 'Your question, or how many windows you need',
  messageConstraint: '10 to 2000 characters.',
  antiBotLabel: 'Anti-bot check',
  antiBotPlaceholder: 'Loading the Cloudflare Turnstile check.',
  antiBotFailed: 'The anti-bot check did not load. Make sure that challenges.cloudflare.com is not blocked, then reload the page.',
  consentBefore: 'I agree that this message and my contact data are processed as the ',
  consentLink: 'privacy notice',
  consentAfter: ' describes.',
  submit: 'Send message',
  sending: 'Sending',
  errors: {
    name: 'Enter your name.',
    email: 'Enter a valid email address.',
    message: 'Write at least 10 characters.',
    messageLong: 'Write 2000 characters or fewer.',
    consent: 'Select the agreement box to send the message.',
    send: 'The message was not sent. Try again in a minute.',
    bot: 'Complete the anti-bot check to send the message.',
  },
  successTitle: 'Message sent',
  successText: 'I received your message and will answer by email.',
  successSimulated: 'This build has no backend. Nothing was sent.',
  again: 'Send another message',
}

const privacyEn = {
  title: 'Privacy notice',
  description:
    'How Consignado Cloud uses personal data, under the Brazilian General Data Protection Law (LGPD, Law 13.709/2018).',
  alertTitle: 'Not reviewed by a lawyer',
  alert: 'I wrote this notice for a technical demo. A lawyer has not reviewed it.',
  sections: [
    {
      title: '1. Who controls the data',
      paragraphs: [
        'The controller is Kaique Souza, who built and runs this demo. To contact me, use the form on the home page.',
      ],
      link: { text: 'Open the contact form', href: ROUTES.contact },
    },
    {
      title: '2. Guests',
      paragraphs: [
        'If you use the demo without an account, what you type stays in your browser. Nothing goes to the database, and no account is made for you.',
        'Cloudflare sees the IP address of every visitor for a short time, to apply the firewall rules and the rate limits.',
      ],
    },
    {
      title: '3. What I collect from registered users, and why',
      items: [
        'Name, email, company and LinkedIn URL: to make your account and to know who uses the demo.',
        'IP address and device fingerprint, stored only as a keyed hash: to prevent abuse. The rule is one person, one trial.',
        'When you request, start and end each access window: to apply the window limit and to control cost.',
        'Security logs of sign-ins and requests: to find and stop attacks.',
        'Messages that you send through the contact form, with the name and email that you give.',
      ],
    },
    {
      title: '4. Legal bases',
      items: [
        'Consent (LGPD article 7, I) for the account data. You give it when you complete your profile, and you can withdraw it at any time.',
        'Legitimate interest (LGPD article 7, IX) for abuse prevention and security: the IP address, the device fingerprint and the security logs.',
      ],
    },
    {
      title: '5. How long I keep the data',
      items: [
        'Account data: until you ask me to delete it, or until 12 months pass with no use of the account.',
        'Security logs: 90 days.',
        'A daily job deletes audit rows older than 90 days, and accounts with 12 months of no use with their windows and contact messages.',
        'To delete your data sooner, ask me through the contact form. I also delete your guest account in Microsoft Entra ID.',
      ],
    },
    {
      title: '6. Who processes the data',
      items: [
        'Microsoft Azure: hosting, database, sign-in (Microsoft Entra ID) and logs.',
        'Cloudflare: all traffic of the site goes through Cloudflare (DNS, TLS, CDN, firewall rules and the anti-bot check on forms). Cloudflare sees the IP address and the requests of each visitor.',
      ],
      after: [
        'These companies are processors. Their data centers can be outside Brazil. I share the data with no other party.',
      ],
    },
    {
      title: '7. Your rights',
      paragraphs: ['LGPD article 18 gives you these rights over your personal data:'],
      items: [
        'To confirm that your data is processed, and to get access to it.',
        'To correct data that is incomplete, wrong or out of date.',
        'To have data that is not necessary or is excessive made anonymous, blocked or deleted.',
        'To receive your data in a portable format.',
        'To have the data that is processed with your consent deleted.',
        'To know with whom your data is shared.',
        'To know that you can refuse consent, and what happens if you refuse.',
        'To withdraw your consent.',
      ],
    },
    {
      title: '8. How to use your rights',
      paragraphs: [
        'Send a message through the contact form, from the email address of your account. I answer by email. You can also file a complaint with the Brazilian data protection authority (ANPD).',
      ],
      link: { text: 'Open the contact form', href: ROUTES.contact },
    },
    {
      title: '9. What this site does not do',
      items: ['It does not sell personal data.', 'It does not show advertising.', 'It does not use tracking cookies.'],
      after: ['The loan data in the demo is synthetic. Do not enter the real data of any person in the loan screens.'],
    },
  ] as LegalSection[],
}

const termsEn = {
  title: 'Terms of use',
  description: 'The conditions for using Consignado Cloud.',
  sections: [
    {
      title: '1. A technical demo',
      paragraphs: [
        'Consignado Cloud is a technical demo of a cloud architecture. It is not a bank or a financial institution. It makes no credit offer, and no real loan is made, approved or paid here. The numbers on the loan screens have no financial value.',
      ],
    },
    {
      title: '2. No real personal data',
      paragraphs: [
        'Do not enter the real personal data of any person in the loan screens: no real name, CPF, income or employer. Use the random generator of the app. Other registered users can see the data in the shared database.',
      ],
    },
    {
      title: '3. Fair use and limits',
      items: [
        'Each registered user gets 3 access windows of 15 minutes on the Kubernetes host. I give more windows on request.',
        'Rate limits apply to all requests.',
        'One account for each person. An account that looks like a duplicate waits for my review.',
        'Do not attack the service, test its limits with automated load, or try to get the data of other accounts.',
        'I can hold or block an account at any time.',
      ],
    },
    {
      title: '4. Availability',
      paragraphs: [
        'The service has a monthly budget. When the budget is reached, the Kubernetes host pauses until the next month. I can pause or stop all of the service at any time, without notice. I can reset the demo data.',
      ],
    },
    {
      title: '5. No warranty',
      paragraphs: [
        'The service is given as it is, with no warranty of any kind. To the extent that the law permits, I am not liable for damage that comes from the use of the service or from its absence.',
      ],
    },
    {
      title: '6. Privacy',
      paragraphs: ['The privacy notice says which personal data I collect and why.'],
      link: { text: 'Read the privacy notice', href: ROUTES.privacy },
    },
    {
      title: '7. Contact',
      paragraphs: ['For a question about these terms, use the contact form on the home page.'],
      link: { text: 'Open the contact form', href: ROUTES.contact },
    },
  ] as LegalSection[],
}

export const en = { common: commonEn, landing: landingEn, contactForm: contactFormEn, privacy: privacyEn, terms: termsEn }
export const { common, landing, contactForm, privacy, terms } = pick(en, ptBR)
