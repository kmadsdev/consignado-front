// The gateway writes the `detail` of a stage or a service in English, as a raw value (like a log line).
// This table gives a pt-BR sentence with the same values for the details that have a stable pattern.
// A detail that matches no pattern is shown as it is. Azure and Kubernetes state values
// (Running, Succeeded, Ready, Stopped, Available) and product words stay in English.
// No React and no DOM: `node --test` loads this file.
import { LANG, type Lang } from '../i18n/lang.ts'

type Rule = [RegExp, (...m: string[]) => string]

/** One rule per sentence pattern. The match is on one whole sentence (the detail is split on ". "). */
export const DETAIL_RULES: readonly Rule[] = [
  // request trace
  [/^(\d+) statements?: (.+)$/, (n, kinds) => `${n} ${n === '1' ? 'comando SQL' : 'comandos SQL'}: ${kinds}`],
  [/^browser sent the request$/, () => 'o navegador enviou a requisição'],
  [/^gateway work without the calls below$/, () => 'trabalho do gateway sem as chamadas abaixo'],
  [/^Spring Boot handled the request in (\S+)$/, (who) => `o Spring Boot tratou a requisição em ${who}`],
  [/^HTTP (\d{3}) from the API host$/, (code) => `HTTP ${code} do host da API`],
  [/^upstream answered (\d{3})$/, (code) => `o host respondeu ${code}`],
  [/^timeout after (\d+) s$/, (s) => `sem resposta em ${s} s`],
  [/^no answer from the API host( \(connection failed\))?$/, (failed) => `sem resposta do host da API${failed ? ' (a conexão falhou)' : ''}`],
  [/^no answer from the internal load balancer( yet)?$/, (yet) => `sem resposta do load balancer interno${yet ? ' ainda' : ''}`],
  [/^internal load balancer to pod, and the way back$/, () => 'load balancer interno até o pod, ida e volta'],
  [/^internal load balancer to pod$/, () => 'load balancer interno até o pod'],
  [/^internal load balancer passed the call$/, () => 'o load balancer interno passou a chamada'],
  [/^cached$/, () => 'do cache'],
  [/^read from Key Vault$/, () => 'lido do Key Vault'],
  [/^not needed for this host$/, () => 'não é necessário para este host'],
  [/^access window is open$/, () => 'a janela de acesso está aberta'],
  // cluster start
  [/^browser asked for an access window$/, () => 'o navegador pediu uma janela de acesso'],
  [/^gateway accepted the request$/, () => 'o gateway aceitou a requisição'],
  [/^window (\d+) of (\d+), engine not paused$/, (a, b) => `janela ${a} de ${b}, Engine não pausada`],
  [/^ARM accepted the (start|stop) of (\S+)$/, (what, name) => `o ARM aceitou ${what === 'start' ? 'o início' : 'a parada'} de ${name}`],
  [/^waiting for ARM: power state (\S+)$/, (state) => `aguardando o ARM: power state ${state}`],
  [/^waiting for the Kubernetes API server$/, () => 'aguardando o API server do Kubernetes'],
  [/^Kubernetes API server answered$/, () => 'o API server do Kubernetes respondeu'],
  [/^no node yet$/, () => 'nenhum node ainda'],
  [/^node (\S+) is not Ready$/, (name) => `o node ${name} ainda não está Ready`],
  [/^no pod in namespace (\S+) yet$/, (ns) => `nenhum pod no namespace ${ns} ainda`],
  [/^pod (\S+) starts Spring Boot and connects to PostgreSQL$/, (pod) => `o pod ${pod} sobe o Spring Boot e conecta no PostgreSQL`],
  [/^pod (\S+) is Ready, waiting for the Service endpoints$/, (pod) => `o pod ${pod} está Ready, aguardando os endpoints do Service`],
  [/^(\d+) ready endpoint\(s\) behind Service (\S+)$/, (n, svc) => `${n} endpoint(s) Ready atrás do Service ${svc}`],
  [/^readiness answered HTTP (\d{3})$/, (code) => `a readiness respondeu HTTP ${code}`],
  [/^window is open for (\d+) minutes$/, (n) => `a janela está aberta por ${n} minutos`],
  [/^cluster (\S+) is stopped$/, (name) => `o cluster ${name} está desligado`],
  [/^cluster (\S+) already runs$/, (name) => `o cluster ${name} já está ligado`],
  // service status
  [/^(\d+) of (\d+) nodes Ready \(seen through the pods\)$/, (a, b) => `${a} de ${b} nodes Ready (visto pelos pods)`],
  [/^(\d+) of (\d+) pods Ready, (\d+) restarts?$/, (a, b, r) => `${a} de ${b} pods Ready, ${r} ${r === '1' ? 'reinício' : 'reinícios'}`],
  [/^Deployment (\S+): (\d+) of (\d+) replicas ready$/, (name, a, b) => `Deployment ${name}: ${a} de ${b} réplicas prontas`],
  [/^HPA (\S+): current (\d+), desired (\d+) \((\d+) to (\d+)\)$/, (name, c, d, lo, hi) => `HPA ${name}: atual ${c}, desejado ${d} (${lo} a ${hi})`],
  [/^signing keys fetched (\d+) min ago$/, (n) => `chaves de assinatura obtidas há ${n} min`],
  [/^signing keys could not be fetched$/, () => 'não foi possível obter as chaves de assinatura'],
  [/^Power state (\S+), provisioning (\S+)( \(stop in progress\))?$/, (p, prov, stop) => `power state ${p}, provisioning ${prov}${stop ? ' (parada em andamento)' : ''}`],
  [/^Cloudflare Worker (\S+)$/, (name) => `Worker da Cloudflare ${name}`],
  [/^Rate limit: (\d+) requests per (\d+) seconds per IP$/, (n, s) => `rate limit: ${n} requisições a cada ${s} segundos por IP`],
  [/^State (\S+)$/, (state) => `estado ${state}`],
  [/^Server state (\S+)$/, (state) => `estado do servidor ${state}`],
  [/^[Rr]esource health: not readable$/, () => 'Resource Health: não foi possível ler'],
  [/^[Rr]esource health: (\S+)$/, (state) => `Resource Health: ${state}`],
  [/^The database answers \(is_db_alive 1\)$/, () => 'o banco de dados responde (is_db_alive 1)'],
  [/^The database does not answer \(is_db_alive 0\)$/, () => 'o banco de dados não responde (is_db_alive 0)'],
  [/^GET (\S+) answered (\d{3}) in (\d+) ms$/, (path, code, ms) => `GET ${path} respondeu ${code} em ${ms} ms`],
  [/^Azure did not answer$/, () => 'o Azure não respondeu'],
  [/^Kubernetes API did not answer$/, () => 'a API do Kubernetes não respondeu'],
]

function sentence(text: string): string | null {
  for (const [re, make] of DETAIL_RULES) {
    const m = re.exec(text)
    if (m) return make(...m.slice(1).map((x) => x ?? ''))
  }
  return null
}

/** The detail in the page language. English: as it is. pt-BR: every sentence must match a rule, else the detail stays as it is. */
export function localizeDetail(detail: string | null | undefined, lang: Lang = LANG): string {
  if (!detail) return ''
  if (lang !== 'pt-BR') return detail
  const parts = detail.split(/\.\s+/)
  const out: string[] = []
  for (const p of parts) {
    const s = sentence(p.replace(/\.$/, ''))
    if (s === null) return detail
    // Keep the case of the first letter of each raw sentence.
    out.push(/^[A-Z]/.test(p) ? s.charAt(0).toUpperCase() + s.slice(1) : s)
  }
  return out.join('. ')
}
