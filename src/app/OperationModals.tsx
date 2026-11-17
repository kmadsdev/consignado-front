import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Modal from '@cloudscape-design/components/modal'
import Select from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import { useState } from 'react'
import { installmentOf, randomCustomerInput, type CustomerInput, type IncomeResult, type SimulationResult } from '../api/client'
import type { Agreement, Customer, Margin } from '../api/types'
import { Mono } from './common'
import { brl, percent } from './format'
import { T } from './strings'

const CPF_MASK = /^\*\*\*\.\d{3}\.\d{3}-\*\*$/
const toNumber = (text: string) => Number(text.replace(',', '.'))

export function MarginPairs({ margin }: { margin: Margin }) {
  return (
    <KeyValuePairs
      columns={3}
      items={[
        { label: T.margin.limit, value: <Mono>{brl(margin.marginLimit)}</Mono> },
        { label: T.margin.committed, value: <Mono>{brl(margin.committed)}</Mono> },
        {
          label: T.margin.available,
          value: <StatusIndicator type={margin.available > 0 ? 'success' : 'warning'}><Mono>{brl(margin.available)}</Mono></StatusIndicator>,
        },
      ]}
    />
  )
}

// ---- add customer -------------------------------------------------------------
export function AddCustomerModal(props: { agreements: Agreement[]; busy: boolean; onDismiss: () => void; onSubmit: (input: CustomerInput) => void }) {
  const [agreementId, setAgreementId] = useState('')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [income, setIncome] = useState('')
  const [touched, setTouched] = useState(false)
  const options = props.agreements.map((a) => ({ value: a.id, label: `${a.code}: ${a.name}`, description: T.addCustomer.agreementHint(a.maxMarginPercent, percent(a.monthlyInterestRate)) }))
  const errors = {
    agreement: agreementId ? '' : T.addCustomer.errAgreement,
    name: name.trim().length >= 3 ? '' : T.addCustomer.errName,
    cpf: CPF_MASK.test(cpf) ? '' : T.addCustomer.errCpf,
    income: toNumber(income) > 0 ? '' : T.addCustomer.errIncome,
  }
  const valid = !errors.agreement && !errors.name && !errors.cpf && !errors.income
  const fill = () => {
    const r = randomCustomerInput(props.agreements)
    setAgreementId(r.agreementId); setName(r.name); setCpf(r.cpf); setIncome(String(r.monthlyIncome))
  }
  const submit = () => {
    setTouched(true)
    if (valid) props.onSubmit({ agreementId, name, cpf, monthlyIncome: toNumber(income) })
  }
  return (
    <Modal
      visible
      onDismiss={props.onDismiss}
      header={T.addCustomer.title}
      footer={
        <Box float="right">
          <SpaceBetween size="xs" direction="horizontal">
            <Button variant="link" onClick={props.onDismiss} disabled={props.busy}>{T.common.cancel}</Button>
            <Button variant="primary" onClick={submit} loading={props.busy}>{T.addCustomer.submit}</Button>
          </SpaceBetween>
        </Box>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); submit() }}>
        <SpaceBetween size="m">
          <SpaceBetween size="xs" direction="horizontal" alignItems="center">
            <Button iconName="gen-ai" onClick={fill} formAction="none">{T.addCustomer.fill}</Button>
            <Box color="text-body-secondary" fontSize="body-s">{T.addCustomer.fillHint}</Box>
          </SpaceBetween>
          <FormField label={T.addCustomer.agreement} errorText={touched ? errors.agreement : ''}>
            <Select
              selectedOption={options.find((o) => o.value === agreementId) ?? null}
              options={options}
              placeholder={T.addCustomer.agreementPlaceholder}
              onChange={(e) => setAgreementId(e.detail.selectedOption.value ?? '')}
            />
          </FormField>
          <FormField label={T.addCustomer.name} errorText={touched ? errors.name : ''}>
            <Input value={name} onChange={(e) => setName(e.detail.value)} placeholder="Marina Sampaio Duarte" autoComplete={false} />
          </FormField>
          <ColumnLayout columns={2}>
            <FormField label={T.addCustomer.cpf} description={T.addCustomer.cpfHint} errorText={touched ? errors.cpf : ''}>
              <Input value={cpf} onChange={(e) => setCpf(e.detail.value)} placeholder="***.456.789-**" autoComplete={false} />
            </FormField>
            <FormField label={T.addCustomer.income} description={T.common.brlHint} errorText={touched ? errors.income : ''}>
              <Input value={income} onChange={(e) => setIncome(e.detail.value)} type="number" inputMode="decimal" placeholder="4500" />
            </FormField>
          </ColumnLayout>
        </SpaceBetween>
      </form>
    </Modal>
  )
}

// ---- simulate a loan --------------------------------------------------------------
export function SimulateModal(props: {
  customer: Customer
  agreement: Agreement
  busy: boolean
  canWrite: boolean
  result: SimulationResult | null
  onDismiss: () => void
  onSubmit: (principal: number, termMonths: number) => void
  onCreateContract: (simulationId: string) => void
}) {
  const { customer, agreement, result } = props
  const [principal, setPrincipal] = useState('8000')
  const [months, setMonths] = useState(String(Math.min(36, agreement.maxTermMonths)))
  const [touched, setTouched] = useState(false)
  const p = toNumber(principal)
  const m = Number(months)
  const errors = {
    principal: p >= 500 ? '' : T.simulate.errPrincipal,
    months: Number.isInteger(m) && m >= 6 && m <= agreement.maxTermMonths ? '' : T.simulate.errMonths(agreement.maxTermMonths),
  }
  const valid = !errors.principal && !errors.months
  const estimate = valid ? installmentOf(p, agreement.monthlyInterestRate, m) : null
  const submit = () => { setTouched(true); if (valid) props.onSubmit(p, m) }
  return (
    <Modal
      visible
      size="medium"
      onDismiss={props.onDismiss}
      header={T.simulate.title}
      footer={
        <Box float="right">
          <SpaceBetween size="xs" direction="horizontal">
            <Button variant="link" onClick={props.onDismiss} disabled={props.busy}>{result ? T.common.close : T.common.cancel}</Button>
            {result
              ? <Button variant="primary" loading={props.busy} disabled={!result.fitsMargin || !props.canWrite} disabledReason={T.simulate.noContractReason} onClick={() => props.onCreateContract(result.simulation.id)}>{T.simulate.createContract}</Button>
              : <Button variant="primary" loading={props.busy} onClick={submit}>{T.simulate.submit}</Button>}
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <KeyValuePairs
          columns={3}
          items={[
            { label: T.simulate.customer, value: <>{customer.name} <Mono>({customer.id})</Mono></> },
            { label: T.simulate.agreement, value: `${agreement.code}, ${percent(agreement.monthlyInterestRate)} ${T.common.perMonth}` },
            { label: T.simulate.income, value: <Mono>{brl(customer.monthlyIncome)}</Mono> },
          ]}
        />
        {!result && (
          <form onSubmit={(e) => { e.preventDefault(); submit() }}>
            <SpaceBetween size="m">
              <ColumnLayout columns={2}>
                <FormField label={T.simulate.principal} description={T.common.brlHint} errorText={touched ? errors.principal : ''}>
                  <Input value={principal} onChange={(e) => setPrincipal(e.detail.value)} type="number" inputMode="decimal" />
                </FormField>
                <FormField label={T.simulate.months} description={T.simulate.monthsHint(agreement.maxTermMonths)} errorText={touched ? errors.months : ''}>
                  <Input value={months} onChange={(e) => setMonths(e.detail.value)} type="number" inputMode="numeric" />
                </FormField>
              </ColumnLayout>
              <Box color="text-body-secondary" fontSize="body-s">
                {estimate !== null ? T.simulate.estimate(brl(estimate)) : T.simulate.estimateNone}
              </Box>
            </SpaceBetween>
          </form>
        )}
        {result && (
          <SpaceBetween size="m">
            <KeyValuePairs
              columns={3}
              items={[
                { label: T.simulate.installment, value: <Box fontSize="heading-l" fontWeight="bold"><span className="mono" style={{ whiteSpace: 'nowrap' }}>{brl(result.simulation.installment)}</span></Box> },
                { label: T.simulate.total, value: <Mono>{brl(result.simulation.totalAmount)}</Mono> },
                { label: T.simulate.term, value: T.common.months(result.simulation.termMonths) },
              ]}
            />
            <MarginPairs margin={result.margin} />
            {result.fitsMargin
              ? <Alert type="success" header={T.simulate.fitsTitle}>{T.simulate.fitsText(brl(result.simulation.installment), brl(result.margin.available))}</Alert>
              : <Alert type="warning" header={T.simulate.noFitTitle}>{T.simulate.noFitText(brl(result.simulation.installment), brl(result.margin.available))}</Alert>}
            <Box color="text-body-secondary" fontSize="body-s">{T.simulate.saved(result.simulation.id)}</Box>
          </SpaceBetween>
        )}
      </SpaceBetween>
    </Modal>
  )
}

// ---- change monthly income ---------------------------------------------------------
export function IncomeModal(props: {
  customer: Customer
  busy: boolean
  margin: Margin | null
  result: IncomeResult | null
  onDismiss: () => void
  onSubmit: (income: number) => void
}) {
  const { customer, result } = props
  const [income, setIncome] = useState(String(customer.monthlyIncome))
  const [touched, setTouched] = useState(false)
  const value = toNumber(income)
  const error = !(value > 0) ? T.income.errIncome : value === customer.monthlyIncome && !result ? T.income.errSame : ''
  const submit = () => { setTouched(true); if (!error) props.onSubmit(value) }
  return (
    <Modal
      visible
      size="medium"
      onDismiss={props.onDismiss}
      header={T.income.title}
      footer={
        <Box float="right">
          <SpaceBetween size="xs" direction="horizontal">
            <Button variant="link" onClick={props.onDismiss} disabled={props.busy}>{result ? T.common.close : T.common.cancel}</Button>
            {!result && <Button variant="primary" loading={props.busy} onClick={submit}>{T.income.submit}</Button>}
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <KeyValuePairs
          columns={2}
          items={[
            { label: T.simulate.customer, value: <>{customer.name} <Mono>({customer.id})</Mono></> },
            { label: T.income.current, value: <Mono>{brl(customer.monthlyIncome)}</Mono> },
          ]}
        />
        {!result && (
          <form onSubmit={(e) => { e.preventDefault(); submit() }}>
            <SpaceBetween size="m">
              <FormField label={T.income.field} description={T.income.hint} errorText={touched ? error : ''}>
                <Input value={income} onChange={(e) => setIncome(e.detail.value)} type="number" inputMode="decimal" />
              </FormField>
              <div>
                <Box variant="awsui-key-label">{T.income.marginNow}</Box>
                {props.margin ? <MarginPairs margin={props.margin} /> : <StatusIndicator type="loading">{T.income.marginLoading}</StatusIndicator>}
              </div>
            </SpaceBetween>
          </form>
        )}
        {result && (
          <SpaceBetween size="m">
            <Alert type="success" header={T.income.doneTitle}>{T.income.doneText(brl(result.customer.monthlyIncome))}</Alert>
            <div>
              <Box variant="awsui-key-label">{T.income.marginNew}</Box>
              <MarginPairs margin={result.margin} />
            </div>
          </SpaceBetween>
        )}
      </SpaceBetween>
    </Modal>
  )
}
