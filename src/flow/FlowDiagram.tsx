// The diagram of ONE request: only the services that the request touched, in path order, with the real times.
// The nodes are HTML (text keeps its size at every width); the lines and the moving dot are SVG.
// Wide container: left to right. Narrow container (drawer, phone): top to bottom.
import Box from '@cloudscape-design/components/box'
import Popover from '@cloudscape-design/components/popover'
import SpaceBetween from '@cloudscape-design/components/space-between'
import * as tokens from '@cloudscape-design/design-tokens'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { PlatformStatus, StageStatus } from '../api/types'
import { decimal, duration } from '../app/format'
import { Glyph } from '../diagram'
import { frameAt, statementKinds, type FlowModel, type FlowNode } from './model'
import { metricText, SERVICE_OF, serviceOf } from './status'
import { F } from './strings'
import './flow.css'

const BASE = import.meta.env.BASE_URL
const ICON: Record<string, string> = {
  browser: 'azure/browser', gateway: 'azure/function-app', identity: 'azure/entra-external-id', keyvault: 'azure/key-vault', fnhost: 'azure/function-app',
  lb: 'azure/load-balancer', service: 'kubernetes/svc', pod: 'kubernetes/pod', database: 'azure/postgresql',
}
type Pt = [number, number]
interface Placed { node: FlowNode; x: number; y: number; w: number }

/** Colours from the Cloudscape tokens: they follow light and dark mode. */
export const FLOW_VARS = {
  '--fl-text': tokens.colorTextBodyDefault,
  '--fl-muted': tokens.colorTextBodySecondary,
  '--fl-line': tokens.colorBorderDividerDefault,
  '--fl-bg': tokens.colorBackgroundContainerContent,
  '--fl-active': tokens.colorTextStatusInfo,
  '--fl-done': tokens.colorTextStatusSuccess,
  '--fl-error': tokens.colorTextStatusError,
  '--fl-warn': tokens.colorTextStatusWarning,
  '--fl-idle': tokens.colorTextStatusInactive,
  '--fl-focus': tokens.colorBorderItemFocused,
} as CSSProperties

const NODE_W = 132
const ICON_R = 16
const TEXT_H = 72 // label, sub, time, live metric
const MIN_COL = 134

function NodeIcon({ kind }: { kind: string }) {
  if (kind === 'edge') return <Glyph name="edge" size={32} />
  if (kind === 'app') return <Glyph name="app" size={32} />
  return <img src={`${BASE}icons/${ICON[kind]}.svg`} width={32} height={32} alt="" draggable={false} />
}

/** Positions of the nodes and the lines between them, for one container width. */
function layout(model: FlowModel, width: number) {
  const cols = model.main.length
  const horizontal = width >= cols * MIN_COL + 16
  const placed = new Map<string, Placed>()
  let height: number
  if (horizontal) {
    const colW = (width - 16) / cols
    const hasAbove = model.nodes.some((n) => n.place === 'above')
    const yMain = hasAbove ? 140 : 30, yA = 30, yB = yMain + 170
    for (const n of model.nodes) {
      const xMain = 8 + colW * (n.col + 0.5)
      if (n.place === 'main' || n.place === 'pod-a') placed.set(n.id, { node: n, x: xMain, y: yMain, w: Math.min(NODE_W, colW - 4) })
      else if (n.place === 'above') placed.set(n.id, { node: n, x: xMain + colW * 0.5, y: yA, w: Math.min(NODE_W, colW - 4) })
      else placed.set(n.id, { node: n, x: n.place === 'pod-b' ? xMain : xMain + colW * 0.5, y: yB, w: Math.min(NODE_W, colW - 4) })
    }
    height = model.nodes.some((n) => n.place === 'below' || n.place === 'pod-b') ? yB + ICON_R + TEXT_H + 8 : yMain + ICON_R + TEXT_H + 12
  } else {
    const rowH = 124
    // Three columns: side nodes left and right of the main path. Narrow screens make every node narrower.
    const side = Math.max(70, Math.min(170, width / 3))
    const nw = Math.min(NODE_W, side - 4)
    const x = width / 2
    const twoPods = model.nodes.some((m) => m.place === 'pod-b')
    for (const n of model.nodes) {
      const y = 28 + n.col * rowH
      if (n.place === 'main') placed.set(n.id, { node: n, x, y, w: Math.min(NODE_W, width - 8, twoPods ? NODE_W : 2 * side - 4) })
      else if (n.place === 'pod-a') placed.set(n.id, { node: n, x: twoPods ? x - side / 2 : x, y, w: twoPods ? nw : NODE_W })
      else if (n.place === 'above') placed.set(n.id, { node: n, x: x - side, y, w: nw })
      else if (n.place === 'below') placed.set(n.id, { node: n, x: x + side, y, w: nw })
      else placed.set(n.id, { node: n, x: x + side / 2, y, w: nw })
    }
    height = 28 + (model.main.length - 1) * rowH + ICON_R + TEXT_H + 10
  }
  const lines = new Map<string, Pt[]>()
  for (const e of model.edges) {
    const a = placed.get(e.from), b = placed.get(e.to)
    if (!a || !b) continue
    lines.set(e.id, route(a, b, horizontal))
  }
  return { placed, lines, height, horizontal }
}

function route(a: Placed, b: Placed, horizontal: boolean): Pt[] {
  const gap = ICON_R + 5
  const below = (p: Placed): Pt => [p.x, p.y + ICON_R + TEXT_H]
  if (horizontal) {
    if (Math.abs(a.y - b.y) < 1) return [[a.x + gap, a.y], [b.x - gap, b.y]]
    if (b.y < a.y) return [[a.x, a.y - gap], [a.x, b.y], [b.x - gap, b.y]] // up, then right
    if (Math.abs(a.x - b.x) < 1) { const s = below(a); return [[s[0], s[1]], [b.x, b.y - gap]] }
    if (b.node.place === 'pod-b') { const mx = (a.x + b.x) / 2; return [[a.x + gap, a.y], [mx, a.y], [mx, b.y], [b.x - gap, b.y]] }
    const s = below(a)
    return [[s[0], s[1]], [s[0], b.y], [b.x - gap, b.y]] // down, then right
  }
  if (Math.abs(a.y - b.y) < 1) return b.x < a.x ? [[a.x - gap, a.y], [b.x + gap, b.y]] : [[a.x + gap, a.y], [b.x - gap, b.y]]
  const s = below(a)
  if (Math.abs(a.x - b.x) < 1) return [s, [b.x, b.y - gap]]
  const my = (s[1] + b.y - gap) / 2
  return [s, [a.x, my], [b.x, my], [b.x, b.y - gap]]
}

function polyLength(pts: Pt[]): number {
  let n = 0
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return n
}
function pointAt(pts: Pt[], f: number): Pt {
  const total = polyLength(pts)
  let left = Math.max(0, Math.min(1, f)) * total
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (left <= seg || i === pts.length - 1) {
      const k = seg > 0 ? Math.min(1, left / seg) : 0
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]
    }
    left -= seg
  }
  return pts[pts.length - 1]
}
function mid(pts: Pt[]): Pt { return pointAt(pts, 0.5) }
/** Idle lines first, so a lit line is never covered by an idle one. */
const RANK: Record<string, number> = { idle: 0, done: 1, active: 2 }
/** Pod names differ only at the end: keep the end when the name is long. */
function shortName(name: string, max = 20): string {
  return name.length > max ? `…${name.slice(-(max - 1))}` : name
}

export interface FlowDiagramProps {
  model: FlowModel
  /** Position of the replay in real ms. At or after the end, the diagram shows the end state. */
  pos: number
  status?: PlatformStatus | null
  label: string
  /** Extra content of the PostgreSQL popover (the database block). */
  dbDetail?: ReactNode
}

export function FlowDiagram({ model, pos, status, label, dbDetail }: FlowDiagramProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const geo = useMemo(() => (width > 0 ? layout(model, width) : null), [model, width])
  const frame = frameAt(model, pos)

  // The way of the moving dot in the current stage.
  let dot: Pt | null = null
  if (geo && frame.current && frame.current.path.length >= 2) {
    const pts: Pt[] = []
    const p = frame.current.path
    for (let i = 1; i < p.length; i++) {
      const e = model.edges.find((x) => (x.from === p[i - 1] && x.to === p[i]) || (x.from === p[i] && x.to === p[i - 1]))
      const line = e ? geo.lines.get(e.id) : undefined
      if (!line) continue
      const seg = e!.from === p[i - 1] ? line : [...line].reverse()
      pts.push(...seg)
    }
    if (pts.length >= 2) dot = pointAt(pts, frame.progress)
  }

  return (
    <div ref={wrap} className="fl-root" role="figure" aria-label={F.diagramLabel(label)} data-orientation={geo?.horizontal ? 'h' : 'v'} style={{ ...FLOW_VARS, height: geo?.height ?? 200 }}>
      {geo && (
        <>
          <svg className="fl-svg" width={width} height={geo.height} aria-hidden="true">
            {[...model.edges].sort((a, b) => RANK[frame.edgeState[a.id] ?? 'idle'] - RANK[frame.edgeState[b.id] ?? 'idle']).map((e) => {
              const pts = geo.lines.get(e.id)
              if (!pts) return null
              const st = frame.edgeState[e.id] ?? 'idle'
              return <polyline key={e.id} points={pts.map((p) => p.join(',')).join(' ')} className={`fl-line fl-line-${st}`} fill="none" />
            })}
            {dot && <circle cx={dot[0]} cy={dot[1]} r={5} className="fl-dot" />}
          </svg>
          {model.edges.map((e) => {
            const pts = geo.lines.get(e.id)
            if (!pts || e.ms === undefined || frame.edgeState[e.id] === 'idle') return null
            const [x, y] = mid(pts)
            return <span key={e.id} className="fl-edge-ms" style={{ left: x, top: y }}>{duration(e.ms)}</span>
          })}
          {[...geo.placed.values()].map((p) => (
            <FlowNodeView key={p.node.id} p={p} model={model} state={frame.nodeState[p.node.id] ?? 'idle'} status={status} dbDetail={dbDetail} />
          ))}
        </>
      )}
    </div>
  )
}

function FlowNodeView({ p, model, state, status, dbDetail }: { p: Placed; model: FlowModel; state: StageStatus | 'idle'; status?: PlatformStatus | null; dbDetail?: ReactNode }) {
  const n = p.node
  const svcId = SERVICE_OF[n.kind]
  const live = svcId ? serviceOf(status, svcId) : undefined
  const isDb = n.kind === 'database'
  const showMs = state === 'done' || state === 'error'
  const title = n.kind === 'pod' && n.sub ? F.node.pod : F.node[n.kind]
  const fullSub = n.sub ?? (n.kind === 'pod' && !n.answered ? F.otherPod : live?.name ?? F.nodeSub[n.kind])
  const sub = n.kind === 'pod' || n.kind === 'app' ? shortName(fullSub) : fullSub
  let extra: string | undefined
  if (n.kind === 'keyvault' && n.cached) extra = F.cached
  if (isDb && model.db && model.db.statements > 0) extra = F.statements(model.db.statements)
  if (n.kind === 'pod' && n.answered && model.nodes.some((m) => m.place === 'pod-b')) extra = F.answered
  const metric = live?.metrics.find((m) => m.value !== null && (m.key === 'latency-avg' || m.key === 'cpu' || m.key === 'replicas'))

  const content = (
    <SpaceBetween size="xs">
      <Box fontSize="body-s">{F.nodeWhat[n.kind]}</Box>
      {n.stages.length > 0 && (
        <ul className="fl-pop-list">
          {model.segments.filter((s) => n.stages.includes(s.stage)).map((s) => (
            <li key={s.stage}><span>{F.stageLong[s.stage] ?? s.stage}</span><span className="mono">{s.timed ? duration(s.ms) : '-'}</span></li>
          ))}
        </ul>
      )}
      {n.sub && <Box fontSize="body-s"><span className="mono">{n.sub}</span></Box>}
      {live && (
        <ul className="fl-pop-list">
          <li><span>{live.kind}</span><span className="mono">{F.live[live.state]}</span></li>
          <li><span className="mono">{live.name}</span><span className="mono">{live.region ?? ''}</span></li>
          {live.metrics.map((m) => <li key={m.key}><span>{m.label}</span><span className="mono">{metricText(m, '-', decimal)}</span></li>)}
        </ul>
      )}
      {isDb && dbDetail}
    </SpaceBetween>
  )

  return (
    <div className={`fl-node fl-node-${state}${n.kind === 'pod' && n.answered === false ? ' fl-node-other' : ''}`} style={{ left: p.x - p.w / 2, top: p.y - ICON_R, width: p.w }} data-node={n.id}>
      <Popover header={title} content={content} triggerType="custom" size="medium" position="top" dismissAriaLabel={F.close}>
        <button type="button" className="fl-node-btn" aria-label={`${title}, ${fullSub}${showMs && n.ms !== undefined ? `, ${duration(n.ms)}` : ''}`}>
          <span className="fl-icon">
            <NodeIcon kind={n.kind} />
            {live && <span className={`fl-live fl-live-${live.state}`} title={F.live[live.state]} aria-hidden="true" />}
          </span>
          <span className="fl-label">{title}</span>
          <span className="fl-sub mono" title={fullSub}>{sub}</span>
          <span className="fl-ms mono">{showMs && n.ms !== undefined ? duration(n.ms) : ' '}{extra ? ` · ${extra}` : ''}</span>
          {metric && <span className="fl-metric">{F.liveMetric(metric.key, metricText(metric, '-', decimal))}</span>}
        </button>
      </Popover>
    </div>
  )
}

export { statementKinds }
