// Unit checks of the pt-BR table for gateway details and of the API refusal texts.
// Run: `pnpm test`. All values are synthetic.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DETAIL_RULES, localizeDetail } from '../details.ts'
import { knownProblemText, problemCode } from '../problems.ts'
import { en } from '../strings.ts'
import { ptBR } from '../strings.pt.ts'

const pt = (d) => localizeDetail(d, 'pt-BR')

const CASES = [
  ['3 statements: 2 select, 1 insert', '3 comandos SQL: 2 select, 1 insert'],
  ['1 statement: 1 select', '1 comando SQL: 1 select'],
  ['browser sent the request', 'o navegador enviou a requisição'],
  ['gateway work without the calls below', 'trabalho do gateway sem as chamadas abaixo'],
  ['Spring Boot handled the request in consignado-api-5d897fb475-ffmb4', 'O Spring Boot tratou a requisição em consignado-api-5d897fb475-ffmb4'],
  ['HTTP 201 from the API host', 'HTTP 201 do host da API'],
  ['upstream answered 503', 'o host respondeu 503'],
  ['timeout after 10 s', 'sem resposta em 10 s'],
  ['no answer from the API host (connection failed)', 'sem resposta do host da API (a conexão falhou)'],
  ['no answer from the internal load balancer yet', 'sem resposta do load balancer interno ainda'],
  ['internal load balancer to pod, and the way back', 'load balancer interno até o pod, ida e volta'],
  ['internal load balancer to pod', 'load balancer interno até o pod'],
  ['internal load balancer passed the call', 'o load balancer interno passou a chamada'],
  ['cold block: instance allocation and JVM start, measured together', 'bloco do cold start: alocação da instância e início da JVM, medidos juntos'],
  ['inside the cold block of function-cold-start', 'dentro do bloco de cold start de function-cold-start'],
  ['cached', 'do cache'],
  ['read from Key Vault', 'lido do Key Vault'],
  ['not needed for this host', 'não é necessário para este host'],
  ['access window is open', 'a janela de acesso está aberta'],
  ['browser asked for an access window', 'o navegador pediu uma janela de acesso'],
  ['gateway accepted the request', 'o gateway aceitou a requisição'],
  ['window 4 of 4, engine not paused', 'janela 4 de 4, Engine não pausada'],
  ['ARM accepted the start of aks-consignado', 'O ARM aceitou o início de aks-consignado'],
  ['ARM accepted the stop of aks-consignado', 'O ARM aceitou a parada de aks-consignado'],
  ['waiting for ARM: power state Starting', 'aguardando o ARM: power state Starting'],
  ['waiting for the Kubernetes API server', 'aguardando o API server do Kubernetes'],
  ['Kubernetes API server answered', 'O API server do Kubernetes respondeu'],
  ['no node yet', 'nenhum node ainda'],
  ['node aks-system-12345678-vmss000005 is not Ready', 'o node aks-system-12345678-vmss000005 ainda não está Ready'],
  ['no pod in namespace consignado yet', 'nenhum pod no namespace consignado ainda'],
  ['pod consignado-api-6b985dd67d-tllwk starts Spring Boot and connects to PostgreSQL', 'o pod consignado-api-6b985dd67d-tllwk sobe o Spring Boot e conecta no PostgreSQL'],
  ['pod consignado-api-6b985dd67d-tllwk is Ready, waiting for the Service endpoints', 'o pod consignado-api-6b985dd67d-tllwk está Ready, aguardando os endpoints do Service'],
  ['1 ready endpoint(s) behind Service consignado-api', '1 endpoint(s) Ready atrás do Service consignado-api'],
  ['readiness answered HTTP 200', 'a readiness respondeu HTTP 200'],
  ['window is open for 15 minutes', 'a janela está aberta por 15 minutos'],
  ['cluster aks-consignado is stopped', 'o cluster aks-consignado está desligado'],
  ['cluster aks-consignado already runs', 'o cluster aks-consignado já está ligado'],
  ['1 of 1 nodes Ready (seen through the pods)', '1 de 1 nodes Ready (visto pelos pods)'],
  ['2 of 2 pods Ready, 0 restarts', '2 de 2 pods Ready, 0 reinícios'],
  ['1 of 1 pods Ready, 1 restart', '1 de 1 pods Ready, 1 reinício'],
  ['1 of 1 pods Ready, 0 restarts. Deployment consignado-api: 1 of 2 replicas ready. HPA consignado-api: current 1, desired 2 (1 to 3)',
    '1 de 1 pods Ready, 0 reinícios. Deployment consignado-api: 1 de 2 réplicas prontas. HPA consignado-api: atual 1, desejado 2 (1 a 3)'],
  ['signing keys fetched 43 min ago', 'chaves de assinatura obtidas há 43 min'],
  ['signing keys could not be fetched', 'não foi possível obter as chaves de assinatura'],
  ['Power state Running, provisioning Succeeded', 'Power state Running, provisioning Succeeded'],
  ['Power state Stopped, provisioning Succeeded (stop in progress)', 'Power state Stopped, provisioning Succeeded (parada em andamento)'],
  ['Cloudflare Worker consignado-edge. Rate limit: 40 requests per 10 seconds per IP', 'Worker da Cloudflare consignado-edge. Rate limit: 40 requisições a cada 10 segundos por IP'],
  ['Rate limit: 40 requests per 10 seconds per IP', 'Rate limit: 40 requisições a cada 10 segundos por IP'],
  ['State Running. Resource health: Available', 'Estado Running. Resource Health: Available'],
  ['State Running. Resource health: not readable', 'Estado Running. Resource Health: não foi possível ler'],
  ['Server state Ready. The database answers (is_db_alive 1)', 'Estado do servidor Ready. O banco de dados responde (is_db_alive 1)'],
  ['Server state Stopped. The database does not answer (is_db_alive 0)', 'Estado do servidor Stopped. O banco de dados não responde (is_db_alive 0)'],
  ['GET /actuator/health/readiness answered 200 in 41 ms', 'GET /actuator/health/readiness respondeu 200 em 41 ms'],
  ['Azure did not answer', 'O Azure não respondeu'],
  ['Kubernetes API did not answer', 'A API do Kubernetes não respondeu'],
]

for (const [raw, want] of CASES) {
  test(`detail pt-BR: ${raw}`, () => assert.equal(pt(raw), want))
}

test('detail: every rule has at least one case above', () => {
  for (const [re] of DETAIL_RULES) assert.ok(CASES.some(([raw]) => raw.split(/\.\s+/).some((p) => re.test(p))), `no case for ${re}`)
})

test('detail fallback: an unknown detail stays as it is, also when only one sentence is unknown', () => {
  assert.equal(pt('something new from the gateway'), 'something new from the gateway')
  assert.equal(pt('State Running. A new sentence'), 'State Running. A new sentence')
  assert.equal(pt(''), '')
  assert.equal(pt(undefined), '')
})

test('detail English: no change', () => {
  assert.equal(localizeDetail('3 statements: 2 select, 1 insert', 'en'), '3 statements: 2 select, 1 insert')
})

test('problem code: from code, else from type', () => {
  assert.equal(problemCode({ code: 'margin-exceeded' }), 'margin-exceeded')
  assert.equal(problemCode({ type: 'urn:consignado:problem:invalid-cpf' }), 'invalid-cpf')
  assert.equal(problemCode(null), '')
})

test('problem text: income below the committed margin, with the numbers of the body, both languages', () => {
  const body = { code: 'income-below-committed-margin', detail: 'The new margin limit 280.00 is below the committed installments 301.40', marginLimit: 280.0, committedInstallments: 301.4 }
  const textPt = knownProblemText(body, ptBR.problem, 'pt-BR')
  assert.match(textPt, /R\$\s280,00/)
  assert.match(textPt, /R\$\s301,40/)
  assert.doesNotMatch(textPt, /margin limit/)
  const textEn = knownProblemText(body, en.problem, 'en-GB')
  assert.match(textEn, /R\$280\.00/)
  assert.match(textEn, /R\$301\.40/)
})

test('problem text: margin exceeded, transition, term limit, validation fields', () => {
  assert.match(knownProblemText({ code: 'margin-exceeded', installment: 512.3, availableMargin: 400 }, ptBR.problem, 'pt-BR'), /512,30.*400,00/)
  assert.equal(knownProblemText({ code: 'illegal-status-transition', currentStatus: 'ACTIVE', requestedStatus: 'APPROVED' }, ptBR.problem, 'pt-BR'), 'O contrato está Ativo, e a máquina de estados não permite a mudança para Aprovado.')
  assert.equal(knownProblemText({ code: 'term-above-agreement-limit', detail: 'The agreement allows at most 84 months' }, en.problem, 'en-GB'), 'The agreement allows at most 84 months. Use a shorter term.')
  assert.equal(knownProblemText({ code: 'validation-failed', errors: [{ field: 'principal', message: 'x' }, { field: 'termMonths', message: 'y' }] }, en.problem, 'en-GB'), 'The API refused these fields: principal, termMonths. Correct them, then try again.')
})

test('problem text: an unknown code gives an empty text (the caller shows the API text)', () => {
  assert.equal(knownProblemText({ code: 'something-new', detail: 'New rule' }, en.problem, 'en-GB'), '')
  assert.equal(knownProblemText(null, en.problem, 'en-GB'), '')
})
