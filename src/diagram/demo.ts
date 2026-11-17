// Fake but realistic event stream. It plays real durations, compressed by `speed`.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LifecycleEvent } from '../api/types'
import { DEMO_DETAIL } from './strings'

interface Step { stage: string; ms?: number; detail: string; hold?: number }

// Real durations in ms. Sum before the window opens: about 4 min 37 s.
const AKS_STEPS: Step[] = [
  { stage: 'request', ms: 42, detail: DEMO_DETAIL.request },
  { stage: 'edge', ms: 31, detail: DEMO_DETAIL.edge },
  { stage: 'gateway', ms: 184, detail: DEMO_DETAIL.gateway },
  { stage: 'identity', ms: 118, detail: DEMO_DETAIL.identity },
  { stage: 'quota', ms: 37, detail: DEMO_DETAIL.quota },
  { stage: 'keyvault', ms: 176, detail: DEMO_DETAIL.keyvault },
  { stage: 'arm-start', ms: 4_210, detail: DEMO_DETAIL['arm-start'] },
  { stage: 'control-plane', ms: 151_400, detail: DEMO_DETAIL['control-plane'] },
  { stage: 'node', ms: 68_900, detail: DEMO_DETAIL.node },
  { stage: 'image-pull', ms: 12_300, detail: DEMO_DETAIL['image-pull'] },
  { stage: 'secrets-mount', ms: 2_840, detail: DEMO_DETAIL['secrets-mount'] },
  { stage: 'container-start', ms: 19_700, detail: DEMO_DETAIL['container-start'] },
  { stage: 'database', ms: 2_450, detail: DEMO_DETAIL.database },
  { stage: 'readiness', ms: 6_100, detail: DEMO_DETAIL.readiness },
  { stage: 'load-balancer', ms: 8_050, detail: DEMO_DETAIL['load-balancer'] },
  { stage: 'first-response', ms: 238, detail: DEMO_DETAIL['first-response'] },
  { stage: 'window-open', detail: DEMO_DETAIL['window-open'], hold: 600 },
  { stage: 'window-close', ms: 900_000, detail: DEMO_DETAIL['window-close'], hold: 2_600 },
  { stage: 'cluster-stop', ms: 44_600, detail: DEMO_DETAIL['cluster-stop'] },
]

const fnSteps = (cold: boolean, n: number): Step[] => {
  const j = (base: number) => base + ((n * 37) % 23) // small, repeatable variation
  return [
    { stage: 'request', ms: j(18), detail: DEMO_DETAIL.request },
    { stage: 'edge', ms: j(24), detail: DEMO_DETAIL.edge },
    { stage: 'gateway', ms: cold ? 162 : j(21), detail: DEMO_DETAIL.gateway },
    { stage: 'identity', ms: cold ? 109 : j(8), detail: DEMO_DETAIL.identity },
    { stage: 'keyvault', ms: cold ? 158 : j(4), detail: DEMO_DETAIL.keyvault },
    cold ? { stage: 'function-cold-start', ms: 6_840, detail: DEMO_DETAIL['function-cold-start'] } : { stage: 'function-cold-start', ms: 0, detail: DEMO_DETAIL.warmSkip, hold: 120 },
    cold ? { stage: 'jvm-start', ms: 4_610, detail: DEMO_DETAIL['jvm-start'] } : { stage: 'jvm-start', ms: 0, detail: DEMO_DETAIL.warmSkip, hold: 120 },
    { stage: 'database', ms: cold ? 384 : j(31), detail: DEMO_DETAIL['database:fn'] },
    { stage: 'response', ms: j(12), detail: DEMO_DETAIL.response },
  ]
}

const DEFAULT_SPEED = { aks: 9, functions: 2 } as const
const MIN_PLAY = 420 // a stage stays visible for at least this long
const WARM_RUNS = 2
const PAUSE_BETWEEN_RUNS = 1_400

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export interface DemoTimelineOptions { speed?: number; loop?: boolean; autoStart?: boolean }
export interface DemoTimeline {
  events: LifecycleEvent[]
  running: boolean
  start: () => void
  reset: () => void
  /** functions view: 0 = cold run, 1.. = warm runs. aks view: always 0. */
  run: number
}

export function useDemoTimeline(view: 'aks' | 'functions', opts?: DemoTimelineOptions): DemoTimeline {
  const speed = opts?.speed ?? DEFAULT_SPEED[view]
  const loop = opts?.loop ?? false
  const [events, setEvents] = useState<LifecycleEvent[]>([])
  const [running, setRunning] = useState(false)
  const [run, setRun] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  const token = useRef(0)

  const stop = useCallback(() => {
    token.current += 1
    window.clearTimeout(timer.current)
  }, [])

  const reset = useCallback(() => {
    stop()
    setEvents([])
    setRunning(false)
    setRun(0)
  }, [stop])

  const start = useCallback(() => {
    stop()
    const mine = token.current
    let clock = Date.now() // simulated wall clock: it advances by the REAL duration of each stage

    const playRun = (runIndex: number) => {
      const steps = view === 'aks' ? AKS_STEPS : fnSteps(runIndex === 0, runIndex)
      setRun(runIndex)
      setEvents([])

      if (reducedMotion()) {
        // No motion: show the end state at once.
        const all: LifecycleEvent[] = steps.map((s) => {
          clock += s.ms ?? 0
          return { ts: new Date(clock).toISOString(), stage: s.stage, status: 'done', detail: s.detail, ms: s.ms }
        })
        setEvents(all)
        setRunning(false)
        return
      }

      const step = (i: number) => {
        if (token.current !== mine) return
        if (i >= steps.length) {
          const lastRun = view === 'aks' ? 0 : WARM_RUNS
          if (runIndex < lastRun) timer.current = window.setTimeout(() => token.current === mine && playRun(runIndex + 1), PAUSE_BETWEEN_RUNS)
          else if (loop) timer.current = window.setTimeout(() => token.current === mine && playRun(0), PAUSE_BETWEEN_RUNS * 2)
          else setRunning(false)
          return
        }
        const s = steps[i]
        setEvents((prev) => [...prev, { ts: new Date(clock).toISOString(), stage: s.stage, status: 'active' }])
        const play = s.hold ?? Math.max(MIN_PLAY, (s.ms ?? 0) / speed)
        timer.current = window.setTimeout(() => {
          if (token.current !== mine) return
          clock += s.ms ?? 0
          setEvents((prev) => [...prev, { ts: new Date(clock).toISOString(), stage: s.stage, status: 'done', detail: s.detail, ms: s.ms }])
          step(i + 1)
        }, play)
      }
      step(0)
    }

    setRunning(true)
    playRun(0)
  }, [view, speed, loop, stop])

  // Stop the timers when the view changes or the component goes away.
  useEffect(() => reset, [view, reset])

  const autoStart = opts?.autoStart ?? false
  useEffect(() => {
    if (autoStart) start()
  }, [autoStart, start])

  return { events, running, start, reset, run }
}
