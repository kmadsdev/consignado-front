// Every user-visible string of the shell, in English. The pt-BR table is in strings.pt.ts.
import { pick } from '../i18n/lang.ts'
import { ptBR } from './strings.pt.ts'

export const en = {
  brand: 'Consignado Cloud',
  brandAlt: 'Consignado Cloud glyph',
  footer: 'Technical demo. Not a credit offer. All data is synthetic.',
  engine: {
    chip: (label: string) => `Engine: ${label}`,
    chipTitle: 'State of the AKS cluster of the Kubernetes host',
    states: {
      stopped: 'stopped', starting: 'starting', running: 'running', stopping: 'stopping', cooldown: 'cool-down', paused: 'paused',
    } as Record<string, string>,
    cooldownLeft: (minutes: number) => `cool-down, ${minutes} min left`,
    pausedBy: { budget: 'paused, budget reached', admin: 'paused by the owner' } as Record<string, string>,
    pausedNoNew: 'running, no new windows',
  },
  metaDescription: 'A payroll-loan API on Azure Functions and AKS behind one Java gateway. The site draws each request with its measured timings. Technical demo, synthetic data.',
  lang: { label: 'EN | PT', title: 'Language', en: 'English', pt: 'Português (Brasil)' },
  theme: { toDark: 'Dark mode', toLight: 'Light mode', title: 'Switch between light and dark mode' },
  preview: {
    label: (name: string) => `Preview as: ${name}`,
    title: 'Design preview',
    description: 'Mock build. No real sign-in.',
    groupPersonas: 'Show the site as',
    groupData: 'Mock data',
    reset: 'Reset the mock data',
    resetDone: 'The mock data is back to its first state.',
    personas: {
      guest: 'Guest',
      recruiter: 'Recruiter (registered)',
      'recruiter-new': 'Recruiter (new, profile not complete)',
      'recruiter-held': 'Recruiter (held, possible duplicate)',
      'recruiter-spent': 'Recruiter (no windows left)',
      admin: 'Admin',
    } as Record<string, string>,
    short: {
      guest: 'Guest', recruiter: 'Recruiter', 'recruiter-new': 'New recruiter', 'recruiter-held': 'Held recruiter', 'recruiter-spent': 'Recruiter, 0 windows', admin: 'Admin',
    } as Record<string, string>,
  },
  user: { signIn: 'Sign in', signOut: 'Sign out', profile: 'Your profile', noName: 'New account', menuTitle: 'Account' },
  nav: {
    header: 'Consignado Cloud',
    overview: 'Overview',
    operations: 'Operations',
    aks: 'Kubernetes host',
    simulate: 'Serverless host',
    admin: 'Admin',
    docs: 'Platform docs on GitHub',
    privacy: 'Privacy',
    terms: 'Terms',
    home: 'Home',
    liveWindow: 'Access window',
    notFound: 'Page not found',
    guestBadge: 'guest',
    sectionHosts: 'Hosts',
    sectionOwner: 'Owner',
    sectionMore: 'More',
  },
  docsUrl: 'https://github.com/kmadsdev/consignado-api/tree/main/docs/platform',
  aria: {
    navigation: 'Side navigation', navigationClose: 'Close the side navigation', navigationToggle: 'Open the side navigation',
    notifications: 'Notifications', breadcrumbs: 'Breadcrumbs', overflow: 'More', overflowTitle: 'All', overflowBack: 'Back', overflowDismiss: 'Close the menu', external: 'Opens in a new tab',
  },
  inspector: {
    title: 'Request inspector',
    empty: 'No request yet. Do an action in a table, and its path through the cloud shows here.',
  },
  notFound: {
    title: 'Page not found',
    text: 'There is no page at',
    home: 'Home page',
    app: 'App overview',
  },
}

export const S = pick(en, ptBR)
