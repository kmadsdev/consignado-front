import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import FormField from '@cloudscape-design/components/form-field'
import Grid from '@cloudscape-design/components/grid'
import Header from '@cloudscape-design/components/header'
import Input from '@cloudscape-design/components/input'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Table from '@cloudscape-design/components/table'
import { useState } from 'react'
import { ApiError, previewSimulation, type PreviewResult } from '../api/client'
import { LOCALE } from '../i18n/lang.ts'
import { Mono } from './common'
import { brl, duration, percent } from './format'
import { RequestFlow, type FlowRecord } from './RequestFlow'
import { T } from './strings'

interface Row { id: string; at: number; principal: number; termMonths: number; ratePercent: number; income: number; installment?: number; error?: string; ms: number }
const TIME = new Intl.DateTimeFormat(LOCALE, { timeStyle: 'medium', timeZone: 'America/Sao_Paulo' })
const toNumber = (text: string) => Number(text.replace(',', '.'))

/** The loan preview of /app/simulate, sent to the pods of the open window. `ready` = false while the cluster starts. */
export function WindowPreview({ ready }: { ready: boolean }) {
  const L = T.windowPreview
  const [principal, setPrincipal] = useState('12000')
  const [months, setMonths] = useState('48')
  const [rate, setRate] = useState('1.66')
  const [income, setIncome] = useState('4200')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [record, setRecord] = useState<FlowRecord | null>(null)
  const [failure, setFailure] = useState('')
  const [ended, setEnded] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const off = !ready || ended

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
    if (!valid || busy || off) return
    setBusy(true); setFailure('')
    const started = performance.now()
    const row = { id: `${Date.now()}`, at: Date.now(), principal: p, termMonths: m, ratePercent: r, income: i }
    try {
      const res = await previewSimulation({ principal: p, termMonths: m, monthlyInterestRate: r / 100, monthlyIncome: i }, 'aks')
      const browserMs = Math.round(performance.now() - started)
      setResult(res.data)
      setRecord({ label: res.label, trace: res.trace, ok: true, at: Date.now(), browserMs, status: 200 })
      setRows((list) => [{ ...row, installment: res.data.installment, ms: browserMs }, ...list].slice(0, 20))
    } catch (err) {
      const browserMs = Math.round(performance.now() - started)
      if (err instanceof ApiError && err.status === 403 && err.code === 'no-session') { setEnded(true); setResult(null); return }
      const message = err instanceof Error ? err.message : T.common.failed
      setFailure(message)
      setResult(null)
      if (err instanceof ApiError) {
        setRows((list) => [{ ...row, error: T.flow.httpError(err.status, T.flow.httpWords(err.status), err.code), ms: browserMs }, ...list].slice(0, 20))
        if (err.trace) setRecord({ label: err.label ?? '', trace: err.trace, ok: false, message, at: Date.now(), browserMs, status: err.status, code: err.code })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container header={<Header variant="h2" description={L.hint}>{L.title}</Header>}>
      <SpaceBetween size="l">
        {!ready && <StatusIndicator type="pending">{L.waiting}</StatusIndicator>}
        {ended && <Alert type="info" header={L.endedTitle}>{L.endedText}</Alert>}
        <Grid gridDefinition={[{ colspan: { default: 12, s: 5 } }, { colspan: { default: 12, s: 7 } }]}>
          <form onSubmit={(e) => { e.preventDefault(); void submit() }} noValidate>
            <SpaceBetween size="m">
              <ColumnLayout columns={2}>
                <FormField label={T.guest.principal} description={T.common.brlHint} errorText={touched ? errors.principal : ''}>
                  <Input value={principal} onChange={(e) => setPrincipal(e.detail.value)} type="number" inputMode="decimal" disabled={off} />
                </FormField>
                <FormField label={T.guest.months} description={T.guest.monthsHint} errorText={touched ? errors.months : ''}>
                  <Input value={months} onChange={(e) => setMonths(e.detail.value)} type="number" inputMode="numeric" disabled={off} />
                </FormField>
                <FormField label={T.guest.rate} description={T.guest.rateHint} errorText={touched ? errors.rate : ''}>
                  <Input value={rate} onChange={(e) => setRate(e.detail.value)} type="number" inputMode="decimal" step={0.01} disabled={off} />
                </FormField>
                <FormField label={T.guest.income} description={T.common.brlHint} errorText={touched ? errors.income : ''}>
                  <Input value={income} onChange={(e) => setIncome(e.detail.value)} type="number" inputMode="decimal" disabled={off} />
                </FormField>
              </ColumnLayout>
              <Button variant="primary" loading={busy} disabled={off}>{L.submit}</Button>
              {Boolean(failure) && <Alert type="error" header={T.guest.failedTitle}>{failure}</Alert>}
              {result && !failure && !ended && (
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
          <Table
            variant="embedded"
            header={<Header variant="h3" counter={`(${rows.length})`} description={L.listHint}>{L.list}</Header>}
            items={rows}
            trackBy="id"
            columnDefinitions={[
              { id: 'at', header: L.colTime, cell: (s) => <Mono>{TIME.format(s.at)}</Mono>, isRowHeader: true },
              { id: 'inputs', header: T.flow.colInputs, cell: (s) => T.flow.inputs(brl(s.principal), s.termMonths, percent(s.ratePercent / 100), brl(s.income)) },
              { id: 'result', header: T.flow.colResult, cell: (s) => s.installment !== undefined ? <Mono>{brl(s.installment)}</Mono> : <StatusIndicator type="error">{s.error}</StatusIndicator> },
              { id: 'ms', header: T.guest.colTime, cell: (s) => <Mono>{duration(s.ms)}</Mono> },
            ]}
            empty={
              <Box textAlign="center" color="inherit" padding={{ vertical: 'm' }}>
                <Box variant="strong" color="inherit">{L.noRows}</Box>
                <Box color="text-body-secondary">{L.noRowsText}</Box>
              </Box>
            }
          />
        </Grid>
        {!ended && (
          <SpaceBetween size="s">
            <Header variant="h3" description={record ? L.requestHint : L.requestEmpty}>{T.guest.request}</Header>
            <RequestFlow host="aks" record={record} />
          </SpaceBetween>
        )}
      </SpaceBetween>
    </Container>
  )
}
