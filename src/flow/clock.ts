// The replay clock: one recorded run (a request of 30 ms or a cluster start of 7 minutes) played again at a speed.
// 100% = the real duration. Pure functions: the caller gives the wall clock (`performance.now()` in the page).

/** The speed steps of the transport, in percent. Exactly these (CONTRACT-ADDENDUM-2 section 3). */
export const SPEEDS = [1, 5, 10, 25, 50, 100, 200, 400, 800] as const
export type Speed = (typeof SPEEDS)[number]

/** Wall time (ms) that a run of `durationMs` takes at `speed` percent. */
export function wallMs(durationMs: number, speed: number): number {
  return (durationMs * 100) / speed
}

/** The step that makes the run last nearest to `targetWallMs` (nearest on a log scale: 2 times too fast = 2 times too slow). */
export function autoSpeed(durationMs: number, targetWallMs: number): Speed {
  const ideal = (durationMs * 100) / Math.max(1, targetWallMs)
  let best: Speed = SPEEDS[0]
  let dist = Infinity
  for (const s of SPEEDS) {
    const d = Math.abs(Math.log(s) - Math.log(Math.max(ideal, 1e-6)))
    if (d < dist) { dist = d; best = s }
  }
  return best
}

export interface ClockState {
  durationMs: number
  speed: Speed
  playing: boolean
  /** Position (run ms) at the anchor. */
  anchorPos: number
  /** Wall clock at the anchor. */
  anchorWall: number
}

export function createClock(durationMs: number, speed: Speed, wall: number, playing = false, pos = 0): ClockState {
  return { durationMs: Math.max(1, durationMs), speed, playing, anchorPos: clamp(pos, durationMs), anchorWall: wall }
}

function clamp(pos: number, durationMs: number): number {
  return Math.min(Math.max(0, pos), Math.max(1, durationMs))
}

/** The position of the run (real ms) at wall time `wall`. */
export function positionAt(c: ClockState, wall: number): number {
  if (!c.playing) return c.anchorPos
  return clamp(c.anchorPos + ((wall - c.anchorWall) * c.speed) / 100, c.durationMs)
}

export function isEnded(c: ClockState, wall: number): boolean {
  return positionAt(c, wall) >= c.durationMs
}

export function play(c: ClockState, wall: number): ClockState {
  const pos = positionAt(c, wall)
  // Play at the end starts again from zero.
  return { ...c, playing: true, anchorPos: pos >= c.durationMs ? 0 : pos, anchorWall: wall }
}
export function pause(c: ClockState, wall: number): ClockState {
  return { ...c, playing: false, anchorPos: positionAt(c, wall), anchorWall: wall }
}
export function seek(c: ClockState, pos: number, wall: number): ClockState {
  return { ...c, anchorPos: clamp(pos, c.durationMs), anchorWall: wall }
}
export function restart(c: ClockState, wall: number): ClockState {
  return { ...c, playing: true, anchorPos: 0, anchorWall: wall }
}
export function setSpeed(c: ClockState, speed: Speed, wall: number): ClockState {
  return { ...c, speed, anchorPos: positionAt(c, wall), anchorWall: wall }
}
/** Stops the clock at the end when the run is over (so `playing` is false after the last frame). */
export function settle(c: ClockState, wall: number): ClockState {
  return c.playing && isEnded(c, wall) ? { ...c, playing: false, anchorPos: c.durationMs, anchorWall: wall } : c
}
