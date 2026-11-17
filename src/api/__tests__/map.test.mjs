// Unit checks of the mapper and of the trace-header parser. Run: `pnpm test` (node --test, no extra dependency).
// The JSON below has the field names of the Spring Boot API (application/Views.java). All values are synthetic.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  cpfForApi, customerToApi, pageQuery, parseTrace, previewToApi, problemText, simulationToApi,
  toAgreement, toContract, toCustomer, toList, toMargin, toPreview, toSimulation, toSnapshot,
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
