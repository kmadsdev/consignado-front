// Every user-visible string of the API area: what the viewer reads when a call fails.
// Calm, specific, short. English now; pt-BR can be added later.
export const E = {
  network: 'The network did not answer. Check your connection, then try again.',
  unauthorized: 'Sign in to use this function.',
  invalidToken: 'Your sign-in is not valid any more. Sign in again.',
  forbidden: 'This account is not allowed to do this.',
  blocked: 'This account is blocked. Use the contact form if you think this is a mistake.',
  noSession: 'The Kubernetes host needs an open access window. Start a 15-minute window first.',
  botCheck: 'The bot check did not pass. Do the check again, then send the form again.',
  paused: 'New access windows are paused now. The serverless host stays available.',
  held: 'This account waits for a check by the owner. You can read the data, but you cannot start a window yet.',
  noWindows: 'No access window is left for this account. You can ask the owner for more.',
  profileIncomplete: 'Complete your profile first. Then you can start an access window.',
  cooldown: (minutes: number) =>
    minutes > 0
      ? `The cluster stopped a short time ago. Azure needs a pause between a stop and a start. Try again in ${minutes} min.`
      : 'The cluster stopped a short time ago. Azure needs a pause between a stop and a start. Try again in some minutes.',
  conflict: 'The data changed while this request ran. Read it again, then try again.',
  notFound: 'This item does not exist.',
  tooLarge: 'The request is too large.',
  validation: 'One or more values are not valid.',
  tooMany: 'Too many requests in a short time. Wait one minute, then try again.',
  badGateway: 'The API host is not available now. Try again in a moment.',
  timeout: 'The API host did not answer in time. A cold host can need 15 to 25 seconds. Try again.',
  internal: 'The service had an internal error. Try again in a moment.',
  unknown: (status: number) => `The request failed (HTTP ${status}). Try again.`,
  authFailed: 'The sign-in did not complete. Try again.',
  reason: {
    reject: 'Rejected in the demo console',
    cancel: 'Cancelled in the demo console',
  },
  trace: {
    noTrace: 'the gateway sent no trace for this call',
  },
}
