// Every user-visible string of the API area: what the viewer reads when a call fails.
// What happened and why, then the one thing to do. English here; the pt-BR table is in strings.pt.ts.
import { pick } from '../i18n/lang.ts'
import { ptBR } from './strings.pt.ts'

export const en = {
  network: 'The request did not reach the server. Check your connection, then try again.',
  unauthorized: 'This call needs a signed-in account. Sign in, then try again.',
  invalidToken: 'Your sign-in expired or is not valid. Sign in again.',
  forbidden: 'Your account cannot make this call. Only the owner can change agreements and use the admin pages.',
  blocked: 'I blocked this account. If you think this is an error, send me a message with the contact form.',
  noSession: 'The Kubernetes host answers only during an open access window. Start a 15-minute window first.',
  botCheck: 'The bot check did not pass. Do the check again, then send the form again.',
  paused: 'New access windows are paused. The serverless host continues to answer.',
  held: 'Your account is on hold until I review it. You can read the data, but you cannot start a window yet.',
  noWindows: 'You used all your access windows. Ask me for more with the form on the Kubernetes host page.',
  dailyLimit: 'All accounts together started 12 windows in the last 24 hours, which is the limit. Try again later.',
  profileIncomplete: 'An access window needs a complete profile. Complete your profile first.',
  cooldown: (minutes: number) =>
    minutes > 0
      ? `The cluster stopped less than 15 minutes ago, and Azure needs a pause between a stop and a start. Try again in ${minutes} min.`
      : 'The cluster stopped less than 15 minutes ago, and Azure needs a pause between a stop and a start. Try again in a few minutes.',
  conflict: 'The data changed while this request ran. Load the data again, then try again.',
  staleVersion: 'This contract changed since you loaded it. I loaded the current state; check it and try again.',
  versionMissing: 'This change needs the version of the contract, and the request had none. I loaded the contract again; try again.',
  notFound: 'This item does not exist.',
  tooLarge: 'The request is too large.',
  validation: 'The API refused one or more values. Correct them, then try again.',
  tooMany: 'You sent too many requests in a short time. Wait 1 minute, then try again.',
  badGateway: 'The gateway did not get an answer from the API host. Try again in 1 minute.',
  timeout: 'The API host did not answer in time. A cold start of the serverless host takes about 19 s. Try again.',
  internal: 'The service had an internal error. Try again in 1 minute.',
  unknown: (status: number) => `The request failed with HTTP ${status}. Try again.`,
  authFailed: 'The sign-in did not complete. Try again.',
  reason: {
    reject: 'Rejected in the demo console',
    cancel: 'Cancelled in the demo console',
  },
  trace: {
    noTrace: 'the gateway sent no trace for this call',
  },
}

export const E = pick(en, ptBR)
