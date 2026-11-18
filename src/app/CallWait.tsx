import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import { useEffect, useRef, useState } from 'react'
import type { HostKind } from '../api/types'
import { decimal, reducedMotion } from './format'
import { T } from './strings'

/** A warm call answers in under 1 s: the cold start hint shows only after this time, so a warm call never flashes it. */
export const COLD_HINT_AFTER_MS = 2000

/** Brings an element into view: smooth, or at once when the viewer asks for reduced motion. */
export function bringIntoView(el: Element | null | undefined, block: ScrollLogicalPosition = 'center') {
  if (!el || typeof el.scrollIntoView !== 'function') return
  el.scrollIntoView({ block, behavior: reducedMotion() ? 'auto' : 'smooth' })
}

/** Seconds since `since`, updated 4 times per second. */
function useElapsedMs(since: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [since])
  return Math.max(0, now - since)
}

/**
 * The wait state of one call: a spinner, the elapsed seconds and, after about 2 s on the serverless host,
 * the cold start as a possible cause. Before the answer the page cannot know the cause, so it says only that much.
 */
export function CallWait(props: { since: number; host: HostKind; scroll?: boolean }) {
  const ms = useElapsedMs(props.since)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (props.scroll) bringIntoView(ref.current) }, [props.scroll, props.since])
  const seconds = `${decimal(Math.floor(ms / 1000), 0)} s`
  const hint = props.host === 'functions' && ms >= COLD_HINT_AFTER_MS
  return (
    <div ref={ref} className="call-wait">
      <SpaceBetween size="xxs">
        <StatusIndicator type="in-progress">
          <span>{T.wait.running}</span> <span className="mono" aria-hidden="true">{seconds}</span>
        </StatusIndicator>
        <div aria-live="polite">{hint && <Box fontSize="body-s" color="text-body-secondary">{T.wait.coldHint}</Box>}</div>
      </SpaceBetween>
    </div>
  )
}
