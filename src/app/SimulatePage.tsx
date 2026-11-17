import Alert from '@cloudscape-design/components/alert'
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import FormField from '@cloudscape-design/components/form-field'
import Grid from '@cloudscape-design/components/grid'
import Header from '@cloudscape-design/components/header'
import Input from '@cloudscape-design/components/input'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, getSnapshot, previewSimulation, type PreviewResult, type Snapshot } from '../api/client'
import type { Customer } from '../api/types'
import { useAuth } from '../auth'
import { demoAksStartEvents } from '../diagram'
import { LifecycleReplay } from '../flow/LifecycleReplay'
import { Mono } from './common'
import { DataTable, type Column } from './DataTable'
import { brl, brlRound, dateTime, duration, percent, relativeTime } from './format'
import { RequestFlow, saveRecord, type FlowRecord } from './RequestFlow'
import { T } from './strings'

interface SavedPreview { id: string; at: string; principal: number; termMonths: number; ratePercent: number; income: number; installment: number; totalAmount: number; fitsMargin: boolean; ms: number; cold: boolean }
const KEY = 'consignado.guest.previews'
const toNumber = (text: string) => Number(text.replace(',', '.'))

function readSaved(): SavedPreview[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SavedPreview[] } catch { return [] }
}
type SnapshotRow = Customer & { agreementCode: string; contracts: number }

export function SimulatePage() {
  const navigate = useNavigate()
  const { me, signIn } = useAuth()
  const [principal, setPrincipal] = useState('12000')
  const [months, setMonths] = useState('48')
  const [rate, setRate] = useState('1.66')
  const [income, setIncome] = useState('4200')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [record, setRecord] = useState<FlowRecord | null>(null)
  const [failure, setFailure] = useState('')
  const [saved, setSaved] = useState<SavedPreview[]>(() => readSaved())
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [snapshotFailed, setSnapshotFailed] = useState(false)
  const demoEvents = useMemo(() => demoAksStartEvents(), [])

  const loadSnapshot = () => {
    setSnapshotFailed(false)
    getSnapshot().then((res) => setSnapshot(res.data)).catch(() => setSnapshotFailed(true))
  }
  useEffect(loadSnapshot, [])
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(saved)) } catch { /* ignore */ } }, [saved])

  const p = toNumber(principal), m = Number(months), r = toNumber(rate), i = toNumber(income)
  const errors = {
    principal: p >= 500 && p <= 500_000 ? '' : T.guest.errPrincipal,
    months: Number.isInteger(m) && m >= 6 && m <= 96 ? '' : T.guest.errMonths,
    rate: r > 0 && r <= 5 ? '' : T.guest.errRate,
    income: i > 0 ? '' : T.guest.errIncome,
  }
  const valid = !errors.principal && !errors.months && !errors.rate && !errors.income

  const submit = async () => {
    setTouched(true)
    if (!valid || busy) return
    setBusy(true); setFailure(''); setSlow(false)
    const slowTimer = window.setTimeout(() => setSlow(true), 1200)
    const started = performance.now()
    try {
      const res = await previewSimulation({ principal: p, termMonths: m, monthlyInterestRate: r / 100, monthlyIncome: i })
      setResult(res.data)
      setRecord(saveRecord({ label: res.label, trace: res.trace, ok: true, at: Date.now(), browserMs: Math.round(performance.now() - started), status: res.trace.status ?? 200 }))
      setSaved((list) => [{ id: `${Date.now()}`, at: new Date().toISOString(), principal: p, termMonths: m, ratePercent: r, income: i, installment: res.data.installment, totalAmount: res.data.totalAmount, fitsMargin: res.data.fitsMargin, ms: res.trace.totalMs, cold: res.trace.cold }, ...list].slice(0, 12))
    } catch (err) {
      setFailure(err instanceof Error ? err.message : T.common.failed)
      if (err instanceof ApiError && err.trace) setRecord(saveRecord({ label: err.label ?? '', trace: err.trace, ok: false, message: err.message, at: Date.now(), browserMs: Math.round(performance.now() - started), status: err.status, code: err.code }))
    } finally {
      window.clearTimeout(slowTimer); setBusy(false); setSlow(false)
    }
  }

  const rows = useMemo<SnapshotRow[]>(() => {
    if (!snapshot) return []
    const codes = new Map(snapshot.agreements.map((a) => [a.id, a.code]))
    return snapshot.customers.map((c) => ({ ...c, agreementCode: codes.get(c.agreementId) ?? '', contracts: snapshot.contracts.filter((k) => k.customerId === c.id).length }))
  }, [snapshot])
  const columns: Column<SnapshotRow>[] = [
    { id: 'id', header: T.col.id, cell: (c) => <Mono>{c.id}</Mono>, sortingField: 'id', isRowHeader: true },
    { id: 'name', header: T.col.name, cell: (c) => <Mono>{c.name}</Mono>, minWidth: 200 },
    { id: 'cpf', header: T.col.cpf, cell: (c) => <Mono>{c.cpf}</Mono> },
    { id: 'agreement', header: T.col.agreement, cell: (c) => c.agreementCode, sortingField: 'agreementCode' },
    { id: 'income', header: T.guest.colIncome, cell: (c) => <Mono>{brlRound(c.monthlyIncome)}</Mono>, sortingField: 'monthlyIncome' },
    { id: 'contracts', header: T.guest.colContracts, cell: (c) => <Mono>{c.contracts}</Mono>, sortingField: 'contracts' },
  ]

  return (
    <ContentLayout header={<Header variant="h1" description={T.guest.description}>{T.guest.title}</Header>}>
      <SpaceBetween size="l">
        <Alert type="info" header={me ? T.guest.signedTitle : T.guest.noticeTitle}>{me ? T.guest.signedText : T.guest.noticeText}</Alert>

        <Grid gridDefinition={[{ colspan: 12 }, { colspan: 12 }]}>
          <Container fitHeight header={<Header variant="h2" description={T.guest.formHint}>{T.guest.form}</Header>}>
            <form onSubmit={(e) => { e.preventDefault(); void submit() }} noValidate>
              <SpaceBetween size="m">
                <ColumnLayout columns={2}>
                  <FormField label={T.guest.principal} description={T.common.brlHint} errorText={touched ? errors.principal : ''}>
                    <Input value={principal} onChange={(e) => setPrincipal(e.detail.value)} type="number" inputMode="decimal" />
                  </FormField>
                  <FormField label={T.guest.months} description={T.guest.monthsHint} errorText={touched ? errors.months : ''}>
                    <Input value={months} onChange={(e) => setMonths(e.detail.value)} type="number" inputMode="numeric" />
                  </FormField>
                  <FormField label={T.guest.rate} description={T.guest.rateHint} errorText={touched ? errors.rate : ''}>
                    <Input value={rate} onChange={(e) => setRate(e.detail.value)} type="number" inputMode="decimal" step={0.01} />
                  </FormField>
                  <FormField label={T.guest.income} description={T.common.brlHint} errorText={touched ? errors.income : ''}>
                    <Input value={income} onChange={(e) => setIncome(e.detail.value)} type="number" inputMode="decimal" />
                  </FormField>
                </ColumnLayout>
                <SpaceBetween size="s" direction="horizontal" alignItems="center">
                  <Button variant="primary" loading={busy}>{T.guest.submit}</Button>
                  {slow && <StatusIndicator type="in-progress">{T.guest.slow}</StatusIndicator>}
                </SpaceBetween>
                {Boolean(failure) && <Alert type="error" header={T.guest.failedTitle}>{failure}</Alert>}
                {result && !failure && (
                  <SpaceBetween size="s">
                    <KeyValuePairs
                      columns={2}
                      items={[
                        { label: T.guest.installment, value: <Box fontSize="heading-xl" fontWeight="bold"><span className="mono" style={{ whiteSpace: 'nowrap' }}>{brl(result.installment)}</span></Box> },
                        { label: T.guest.total, value: <Mono>{brl(result.totalAmount)}</Mono> },
                        { label: T.guest.interest, value: <Mono>{brl(result.totalInterest)}</Mono> },
                        { label: T.guest.marginLimit, value: <Mono>{brl(result.marginLimit)}</Mono> },
                      ]}
                    />
                    {result.fitsMargin
                      ? <StatusIndicator type="success">{T.guest.fits}</StatusIndicator>
                      : <StatusIndicator type="warning">{T.guest.noFit}</StatusIndicator>}
                  </SpaceBetween>
                )}
              </SpaceBetween>
            </form>
          </Container>
          <Container fitHeight header={<Header variant="h2" description={T.guest.requestHint}>{T.guest.request}</Header>}>
            <SpaceBetween size="s">
              {!record && <Box color="text-body-secondary">{T.guest.requestEmpty}</Box>}
              <RequestFlow host="functions" record={record} />
            </SpaceBetween>
          </Container>
        </Grid>

        <Table
          header={
            <Header variant="h2" counter={`(${saved.length})`} description={T.guest.savedHint}
              actions={<Button disabled={saved.length === 0} onClick={() => setSaved([])}>{T.guest.clear}</Button>}>
              {T.guest.saved}
            </Header>
          }
          items={saved}
          trackBy="id"
          columnDefinitions={[
            { id: 'at', header: T.guest.colWhen, cell: (s) => <span title={dateTime(s.at)}>{relativeTime(s.at)}</span>, isRowHeader: true },
            { id: 'principal', header: T.guest.principal, cell: (s) => <Mono>{brl(s.principal)}</Mono> },
            { id: 'term', header: T.col.term, cell: (s) => T.common.months(s.termMonths) },
            { id: 'rate', header: T.col.rate, cell: (s) => <Mono>{percent(s.ratePercent / 100)}</Mono> },
            { id: 'installment', header: T.guest.installment, cell: (s) => <Mono>{brl(s.installment)}</Mono> },
            { id: 'fits', header: T.guest.colFits, cell: (s) => s.fitsMargin ? <StatusIndicator type="success">{T.common.yes}</StatusIndicator> : <StatusIndicator type="warning">{T.common.no}</StatusIndicator> },
            { id: 'ms', header: T.guest.colTime, cell: (s) => <SpaceBetween size="xs" direction="horizontal" alignItems="center"><Mono>{duration(s.ms)}</Mono>{s.cold && <Badge color="blue">{T.inspector.cold}</Badge>}</SpaceBetween> },
          ]}
          empty={
            <Box textAlign="center" color="inherit" padding={{ vertical: 'm' }}>
              <Box variant="strong" color="inherit">{T.guest.noSaved}</Box>
              <Box color="text-body-secondary">{T.guest.noSavedText}</Box>
            </Box>
          }
        />

        {snapshotFailed
          ? <Alert type="error" header={T.guest.snapshotFailed} action={<Button onClick={loadSnapshot}>{T.common.retry}</Button>}>{T.guest.snapshotFailedText}</Alert>
          : (
            <DataTable
              title={T.guest.snapshot}
              description={snapshot ? T.guest.snapshotHint(relativeTime(snapshot.asOf)) : T.guest.snapshotLoading}
              items={rows} columns={columns} trackBy="id"
              loading={!snapshot}
              filterPlaceholder={T.guest.findSnapshot} filterAriaLabel={T.guest.findSnapshot}
              emptyTitle={T.guest.noSnapshot} emptyText={T.guest.noSnapshotText}
              pageSize={10}
            />
          )}

        <Container
          header={
            <Header
              variant="h2"
              description={T.guest.aksHint}
              info={<Badge color="severity-medium">{T.guest.simBadge}</Badge>}
            >
              {T.guest.aks}
            </Header>
          }
        >
          <SpaceBetween size="m">
            <LifecycleReplay events={demoEvents} runKey="guest-replay" height={640} autoPlay={false} />
            <Alert type="info" header={T.guest.ctaTitle} action={me ? <Button onClick={() => navigate('/app/aks')}>{T.guest.ctaSigned}</Button> : <Button variant="primary" onClick={() => { signIn(); navigate('/app/aks') }}>{T.guest.cta}</Button>}>
              {T.guest.ctaText}
            </Alert>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  )
}
