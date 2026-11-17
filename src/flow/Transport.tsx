// The ONE transport and replay clock of the site: request flows and recorded cluster starts use it.
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Select from '@cloudscape-design/components/select'
import Slider from '@cloudscape-design/components/slider'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { useCallback, useEffect, useRef, useState } from 'react'
import { duration } from '../app/format'
import { autoSpeed, createClock, isEnded, pause, play, positionAt, restart, seek, settle, setSpeed, SPEEDS, wallMs, type ClockState, type Speed } from './clock'
import { F } from './strings'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export interface Replay {
  /** Position in the run, in real ms. */
  pos: number
  durationMs: number
  playing: boolean
  speed: Speed
  play: () => void
  pause: () => void
  restart: () => void
  seek: (pos: number) => void
  setSpeed: (s: Speed) => void
}

/**
 * Replays a recorded run of `durationMs`. When `runKey` changes, the run plays once at the step that makes it last
 * about `targetWallMs` (no auto play with prefers-reduced-motion: the end state shows at once).
 */
export function useReplay(durationMs: number, runKey: string | number, targetWallMs: number, autoPlay = true): Replay {
  const now = () => performance.now()
  const [clock, setClock] = useState<ClockState>(() => createClock(durationMs, autoSpeed(durationMs, targetWallMs), now(), false, durationMs))
  const [pos, setPos] = useState(durationMs)
  const clockRef = useRef(clock)
  clockRef.current = clock

  // A new run: choose the speed, then play once (or show the end).
  useEffect(() => {
    const reduced = prefersReducedMotion()
    const start = autoPlay && !reduced
    const c = createClock(durationMs, autoSpeed(durationMs, targetWallMs), now(), start, start ? 0 : durationMs)
    setClock(c)
    setPos(positionAt(c, now()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, durationMs])

  // One animation frame loop while playing.
  useEffect(() => {
    if (!clock.playing) return
    let raf = 0
    const tick = () => {
      const t = now()
      const c = clockRef.current
      setPos(positionAt(c, t))
      if (isEnded(c, t)) { setClock(settle(c, t)); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [clock])

  const apply = useCallback((fn: (c: ClockState, wall: number) => ClockState) => {
    const t = now()
    const next = fn(clockRef.current, t)
    clockRef.current = next
    setClock(next)
    setPos(positionAt(next, t))
  }, [])

  return {
    pos,
    durationMs: clock.durationMs,
    playing: clock.playing,
    speed: clock.speed,
    play: () => apply(play),
    pause: () => apply(pause),
    restart: () => apply(restart),
    seek: (p: number) => apply((c, w) => seek(c, p, w)),
    setSpeed: (s: Speed) => apply((c, w) => setSpeed(c, s, w)),
  }
}

/** Play, pause, restart, position, speed, and the elapsed real time. */
export function Transport({ replay, label }: { replay: Replay; label?: string }) {
  const T = F.transport
  const options = SPEEDS.map((s) => ({ value: String(s), label: T.speedOption(s), description: T.lasts(duration(wallMs(replay.durationMs, s))) }))
  const selected = options.find((o) => o.value === String(replay.speed)) ?? null
  const step = Math.max(replay.durationMs / 1000, 0.01)
  return (
    <div className="fl-transport" role="group" aria-label={label ?? T.label} data-pos={Math.round(replay.pos)} data-duration={Math.round(replay.durationMs)} data-speed={replay.speed} data-playing={replay.playing ? 'true' : 'false'}>
      <SpaceBetween size="xs" direction="horizontal" alignItems="center">
        {replay.playing
          ? <Button variant="icon" iconName="pause" ariaLabel={T.pause} onClick={replay.pause} />
          : <Button variant="icon" iconName="play" ariaLabel={T.play} onClick={replay.play} />}
        <Button variant="icon" iconName="undo" ariaLabel={T.restart} onClick={replay.restart} />
      </SpaceBetween>
      <div className="fl-transport-slider">
        <Slider
          ariaLabel={T.position}
          min={0}
          max={replay.durationMs}
          step={step}
          value={Math.min(replay.pos, replay.durationMs)}
          valueFormatter={(v) => duration(v)}
          onChange={(e) => replay.seek(e.detail.value)}
        />
      </div>
      <Box variant="code" fontSize="body-s"><span className="fl-elapsed" aria-live="off">{T.elapsed(duration(replay.pos), duration(replay.durationMs))}</span></Box>
      <div className="fl-transport-speed">
        <Select
          selectedOption={selected}
          options={options}
          onChange={(e) => replay.setSpeed(Number(e.detail.selectedOption.value) as Speed)}
          ariaLabel={`${T.speed}. ${T.speedHint}`}
          expandToViewport
        />
      </div>
    </div>
  )
}
