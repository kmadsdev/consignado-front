// Hand-made layout of the three diagram views. All coordinates are design pixels.
// For a service node, (x, y) is the CENTRE OF ITS ICON. Edges are computed from these numbers.
import { AKS_STAGES, FUNCTIONS_STAGES } from '../api/stages'
import { E, G, N } from './strings'

export type Side = 'l' | 'r' | 't' | 'b'
export type EdgeKind = 'request' | 'trust' | 'deploy'
export type Pt = [number, number]

export interface SvcDef {
  id: string
  x: number
  y: number
  icon: string // 'az:<name>' | 'k8s:<name>' | 'glyph:<name>'
  label: string
  sub?: string
  what: string
  pop?: 'top' | 'bottom'
}
export interface GroupDef {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
  icon?: string
  tone: 'neutral' | 'net' | 'k8s'
}
export interface EdgeDef {
  id: string
  from: string
  to: string
  sh: Side
  th: Side
  kind?: EdgeKind
  label?: string
  /** Waypoints between the two ends. */
  via?: Pt[]
  /** Replace the computed start or end point (used for group borders). */
  p1?: Pt
  p2?: Pt
  /** x of the vertical middle segment of an l/r to l/r edge. */
  mx?: number
  labelAt?: Pt
}
export interface StageTarget { nodes: string[]; edges: string[] }
export interface ViewDef {
  svcs: SvcDef[]
  groups: GroupDef[]
  edges: EdgeDef[]
  legendAt: Pt
  stageMap: Record<string, StageTarget>
}

export const SVC_W = 124
export const iconSize = (icon: string) => (icon.startsWith('k8s:') ? 36 : 40)
const LABEL_H = 18
const SUB_H = 15

/** The point where an edge touches a service node. */
export function anchor(s: SvcDef, side: Side): Pt {
  const half = iconSize(s.icon) / 2
  const gap = 7
  if (side === 'l') return [s.x - half - gap, s.y]
  if (side === 'r') return [s.x + half + gap, s.y]
  if (side === 't') return [s.x, s.y - half - gap]
  return [s.x, s.y + half + 7 + LABEL_H + (s.sub ? SUB_H : 0) + 5]
}

const svc = (id: string, x: number, y: number, icon: string, t: { label: string; sub?: string; what: string }, pop?: 'top' | 'bottom'): SvcDef =>
  ({ id, x, y, icon, label: t.label, sub: t.sub, what: t.what, pop })

const t = (nodes: string | string[], ...edges: string[]): StageTarget => ({ nodes: Array.isArray(nodes) ? nodes : [nodes], edges })

// ---------------------------------------------------------------- overview --
const OV_PATH_IN = ['e-user-fd', 'e-fd-gw']
const overviewBase = {
  svcs: [
    svc('user', 70, 290, 'az:browser', N.user),
    svc('blob', 225, 120, 'az:storage-account', N.blob, 'bottom'),
    svc('frontdoor', 225, 290, 'glyph:edge', N.frontdoor),
    svc('keyvault', 440, 120, 'az:key-vault', N.keyvault, 'bottom'),
    svc('gateway', 440, 290, 'az:function-app', N.gateway),
    svc('entra', 440, 500, 'az:entra-external-id', N.entra),
    svc('fn', 800, 118, 'az:function-app', N.fn, 'bottom'),
    svc('lb', 662, 470, 'az:load-balancer', N.lb),
    svc('hpa', 815, 372, 'k8s:hpa', N.hpa),
    svc('svc', 815, 470, 'k8s:svc', N.svc),
    svc('pod1', 918, 372, 'k8s:pod', N.pod),
    svc('pod2', 918, 470, 'k8s:pod', N.pod),
    svc('pg', 1110, 290, 'az:postgresql', N.pg),
    svc('gha', 225, 690, 'glyph:pipeline', N.gha),
    svc('acr', 865, 690, 'az:container-registry', N.acr),
  ],
  groups: [
    { id: 'g-edge', x: 150, y: 50, w: 150, h: 310, label: G.edge, tone: 'neutral' },
    { id: 'g-fn', x: 590, y: 50, w: 420, h: 140, label: G.serverless, icon: 'az:function-app', tone: 'neutral' },
    { id: 'g-vnet', x: 590, y: 225, w: 420, h: 374, label: G.vnet, icon: 'az:virtual-network', tone: 'net' },
    { id: 'g-cluster', x: 735, y: 258, w: 262, h: 329, label: G.cluster, icon: 'az:kubernetes-service', tone: 'k8s' },
    { id: 'g-nodepool', x: 747, y: 288, w: 238, h: 287, label: G.nodepool, icon: 'k8s:node', tone: 'neutral' },
    { id: 'g-ns', x: 759, y: 318, w: 214, h: 221, label: G.ns, icon: 'k8s:ns', tone: 'neutral' },
    { id: 'g-ci', x: 150, y: 628, w: 150, h: 122, label: G.ci, tone: 'neutral' },
  ],
  edges: [
    { id: 'e-user-fd', from: 'user', to: 'frontdoor', sh: 'r', th: 'l', label: E.https, labelAt: [124, 290] },
    { id: 'e-fd-blob', from: 'frontdoor', to: 'blob', sh: 't', th: 'b', label: E.pageLoad },
    { id: 'e-fd-gw', from: 'frontdoor', to: 'gateway', sh: 'r', th: 'l', label: E.api, labelAt: [357, 290] },
    { id: 'e-gw-kv', from: 'gateway', to: 'keyvault', sh: 't', th: 'b', label: E.readSecrets },
    { id: 'e-gw-entra', from: 'gateway', to: 'entra', sh: 'b', th: 't', label: E.checkToken },
    { id: 'e-gw-fn', from: 'gateway', to: 'fn', sh: 'r', th: 'l', mx: 530, label: E.hostFn, labelAt: [530, 196] },
    { id: 'e-gw-lb', from: 'gateway', to: 'lb', sh: 'r', th: 'l', mx: 530, label: E.hostAks, labelAt: [530, 392] },
    { id: 'e-lb-svc', from: 'lb', to: 'svc', sh: 'r', th: 'l' },
    { id: 'e-svc-pod1', from: 'svc', to: 'pod1', sh: 'r', th: 'l' },
    { id: 'e-svc-pod2', from: 'svc', to: 'pod2', sh: 'r', th: 'l' },
    { id: 'e-fn-pg', from: 'fn', to: 'pg', sh: 'r', th: 't', label: E.jdbc, labelAt: [1060, 118] },
    { id: 'e-pod1-pg', from: 'pod1', to: 'pg', sh: 'r', th: 'l', mx: 1048 },
    { id: 'e-pod2-pg', from: 'pod2', to: 'pg', sh: 'r', th: 'l', mx: 1048, label: E.jdbc, labelAt: [1048, 425] },
    { id: 'e-gha-acr', from: 'gha', to: 'acr', sh: 'r', th: 'l', kind: 'deploy', label: E.push },
    { id: 'e-gha-entra', from: 'gha', to: 'entra', sh: 't', th: 'l', kind: 'trust', label: E.oidc, labelAt: [318, 500] },
    { id: 'e-acr-pull', from: 'g-nodepool', to: 'acr', sh: 'b', th: 't', kind: 'trust', p1: [865, 575], label: E.acrPull, labelAt: [865, 628] },
    { id: 'e-wi', from: 'pod2', to: 'entra', sh: 'b', th: 'r', kind: 'trust', via: [[918, 557], [562, 557], [562, 500]], label: E.wi, labelAt: [662, 557] },
  ] as EdgeDef[],
  legendAt: [1040, 628] as Pt,
}

const OVERVIEW_FN_MAP: Record<string, StageTarget> = {
  request: t('user'),
  edge: t('frontdoor', 'e-user-fd'),
  gateway: t('gateway', 'e-fd-gw'),
  identity: t('entra', 'e-gw-entra'),
  keyvault: t('keyvault', 'e-gw-kv'),
  'function-cold-start': t('fn', 'e-gw-fn'),
  'jvm-start': t('fn'),
  database: t('pg', 'e-fn-pg'),
  response: t('user', ...OV_PATH_IN, 'e-gw-fn'),
}
const OVERVIEW_AKS_MAP: Record<string, StageTarget> = {
  request: t('user'),
  edge: t('frontdoor', 'e-user-fd'),
  gateway: t('gateway', 'e-fd-gw'),
  identity: t('entra', 'e-gw-entra'),
  quota: t('gateway'),
  keyvault: t('keyvault', 'e-gw-kv'),
  'arm-start': t('g-cluster'),
  'control-plane': t('g-cluster'),
  node: t('g-nodepool'),
  'image-pull': t('acr', 'e-acr-pull'),
  'secrets-mount': t('entra', 'e-wi'),
  'container-start': t(['pod1', 'pod2']),
  database: t('pg', 'e-pod1-pg', 'e-pod2-pg'),
  readiness: t('svc', 'e-svc-pod1', 'e-svc-pod2'),
  'load-balancer': t('lb', 'e-lb-svc'),
  'first-response': t('user', ...OV_PATH_IN, 'e-gw-lb', 'e-lb-svc'),
  'window-open': t('g-vnet'),
  'window-close': t('g-vnet'),
  'cluster-stop': t('g-cluster'),
}

// --------------------------------------------------------------------- aks --
const AKS_VIEW: ViewDef = {
  svcs: [
    svc('user', 60, 330, 'az:browser', N.user),
    svc('frontdoor', 195, 330, 'glyph:edge', N.frontdoor),
    svc('gateway', 340, 330, 'az:function-app', N.gatewayAks),
    svc('entra', 340, 150, 'az:entra-external-id', N.entra, 'bottom'),
    svc('keyvault', 340, 520, 'az:key-vault', N.keyvault),
    svc('arm', 500, 150, 'az:resource-groups', N.arm, 'bottom'),
    svc('window', 500, 520, 'az:scheduler', N.window),
    svc('lb', 655, 330, 'az:load-balancer', N.lb),
    svc('cp', 890, 150, 'az:kubernetes-service', N.cp, 'bottom'),
    svc('svc', 815, 330, 'k8s:svc', N.svc),
    svc('pod', 962, 330, 'k8s:pod', N.pods),
    svc('csi', 815, 520, 'k8s:secret', N.csi),
    svc('kubelet', 962, 520, 'k8s:node', N.kubelet),
    svc('pg', 1185, 330, 'az:postgresql', N.pg),
    svc('acr', 1185, 520, 'az:container-registry', N.acr),
  ],
  groups: [
    { id: 'g-vnet', x: 575, y: 40, w: 505, h: 600, label: G.vnetShort, icon: 'az:virtual-network', tone: 'net' },
    { id: 'g-cluster', x: 725, y: 72, w: 343, h: 556, label: G.cluster, icon: 'az:kubernetes-service', tone: 'k8s' },
    { id: 'g-node', x: 738, y: 250, w: 317, h: 366, label: G.node, icon: 'az:virtual-machine', tone: 'neutral' },
    { id: 'g-ns', x: 751, y: 280, w: 291, h: 130, label: G.ns, icon: 'k8s:ns', tone: 'neutral' },
  ],
  edges: [
    { id: 'e-user-fd', from: 'user', to: 'frontdoor', sh: 'r', th: 'l', label: E.https },
    { id: 'e-fd-gw', from: 'frontdoor', to: 'gateway', sh: 'r', th: 'l', label: E.api },
    { id: 'e-gw-entra', from: 'gateway', to: 'entra', sh: 't', th: 'b', label: E.checkToken },
    { id: 'e-gw-kv', from: 'gateway', to: 'keyvault', sh: 'b', th: 't', label: E.readSecrets },
    { id: 'e-gw-arm', from: 'gateway', to: 'arm', sh: 'r', th: 'l', mx: 422 },
    { id: 'e-gw-window', from: 'gateway', to: 'window', sh: 'r', th: 'l', mx: 422, label: E.countdown, labelAt: [422, 476] },
    { id: 'e-gw-lb', from: 'gateway', to: 'lb', sh: 'r', th: 'l', label: E.apiCall, labelAt: [515, 330] },
    { id: 'e-arm-cp', from: 'arm', to: 'cp', sh: 'r', th: 'l', label: E.startCluster, labelAt: [650, 150] },
    { id: 'e-cp-node', from: 'cp', to: 'g-node', sh: 'b', th: 't', p2: [890, 250] },
    { id: 'e-lb-svc', from: 'lb', to: 'svc', sh: 'r', th: 'l' },
    { id: 'e-svc-pod', from: 'svc', to: 'pod', sh: 'r', th: 'l' },
    { id: 'e-kubelet-pod', from: 'kubelet', to: 'pod', sh: 't', th: 'b', label: E.startContainer, labelAt: [962, 452] },
    { id: 'e-kubelet-acr', from: 'kubelet', to: 'acr', sh: 'r', th: 'l', label: E.pullImage, labelAt: [1119, 520] },
    { id: 'e-pod-pg', from: 'pod', to: 'pg', sh: 'r', th: 'l', label: E.jdbc, labelAt: [1119, 330] },
    { id: 'e-csi-kv', from: 'csi', to: 'keyvault', sh: 'b', th: 'b', kind: 'trust', via: [[815, 676], [340, 676]], label: E.wiKv, labelAt: [578, 676] },
  ],
  legendAt: [20, 44],
  stageMap: {
    request: t('user'),
    edge: t('frontdoor', 'e-user-fd'),
    gateway: t('gateway', 'e-fd-gw'),
    identity: t('entra', 'e-gw-entra'),
    quota: t('gateway'),
    keyvault: t('keyvault', 'e-gw-kv'),
    'arm-start': t('arm', 'e-gw-arm'),
    'control-plane': t('cp', 'e-arm-cp'),
    node: t(['kubelet', 'g-node'], 'e-cp-node'),
    'image-pull': t('acr', 'e-kubelet-acr'),
    'secrets-mount': t('csi', 'e-csi-kv'),
    'container-start': t('pod', 'e-kubelet-pod'),
    database: t('pg', 'e-pod-pg'),
    readiness: t('svc', 'e-svc-pod'),
    'load-balancer': t('lb', 'e-lb-svc'),
    'first-response': t('user', 'e-user-fd', 'e-fd-gw', 'e-gw-lb', 'e-lb-svc', 'e-svc-pod'),
    response: t('user', 'e-user-fd', 'e-fd-gw', 'e-gw-lb', 'e-lb-svc', 'e-svc-pod'),
    'window-open': t('window', 'e-gw-window'),
    'window-close': t('window'),
    'cluster-stop': t(['arm', 'g-cluster'], 'e-gw-arm', 'e-arm-cp'),
  },
}

// --------------------------------------------------------------- functions --
const FUNCTIONS_VIEW: ViewDef = {
  svcs: [
    svc('user', 70, 260, 'az:browser', N.user),
    svc('blob', 225, 90, 'az:storage-account', N.blob, 'bottom'),
    svc('frontdoor', 225, 260, 'glyph:edge', N.frontdoor),
    svc('entra', 400, 90, 'az:entra-external-id', N.entra, 'bottom'),
    svc('gateway', 400, 260, 'az:function-app', N.gateway),
    svc('keyvault', 400, 440, 'az:key-vault', N.keyvault),
    svc('fnhost', 620, 260, 'az:function-app', N.fnhost),
    svc('app', 790, 260, 'glyph:app', N.app),
    svc('pg', 990, 260, 'az:postgresql', N.pg),
  ],
  groups: [
    { id: 'g-fn', x: 535, y: 170, w: 345, h: 180, label: G.serverless, icon: 'az:function-app', tone: 'neutral' },
  ],
  edges: [
    { id: 'e-user-fd', from: 'user', to: 'frontdoor', sh: 'r', th: 'l', label: E.https },
    { id: 'e-fd-blob', from: 'frontdoor', to: 'blob', sh: 't', th: 'b', label: E.pageLoad },
    { id: 'e-fd-gw', from: 'frontdoor', to: 'gateway', sh: 'r', th: 'l', label: E.api },
    { id: 'e-gw-entra', from: 'gateway', to: 'entra', sh: 't', th: 'b', label: E.checkToken },
    { id: 'e-gw-kv', from: 'gateway', to: 'keyvault', sh: 'b', th: 't', label: E.readSecrets },
    { id: 'e-gw-fn', from: 'gateway', to: 'fnhost', sh: 'r', th: 'l', label: E.invoke, labelAt: [481, 260] },
    { id: 'e-fn-app', from: 'fnhost', to: 'app', sh: 'r', th: 'l' },
    { id: 'e-app-pg', from: 'app', to: 'pg', sh: 'r', th: 'l', label: E.jdbc, labelAt: [922, 260] },
  ],
  legendAt: [870, 392],
  stageMap: {
    request: t('user'),
    edge: t('frontdoor', 'e-user-fd'),
    gateway: t('gateway', 'e-fd-gw'),
    identity: t('entra', 'e-gw-entra'),
    keyvault: t('keyvault', 'e-gw-kv'),
    'function-cold-start': t('fnhost', 'e-gw-fn'),
    'jvm-start': t('app', 'e-fn-app'),
    database: t('pg', 'e-app-pg'),
    response: t('user', 'e-user-fd', 'e-fd-gw', 'e-gw-fn', 'e-fn-app'),
  },
}

export type ViewName = 'overview' | 'aks' | 'functions'

/** The stage map says which node(s) and which edge(s) belong to each stage id. */
export function getView(view: ViewName, host: 'functions' | 'aks'): ViewDef {
  if (view === 'aks') return AKS_VIEW
  if (view === 'functions') return FUNCTIONS_VIEW
  return { ...overviewBase, groups: overviewBase.groups as GroupDef[], stageMap: host === 'aks' ? OVERVIEW_AKS_MAP : OVERVIEW_FN_MAP }
}

export const STAGES_OF: Record<'aks' | 'functions', readonly string[]> = { aks: AKS_STAGES, functions: FUNCTIONS_STAGES }
const FN_ONLY = new Set<string>(FUNCTIONS_STAGES.filter((s) => !(AKS_STAGES as readonly string[]).includes(s)))
const AKS_ONLY = new Set<string>(AKS_STAGES.filter((s) => !(FUNCTIONS_STAGES as readonly string[]).includes(s)))

/** The overview takes events of one host. Without a hint, the stage ids decide. */
export function inferHost(stages: string[]): 'functions' | 'aks' {
  if (stages.some((s) => AKS_ONLY.has(s))) return 'aks'
  if (stages.some((s) => FN_ONLY.has(s))) return 'functions'
  return 'functions'
}
