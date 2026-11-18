// The version check of contract state changes (M2): If-Match from the last read, 412 / 428 handling.
// Run: `pnpm test`. Fake get/act functions stand in for the gateway; no network.
import assert from 'node:assert/strict'
import { test, beforeEach } from 'node:test'
import { ApiError } from '../errors.ts'
import { toContract } from '../map.ts'
import { StaleVersionError, changeWithVersion, checkIfMatch, etagOf, forgetEtags, knownEtag, rememberEtag } from '../versions.ts'

const messages = { stale: 'This contract changed since you loaded it. I loaded the current state; check it and try again.', missing: 'missing' }
const row = (version, status = 'PENDING') => ({ id: 'k1', customerId: 'c1', simulationId: 's1', status, principal: 1000, termMonths: 12, installment: 100, createdAt: '2026-11-17T08:05:00Z', etag: `"${version}"` })
const trace = { host: 'functions', cold: false, totalMs: 40, events: [] }

/** A fake API: one contract, the version rule of the API, and a log of what the client sent. */
function fakeApi(start = 3) {
  const s = { version: start, status: 'PENDING', sent: [], reads: 0 }
  s.get = async () => { s.reads++; return { data: row(s.version, s.status), trace, label: 'GET', etag: `"${s.version}"` } }
  s.act = async (_host, _id, _action, ifMatch) => {
    s.sent.push(ifMatch)
    const check = checkIfMatch(s.version, ifMatch)
    if (check === 'missing') throw new ApiError(428, 'If-Match is required', trace, 'precondition-required', undefined, 'POST x')
    if (check === 'stale') throw new ApiError(412, 'stale', trace, 'precondition-failed', undefined, 'POST /api/fn/api/v1/contracts/k1/approve')
    s.version++; s.status = 'APPROVED'
    return { data: row(s.version, s.status), trace, label: 'POST', etag: `"${s.version}"` }
  }
  return s
}

beforeEach(() => forgetEtags())

test('the version of a list row is the ETag the API gives', () => {
  assert.equal(etagOf(0), '"0"')
  assert.equal(etagOf(7), '"7"')
  assert.equal(etagOf(undefined), undefined)
  assert.equal(etagOf('7'), undefined)
  assert.equal(toContract({ id: 'k1', simulationId: 's1', customerId: 'c1', status: 'PROPOSED', principal: 1, monthlyInterestRate: 0.01, termMonths: 6, installmentAmount: 1, version: 4, createdAt: '', updatedAt: '' }).etag, '"4"')
})

test('a header ETag wins over the body version', () => {
  rememberEtag('functions', 'k1', 'W/"5"', '"4"')
  assert.equal(knownEtag('functions', 'k1'), 'W/"5"')
  rememberEtag('functions', 'k1', null, '"6"')
  assert.equal(knownEtag('functions', 'k1'), '"6"')
  assert.equal(knownEtag('aks', 'k1'), undefined, 'each host has its own database')
})

test('the rule of the API: same version ok, other version stale, none or * missing', () => {
  assert.equal(checkIfMatch(3, '"3"'), 'ok')
  assert.equal(checkIfMatch(3, 'W/"3"'), 'ok')
  assert.equal(checkIfMatch(3, '"2"'), 'stale')
  assert.equal(checkIfMatch(3, '"abc"'), 'stale')
  assert.equal(checkIfMatch(3, undefined), 'missing')
  assert.equal(checkIfMatch(3, ''), 'missing')
  assert.equal(checkIfMatch(3, '*'), 'missing')
})

test('a change sends the ETag of the last read and keeps the new one', async () => {
  const api = fakeApi(3)
  rememberEtag('functions', 'k1', null, '"3"')
  const res = await changeWithVersion({ get: api.get, act: api.act, messages }, 'functions', 'k1', 'approve')
  assert.deepEqual(api.sent, ['"3"'])
  assert.equal(api.reads, 0, 'a known ETag needs no read')
  assert.equal(res.data.status, 'APPROVED')
  assert.equal(knownEtag('functions', 'k1'), '"4"')
})

test('with no ETag yet, the client reads the contract once first', async () => {
  const api = fakeApi(9)
  await changeWithVersion({ get: api.get, act: api.act, messages }, 'functions', 'k1', 'approve')
  assert.equal(api.reads, 1)
  assert.deepEqual(api.sent, ['"9"'])
})

test('a stale version gives 412: plain message, the contract read again, the trace of the refused call', async () => {
  const api = fakeApi(5)
  rememberEtag('functions', 'k1', null, '"3"') // this page read version 3; someone else changed it twice
  api.status = 'CANCELLED'
  await assert.rejects(changeWithVersion({ get: api.get, act: api.act, messages }, 'functions', 'k1', 'approve'), (err) => {
    assert.ok(err instanceof StaleVersionError)
    assert.ok(err instanceof ApiError, 'the request record treats it like any other answer')
    assert.equal(err.status, 412)
    assert.equal(err.message, messages.stale)
    assert.equal(err.code, 'stale-version')
    assert.equal(err.label, 'POST /api/fn/api/v1/contracts/k1/approve')
    assert.equal(err.trace, trace)
    assert.equal(err.current.status, 'CANCELLED')
    return true
  })
  assert.equal(api.version, 5, 'nothing changed')
  assert.equal(knownEtag('functions', 'k1'), '"5"', 'the next try uses the current version')
})

test('the second try after a 412 goes through', async () => {
  const api = fakeApi(5)
  rememberEtag('functions', 'k1', null, '"3"')
  await assert.rejects(changeWithVersion({ get: api.get, act: api.act, messages }, 'functions', 'k1', 'approve'))
  const res = await changeWithVersion({ get: api.get, act: api.act, messages }, 'functions', 'k1', 'approve')
  assert.equal(res.data.status, 'APPROVED')
  assert.deepEqual(api.sent, ['"3"', '"5"'])
})

test('other errors pass unchanged', async () => {
  const api = fakeApi(1)
  rememberEtag('functions', 'k1', null, '"1"')
  const conflict = new ApiError(409, 'A contract in state SETTLED cannot be approved.', trace, 'invalid-transition')
  await assert.rejects(changeWithVersion({ get: api.get, act: async () => { throw conflict }, messages }, 'functions', 'k1', 'approve'), (err) => err === conflict)
})
