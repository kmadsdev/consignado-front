import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ButtonDropdown from '@cloudscape-design/components/button-dropdown'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import Tabs from '@cloudscape-design/components/tabs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from '../api/client'
import { ApiError, CONTRACT_TRANSITIONS, speedOf, type ApiResult, type ContractAction, type IncomeResult, type SimulationResult } from '../api/client'
import type { Agreement, Contract, Customer, HostKind, Margin, Simulation } from '../api/types'
import { useShell } from '../shell/context'
import { ContractStatusText, CopyId, Mono } from './common'
import { DataTable, type Column } from './DataTable'
import { brl, dateOnly, dateTime, duration, percent, relativeTime } from './format'
import { AddCustomerModal, IncomeModal, SimulateModal } from './OperationModals'
import { T } from './strings'

type CustomerRow = Customer & { agreementCode: string }
type ContractRow = Contract & { customerName: string }
type SimulationRow = Simulation & { customerName: string; state: 'open' | 'contracted' | 'expired' }
const ACTIONS: ContractAction[] = ['approve', 'reject', 'activate', 'settle', 'cancel']

interface Props {
  host: HostKind
  /** False for an account on hold: it can read, but every write button is off. */
  canWrite: boolean
  readOnlyReason?: string
}

/** The tables of the shared data and the workflow actions, bound to one host. */
export function Operations({ host, canWrite, readOnlyReason }: Props) {
  const { notify, showTrace } = useShell()
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('customers')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [simulationId, setSimulationId] = useState<string | null>(null)
  const [contractId, setContractId] = useState<string | null>(null)
  const [modal, setModal] = useState<'add' | 'simulate' | 'income' | null>(null)
  const [simResult, setSimResult] = useState<SimulationResult | null>(null)
  const [incomeResult, setIncomeResult] = useState<IncomeResult | null>(null)
  const [margin, setMargin] = useState<Margin | null>(null)
  const alive = useRef(true)
  const loadSeq = useRef(0)

  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    setLoading(true); setError(null); setSlow(false)
    const slowTimer = window.setTimeout(() => { if (seq === loadSeq.current) setSlow(true) }, 1500)
    try {
      const a = await api.listAgreements(host)
      if (seq !== loadSeq.current || !alive.current) return
      setAgreements(a.data)
      showTrace({ label: a.label, trace: a.trace, ok: true, at: Date.now() })
      const [c, s, k] = await Promise.all([api.listCustomers(host), api.listSimulations(host), api.listContracts(host)])
      if (seq !== loadSeq.current || !alive.current) return
      setCustomers(c.data); setSimulations(s.data); setContracts(k.data)
    } catch (err) {
      if (seq === loadSeq.current && alive.current) setError(err instanceof Error ? err.message : T.ops.unknownError)
    } finally {
      window.clearTimeout(slowTimer)
      if (seq === loadSeq.current && alive.current) { setLoading(false); setSlow(false) }
    }
  }, [host, showTrace])

  useEffect(() => {
    alive.current = true
    void load()
    return () => { alive.current = false }
  }, [load])

  /** Runs one write (or one traced read), shows the notice and opens the request inspector. */
  async function run<Data>(fn: () => Promise<ApiResult<Data>>, okText: (data: Data) => string): Promise<Data | undefined> {
    setBusy(true)
    const slowTimer = window.setTimeout(() => notify({ id: 'op', type: 'in-progress', loading: true, content: host === 'aks' ? T.ops.slowAks : T.ops.slow }), 1200)
    try {
      const res = await fn()
      showTrace({ label: res.label, trace: res.trace, ok: true, at: Date.now() }, true)
      notify({ id: 'op', type: 'success', content: `${okText(res.data)} ${T.ops.timing(duration(res.trace.totalMs), speedOf(res.trace))}` })
      return res.data
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null
      if (apiError?.trace) showTrace({ label: apiError.label ?? '', trace: apiError.trace, ok: false, message: apiError.message, at: Date.now() }, true)
      notify({ id: 'op', type: 'error', header: T.ops.failed, content: err instanceof Error ? err.message : T.ops.unknownError })
      return undefined
    } finally {
      window.clearTimeout(slowTimer)
      if (alive.current) setBusy(false)
    }
  }

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])
  const agreementById = useMemo(() => new Map(agreements.map((a) => [a.id, a])), [agreements])
  const customerRows = useMemo<CustomerRow[]>(() => customers.map((c) => ({ ...c, agreementCode: agreementById.get(c.agreementId)?.code ?? '' })), [customers, agreementById])
  const contractRows = useMemo<ContractRow[]>(() => contracts.map((c) => ({ ...c, customerName: customerById.get(c.customerId)?.name ?? c.customerId })), [contracts, customerById])
  const simulationRows = useMemo<SimulationRow[]>(() => {
    const contracted = new Set(contracts.map((c) => c.simulationId))
    const now = Date.now()
    return simulations.map((s) => ({
      ...s,
      customerName: customerById.get(s.customerId)?.name ?? s.customerId,
      state: contracted.has(s.id) ? 'contracted' : new Date(s.expiresAt).getTime() < now ? 'expired' : 'open',
    }))
  }, [simulations, contracts, customerById])

  const customer = customerRows.find((c) => c.id === customerId) ?? null
  const simulation = simulationRows.find((s) => s.id === simulationId) ?? null
  const contract = contractRows.find((c) => c.id === contractId) ?? null
  const writeOff = !canWrite
  const writeReason = readOnlyReason ?? T.ops.readOnly

  const closeModal = () => { setModal(null); setSimResult(null); setIncomeResult(null); setMargin(null) }

  const doCreateContract = async (id: string) => {
    const created = await run(() => api.createContract(host, id), (c) => T.ops.contractCreated(c.id))
    if (created) {
      setContracts((list) => [created, ...list])
      setContractId(created.id)
      setTab('contracts')
      closeModal()
    }
  }
  const doContractAction = async (action: ContractAction) => {
    if (!contract) return
    const next = await run(() => api.contractAction(host, contract.id, action), (c) => T.ops.contractChanged(c.id, T.contractStatus[c.status]))
    if (next) setContracts((list) => list.map((c) => (c.id === next.id ? next : c)))
  }
  const openIncome = () => {
    if (!customer) return
    setModal('income')
    api.getMargin(host, customer.id)
      .then((res) => { if (alive.current) { setMargin(res.data); showTrace({ label: res.label, trace: res.trace, ok: true, at: Date.now() }) } })
      .catch(() => undefined)
  }

  const customerColumns: Column<CustomerRow>[] = [
    { id: 'id', header: T.col.id, cell: (c) => <Mono>{c.id}</Mono>, sortingField: 'id', isRowHeader: true },
    { id: 'name', header: T.col.name, cell: (c) => c.name, sortingField: 'name', minWidth: 200 },
    { id: 'cpf', header: T.col.cpf, cell: (c) => <Mono>{c.cpf}</Mono> },
    { id: 'agreement', header: T.col.agreement, cell: (c) => c.agreementCode, sortingField: 'agreementCode' },
    { id: 'income', header: T.col.income, cell: (c) => <Mono>{brl(c.monthlyIncome)}</Mono>, sortingField: 'monthlyIncome' },
    { id: 'created', header: T.col.created, cell: (c) => <span title={dateTime(c.createdAt)}>{relativeTime(c.createdAt)}</span>, sortingField: 'createdAt' },
  ]
  const simulationColumns: Column<SimulationRow>[] = [
    { id: 'id', header: T.col.id, cell: (s) => <Mono>{s.id}</Mono>, sortingField: 'id', isRowHeader: true },
    { id: 'customer', header: T.col.customer, cell: (s) => s.customerName, sortingField: 'customerName', minWidth: 190 },
    { id: 'principal', header: T.col.principal, cell: (s) => <Mono>{brl(s.principal)}</Mono>, sortingField: 'principal' },
    { id: 'term', header: T.col.term, cell: (s) => T.common.months(s.termMonths), sortingField: 'termMonths' },
    { id: 'installment', header: T.col.installment, cell: (s) => <Mono>{brl(s.installment)}</Mono>, sortingField: 'installment' },
    { id: 'total', header: T.col.total, cell: (s) => <Mono>{brl(s.totalAmount)}</Mono>, sortingField: 'totalAmount' },
    { id: 'rate', header: T.col.rate, cell: (s) => <Mono>{percent(s.monthlyInterestRate)}</Mono>, sortingField: 'monthlyInterestRate', hiddenByDefault: true },
    {
      id: 'state', header: T.col.state, sortingField: 'state',
      cell: (s) => s.state === 'open' ? <StatusIndicator type="info">{T.simState.open}</StatusIndicator> : s.state === 'contracted' ? <StatusIndicator type="success">{T.simState.contracted}</StatusIndicator> : <StatusIndicator type="stopped">{T.simState.expired}</StatusIndicator>,
    },
    { id: 'expires', header: T.col.expires, cell: (s) => dateTime(s.expiresAt), sortingField: 'expiresAt', hiddenByDefault: true },
  ]
  const contractColumns: Column<ContractRow>[] = [
    { id: 'id', header: T.col.id, cell: (c) => <Mono>{c.id}</Mono>, sortingField: 'id', isRowHeader: true },
    { id: 'customer', header: T.col.customer, cell: (c) => c.customerName, sortingField: 'customerName', minWidth: 190 },
    { id: 'status', header: T.col.status, cell: (c) => <ContractStatusText status={c.status} />, sortingField: 'status' },
    { id: 'principal', header: T.col.principal, cell: (c) => <Mono>{brl(c.principal)}</Mono>, sortingField: 'principal' },
    { id: 'term', header: T.col.term, cell: (c) => T.common.months(c.termMonths), sortingField: 'termMonths' },
    { id: 'installment', header: T.col.installment, cell: (c) => <Mono>{brl(c.installment)}</Mono>, sortingField: 'installment' },
    { id: 'simulation', header: T.col.simulation, cell: (c) => <Mono>{c.simulationId}</Mono>, hiddenByDefault: true },
    { id: 'created', header: T.col.created, cell: (c) => <span title={dateTime(c.createdAt)}>{relativeTime(c.createdAt)}</span>, sortingField: 'createdAt' },
  ]
  const agreementColumns: Column<Agreement>[] = [
    { id: 'code', header: T.col.code, cell: (a) => <Mono>{a.code}</Mono>, sortingField: 'code', isRowHeader: true },
    { id: 'name', header: T.col.name, cell: (a) => a.name, sortingField: 'name', minWidth: 220 },
    { id: 'margin', header: T.col.maxMargin, cell: (a) => <Mono>{a.maxMarginPercent}%</Mono>, sortingField: 'maxMarginPercent' },
    { id: 'term', header: T.col.maxTerm, cell: (a) => T.common.months(a.maxTermMonths), sortingField: 'maxTermMonths' },
    { id: 'rate', header: T.col.rate, cell: (a) => <Mono>{percent(a.monthlyInterestRate)}</Mono>, sortingField: 'monthlyInterestRate' },
    { id: 'id', header: T.col.id, cell: (a) => <CopyId value={a.id} />, hiddenByDefault: true },
    { id: 'created', header: T.col.created, cell: (a) => dateOnly(a.createdAt), sortingField: 'createdAt' },
  ]

  const loadingText = slow ? (host === 'aks' ? T.ops.loadingSlowAks : T.ops.loadingSlow) : T.ops.loading
  const refresh = <Button iconName="refresh" ariaLabel={T.ops.refresh} onClick={() => void load()} disabled={loading} />
  const agreementOfCustomer = customer ? agreementById.get(customer.agreementId) : undefined

  return (
    <SpaceBetween size="m">
      {error && (
        <Alert type="error" header={T.ops.loadFailed} action={<Button onClick={() => void load()}>{T.common.retry}</Button>}>
          {error}
        </Alert>
      )}
      {writeOff && !error && <Alert type="info" header={T.ops.readOnlyTitle}>{writeReason}</Alert>}
      <Tabs
        activeTabId={tab}
        onChange={(e) => setTab(e.detail.activeTabId)}
        ariaLabel={T.ops.tabsLabel}
        tabs={[
          {
            id: 'customers', label: T.ops.customers,
            content: (
              <DataTable
                title={T.ops.customers}
                description={T.ops.customersHint}
                items={customerRows} columns={customerColumns} trackBy="id"
                loading={loading} loadingText={loadingText}
                filterPlaceholder={T.ops.findCustomers} filterAriaLabel={T.ops.findCustomers}
                emptyTitle={error ? T.ops.noData : T.ops.noCustomers} emptyText={error ? T.ops.noDataText : T.ops.noCustomersText}
                selected={customer} onSelect={(c) => setCustomerId(c?.id ?? null)} selectionLabel={(c) => `${T.table.selectRow} ${c.name}`}
                defaultSort={{ field: 'createdAt', descending: true }}
                actions={
                  <SpaceBetween size="xs" direction="horizontal">
                    {refresh}
                    <Button disabled={!customer || writeOff || busy} disabledReason={writeOff ? writeReason : T.ops.selectCustomer} onClick={openIncome}>{T.ops.changeIncome}</Button>
                    <Button disabled={!customer || writeOff || busy} disabledReason={writeOff ? writeReason : T.ops.selectCustomer} onClick={() => setModal('simulate')}>{T.ops.simulate}</Button>
                    <Button variant="primary" disabled={writeOff || loading || Boolean(error)} disabledReason={writeOff ? writeReason : undefined} onClick={() => setModal('add')}>{T.ops.addCustomer}</Button>
                  </SpaceBetween>
                }
              />
            ),
          },
          {
            id: 'simulations', label: T.ops.simulations,
            content: (
              <DataTable
                title={T.ops.simulations}
                description={T.ops.simulationsHint}
                items={simulationRows} columns={simulationColumns} trackBy="id"
                loading={loading} loadingText={loadingText}
                filterPlaceholder={T.ops.findSimulations} filterAriaLabel={T.ops.findSimulations}
                emptyTitle={error ? T.ops.noData : T.ops.noSimulations} emptyText={error ? T.ops.noDataText : T.ops.noSimulationsText}
                selected={simulation} onSelect={(s) => setSimulationId(s?.id ?? null)} selectionLabel={(s) => `${T.table.selectRow} ${s.id}`}
                defaultSort={{ field: 'id', descending: true }}
                actions={
                  <SpaceBetween size="xs" direction="horizontal">
                    {refresh}
                    <Button
                      variant="primary"
                      loading={busy}
                      disabled={!simulation || simulation.state !== 'open' || writeOff}
                      disabledReason={writeOff ? writeReason : !simulation ? T.ops.selectSimulation : simulation.state === 'contracted' ? T.ops.simHasContract : T.ops.simExpired}
                      onClick={() => simulation && void doCreateContract(simulation.id)}
                    >
                      {T.ops.createContract}
                    </Button>
                  </SpaceBetween>
                }
              />
            ),
          },
          {
            id: 'contracts', label: T.ops.contracts,
            content: (
              <DataTable
                title={T.ops.contracts}
                description={T.ops.contractsHint}
                items={contractRows} columns={contractColumns} trackBy="id"
                loading={loading} loadingText={loadingText}
                filterPlaceholder={T.ops.findContracts} filterAriaLabel={T.ops.findContracts}
                emptyTitle={error ? T.ops.noData : T.ops.noContracts} emptyText={error ? T.ops.noDataText : T.ops.noContractsText}
                selected={contract} onSelect={(c) => setContractId(c?.id ?? null)} selectionLabel={(c) => `${T.table.selectRow} ${c.id}`}
                defaultSort={{ field: 'createdAt', descending: true }}
                actions={
                  <SpaceBetween size="xs" direction="horizontal">
                    {refresh}
                    <ButtonDropdown
                      variant="primary"
                      loading={busy}
                      disabled={!contract || writeOff}
                      disabledReason={writeOff ? writeReason : T.ops.selectContract}
                      items={ACTIONS.map((a) => {
                        const allowed = contract ? Boolean(CONTRACT_TRANSITIONS[contract.status][a]) : false
                        return { id: a, text: T.contractAction[a], disabled: !allowed, disabledReason: contract ? T.ops.actionNotAllowed(T.contractStatus[contract.status]) : undefined }
                      })}
                      onItemClick={(e) => void doContractAction(e.detail.id as ContractAction)}
                    >
                      {T.ops.contractActions}
                    </ButtonDropdown>
                  </SpaceBetween>
                }
              />
            ),
          },
          {
            id: 'agreements', label: T.ops.agreements,
            content: (
              <DataTable
                title={T.ops.agreements}
                description={T.ops.agreementsHint}
                items={agreements} columns={agreementColumns} trackBy="id"
                loading={loading} loadingText={loadingText}
                filterPlaceholder={T.ops.findAgreements} filterAriaLabel={T.ops.findAgreements}
                emptyTitle={error ? T.ops.noData : T.ops.noAgreements} emptyText={error ? T.ops.noDataText : T.ops.noAgreementsText}
                actions={refresh}
              />
            ),
          },
        ]}
      />
      <Box color="text-body-secondary" fontSize="body-s">{T.ops.noDelete}</Box>

      {modal === 'add' && (
        <AddCustomerModal
          agreements={agreements}
          busy={busy}
          onDismiss={closeModal}
          onSubmit={async (input) => {
            const created = await run(() => api.createCustomer(host, input), (c) => T.ops.customerCreated(c.name, c.id))
            if (created) { setCustomers((list) => [created, ...list]); setCustomerId(created.id); closeModal() }
          }}
        />
      )}
      {modal === 'simulate' && customer && agreementOfCustomer && (
        <SimulateModal
          customer={customer}
          agreement={agreementOfCustomer}
          busy={busy}
          canWrite={canWrite}
          result={simResult}
          onDismiss={closeModal}
          onSubmit={async (principal, termMonths) => {
            const res = await run(() => api.simulate(host, { customerId: customer.id, principal, termMonths }), (r) => T.ops.simulationCreated(r.simulation.id))
            if (res) { setSimulations((list) => [res.simulation, ...list]); setSimulationId(res.simulation.id); setSimResult(res) }
          }}
          onCreateContract={(id) => void doCreateContract(id)}
        />
      )}
      {modal === 'income' && customer && (
        <IncomeModal
          customer={customer}
          busy={busy}
          margin={margin}
          result={incomeResult}
          onDismiss={closeModal}
          onSubmit={async (income) => {
            const res = await run(() => api.changeIncome(host, customer.id, income), (r) => T.ops.incomeChanged(r.customer.id))
            if (res) { setCustomers((list) => list.map((c) => (c.id === res.customer.id ? res.customer : c))); setIncomeResult(res) }
          }}
        />
      )}
    </SpaceBetween>
  )

}
