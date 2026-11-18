// Unit checks of the mapper and of the trace-header parser. Run: `pnpm test` (node --test, no extra dependency).
// The JSON below has the field names of the Spring Boot API (application/Views.java). All values are synthetic.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  cpfForApi, customerToApi, pageQuery, parseTrace, previewToApi, problemText, simulationToApi,
  toAgreement, toBudget, toContract, toCustomer, toList, toMargin, toPreview, toSimulation, toSnapshot,
} from '../map.ts'

const customer = { id: 'c0ffee00-0000-4000-8000-000000000001', cpf: '***.***.***-09', fullName: 'Ana Teste Exemplo', agreementId: 'a0000000-0000-4000-8000-000000000001', netMonthlySalary: 5000.0, createdAt: '2026-11-17T08:00:00Z' }
const contract = { id: 'k1', simulationId: 's1', customerId: customer.id, status: 'PROPOSED', principal: 10000, monthlyInterestRate: 0.018, termMonths: 24, installmentAmount: 516.31, statusReason: null, version: 0, createdAt: '2026-11-17T08:05:00Z', updatedAt: '2026-11-17T08:05:00Z' }

test('customer: fullName and netMonthlySalary become name and monthlyIncome', () => {
  assert.deepEqual(toCustomer(customer), { id: customer.id, agreementId: customer.agreementId, name: 'Ana Teste Exemplo', cpf: '***.***.***-09', monthlyIncome: 5000, createdAt: '2026-11-17T08:00:00Z' })
})

test('agreement: decimal values that come as text become numbers', () => {
  const a = toAgreement({ id: 'a1', code: 'INSS', name: 'INSS', maxMarginPercent: '35.00', maxTermMonths: 84, monthlyInterestRate: '0.016600', createdAt: '2026-01-01T00:00:00Z' })
  assert.equal(a.maxMarginPercent, 35)
  assert.equal(a.monthlyInterestRate, 0.0166)
})

test('margin: the limit is committed plus available', () => {
  const m = toMargin({ customerId: customer.id, netMonthlySalary: 5000, maxMarginPercent: 35, committedInstallments: 516.31, availableMargin: 1233.69 })
  assert.deepEqual(m, { customerId: customer.id, monthlyIncome: 5000, marginLimit: 1750, committed: 516.31, available: 1233.69 })
})

test('simulation: installmentAmount and totalPayable become installment and totalAmount', () => {
  const s = toSimulation({ id: 's1', customerId: customer.id, agreementId: 'a1', principal: 10000, monthlyInterestRate: 0.018, termMonths: 24, installmentAmount: 516.31, totalPayable: 12391.44, availableMargin: 1750, createdAt: '2026-11-17T08:01:00Z', expiresAt: '2026-11-19T08:01:00Z' })
  assert.deepEqual(s, { id: 's1', customerId: customer.id, principal: 10000, termMonths: 24, installment: 516.31, totalAmount: 12391.44, monthlyInterestRate: 0.018, expiresAt: '2026-11-19T08:01:00Z' })
})

test('contract: PROPOSED becomes PENDING, other states stay', () => {
  assert.equal(toContract(contract).status, 'PENDING')
  assert.equal(toContract(contract).installment, 516.31)
  assert.equal(toContract({ ...contract, status: 'ACTIVE' }).status, 'ACTIVE')
  assert.equal(toContract({ ...contract, status: 'SOMETHING-NEW' }).status, 'PENDING')
})

test('preview: withinMargin becomes fitsMargin; no margin input means it fits', () => {
  assert.deepEqual(toPreview({ principal: 10000, termMonths: 24, monthlyInterestRate: 0.018, installment: 516.31, totalAmount: 12391.44, totalInterest: 2391.44, marginLimit: 1750, withinMargin: true }),
    { installment: 516.31, totalAmount: 12391.44, totalInterest: 2391.44, marginLimit: 1750, fitsMargin: true })
  assert.equal(toPreview({ principal: 1, termMonths: 1, monthlyInterestRate: 0, installment: 1, totalAmount: 1, totalInterest: 0, withinMargin: false }).fitsMargin, false)
})

test('paged listing: the envelope {content, page, size, totalElements, totalPages}', () => {
  const list = toList({ content: [customer], page: 0, size: 100, totalElements: 137, totalPages: 2 }, toCustomer)
  assert.equal(list.items.length, 1)
  assert.equal(list.items[0].name, 'Ana Teste Exemplo')
  assert.deepEqual(list.page, { page: 0, size: 100, totalElements: 137, totalPages: 2 })
  assert.equal(toList([customer], toCustomer).page.totalElements, 1)
  assert.deepEqual(toList(null, toCustomer).items, [])
  assert.equal(pageQuery(), 'page=0&size=100')
  assert.equal(pageQuery(3, 500), 'page=3&size=100')
})

test('snapshot: keeps the API field names, and the same mapper applies', () => {
  const snap = toSnapshot({ asOf: '2026-11-17T09:00:00Z', agreements: [], customers: [{ ...customer, fullName: 'A** T**** E****', cpf: '***.***.***-**' }], contracts: [contract] })
  assert.equal(snap.customers[0].name, 'A** T**** E****')
  assert.equal(snap.customers[0].monthlyIncome, 5000)
  assert.equal(snap.contracts[0].status, 'PENDING')
  assert.deepEqual(toSnapshot({ asOf: '2026-11-17T09:00:00Z' }).customers, [])
})

test('requests: the frontend names become the API names', () => {
  const body = customerToApi({ agreementId: 'a1', name: '  Ana Teste ', cpf: '***.456.789-**', monthlyIncome: 5000.004 }, () => 0.5)
  assert.equal(body.fullName, 'Ana Teste')
  assert.equal(body.netMonthlySalary, 5000)
  assert.equal(body.agreementId, 'a1')
  assert.match(body.cpf, /^\d{11}$/)
  assert.deepEqual(simulationToApi({ customerId: 'c1', principal: 10000, termMonths: 24 }), { customerId: 'c1', amount: 10000, termMonths: 24 })
  assert.deepEqual(previewToApi({ principal: 10000, termMonths: 24, monthlyInterestRate: 0.018, monthlyIncome: 5000 }), { principal: 10000, termMonths: 24, monthlyInterestRate: 0.018, monthlyIncome: 5000, maxMarginPercent: 35 })
  assert.deepEqual(previewToApi({ principal: 10000, termMonths: 24, monthlyInterestRate: 0.018 }), { principal: 10000, termMonths: 24, monthlyInterestRate: 0.018 })
})

test('cpf: the masked form value becomes 11 digits with correct check digits', () => {
  const valid = (cpf) => {
    const d = [...cpf].map(Number)
    const digit = (n) => { const sum = d.slice(0, n).reduce((acc, x, i) => acc + x * (n + 1 - i), 0); const r = (sum * 10) % 11; return r === 10 ? 0 : r }
    return digit(9) === d[9] && digit(10) === d[10]
  }
  for (const r of [0, 0.13, 0.5, 0.77, 0.999]) {
    const cpf = cpfForApi('***.456.789-**', () => r)
    assert.match(cpf, /^\d{3}456789\d{2}$/)
    assert.ok(valid(cpf), cpf)
  }
  // A synthetic number (sequence 000.000.001) with its calculated check digits.
  assert.equal(cpfForApi('000.000.001-91'), '00000000191')
  assert.equal(cpfForApi('000.000.001-**'), '00000000191')
})

test('trace header: base64url JSON becomes RequestTrace', () => {
  const trace = { host: 'functions', cold: true, totalMs: 9120, events: [
    { ts: '2026-11-17T09:00:00Z', stage: 'request', status: 'done' },
    { ts: '2026-11-17T09:00:00Z', stage: 'edge', status: 'done', detail: 'Cloudflare edge: WAF, rate limit' },
    { ts: '2026-11-17T09:00:00Z', stage: 'identity', status: 'done', detail: 'no token: guest — só cálculo', ms: 0 },
    { ts: '2026-11-17T09:00:00Z', stage: 'function-cold-start', status: 'done', ms: 9100 },
    { ts: '2026-11-17T09:00:09Z', stage: 'response', status: 'done', detail: '200' },
  ] }
  const header = Buffer.from(JSON.stringify(trace), 'utf8').toString('base64url')
  assert.ok(!header.includes('='))
  assert.deepEqual(parseTrace(header), trace)
  assert.equal(parseTrace(header + '=').events.length, 5)
})

test('trace header: a missing or broken value gives null, a bad event is dropped', () => {
  assert.equal(parseTrace(null), null)
  assert.equal(parseTrace(''), null)
  assert.equal(parseTrace('%%%not-base64%%%'), null)
  assert.equal(parseTrace(Buffer.from('{"host":"aks"}').toString('base64url')), null)
  const odd = Buffer.from(JSON.stringify({ totalMs: '12', events: [null, { stage: 'gateway', status: 'weird', ms: 'x' }] })).toString('base64url')
  const parsed = parseTrace(odd, 'aks')
  assert.deepEqual(parsed, { host: 'aks', cold: false, totalMs: 12, events: [{ ts: parsed.events[0].ts, stage: 'gateway', status: 'done' }] })
})

test('error bodies: gateway {code, message} and API problem details', () => {
  assert.equal(problemText({ code: 'cooldown', message: 'The cluster stopped a short time ago. Try again in 12 min.' }), 'The cluster stopped a short time ago. Try again in 12 min.')
  assert.equal(problemText({ code: 'margin-exceeded', title: 'Margin exceeded', detail: 'The installment does not fit the available margin' }), 'The installment does not fit the available margin')
  assert.equal(problemText({ code: 'validation-failed', detail: 'One or more fields are not valid', errors: [{ field: 'cpf', message: 'invalid CPF' }] }), 'cpf: invalid CPF')
  assert.equal(problemText(null), '')
})

// ---- round 1 (live end-to-end test) ---------------------------------------------
import { formatCpf, isValidCpf, maskCpf, normalizeTrace, speedOf } from '../map.ts'

test('cold: only the Functions host can be cold; a trace that is not cold has no cold-start stages', () => {
  const ev = (stage, ms) => ({ ts: '2026-11-17T09:00:00Z', stage, status: 'done', ms })
  const aks = normalizeTrace({ host: 'aks', cold: true, totalMs: 4352, events: [ev('gateway', 29), ev('response')] })
  assert.equal(aks.cold, false)
  assert.equal(speedOf(aks), 'slow')
  const fnCold = normalizeTrace({ host: 'functions', cold: true, totalMs: 18687, events: [ev('gateway', 20), ev('function-cold-start', 18600), ev('jvm-start'), ev('response')] })
  assert.equal(fnCold.cold, true)
  assert.equal(fnCold.events.length, 4)
  assert.equal(speedOf(fnCold), 'cold')
  const fnSlow = normalizeTrace({ host: 'functions', cold: false, totalMs: 4550, events: [ev('gateway', 20), ev('function-cold-start', 4537), ev('response')] })
  assert.deepEqual(fnSlow.events.map((e) => e.stage), ['gateway', 'response'])
  assert.equal(speedOf(fnSlow), 'slow')
  assert.equal(speedOf({ host: 'functions', cold: false, totalMs: 572 }), 'warm')
  const header = Buffer.from(JSON.stringify({ host: 'aks', cold: true, totalMs: 4352, events: [ev('gateway', 29)] })).toString('base64url')
  assert.equal(parseTrace(header).cold, false)
})

test('cpf: check, format and the mask of the API', () => {
  assert.equal(isValidCpf('000.000.001-91'), true)
  assert.equal(isValidCpf('00000000191'), true)
  assert.equal(isValidCpf('000.000.001-92'), false)
  assert.equal(isValidCpf('111.111.111-11'), false)
  assert.equal(isValidCpf('***.456.789-**'), false)
  assert.equal(formatCpf('00000000191'), '000.000.001-91')
  assert.equal(maskCpf('000.000.001-91'), '***.***.***-91')
  assert.equal(maskCpf('***.***.***-91'), '***.***.***-91')
  // What the form sends is what the API gets, so the 2 digits in the table are the 2 last digits typed.
  assert.equal(customerToApi({ agreementId: 'a1', name: 'Ana Teste', cpf: '000.000.001-91', monthlyIncome: 1 }).cpf, '00000000191')
  for (const r of [0.1, 0.42, 0.9]) assert.ok(isValidCpf(formatCpf(cpfForApi('***.***.***-**', () => r))))
})

test('snapshot: a guest gets the income rounded to the nearest R$ 100', () => {
  const snap = toSnapshot({ asOf: '2026-11-17T09:00:00Z', customers: [{ ...customer, netMonthlySalary: 2139.5 }, { ...customer, netMonthlySalary: 5250 }] })
  assert.deepEqual(snap.customers.map((c) => c.monthlyIncome), [2100, 5300])
  assert.equal(toCustomer({ ...customer, netMonthlySalary: 2139.5 }).monthlyIncome, 2139.5)
})

test('budget: the new fields in the billing currency; the old fields as a fallback', () => {
  const asOf = '2026-11-18T20:00:00Z'
  assert.deepEqual(toBudget({ limit: 330, spent: 23.15, currency: 'brl', asOf, limitUsd: 330, spentUsd: 23.15 }), { limit: 330, spent: 23.15, currency: 'BRL', asOf })
  assert.deepEqual(toBudget({ limitUsd: 60, spentUsd: 12.5, asOf }), { limit: 60, spent: 12.5, currency: 'BRL', asOf })
  assert.equal(toBudget({ limit: 60, spent: 1, currency: 'USD', asOf }).currency, 'USD')
  assert.equal(toBudget({ limit: 60, spent: 1, currency: 'R$', asOf }).currency, 'BRL')
})
