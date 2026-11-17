// Checks of the i18n layer. Run: `pnpm test` (node --test, no extra dependency).
// TypeScript checks the shape of the pt-BR tables at build time. This test also covers the tables that are typed
// as Record<string, string> (stage names, states), where TypeScript cannot see a missing key.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectLang } from '../lang.ts'
import { en as admin } from '../../admin/strings.ts'
import { ptBR as adminPt } from '../../admin/strings.pt.ts'
import { en as api } from '../../api/strings.ts'
import { ptBR as apiPt } from '../../api/strings.pt.ts'
import { en as app } from '../../app/strings.ts'
import { ptBR as appPt } from '../../app/strings.pt.ts'
import { en as diagram } from '../../diagram/strings.ts'
import { ptBR as diagramPt } from '../../diagram/strings.pt.ts'
import { en as landing } from '../../landing/strings.ts'
import { ptBR as landingPt } from '../../landing/strings.pt.ts'
import { en as shell } from '../../shell/strings.ts'
import { ptBR as shellPt } from '../../shell/strings.pt.ts'

test('language order: saved choice, then browser language, then English', () => {
  assert.equal(detectLang('en', ['pt-BR']), 'en')
  assert.equal(detectLang('pt-BR', ['en-US']), 'pt-BR')
  assert.equal(detectLang(null, ['pt-BR', 'en']), 'pt-BR')
  assert.equal(detectLang(null, ['pt-PT']), 'pt-BR')
  assert.equal(detectLang(null, ['pt']), 'pt-BR')
  assert.equal(detectLang(null, ['en-US', 'pt-BR']), 'en')
  assert.equal(detectLang(null, ['es-AR']), 'en')
  assert.equal(detectLang('fr', []), 'en')
  assert.equal(detectLang(undefined, []), 'en')
})

/** Every difference of shape between two tables, as a list of paths. */
function diff(a, b, path, out) {
  const kind = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v)
  if (kind(a) !== kind(b)) { out.push(`${path}: ${kind(a)} in en, ${kind(b)} in pt-BR`); return out }
  if (kind(a) === 'array') {
    if (a.length !== b.length) out.push(`${path}: ${a.length} items in en, ${b.length} in pt-BR`)
    a.forEach((item, i) => { if (i < b.length) diff(item, b[i], `${path}[${i}]`, out) })
  } else if (kind(a) === 'object') {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(key in a)) out.push(`${path}.${key}: only in pt-BR`)
      else if (!(key in b)) out.push(`${path}.${key}: only in en`)
      else diff(a[key], b[key], `${path}.${key}`, out)
    }
  } else if (kind(a) === 'string' && (a.trim() === '') !== (b.trim() === '')) out.push(`${path}: empty in one language`)
  return out
}

for (const [area, enTable, ptTable] of [
  ['admin', admin, adminPt], ['api', api, apiPt], ['app', app, appPt],
  ['diagram', diagram, diagramPt], ['landing', landing, landingPt], ['shell', shell, shellPt],
]) {
  test(`${area}: the pt-BR table has the shape of the English table`, () => {
    assert.deepEqual(diff(enTable, ptTable, area, []), [])
  })
}

test('links and ids do not change with the language', () => {
  assert.equal(shellPt.docsUrl, shell.docsUrl)
  assert.deepEqual(landingPt.landing.header.repos, landing.landing.header.repos)
  const hrefs = (t) => [...t.privacy.sections, ...t.terms.sections].map((s) => s.link?.href ?? null)
  assert.deepEqual(hrefs(landingPt), hrefs(landing))
})

test('the footer line and the lawyer notice are in the pt-BR tables', () => {
  const footer = 'Demonstração técnica. Não é oferta de crédito. Todos os dados são sintéticos.'
  assert.equal(shellPt.footer, footer)
  assert.equal(landingPt.common.footer, footer)
  assert.match(landingPt.privacy.alert, /não foi revisado por um advogado/)
})
