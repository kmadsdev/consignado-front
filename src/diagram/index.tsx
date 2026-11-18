// CONTRACT (owned by the diagram worker): the public surface of the diagrams.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background, BackgroundVariant, Controls, EdgeLabelRenderer, Handle, NodeToolbar, Position, ReactFlow, ReactFlowProvider, useReactFlow,
  type Edge, type EdgeProps, type Node, type NodeChange, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator, { type StatusIndicatorProps } from '@cloudscape-design/components/status-indicator'
import type { HostKind, LifecycleEvent, StageStatus } from '../api/types'
import { anchor, getView, iconSize, inferHost, STAGES_OF, SVC_W, type EdgeDef, type EdgeKind, type GroupDef, type Pt, type SvcDef, type ViewDef } from './model'
import { localizeDetail } from '../api/details'
import { LOCALE } from '../i18n/lang.ts'
import { STAGE_NAMES, UI } from './strings'
import './diagram.css'

export { demoAksStartEvents, useDemoTimeline } from './demo'
export type { DemoTimeline, DemoTimelineOptions } from './demo'
export { STAGE_NAMES, stageLine } from './strings'

export type DiagramView = 'overview' | 'aks' | 'functions'
export interface ArchitectureDiagramProps {
  view: DiagramView
  /** Events so far. The diagram lights each stage as its events arrive. */
  events: LifecycleEvent[]
  height?: number
  onStageSelect?: (stage: string) => void
  /** Overview only: which host the events belong to. Default: read from the stage ids. */
  host?: HostKind
  /** Force a colour mode. Default: follow the Cloudscape mode of the page. */
  mode?: 'light' | 'dark'
  /** Optional live state per service node id (from GET /api/status). The node shows a dot, the resource name and a short line. */
  nodeStatus?: Record<string, NodeStatus>
}
export type NodeState = 'up' | 'degraded' | 'down' | 'stopped' | 'starting' | 'unknown'
export interface NodeStatus {
  state: NodeState
  /** The state in words, in the page language. */
  stateText: string
  /** The real resource name, shown in monospace under the node. */
  name: string
  /** Short lines under the name (one per line, split on a line break): the region, one key metric. */
  summary?: string
  /** Rows of the detail that opens on a click. */
  rows: Array<{ label: string; value: string }>
}

type Visual = StageStatus | 'idle'
interface StageInfo { status: StageStatus; ms?: number; detail?: string; ts: string }

// ------------------------------------------------------------------ helpers --
function latestByStage(events: LifecycleEvent[]): Map<string, StageInfo> {
  const m = new Map<string, StageInfo>()
  for (const e of events) m.set(e.stage, { status: e.status, ms: e.ms ?? m.get(e.stage)?.ms, detail: e.detail ?? m.get(e.stage)?.detail, ts: e.ts })
  return m
}

function combine(statuses: Array<StageStatus | undefined>, anyEvents: boolean): Visual {
  if (!anyEvents) return 'idle'
  if (statuses.includes('error')) return 'error'
  if (statuses.includes('active')) return 'active'
  if (statuses.includes('done')) return 'done'
  return 'pending'
}

const SECONDS = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60_000) return `${SECONDS.format(ms / 1000)} s`
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

/** Cloudscape `applyMode` puts the class `awsui-dark-mode` on the body. */
function usePageDark(): boolean {
  const read = () => typeof document !== 'undefined' && (document.body.classList.contains('awsui-dark-mode') || document.documentElement.classList.contains('awsui-dark-mode'))
  const [dark, setDark] = useState(read)
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(read()))
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    setDark(read())
    return () => mo.disconnect()
  }, [])
  return dark
}

// ------------------------------------------------------------ edge geometry --
function groupAnchor(g: GroupDef, side: EdgeDef['sh']): Pt {
  if (side === 'l') return [g.x, g.y + g.h / 2]
  if (side === 'r') return [g.x + g.w, g.y + g.h / 2]
  if (side === 't') return [g.x + g.w / 2, g.y]
  return [g.x + g.w / 2, g.y + g.h]
}

function route(def: EdgeDef, v: ViewDef): Pt[] {
  const end = (id: string, side: EdgeDef['sh']): Pt => {
    const s = v.svcs.find((n) => n.id === id)
    if (s) return anchor(s, side)
    return groupAnchor(v.groups.find((g) => g.id === id)!, side)
  }
  const p1 = def.p1 ?? end(def.from, def.sh)
  const p2 = def.p2 ?? end(def.to, def.th)
  if (def.via) return [p1, ...def.via, p2]
  const h1 = def.sh === 'l' || def.sh === 'r'
  const h2 = def.th === 'l' || def.th === 'r'
  if (h1 && h2) {
    if (Math.abs(p1[1] - p2[1]) < 1) return [p1, p2]
    const mx = def.mx ?? (p1[0] + p2[0]) / 2
    return [p1, [mx, p1[1]], [mx, p2[1]], p2]
  }
  if (!h1 && !h2) {
    if (Math.abs(p1[0] - p2[0]) < 1) return [p1, p2]
    const my = (p1[1] + p2[1]) / 2
    return [p1, [p1[0], my], [p2[0], my], p2]
  }
  return h1 ? [p1, [p2[0], p1[1]], p2] : [p1, [p1[0], p2[1]], p2]
}

function roundedPath(pts: Pt[], r = 8): string {
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]
    const [cx, cy] = pts[i]
    const [nx, ny] = pts[i + 1]
    const d1 = Math.hypot(cx - px, cy - py)
    const d2 = Math.hypot(nx - cx, ny - cy)
    const rr = Math.min(r, d1 / 2, d2 / 2)
    d += ` L ${cx - ((cx - px) / d1) * rr} ${cy - ((cy - py) / d1) * rr} Q ${cx} ${cy} ${cx + ((nx - cx) / d2) * rr} ${cy + ((ny - cy) / d2) * rr}`
  }
  const last = pts[pts.length - 1]
  return `${d} L ${last[0]} ${last[1]}`
}

function pathLength(pts: Pt[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return len
}

function longestMid(pts: Pt[]): Pt {
  let best: Pt = pts[0]
  let max = -1
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (len > max) { max = len; best = [(pts[i][0] + pts[i - 1][0]) / 2, (pts[i][1] + pts[i - 1][1]) / 2] }
  }
  return best
}

// -------------------------------------------------------------------- icons --
const BASE = import.meta.env.BASE_URL

export function Glyph({ name, size }: { name: string; size: number }) {
  if (name === 'pipeline') {
    // Own pictogram of a build pipeline: one source step that fans out to two steps.
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="dg-glyph">
        <path d="M13 20h6M19 20c4 0 2-9 8-9M19 20c4 0 2 9 8 9" fill="none" strokeWidth="2" strokeLinecap="round" className="dg-glyph-line" />
        <circle cx="8.5" cy="20" r="5.5" className="dg-glyph-fill" />
        <path d="M7 17.4v5.2l4-2.6z" className="dg-glyph-cut" />
        <rect x="27" y="6" width="10" height="10" rx="3" className="dg-glyph-soft" strokeWidth="2" />
        <rect x="27" y="24" width="10" height="10" rx="3" className="dg-glyph-soft" strokeWidth="2" />
        <path d="M29.8 11l1.6 1.6 2.9-3.2M29.8 29l1.6 1.6 2.9-3.2" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="dg-glyph-line" />
      </svg>
    )
  }
  if (name === 'edge') {
    // Own pictogram of a network edge: a shield with a small globe. Not a vendor logo.
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="dg-glyph">
        <path d="M20 4l13 4.5v9.8c0 8-5.4 14-13 17.2c-7.6-3.2-13-9.2-13-17.2V8.5z" className="dg-glyph-soft" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="20" cy="19" r="7.5" fill="none" strokeWidth="1.8" className="dg-glyph-line" />
        <path d="M12.5 19h15M20 11.5c-3 2.2-3 12.8 0 15M20 11.5c3 2.2 3 12.8 0 15" fill="none" strokeWidth="1.6" strokeLinecap="round" className="dg-glyph-line" />
      </svg>
    )
  }
  // Own pictogram of an application: a window with code brackets.
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="dg-glyph">
      <rect x="4" y="6" width="32" height="28" rx="4" className="dg-glyph-soft" strokeWidth="2" />
      <path d="M4 10a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v3H4z" className="dg-glyph-fill" />
      <path d="M16 19l-4.5 4.5L16 28M24 19l4.5 4.5L24 28" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dg-glyph-line" />
      <path d="M21.4 17.5l-2.8 12" fill="none" strokeWidth="1.8" strokeLinecap="round" className="dg-glyph-line" />
    </svg>
  )
}

function Icon({ icon, size }: { icon: string; size: number }) {
  const [set, name] = icon.split(':')
  if (set === 'glyph') return <Glyph name={name} size={size} />
  const folder = set === 'k8s' ? 'kubernetes' : 'azure'
  return <img src={`${BASE}icons/${folder}/${name}.svg`} width={size} height={size} alt="" draggable={false} />
}

function Pill({ status, ms }: { status: Visual; ms?: number }) {
  if (status !== 'done' && status !== 'error') return null
  return (
    <span className={`dg-pill dg-pill-${status}`}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        {status === 'done'
          ? <path d="M2 5.3l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
      </svg>
      {ms !== undefined && ms > 0 && <span className="dg-pill-ms">{formatMs(ms)}</span>}
    </span>
  )
}

const STATUS_TEXT: Record<Visual, string> = { idle: UI.statusIdle, pending: UI.statusPending, active: UI.statusActive, done: UI.statusDone, error: UI.statusError }

// -------------------------------------------------------------------- nodes --
interface SvcData extends Record<string, unknown> { def: SvcDef; status: Visual; ms?: number; stages: Array<{ id: string; status: Visual; ms?: number }>; live?: NodeStatus }
interface GroupData extends Record<string, unknown> { def: GroupDef; status: Visual; ms?: number }
interface LegendData extends Record<string, unknown> { kinds: EdgeKind[] }

const hidden = { opacity: 0, pointerEvents: 'none' as const }

const ServiceNode = memo(function ServiceNode({ data, selected }: NodeProps<Node<SvcData>>) {
  const { def, status, ms, stages, live } = data
  const size = iconSize(def.icon)
  return (
    <div className={`dg-svc dg-st-${status}${selected ? ' dg-selected' : ''}`} style={{ width: SVC_W }}>
      <Handle type="target" position={Position.Left} style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={hidden} isConnectable={false} />
      <div className="dg-icon" style={{ width: size, height: size }}>
        <Icon icon={def.icon} size={size} />
        <Pill status={status} ms={ms} />
        {live && <span className={`dg-live-dot dg-live-${live.state}`} title={live.stateText} aria-hidden="true" />}
      </div>
      <div className="dg-label">{def.label}</div>
      {live && live.name !== def.label ? <div className="dg-live-name" title={live.name}>{live.name}</div> : def.sub && <div className="dg-sub">{def.sub}</div>}
      {live?.summary?.split('\n').map((line, i) => <div key={i} className="dg-live-sum">{line}</div>)}
      <NodeToolbar isVisible={!!selected} position={def.pop === 'bottom' ? Position.Bottom : Position.Top} offset={10}>
        <div className="dg-pop" role="note">
          <div className="dg-pop-title">{def.label}</div>
          <p className="dg-pop-text">{def.what}</p>
          {live && (
            <dl className="dg-pop-live">
              {live.rows.map((r, i) => <div key={i} className="dg-pop-live-row"><dt>{r.label}</dt><dd>{r.value}</dd></div>)}
            </dl>
          )}
          {stages.length > 0 && (
            <ul className="dg-pop-stages">
              {stages.map((s) => (
                <li key={s.id} className={`dg-pop-stage dg-pop-${s.status}`}>
                  <span className="dg-pop-dot" aria-hidden="true" />
                  <span className="dg-pop-name">{STAGE_NAMES[s.id] ?? s.id}</span>
                  <span className="dg-pop-ms">{s.ms !== undefined && s.status === 'done' ? formatMs(s.ms) : STATUS_TEXT[s.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </NodeToolbar>
    </div>
  )
})

const GroupNode = memo(function GroupNode({ data }: NodeProps<Node<GroupData>>) {
  const { def, status, ms } = data
  return (
    <div className={`dg-group dg-tone-${def.tone} dg-st-${status}`} style={{ width: def.w, height: def.h }}>
      <Handle type="target" position={Position.Left} style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={hidden} isConnectable={false} />
      <div className="dg-group-label">
        {def.icon && <Icon icon={def.icon} size={14} />}
        <span>{def.label}</span>
        <Pill status={status} ms={ms} />
      </div>
    </div>
  )
})

const LegendNode = memo(function LegendNode({ data }: NodeProps<Node<LegendData>>) {
  const row = (cls: string, text: string) => (
    <div className="dg-legend-row" key={cls}>
      <svg width="34" height="8" viewBox="0 0 34 8" aria-hidden="true" className={`dg-edge ${cls}`}>
        <path d="M1 4h26" className="dg-edge-path" fill="none" />
        <path d="M33 4l-6-3.2v6.4z" className="dg-legend-head" />
      </svg>
      <span>{text}</span>
    </div>
  )
  return (
    <div className="dg-legend">
      <div className="dg-legend-title">{UI.legend}</div>
      {data.kinds.includes('request') && row('dg-k-request dg-e-idle', UI.legendRequest)}
      {data.kinds.includes('trust') && row('dg-k-trust dg-e-idle', UI.legendTrust)}
      {data.kinds.includes('deploy') && row('dg-k-deploy dg-e-idle', UI.legendDeploy)}
      {row('dg-k-request dg-e-active', UI.legendActive)}
      {row('dg-k-request dg-e-done', UI.legendDone)}
    </div>
  )
})

// --------------------------------------------------------------------- edge --
interface FlowEdgeData extends Record<string, unknown> { d: string; len: number; lx: number; ly: number; label?: string; kind: EdgeKind; status: Visual; reduced: boolean }

const FlowEdge = memo(function FlowEdge({ data }: EdgeProps<Edge<FlowEdgeData>>) {
  if (!data) return null
  const { d, len, lx, ly, label, kind, status, reduced } = data
  const marker = status === 'idle' ? kind : status
  const dur = Math.min(2.6, Math.max(0.9, len / 110))
  return (
    <>
      <g className={`dg-edge dg-k-${kind} dg-e-${status}`}>
        <path d={d} className="dg-edge-path" fill="none" markerEnd={`url(#dg-arrow-${marker})`} />
        {status === 'active' && !reduced && (
          <circle r="4" className="dg-edge-dot">
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={d} />
          </circle>
        )}
      </g>
      {label && (
        <EdgeLabelRenderer>
          <div className={`dg-edge-label dg-k-${kind} dg-e-${status}`} style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}>{label}</div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

const nodeTypes = { svc: ServiceNode, group: GroupNode, legend: LegendNode }
const edgeTypes = { flow: FlowEdge }
const MARKERS = ['request', 'trust', 'deploy', 'pending', 'active', 'done', 'error']

// ------------------------------------------------------------------ diagram --
function DiagramInner({ view, events, onStageSelect, host, dark, nodeStatus }: ArchitectureDiagramProps & { dark: boolean }) {
  const reduced = usePrefersReducedMotion()
  const flow = useReactFlow()
  const wrap = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sized, setSized] = useState(false) // React Flow needs a container with a real size

  const info = useMemo(() => latestByStage(events), [events])
  const lane = host ?? inferHost(events.map((e) => e.stage))
  const def = useMemo(() => getView(view, lane), [view, lane])

  const { nodes, edges, firstStage } = useMemo(() => {
    const any = info.size > 0
    const stagesOfNode = new Map<string, string[]>()
    const stagesOfEdge = new Map<string, string[]>()
    for (const [stage, target] of Object.entries(def.stageMap)) {
      for (const n of target.nodes) stagesOfNode.set(n, [...(stagesOfNode.get(n) ?? []), stage])
      for (const e of target.edges) stagesOfEdge.set(e, [...(stagesOfEdge.get(e) ?? []), stage])
    }
    const nodeState = (id: string) => {
      const stages = stagesOfNode.get(id) ?? []
      const status = combine(stages.map((s) => info.get(s)?.status), any)
      const done = stages.filter((s) => info.get(s)?.status === 'done' && info.get(s)?.ms !== undefined)
      const ms = done.length ? done.reduce((sum, s) => sum + (info.get(s)!.ms ?? 0), 0) : undefined
      return { stages, status, ms }
    }

    const groupNodes: Node[] = def.groups.map((g, i) => {
      const st = nodeState(g.id)
      return {
        id: g.id, type: 'group', position: { x: g.x, y: g.y }, width: g.w, height: g.h, zIndex: -10 + i,
        selectable: false, focusable: false, draggable: false, style: { pointerEvents: 'none' },
        data: { def: g, status: stagesOfNode.has(g.id) ? st.status : 'idle', ms: st.ms } satisfies GroupData,
      }
    })
    const svcNodes: Node[] = def.svcs.map((s) => {
      const st = nodeState(s.id)
      // A node with no stage in this view is context only: it stays calm.
      const status: Visual = st.stages.length === 0 ? 'idle' : st.status
      return {
        id: s.id, type: 'svc', position: { x: s.x - SVC_W / 2, y: s.y - iconSize(s.icon) / 2 }, zIndex: 10,
        selected: s.id === selectedId, draggable: false, ariaLabel: `${s.label}${s.sub ? `, ${s.sub}` : ''}. ${STATUS_TEXT[status]}.${nodeStatus?.[s.id] ? ` ${nodeStatus[s.id].name}: ${nodeStatus[s.id].stateText}.` : ''}`,
        data: { def: s, status, ms: st.ms, stages: st.stages.map((id) => ({ id, status: any ? (info.get(id)?.status ?? 'pending') : 'idle', ms: info.get(id)?.ms })), live: nodeStatus?.[s.id] } satisfies SvcData,
      }
    })
    const kinds = Array.from(new Set(def.edges.map((e) => e.kind ?? 'request')))
    const legend: Node = {
      id: 'legend', type: 'legend', position: { x: def.legendAt[0], y: def.legendAt[1] }, selectable: false, focusable: false, draggable: false,
      style: { pointerEvents: 'none' }, data: { kinds } satisfies LegendData,
    }

    const flowEdges: Edge[] = def.edges.map((e) => {
      const pts = route(e, def)
      const stages = stagesOfEdge.get(e.id) ?? []
      const status: Visual = stages.length === 0 ? 'idle' : combine(stages.map((s) => info.get(s)?.status), any)
      const [lx, ly] = e.labelAt ?? longestMid(pts)
      return {
        id: e.id, source: e.from, target: e.to, type: 'flow', selectable: false, focusable: false,
        zIndex: status === 'active' ? 3 : status === 'done' ? 2 : 1,
        data: { d: roundedPath(pts), len: pathLength(pts), lx, ly, label: e.label, kind: e.kind ?? 'request', status, reduced } satisfies FlowEdgeData,
      }
    })
    const firstStage = new Map<string, string>()
    for (const [id, stages] of stagesOfNode) firstStage.set(id, stages[0])
    return { nodes: [...groupNodes, legend, ...svcNodes], edges: flowEdges, firstStage }
  }, [def, info, selectedId, reduced, nodeStatus])

  const fit = useCallback(() => { void flow.fitView({ padding: 0.04, duration: 0 }) }, [flow])

  // Fit again when the container changes its size, and when the view changes.
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    let raf = 0
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) setSized(true)
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(fit)
    })
    ro.observe(el)
    return () => { ro.disconnect(); cancelAnimationFrame(raf) }
  }, [fit])
  useEffect(() => {
    setSelectedId(null)
    const id = window.setTimeout(fit, 60)
    return () => window.clearTimeout(id)
  }, [view, fit])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const c of changes) {
      if (c.type !== 'select') continue
      if (c.selected) {
        setSelectedId(c.id)
        const stage = firstStage.get(c.id)
        if (stage) onStageSelect?.(stage)
      } else {
        setSelectedId((cur) => (cur === c.id ? null : cur))
      }
    }
  }, [firstStage, onStageSelect])

  return (
    <div ref={wrap} className="dg-canvas">
      {sized && <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        colorMode={dark ? 'dark' : 'light'}
        fitView
        fitViewOptions={{ padding: 0.04 }}
        minZoom={0.3}
        maxZoom={2.5}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable
        zoomOnScroll={false}
        zoomOnPinch
        panOnDrag
        preventScrolling={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} className="dg-dots" />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>}
    </div>
  )
}

export function ArchitectureDiagram(props: ArchitectureDiagramProps) {
  const pageDark = usePageDark()
  const dark = props.mode ? props.mode === 'dark' : pageDark
  return (
    <div className="dg-root" data-mode={dark ? 'dark' : 'light'} style={{ height: props.height ?? 480 }} role="figure" aria-label={UI.diagramLabel[props.view]}>
      <svg className="dg-defs" width="0" height="0" aria-hidden="true">
        <defs>
          {MARKERS.map((m) => (
            <marker key={m} id={`dg-arrow-${m}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
              <path d="M1 1.2L9.5 5 1 8.8z" className={`dg-arrow dg-arrow-${m}`} />
            </marker>
          ))}
        </defs>
      </svg>
      <ReactFlowProvider>
        <DiagramInner {...props} dark={dark} />
      </ReactFlowProvider>
    </div>
  )
}

// ----------------------------------------------------------------- timeline --
export interface LifecycleTimelineProps { view: Exclude<DiagramView, 'overview'>; events: LifecycleEvent[] }

const INDICATOR: Record<StageStatus, StatusIndicatorProps.Type> = { pending: 'pending', active: 'in-progress', done: 'success', error: 'error' }
const clock = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' })

export function LifecycleTimeline(props: LifecycleTimelineProps) {
  const info = useMemo(() => latestByStage(props.events), [props.events])
  return (
    <SpaceBetween size="s">
      {STAGES_OF[props.view].map((stage) => {
        const s = info.get(stage)
        const status: StageStatus = s?.status ?? 'pending'
        return (
          <div key={stage} className="dg-tl-row" data-stage={stage}>
            <StatusIndicator type={INDICATOR[status]}>{STAGE_NAMES[stage] ?? stage}</StatusIndicator>
            {s && (
              <div className="dg-tl-meta">
                <Box variant="code" fontSize="body-s" color="text-body-secondary">{clock.format(new Date(s.ts))}</Box>
                {s.ms !== undefined && s.status !== 'active' && <Box variant="code" fontSize="body-s">{formatMs(s.ms)}</Box>}
                {s.detail && <Box variant="small" color="text-body-secondary"><span className="mono">{localizeDetail(s.detail)}</span></Box>}
              </div>
            )}
          </div>
        )
      })}
    </SpaceBetween>
  )
}
