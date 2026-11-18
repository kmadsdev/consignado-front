// Every user-visible string of the API area, in Brazilian Portuguese. Same shape as the English table.
import type { en } from './strings.ts'

export const ptBR: typeof en = {
  network: 'A requisição não chegou ao servidor. Confira sua conexão e tente de novo.',
  unauthorized: 'Esta chamada exige uma conta logada. Entre e tente de novo.',
  invalidToken: 'Seu login expirou ou não é válido. Entre de novo.',
  forbidden: 'Sua conta não pode fazer esta chamada. Só o dono do projeto altera convênios e usa as páginas de administração.',
  blocked: 'Eu bloqueei esta conta. Se você acha que é um erro, me mande uma mensagem pelo formulário de contato.',
  noSession: 'O host Kubernetes só responde durante uma janela de acesso aberta. Inicie antes uma janela de 15 minutos.',
  botCheck: 'A verificação anti-bot não passou. Refaça a verificação e envie o formulário de novo.',
  paused: 'Novas janelas de acesso estão pausadas. O host serverless continua respondendo.',
  held: 'Sua conta está em análise até eu revisar. Você pode ler os dados, mas ainda não pode iniciar uma janela.',
  noWindows: 'Você usou todas as suas janelas de acesso. Peça mais pelo formulário da página do host Kubernetes.',
  dailyLimit: 'Somando todas as contas, 12 janelas começaram nas últimas 24 horas, que é o limite. Tente mais tarde.',
  profileIncomplete: 'Uma janela de acesso exige o perfil completo. Complete seu perfil antes.',
  cooldown: (minutes: number) =>
    minutes > 0
      ? `O cluster parou há menos de 15 minutos, e o Azure pede um intervalo entre parar e iniciar. Tente de novo em ${minutes} min.`
      : 'O cluster parou há menos de 15 minutos, e o Azure pede um intervalo entre parar e iniciar. Tente de novo em alguns minutos.',
  conflict: 'Os dados mudaram enquanto esta requisição rodava. Carregue os dados de novo e tente outra vez.',
  staleVersion: 'Este contrato mudou desde que você o carregou. Carreguei o estado atual; confira e tente de novo.',
  versionMissing: 'Esta mudança precisa da versão do contrato, e a requisição não tinha nenhuma. Carreguei o contrato de novo; tente de novo.',
  notFound: 'Este item não existe.',
  tooLarge: 'A requisição é grande demais.',
  validation: 'A API recusou um ou mais valores. Corrija e tente de novo.',
  tooMany: 'Você mandou requisições demais em pouco tempo. Espere 1 minuto e tente de novo.',
  badGateway: 'O gateway não recebeu resposta do host da API. Tente de novo em 1 minuto.',
  timeout: 'O host da API não respondeu a tempo. O cold start do host serverless leva cerca de 19 s. Tente de novo.',
  internal: 'O serviço teve um erro interno. Tente de novo em 1 minuto.',
  unknown: (status: number) => `A requisição falhou com HTTP ${status}. Tente de novo.`,
  authFailed: 'O login não foi concluído. Tente de novo.',
  reason: {
    reject: 'Recusado no console da demo',
    cancel: 'Cancelado no console da demo',
  },
  trace: {
    noTrace: 'o gateway não mandou trace para esta chamada',
  },
}
