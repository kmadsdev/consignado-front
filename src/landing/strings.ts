// Every user-visible string of the landing area. One file, so pt-BR can be added later.

export const ROUTES = {
  home: '/',
  contact: '/#contact',
  simulate: '/app/simulate',
  aks: '/app/aks',
  privacy: '/privacy',
  terms: '/terms',
} as const

export const NOTICE_DATE = '2026-11-17'

export interface Fact {
  label: string
  value: string
  /** Show the value in monospace (durations, counts). */
  mono?: boolean
}

export interface LegalSection {
  title: string
  paragraphs?: string[]
  items?: string[]
  /** Paragraphs shown after the list. */
  after?: string[]
  /** A link shown after the text of the section. */
  link?: { text: string; href: string }
}

export const common = {
  product: 'Consignado Cloud',
  footer: 'Technical demo. Not a credit offer. All data is synthetic.',
  footerNav: 'Legal',
  privacy: 'Privacy',
  terms: 'Terms',
  home: 'Home',
  lastUpdated: 'Last updated',
  backHome: 'Back to the home page',
}

export const landing = {
  header: {
    title: 'Consignado Cloud',
    tagline: 'One loan engine, two Azure hosts. Watch each request travel through the architecture, live.',
    about:
      'A technical demo by Kaique Souza, backend engineer. It runs one payroll-loan API on two Azure hosts to show an architecture with the shape of production: an edge with a firewall, a gateway, identity, secrets, a database and automated deploys. The loan screens exist to produce requests. The architecture is the thing on show.',
    sourceLabel: 'Source code',
    repos: [
      { name: 'kmadsdev/consignado-api', href: 'https://github.com/kmadsdev/consignado-api' },
      { name: 'kmadsdev/consignado-front', href: 'https://github.com/kmadsdev/consignado-front' },
      { name: 'kmadsdev/consignado-serverless', href: 'https://github.com/kmadsdev/consignado-serverless' },
    ],
    primaryAction: 'Try the simulation',
    secondaryAction: 'Sign in to run it on Kubernetes',
  },

  diagram: {
    title: 'The architecture, live',
    badge: 'Simulation',
    description:
      'A replay of one request on the serverless host. Each stage lights up when its event arrives.',
    caption:
      'This page plays recorded timings in a loop. In the application, the same diagram is driven by the events of your own requests.',
  },

  hosts: {
    title: 'Two hosts, one API',
    description:
      'The same Spring Boot application runs on both hosts, behind the same gateway and against the same database.',
    tradeOffLabel: 'Trade-off',
    functions: {
      title: 'Azure Functions',
      subtitle: 'Serverless host',
      facts: [
        { label: 'Availability', value: 'Always on' },
        { label: 'Who can use it', value: 'Guests and signed-in users' },
        { label: 'Cold start', value: 'About 8 to 15 s', mono: true },
        { label: 'Warm request', value: '60 to 300 ms', mono: true },
        { label: 'When idle', value: 'Scales to zero instances' },
        { label: 'Network', value: 'No public endpoint, gateway only' },
      ] as Fact[],
      tradeOff:
        'It costs nothing when idle, but the first request after a pause waits for a new instance and for the JVM to start.',
    },
    aks: {
      title: 'Azure Kubernetes Service',
      subtitle: 'Kubernetes host',
      facts: [
        { label: 'Availability', value: 'Started for a 15-minute access window' },
        { label: 'Who can use it', value: 'Signed-in users, 3 windows each' },
        { label: 'Cold start', value: 'About 4 to 6 min', mono: true },
        { label: 'Start progress', value: 'Shown stage by stage' },
        { label: 'When the window ends', value: 'The cluster is stopped' },
        { label: 'Network', value: 'Internal load balancer, 2 pods' },
      ] as Fact[],
      tradeOff:
        'It answers at a steady speed once it runs, but a stopped cluster needs minutes to start and a running one costs money each hour.',
    },
  },

  access: {
    title: 'What you can do',
    description: 'Three access levels. Sign-in is by a one-time code sent to your email.',
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
        serverless: 'Stateless loan preview',
        kubernetes: 'Replay only, marked as a simulation',
        data: 'Masked snapshot, read-only',
        limits: 'Your data stays in the browser',
      },
      {
        level: 'Registered',
        serverless: 'Full workflow, at all times',
        kubernetes: '3 access windows of 15 minutes',
        data: 'Read all, write through the workflow',
        limits: 'More windows on request',
      },
      {
        level: 'Owner',
        serverless: 'Full workflow, at all times',
        kubernetes: 'No window limit',
        data: 'Read all, write through the workflow',
        limits: 'None. Also: users, sessions, engine state and budget',
      },
    ],
  },

  path: {
    title: 'The request path',
    description: 'What one API call goes through, in order.',
    steps: [
      { service: 'Browser', text: 'sends the call over HTTPS to one public hostname.' },
      {
        service: 'Azure Front Door',
        text: 'ends the TLS connection, applies the firewall (WAF) rules and the rate limit, and drops what fails.',
      },
      {
        service: 'Gateway (Java function)',
        text: 'is the only origin that the edge can reach. It accepts the call and selects the host.',
      },
      {
        service: 'Microsoft Entra ID',
        text: 'issued the token. The gateway checks its signature and claims, then the account state and the access windows left.',
      },
      {
        service: 'Azure Key Vault',
        text: 'gives the gateway its secrets through a managed identity.',
      },
      {
        service: 'Azure Functions',
        text: 'runs the Spring Boot API for the serverless host. For the Kubernetes host, the call goes to the next step.',
      },
      {
        service: 'Internal Azure Load Balancer and AKS pods',
        text: 'receive the call inside the virtual network and send it to one of 2 pods with the same API.',
      },
      {
        service: 'PostgreSQL',
        text: 'stores the shared data. Only the calls of signed-in users reach it.',
      },
    ],
    pageLoadLabel: 'Page load',
    pageLoad: 'Browser, then Azure Front Door (CDN and WAF), then Blob Storage (static site).',
  },

  security: {
    title: 'Security and limits, stated plainly',
    description: 'What protects the demo, and what stops it.',
    items: [
      { lead: 'Edge.', text: 'A web application firewall and rate limits at Azure Front Door.' },
      {
        lead: 'No public hosts.',
        text: 'The cluster and the API hosts have no public endpoint. Only the gateway is exposed.',
      },
      {
        lead: 'No stored passwords.',
        text: 'OIDC for deploys, workload identity for pods, managed identities for functions.',
      },
      { lead: 'Sign-in.', text: 'A one-time code by email, through Microsoft Entra ID.' },
      {
        lead: 'One person, one trial.',
        text: 'Possible duplicate accounts are held for review by the owner.',
      },
      {
        lead: 'Budget.',
        text: 'A monthly budget of US$60. When it is reached, the Kubernetes host is paused.',
      },
      { lead: 'Data.', text: 'All data is synthetic. No real person is in the database.' },
    ],
  },

  stack: {
    title: 'Built with',
    groups: [
      { label: 'API', items: ['Java 21', 'Spring Boot 3', 'PostgreSQL 16'] },
      { label: 'Hosts', items: ['Azure Functions', 'AKS'] },
      { label: 'Edge and storage', items: ['Front Door', 'Blob Storage'] },
      { label: 'Identity and secrets', items: ['Entra ID', 'Key Vault'] },
      { label: 'Infrastructure and deploys', items: ['Terraform', 'GitHub Actions'] },
      { label: 'Front end', items: ['React', 'Cloudscape'] },
    ],
  },

  contact: {
    title: 'Contact, or request more access',
    description:
      'Ask a question about the project, or ask for more access windows on the Kubernetes host. The owner reads each message.',
  },
}

export const contactForm = {
  name: 'Name',
  namePlaceholder: 'Your name',
  email: 'Email',
  emailPlaceholder: 'you@example.com',
  emailConstraint: 'The answer goes to this address.',
  kind: 'Subject',
  kinds: {
    contact: 'General question',
    'more-windows': 'More access windows',
  },
  message: 'Message',
  messagePlaceholder: 'What do you want to know or to test?',
  messageConstraint: 'Between 10 and 2000 characters.',
  antiBotLabel: 'Anti-bot check',
  antiBotPlaceholder: 'The anti-bot widget loads here.',
  consentBefore: 'I agree that this message and my contact data are processed as the ',
  consentLink: 'privacy notice',
  consentAfter: ' describes.',
  submit: 'Send message',
  sending: 'Sending',
  errors: {
    name: 'Enter your name.',
    email: 'Enter a valid email address.',
    message: 'Write at least 10 characters.',
    messageLong: 'Write 2000 characters at most.',
    consent: 'Your agreement is necessary to send the message.',
    send: 'The message was not sent. Try again in a moment.',
  },
  successTitle: 'Message sent',
  successText: 'The owner received your message and will answer by email.',
  successSimulated: 'No backend is connected in this build. The send was simulated.',
  again: 'Send another message',
}

export const privacy = {
  title: 'Privacy notice',
  description:
    'How Consignado Cloud uses personal data, under the Brazilian General Data Protection Law (LGPD, Law 13.709/2018).',
  alertTitle: 'Not reviewed by a lawyer',
  alert: 'This notice was written for a technical demo and has not been reviewed by a lawyer.',
  sections: [
    {
      title: '1. Who controls the data',
      paragraphs: [
        'The controller is Kaique Souza, the author and owner of this demo. To contact the controller, use the form on the home page.',
      ],
      link: { text: 'Open the contact form', href: ROUTES.contact },
    },
    {
      title: '2. Guests',
      paragraphs: [
        'If you use the demo without an account, the data that you type stays in your browser. It is not sent to the database and no account is made for you.',
        'The edge network sees your IP address for a short time, to apply the firewall and the rate limits. This is true for each visitor.',
      ],
    },
    {
      title: '3. What is collected from registered users, and why',
      items: [
        'Name, email, company and LinkedIn URL: to make your account and to know who uses the demo.',
        'IP address and a hashed device fingerprint: to prevent abuse. The rule is one person, one trial.',
        'Usage records of your access windows (when each one was requested, started and ended): to apply the limit of windows and to control cost.',
        'Security logs of sign-ins and requests: to find and stop attacks.',
        'Messages that you send through the contact form, with the name and email that you give.',
      ],
    },
    {
      title: '4. Legal bases',
      items: [
        'Consent (LGPD article 7, I): the account data. You give it when you complete your profile, and you can withdraw it at any time.',
        'Legitimate interest (LGPD article 7, IX): abuse prevention and security, which includes the IP address, the device fingerprint and the security logs.',
      ],
    },
    {
      title: '5. How long the data is kept',
      items: [
        'Account data: until you ask for its deletion, or after 12 months without use.',
        'Security logs: 90 days.',
      ],
    },
    {
      title: '6. Who processes the data',
      items: [
        'Microsoft Azure: hosting, database, sign-in (Microsoft Entra ID) and logs.',
        'Cloudflare: DNS and the anti-bot check on forms.',
      ],
      after: [
        'These companies act as processors. Their data centers can be outside Brazil. The data is not shared with any other party.',
      ],
    },
    {
      title: '7. Your rights',
      paragraphs: [
        'LGPD article 18 gives you these rights about your personal data:',
      ],
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
        'Send a message through the contact form, from the email address of your account. The controller answers by email. You can also file a complaint with the Brazilian data protection authority (ANPD).',
      ],
      link: { text: 'Open the contact form', href: ROUTES.contact },
    },
    {
      title: '9. What this site does not do',
      items: [
        'It does not sell personal data.',
        'It does not show advertising.',
        'It does not use tracking cookies.',
      ],
      after: [
        'The loan data in the demo is synthetic. Do not enter the real data of any person in the loan screens.',
      ],
    },
  ] as LegalSection[],
}

export const terms = {
  title: 'Terms of use',
  description: 'The conditions to use Consignado Cloud. They are short.',
  sections: [
    {
      title: '1. A technical demonstration',
      paragraphs: [
        'Consignado Cloud is a technical demonstration of a cloud architecture. It is not a bank and not a financial institution. It makes no credit offer, and no real loan is made, approved or paid here. The numbers on the loan screens have no financial value.',
      ],
    },
    {
      title: '2. No real personal data',
      paragraphs: [
        'Do not enter the real personal data of any person in the loan screens: no real name, CPF, income or employer. Use the random generator that the application gives you. Data in the shared database can be seen by other registered users.',
      ],
    },
    {
      title: '3. Fair use and limits',
      items: [
        'Each registered user gets 3 access windows of 15 minutes on the Kubernetes host. More windows are given on request.',
        'Rate limits apply to all requests.',
        'One account for each person. Possible duplicate accounts are held for review.',
        'Do not attack the service, test its limits with automated load, or try to get the data of other accounts.',
        'The owner can hold or block an account at any time.',
      ],
    },
    {
      title: '4. Availability',
      paragraphs: [
        'The service has a monthly budget. When the budget is reached, the Kubernetes host is paused until the next month. The owner can pause or stop all of the service at any time, without notice. Data in the demo can be reset.',
      ],
    },
    {
      title: '5. No warranty',
      paragraphs: [
        'The service is given as it is, with no warranty of any kind. To the extent that the law permits, the owner is not liable for damage that comes from the use of the service or from the lack of it.',
      ],
    },
    {
      title: '6. Privacy',
      paragraphs: ['The privacy notice tells you which personal data is collected and why.'],
      link: { text: 'Read the privacy notice', href: ROUTES.privacy },
    },
    {
      title: '7. Contact',
      paragraphs: ['For a question about these terms, use the contact form on the home page.'],
      link: { text: 'Open the contact form', href: ROUTES.contact },
    },
  ] as LegalSection[],
}
