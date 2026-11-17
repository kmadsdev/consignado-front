import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TURNSTILE_SITEKEY } from '../config'

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<TurnstileApi> | null = null

/** Loads the Cloudflare Turnstile script once. It is the only third-party script of the site. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (!loading) {
    loading = new Promise<TurnstileApi>((resolve, reject) => {
      if (window.turnstile) { resolve(window.turnstile); return }
      const script = document.createElement('script')
      script.src = SRC
      script.async = true
      script.defer = true
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')))
      script.onerror = () => { loading = null; script.remove(); reject(new Error('turnstile')) }
      document.head.appendChild(script)
    })
  }
  return loading
}

/** True when the build has a site key, so the forms must send a token. */
export const turnstileOn = TURNSTILE_SITEKEY !== ''

/**
 * The bot check. With a site key: the Cloudflare widget, and `onToken` gets the token ('' when it expires).
 * With no site key: `placeholder`, as in the design preview.
 */
export function Turnstile({ onToken, placeholder, failedText }: { onToken: (token: string) => void; placeholder: ReactNode; failedText: string }) {
  const box = useRef<HTMLDivElement>(null)
  const callback = useRef(onToken)
  const [failed, setFailed] = useState(false)
  callback.current = onToken

  useEffect(() => {
    if (!turnstileOn) return
    let alive = true
    let id = ''
    loadTurnstile()
      .then((api) => {
        if (!alive || !box.current) return
        id = api.render(box.current, {
          sitekey: TURNSTILE_SITEKEY,
          theme: document.body.classList.contains('awsui-dark-mode') ? 'dark' : 'light',
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(''),
          'error-callback': () => { callback.current(''); return true },
        })
      })
      .catch(() => { if (alive) setFailed(true) })
    return () => {
      alive = false
      if (id) { try { window.turnstile?.remove(id) } catch { /* ignore */ } }
    }
  }, [])

  if (!turnstileOn) return <>{placeholder}</>
  return (
    <div>
      <div ref={box} style={{ minHeight: 65 }} />
      {failed && <span role="alert">{failedText}</span>}
    </div>
  )
}
